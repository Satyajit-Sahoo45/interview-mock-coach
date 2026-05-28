import {
  buildQuestionPrompt,
  buildEvaluationPrompt,
  buildSummaryPrompt,
  buildFollowUpPrompt,
} from "./prompts";

const MODEL = "gemini-3.1-flash-lite"; // swap to 'gemini-1.5-pro' for higher quality
const getApiUrl = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function callGemini(prompt) {
  const apiKey =
    window.__GEMINI_API_KEY__ || localStorage.getItem("gemini_api_key") || "";

  if (!apiKey)
    throw new Error(
      "Gemini API key not found. Please enter it on the home screen.",
    );

  const res = await fetch(getApiUrl(apiKey), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [
          {
            text: "You are an expert interviewer and career coach. Always respond with valid JSON only — no markdown, no explanation, no code fences.",
          },
        ],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || `Gemini API error ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();

  // Gemini response path: candidates[0].content.parts[0].text
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  if (!raw) throw new Error("Gemini returned an empty response. Try again.");

  // Strip markdown fences if model wraps response
  const clean = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    return JSON.parse(clean);
  } catch (_) {
    throw new Error("Gemini returned invalid JSON. Try again.");
  }
}

// ─── Public helpers ───────────────────────────────────────────────────────────

export async function fetchQuestion(
  role,
  type,
  difficulty,
  previousQuestions,
  jobDescription,
) {
  const prompt = buildQuestionPrompt(
    role,
    type,
    difficulty,
    previousQuestions,
    jobDescription,
  );
  return callGemini(prompt);
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
  return callGemini(prompt);
  // Returns: { score, rating, strengths, gaps, missedPoints, improvedAnswer }
}

export async function fetchFollowUp(question, answer, gaps, role, difficulty) {
  return callGemini(
    buildFollowUpPrompt(question, answer, gaps, role, difficulty),
  );
}

export async function fetchSessionSummary(sessions, role, type, difficulty) {
  const prompt = buildSummaryPrompt(sessions, role, type, difficulty);
  return callGemini(prompt);
  // Returns: { overallScore, overallRating, topStrengths, criticalImprovements,
  //            studyTopics, motivationalNote }
}
