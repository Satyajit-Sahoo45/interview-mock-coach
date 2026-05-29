import { useState, useCallback } from "react";
import { loadSettings } from "../utils/storage"; // V3: read questionCount + provider

// ── V3: Dynamic API provider switching based on Settings ─────────────────────
// Reads the saved provider from localStorage at hook init time.
// To add a new provider: add its key to storage.js DEFAULT_SETTINGS
//   and create a matching api-<provider>.js in utils/
function getApiModule() {
  const provider = loadSettings().provider || "gemini";
  switch (provider) {
    case "gemini":
      return import("../utils/api.js");
    case "openai":
      return import("../utils/api-openai.js");
    default:
      return import("../utils/api-claude.js");
  }
}

// States: idle | loading-question | answering | evaluating | feedback
//         followup-loading | followup-answering | followup-evaluating | followup-feedback
//         done
export default function useInterview(config) {
  const [state, setState] = useState("idle");
  const [currentQ, setCurrentQ] = useState(null);
  const [qIndex, setQIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [showImproved, setShowImproved] = useState(false);

  // V2: follow-up state
  const [followUpQ, setFollowUpQ] = useState(null);
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [followUpFeedback, setFollowUpFeedback] = useState(null);

  // V2: retry counter
  const [retryCount, setRetryCount] = useState(0);

  const { role, type, difficulty, jobDescription } = config;

  // V3: dynamic question count from Settings (fallback 5)
  const totalQuestions = loadSettings().questionCount || 5;

  // ── Load next question ──────────────────────────────────────────────────────
  const loadQuestion = useCallback(
    async (sessionsSoFar = []) => {
      setError(null);
      setAnswer("");
      setFeedback(null);
      setFollowUpQ(null);
      setFollowUpAnswer("");
      setFollowUpFeedback(null);
      setShowHint(false);
      setShowImproved(false);
      setRetryCount(0);
      setState("loading-question");

      try {
        const { fetchQuestion } = await getApiModule();
        const previousQuestions = sessionsSoFar.map((s) => s.question);
        const q = await fetchQuestion(
          role,
          type,
          difficulty,
          previousQuestions,
          jobDescription,
        );
        setCurrentQ(q);
        setState("answering");
      } catch (e) {
        setError(e.message || "Failed to load question.");
        setState("idle");
      }
    },
    [role, type, difficulty, jobDescription],
  );

  // ── Start interview ─────────────────────────────────────────────────────────
  const startInterview = useCallback(() => {
    setQIndex(0);
    setSessions([]);
    setSummary(null);
    loadQuestion([]);
  }, [loadQuestion]);

  // ── Submit main answer ──────────────────────────────────────────────────────
  const submitAnswer = useCallback(async () => {
    if (!answer.trim() || !currentQ) return;
    setError(null);
    setState("evaluating");
    try {
      const { evaluateAnswer } = await getApiModule();
      const fb = await evaluateAnswer(
        currentQ.question,
        answer,
        role,
        type,
        difficulty,
      );
      setFeedback(fb);
      setState("feedback");
    } catch (e) {
      setError(e.message || "Failed to evaluate answer.");
      setState("answering");
    }
  }, [answer, currentQ, role, type, difficulty]);

  // ── V2: Retry same question ─────────────────────────────────────────────────
  const retryQuestion = useCallback(() => {
    setAnswer("");
    setFeedback(null);
    setShowHint(false);
    setShowImproved(false);
    setFollowUpQ(null);
    setFollowUpAnswer("");
    setFollowUpFeedback(null);
    setRetryCount((c) => c + 1);
    setState("answering");
  }, []);

  // ── V2: Load follow-up question ─────────────────────────────────────────────
  const loadFollowUp = useCallback(async () => {
    if (!feedback?.gaps?.length) return;
    setError(null);
    setState("followup-loading");
    try {
      const { fetchFollowUp } = await getApiModule();
      const result = await fetchFollowUp(
        currentQ.question,
        answer,
        feedback.gaps,
        role,
        difficulty,
      );
      setFollowUpQ(result);
      setState("followup-answering");
    } catch (e) {
      setError(e.message || "Failed to load follow-up.");
      setState("feedback");
    }
  }, [feedback, currentQ, answer, role, difficulty]);

  // ── V2: Submit follow-up answer ─────────────────────────────────────────────
  const submitFollowUp = useCallback(async () => {
    if (!followUpAnswer.trim() || !followUpQ) return;
    setError(null);
    setState("followup-evaluating");
    try {
      const { evaluateAnswer } = await getApiModule();
      const fb = await evaluateAnswer(
        followUpQ.followUp,
        followUpAnswer,
        role,
        type,
        difficulty,
      );
      setFollowUpFeedback(fb);
      setState("followup-feedback");
    } catch (e) {
      setError(e.message || "Failed to evaluate follow-up.");
      setState("followup-answering");
    }
  }, [followUpAnswer, followUpQ, role, type, difficulty]);

  // ── Next question or finish ─────────────────────────────────────────────────
  const nextQuestion = useCallback(async () => {
    const newSession = {
      question: currentQ.question,
      category: currentQ.category,
      answer,
      feedback,
      retryCount,
      followUpQ: followUpQ?.followUp || null,
      followUpAnswer: followUpAnswer || null,
      followUpFeedback,
    };
    const updatedSessions = [...sessions, newSession];
    setSessions(updatedSessions);

    if (updatedSessions.length >= totalQuestions) {
      // V3: was TOTAL_QUESTIONS
      setState("loading-question");
      try {
        const { fetchSessionSummary } = await getApiModule();
        const s = await fetchSessionSummary(
          updatedSessions,
          role,
          type,
          difficulty,
        );
        setSummary(s);
        setState("done");
      } catch (e) {
        // V3: navigate forward even if summary generation fails
        setError(e.message || "Failed to generate summary.");
        setSummary(null);
        setState("done");
      }
    } else {
      setQIndex((i) => i + 1);
      loadQuestion(updatedSessions);
    }
  }, [
    currentQ,
    answer,
    feedback,
    retryCount,
    followUpQ,
    followUpAnswer,
    followUpFeedback,
    sessions,
    role,
    type,
    difficulty,
    loadQuestion,
    totalQuestions,
  ]);

  const isFeedbackState = [
    "feedback",
    "followup-loading",
    "followup-answering",
    "followup-evaluating",
    "followup-feedback",
  ].includes(state);

  return {
    state,
    currentQ,
    qIndex,
    answer,
    setAnswer,
    feedback,
    sessions,
    summary,
    error,
    showHint,
    setShowHint,
    showImproved,
    setShowImproved,
    retryCount,
    followUpQ,
    followUpAnswer,
    setFollowUpAnswer,
    followUpFeedback,
    isFeedbackState,
    startInterview,
    submitAnswer,
    retryQuestion,
    loadFollowUp,
    submitFollowUp,
    nextQuestion,
    totalQuestions, // V3: dynamic from settings
  };
}
