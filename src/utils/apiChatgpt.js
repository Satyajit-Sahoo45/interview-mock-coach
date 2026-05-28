import {
  buildQuestionPrompt,
  buildEvaluationPrompt,
  buildSummaryPrompt,
} from "./prompts";

const OPENAI_API = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o"; // swap to 'gpt-3.5-turbo' to reduce cost

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function callGPT(prompt) {
  const apiKey =
    window.__OPENAI_API_KEY__ || localStorage.getItem("openai_api_key") || "";

  const res = await fetch(OPENAI_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You are an expert interviewer and career coach. Always respond with valid JSON only — no markdown, no explanation, no code fences.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || `OpenAI API error ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || "";

  // Strip markdown fences just in case model wraps response
  const clean = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    return JSON.parse(clean);
  } catch (_) {
    throw new Error("GPT returned invalid JSON. Try again.");
  }
}

// ─── Public helpers ───────────────────────────────────────────────────────────

export async function fetchQuestion(role, type, difficulty, previousQuestions) {
  const prompt = buildQuestionPrompt(role, type, difficulty, previousQuestions);
  return callGPT(prompt);
  // Returns: { question, category, hints, idealTopics }
}

export async function evaluateAnswer(question, answer, role, type, difficulty) {
  const prompt = buildEvaluationPrompt(
    question,
    answer,
    role,
    type,
    difficulty,
  );
  return callGPT(prompt);
  // Returns: { score, rating, strengths, gaps, missedPoints, improvedAnswer }
}

export async function fetchSessionSummary(sessions, role, type, difficulty) {
  const prompt = buildSummaryPrompt(sessions, role, type, difficulty);
  return callGPT(prompt);
  // Returns: { overallScore, overallRating, topStrengths, criticalImprovements,
  //            studyTopics, motivationalNote }
}
