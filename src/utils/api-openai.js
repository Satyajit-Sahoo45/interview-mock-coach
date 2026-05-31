// utils/api-openai.js — SECURE VERSION (OpenAI via proxy)
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

const MODEL = "gpt-4o";

async function callProxy(prompt) {
  let res;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "openai",
        model: MODEL,
        payload: {
          model: MODEL,
          max_tokens: 1500,
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content:
                "You are an expert interviewer and career coach. Always respond with valid JSON only — no markdown, no code fences.",
            },
            { role: "user", content: prompt },
          ],
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
  const raw = data.choices?.[0]?.message?.content || "";
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
