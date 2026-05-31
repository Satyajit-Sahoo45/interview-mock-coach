// All calls go through the /api/chat proxy. Keys never touch the browser.
// REPLACE your existing utils/api-gemini.js with this.
import {
  buildQuestionPrompt,
  buildEvaluationPrompt,
  buildSummaryPrompt,
  buildFollowUpPrompt,
  buildCheatSheetPrompt,
  buildResumeTipsPrompt,
  buildMCQPrompt,
  buildMCQSummaryPrompt,
} from "./prompts";
import { sanitizeError } from "./sanitize";

const MODEL = "gemini-3.1-flash-lite";

// ── Core fetch — calls /api/chat proxy, never the AI directly ────────────────
async function callProxy(prompt) {
  let res;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "gemini",
        model: MODEL,
        payload: {
          system_instruction: {
            parts: [
              {
                text: "You are an expert interviewer and career coach. Always respond with valid JSON only — no markdown, no explanation, no code fences.",
              },
            ],
          },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
        },
      }),
    });
  } catch (e) {
    throw new Error(sanitizeError(e));
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(sanitizeError(err?.error || `Error ${res.status}`));
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];

  if (candidate?.finishReason === "MAX_TOKENS")
    throw new Error("Response was too long. Please try again.");

  const raw = candidate?.content?.parts?.[0]?.text || "";
  if (!raw) throw new Error("The AI returned an empty response. Try again.");

  const clean = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  try {
    return JSON.parse(clean);
  } catch (_) {
    throw new Error("The AI returned an unexpected response. Try again.");
  }
}

export const fetchQuestion = (role, type, diff, prev, jd) =>
  callProxy(buildQuestionPrompt(role, type, diff, prev, jd));
export const evaluateAnswer = (q, a, role, type, diff) =>
  callProxy(buildEvaluationPrompt(q, a, role, type, diff));
export const fetchFollowUp = (q, a, gaps, role, diff) =>
  callProxy(buildFollowUpPrompt(q, a, gaps, role, diff));
export const fetchSessionSummary = (sessions, role, type, diff) =>
  callProxy(buildSummaryPrompt(sessions, role, type, diff));
export const fetchCheatSheet = (role, type, diff, jd) =>
  callProxy(buildCheatSheetPrompt(role, type, diff, jd));
export const fetchResumeTips = (sessions, role, type) =>
  callProxy(buildResumeTipsPrompt(sessions, role, type));
export const fetchMCQQuestion = (role, diff, prev, jd) =>
  callProxy(buildMCQPrompt(role, diff, prev, jd));
export const fetchMCQSummary = (results, role, diff) =>
  callProxy(buildMCQSummaryPrompt(results, role, diff));
