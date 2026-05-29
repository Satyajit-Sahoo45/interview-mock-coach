// ─── Constants ────────────────────────────────────────────────────────────────

export const TOTAL_QUESTIONS = 5;

export const ROLES = [
  { id: "frontend", label: "Frontend Dev", icon: "⚡" },
  { id: "backend", label: "Backend Dev", icon: "🔧" },
  { id: "fullstack", label: "Full-Stack Dev", icon: "🚀" },
  { id: "product", label: "Product Manager", icon: "📊" },
  { id: "data", label: "Data Analyst", icon: "📈" },
  { id: "design", label: "UX Designer", icon: "🎨" },
  { id: "devops", label: "DevOps Engineer", icon: "⚙️" },
  { id: "mobile", label: "Mobile Dev", icon: "📱" },
  { id: "ml", label: "ML Engineer", icon: "🤖" },
  { id: "qa", label: "QA Engineer", icon: "🧪" },
  { id: "mt", label: "Manual Testing", icon: "🔩" },
  { id: "at", label: "Automation Testing", icon: "⚙️" },
];

export const INTERVIEW_TYPES = [
  {
    id: "behavioral",
    label: "Behavioral",
    desc: "Situation-based soft skill questions (STAR method)",
    icon: "🧠",
  },
  {
    id: "technical",
    label: "Technical",
    desc: "Role-specific knowledge and problem-solving",
    icon: "💻",
  },
  {
    id: "hr",
    label: "HR Round",
    desc: "Culture fit, motivations, and career goals",
    icon: "🤝",
  },
];

export const DIFFICULTIES = [
  { id: "fresher", label: "Fresher", range: "0 yr" },
  { id: "junior", label: "Junior", range: "0–2 yrs" },
  { id: "mid", label: "Mid-Level", range: "2–5 yrs" },
  { id: "senior", label: "Senior", range: "5+ yrs" },
];

// ─── Prompt Builders ──────────────────────────────────────────────────────────

/**
 * V2: accepts optional jobDescription to tailor questions to a specific JD
 */
export const buildQuestionPrompt = (
  role,
  type,
  difficulty,
  previousQuestions = [],
  jobDescription = "",
) => `
You are a senior interviewer at a top tech company conducting a ${difficulty}-level ${type} interview for a ${role} position.

${
  jobDescription
    ? `The candidate applied for this specific role. Use the job description to tailor your question:\n"""\n${jobDescription.slice(0, 800)}\n"""\n`
    : ""
}

${
  previousQuestions.length > 0
    ? `Questions already asked (DO NOT repeat or rephrase):\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
    : ""
}

Generate ONE realistic interview question for ${difficulty} level.
It must be ${type} in nature and commonly asked at top companies.

Respond ONLY with valid JSON — no markdown, no code fences, no extra text:
{
  "question": "<the interview question>",
  "category": "<e.g. System Design | Problem Solving | Leadership | Communication>",
  "hints": ["<hint 1>", "<hint 2>"],
  "idealTopics": ["<key topic 1>", "<key topic 2>", "<key topic 3>"]
}
`;

/**
 * Evaluates a candidate's answer.
 */
export const buildEvaluationPrompt = (
  question,
  answer,
  role,
  type,
  difficulty,
) => `
You are an expert interviewer evaluating a ${difficulty}-level ${role} candidate in a ${type} interview.

Question: ${question}
Candidate's Answer: ${answer}

Evaluate honestly and constructively. Respond ONLY with valid JSON — no markdown, no code fences:
{
  "score": <integer 1–10>,
  "rating": "<Excellent | Good | Average | Needs Work>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "gaps": ["<gap 1>", "<gap 2>"],
  "missedPoints": ["<missed point 1>", "<missed point 2>"],
  "improvedAnswer": "<A polished 2–3 sentence version addressing the gaps>"
}
`;

/**
 * V2: Generates a follow-up question based on what the candidate said.
 */
export const buildFollowUpPrompt = (
  question,
  answer,
  gaps,
  role,
  difficulty,
) => `
You are a sharp interviewer conducting a ${difficulty}-level interview for a ${role} position.

