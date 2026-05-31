// All input sanitization and validation
// Import and call these BEFORE passing any user input to prompt builders.

// ─── Character limits ─────────────────────────────────────────────────────────
export const LIMITS = {
  ANSWER: 2000, // interview/MCQ answer
  JOB_DESCRIPTION: 3000, // job description paste
  QUESTION: 500, // question text (from AI, not user — still limit for safety)
  EXPLANATION: 1000,
};

// ─── Prompt injection patterns to strip ──────────────────────────────────────
// These are common patterns used to hijack AI system prompts.
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous\s+|prior\s+)?instructions?/gi,
  /disregard\s+(all\s+)?(previous\s+|prior\s+)?instructions?/gi,
  /forget\s+(all\s+)?(previous\s+|prior\s+)?instructions?/gi,
  /you\s+are\s+now\s+/gi,
  /act\s+as\s+(if\s+you\s+are|a)\s+/gi,
  /pretend\s+(you\s+are|to\s+be)\s+/gi,
  /jailbreak/gi,
  /system\s*prompt/gi,
  /\[INST\]|\[\/INST\]/g, // Llama injection syntax
  /<\|im_start\|>|<\|im_end\|>/g, // OpenAI special tokens
  /###\s*(human|assistant|system)\s*:/gi,
];

/**
 * Sanitize any user-supplied text before it goes into a prompt.
 * - Trims whitespace
 * - Enforces character limit
 * - Strips prompt injection patterns
 * - Removes null bytes and control characters
 * Returns the cleaned string.
 */
export function sanitizeInput(text, limit = LIMITS.ANSWER) {
  if (!text || typeof text !== "string") return "";

  let clean = text
    .trim()
    // Remove null bytes and non-printable control chars (except newline/tab)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Normalise multiple blank lines to max 2
    .replace(/\n{3,}/g, "\n\n");

  // Strip injection patterns
  INJECTION_PATTERNS.forEach((pattern) => {
    clean = clean.replace(pattern, "[removed]");
  });

  // Enforce length limit
  if (clean.length > limit) {
    clean = clean.slice(0, limit);
  }

  return clean;
}

/**
 * Sanitize all fields of the interview config before use.
 * Returns a new config object with clean values.
 */
export function sanitizeConfig(config) {
  const ALLOWED_ROLES = [
    "frontend",
    "backend",
    "fullstack",
    "product",
    "data",
    "design",
    "devops",
    "mobile",
    "ml",
    "qa",
  ];
  const ALLOWED_TYPES = ["behavioral", "technical", "hr", "mcq"];
  const ALLOWED_DIFFS = ["junior", "mid", "senior"];

  return {
    role: ALLOWED_ROLES.includes(config.role) ? config.role : "frontend",
    type: ALLOWED_TYPES.includes(config.type) ? config.type : "behavioral",
    difficulty: ALLOWED_DIFFS.includes(config.difficulty)
      ? config.difficulty
      : "mid",
    jobDescription: config.jobDescription
      ? sanitizeInput(config.jobDescription, LIMITS.JOB_DESCRIPTION)
      : "",
  };
}

/**
 * Validate and clamp settings values before saving to DB.
 * Prevents arbitrary values being written to user_settings.
 */
export function validateSettings(settings) {
  const ALLOWED_PROVIDERS = ["gemini", "claude", "openai"];
  const ALLOWED_THEMES = ["dark", "light"];
  const ALLOWED_COUNTS = [3, 5, 7, 10];

  return {
    provider: ALLOWED_PROVIDERS.includes(settings.provider)
      ? settings.provider
      : "gemini",
    questionCount: ALLOWED_COUNTS.includes(Number(settings.questionCount))
      ? Number(settings.questionCount)
      : 5,
    theme: ALLOWED_THEMES.includes(settings.theme) ? settings.theme : "dark",
    voiceEnabled: Boolean(settings.voiceEnabled),
    autoSave: Boolean(settings.autoSave),
    showIdealTopics: Boolean(settings.showIdealTopics),
  };
}

/**
 * Sanitize error messages before showing them in the UI.
 * Prevents leaking API keys, project IDs, or internal paths.
 */
export function sanitizeError(error) {
  const msg = error?.message || String(error) || "Unknown error";

  // Never show these patterns to the user
  const sensitivePatterns = [
    /sk-ant-[a-zA-Z0-9-]+/g, // Claude keys
    /sk-[a-zA-Z0-9]+/g, // OpenAI keys
    /AIza[a-zA-Z0-9-_]+/g, // Gemini keys
    /project[_-]?[a-zA-Z0-9]+/gi, // project IDs
    /at\s+\w+\s+\(.*:\d+:\d+\)/g, // stack traces
    /\/home\/|\/usr\/|C:\\/g, // file paths
  ];

  let clean = msg;
  sensitivePatterns.forEach((p) => {
    clean = clean.replace(p, "[redacted]");
  });

  // Map common API error codes to user-friendly messages
  if (/429/.test(clean))
    return "Rate limit reached. Please wait a moment and try again.";
  if (/401|403/.test(clean))
    return "Invalid API key. Please check your key in Settings.";
  if (/500|502|503/.test(clean))
    return "The AI service is temporarily unavailable. Try again shortly.";
  if (/network|failed to fetch/i.test(clean))
    return "Network error. Check your internet connection.";
  if (/MAX_TOKENS/.test(clean))
    return "Response was too long. Try a shorter answer or switch models.";
  if (/malformed JSON/i.test(clean))
    return "The AI returned an unexpected response. Please try again.";
  if (/\[redacted\]/.test(clean))
    return "An API error occurred. Please check your key in Settings.";

  // Safe to show as-is
  return clean;
}
