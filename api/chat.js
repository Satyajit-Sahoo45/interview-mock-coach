// Vercel Edge Function (AI proxy)
//
// This is your backend. All AI calls from the browser come here.
// Keys never touch the client — they live in Vercel environment variables.

export const config = { runtime: "edge" };

// Allowed providers and their upstream URLs
const PROVIDERS = {
  gemini: {
    url: (model) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    keyEnv: "GEMINI_API_KEY",
  },
  claude: {
    url: () => "https://api.anthropic.com/v1/messages",
    keyEnv: "CLAUDE_API_KEY",
  },
  openai: {
    url: () => "https://api.openai.com/v1/chat/completions",
    keyEnv: "OPENAI_API_KEY",
  },
};

// Simple in-memory rate limiter (resets per Edge instance — good enough for abuse prevention)
const rateLimitMap = new Map();
const RATE_LIMIT = 10; // max requests
const WINDOW_MS = 60000; // per 60 seconds

function isRateLimited(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + WINDOW_MS };

  if (now > record.resetAt) {
    // Window expired — reset
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  if (record.count >= RATE_LIMIT) return true;

  record.count++;
  rateLimitMap.set(ip, record);
  return false;
}

export default async function handler(req) {
  // ── CORS ────────────────────────────────────────────────────────────────────
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
  const origin = req.headers.get("origin") || "";

  // Reject requests from unknown origins in production
  if (allowedOrigin !== "*" && origin !== allowedOrigin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Rate limiting ────────────────────────────────────────────────────────────
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Try again in a minute." }),
      {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // ── Parse and validate request body ─────────────────────────────────────────
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { provider = "gemini", model, payload } = body;

  // Validate provider
  const providerConfig = PROVIDERS[provider];
  if (!providerConfig) {
    return new Response(JSON.stringify({ error: "Unknown provider" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate payload size (prevent huge requests)
  const payloadStr = JSON.stringify(payload);
  if (payloadStr.length > 50000) {
    // 50kb max
    return new Response(JSON.stringify({ error: "Payload too large" }), {
      status: 413,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Ensure the API key exists in server environment
  const apiKey = process.env[providerConfig.keyEnv];
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Provider not configured on server" }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // ── Build provider-specific headers ─────────────────────────────────────────
  let upstreamHeaders = { "Content-Type": "application/json" };
  if (provider === "claude") {
    upstreamHeaders["x-api-key"] = apiKey;
    upstreamHeaders["anthropic-version"] = "2023-06-01";
  } else if (provider === "openai") {
    upstreamHeaders["Authorization"] = `Bearer ${apiKey}`;
  }
  // Gemini key is in the URL query param, not a header

  // ── Forward to upstream AI provider ─────────────────────────────────────────
  const upstream = providerConfig.url(model || "gemini-2.0-flash");
  let upstreamRes;
  try {
    upstreamRes = await fetch(upstream, {
      method: "POST",
      headers: upstreamHeaders,
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Failed to reach AI provider" }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // ── Stream response back to client ───────────────────────────────────────────
  const data = await upstreamRes.json();

  return new Response(JSON.stringify(data), {
    status: upstreamRes.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