The candidate just answered this question:
"${question}"

Their answer: "${answer}"

Gaps identified: ${gaps.join(", ")}

Ask ONE sharp follow-up question that drills into their weakest gap or probes deeper on something they glossed over.
Make it feel natural — like a real interviewer following up.

Respond ONLY with valid JSON — no markdown, no code fences:
{
  "followUp": "<the follow-up question>",
  "targetGap": "<which gap this targets>"
}
`;

/**
 * Generates an overall session summary.
 */
export const buildSummaryPrompt = (sessions, role, type, difficulty) => `
You are an expert career coach reviewing a completed mock interview.

Role: ${role} | Type: ${type} | Difficulty: ${difficulty}

Session Data:
${sessions
  .map(
    (s, i) => `
Q${i + 1}: ${s.question}
Answer: ${s.answer}
Score: ${s.feedback?.score ?? "N/A"}/10
Gaps: ${(s.feedback?.gaps ?? []).join(", ")}
${s.followUpQ ? `Follow-up asked: ${s.followUpQ}` : ""}
`,
  )
  .join("\n")}

Respond ONLY with valid JSON — no markdown, no code fences:
{
  "overallScore": <average score, one decimal>,
  "overallRating": "<Excellent | Good | Average | Needs Work>",
  "topStrengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "criticalImprovements": ["<action 1>", "<action 2>", "<action 3>"],
  "studyTopics": ["<topic 1>", "<topic 2>", "<topic 3>"],
  "motivationalNote": "<A personalised 1–2 sentence encouraging message>"
}
`;

// ─── V3 new prompts ───────────────────────────────────────────────────────────

export const buildCheatSheetPrompt = (
  role,
  type,
  difficulty,
  jobDescription = "",
) => `
You are an expert career coach. Generate a concise pre-interview cheat sheet for a candidate
preparing for a ${difficulty}-level ${type} interview for a ${role} position.
${jobDescription ? `\nJob context:\n"""\n${jobDescription.slice(0, 600)}\n"""` : ""}
 
Keep every item short and punchy — this is a quick-reference card, not an essay.
 
Respond ONLY with valid JSON — no markdown, no code fences:
{
  "keyTopics": ["<topic 1>", "<topic 2>", "<topic 3>", "<topic 4>", "<topic 5>"],
  "starExamples": [
    { "situation": "<1 sentence>", "task": "<1 sentence>", "action": "<1 sentence>", "result": "<1 sentence>" }
  ],
  "commonMistakes": ["<mistake 1>", "<mistake 2>", "<mistake 3>"],
  "powerPhrases": ["<phrase 1>", "<phrase 2>", "<phrase 3>"],
  "questionsToAsk": ["<question to ask interviewer 1>", "<question 2>", "<question 3>"]
}
`;

export const buildResumeTipsPrompt = (sessions, role, type) => `
You are an expert resume coach. Based on this mock interview session for a ${role} ${type} position,
suggest 4 powerful bullet points the candidate should add to their resume, based on the topics
they demonstrated knowledge of. Make each bullet start with a strong action verb and include
a quantified impact where possible (use realistic estimates if exact numbers aren't available).
 
Session highlights:
${sessions
  .slice(0, 3)
  .map(
    (s, i) =>
      `Q${i + 1}: ${s.question}\nAnswer summary: ${s.answer?.slice(0, 200)}`,
  )
  .join("\n\n")}
 
Respond ONLY with valid JSON — no markdown, no code fences:
{
  "bullets": [
    "<bullet 1>",
    "<bullet 2>",
    "<bullet 3>",
    "<bullet 4>"
  ],
  "tip": "<One sentence coaching tip about resume presentation for this role>"
}
`;
