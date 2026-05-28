import {
  buildQuestionPrompt,
  buildEvaluationPrompt,
  buildSummaryPrompt,
} from "./prompts";

const CLAUDE_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function callClaude(prompt) {
  const apiKey =
    window.__CLAUDE_API_KEY__ || localStorage.getItem("claude_api_key") || "";
  const res = await fetch(CLAUDE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  const raw = data.content?.find((b) => b.type === "text")?.text || "";

  // Strip markdown fences if model wraps JSON
  const clean = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  return JSON.parse(clean);
}

// ─── Public helpers ───────────────────────────────────────────────────────────

export async function fetchQuestion(role, type, difficulty, previousQuestions) {
  const prompt = buildQuestionPrompt(role, type, difficulty, previousQuestions);
  return callClaude(prompt);
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
  return callClaude(prompt);
  // Returns: { score, rating, strengths, gaps, missedPoints, improvedAnswer }
}

export async function fetchSessionSummary(sessions, role, type, difficulty) {
  const prompt = buildSummaryPrompt(sessions, role, type, difficulty);
  return callClaude(prompt);
  // Returns: { overallScore, overallRating, topStrengths, criticalImprovements,
  //            studyTopics, motivationalNote }
}
