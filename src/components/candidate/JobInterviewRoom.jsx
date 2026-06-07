// components/candidate/JobInterviewRoom.jsx
// Interview room for job-specific interviews (uses recruiter's questions)
import { useState, useEffect, useCallback } from "react";
import Card from "../ui/Card.jsx";
import Badge from "../ui/Badge.jsx";
import Button from "../ui/Button.jsx";
import DotLoader from "../ui/DotLoader.jsx";
import ScoreRing from "../ui/ScoreRing.jsx";
import ProgressBar from "../ui/ProgressBar.jsx";
import VoiceRecorder from "../ui/VoiceRecorder.jsx";
import Confetti from "../ui/Confetti.jsx";
import { useToast } from "../ui/Toast.jsx";
import {
  getJobQuestions,
  createApplication,
  completeApplication,
  saveApplicationAnswers,
} from "../../utils/db-recruiter.js";
import { sanitizeInput, sanitizeError, LIMITS } from "../../utils/sanitize.js";
import { loadSettings } from "../../utils/storage.js";
import { ROLES } from "../../utils/prompts.js";
import useDB from "../../hooks/useDB.js";

function getApiModule() {
  const provider = loadSettings().provider || "gemini";
  switch (provider) {
    case "gemini":
      return import("../../utils/api.js");
    case "openai":
      return import("../../utils/api-openai.js");
    default:
      return import("../../utils/api-claude.js");
  }
}

export default function JobInterviewRoom({ job, onComplete, onExit }) {
  const { db, userId, userEmail } = useDB();
  const toast = useToast();
  const settings = loadSettings();

  // State
  const [phase, setPhase] = useState("loading"); // loading|confirming|answering|evaluating|feedback|summary|done
  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [answers, setAnswers] = useState([]); // completed Q+A+feedback
  const [summary, setSummary] = useState(null);
  const [applicationId, setApplicationId] = useState(null);
  const [error, setError] = useState(null);
  const [showImproved, setShowImproved] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [candidateName, setCandidateName] = useState("");

  const currentQ = questions[qIndex];
  const progress = questions.length > 0 ? (qIndex / questions.length) * 100 : 0;
  const roleLabel = ROLES.find((r) => r.id === job.role)?.label || job.role;

  // Load questions on mount
  useEffect(() => {
    if (!db) return;
    (async () => {
      try {
        const qs = await getJobQuestions(db, job.id);
        if (!qs.length) {
          setError("This job has no questions set up yet.");
          setPhase("error");
          return;
        }
        setQuestions(qs);
        setPhase("confirming");
      } catch (e) {
        setError(sanitizeError(e));
        setPhase("error");
      }
    })();
  }, [db, job.id]);

  // Start interview — create application row
  const handleStartInterview = useCallback(async () => {
    setPhase("loading");
    try {
      const app = await createApplication(db, {
        jobId: job.id,
        candidateId: userId,
        candidateName: candidateName.trim() || null,
        candidateEmail: userEmail || null,
      });
      if (app.alreadyApplied) {
        toast.warn("You have already applied to this job.");
        setPhase("confirming");
        return;
      }
      setApplicationId(app.id);
      setPhase("answering");
    } catch (e) {
      setError(sanitizeError(e));
      setPhase("confirming");
    }
  }, [db, job.id, userId, candidateName, userEmail]);

  // Submit answer
  const handleSubmit = useCallback(async () => {
    if (!answer.trim() || !currentQ) return;
    setError(null);
    setPhase("evaluating");

    try {
      const { fetchJobEvaluation } = await getApiModule();
      const safeAnswer = sanitizeInput(answer, LIMITS.ANSWER);

      // Use job-specific evaluation if available, otherwise regular evaluation
      let fb;
      if (fetchJobEvaluation) {
        fb = await fetchJobEvaluation(
          currentQ.question_text,
          currentQ.ideal_answer || "",
          safeAnswer,
          job.role,
          job.difficulty,
        );
      } else {
        const { evaluateAnswer } = await getApiModule();
        fb = await evaluateAnswer(
          currentQ.question_text,
          safeAnswer,
          job.role,
          "technical",
          job.difficulty,
        );
      }
      setFeedback(fb);
      setPhase("feedback");
    } catch (e) {
      setError(sanitizeError(e));
      setPhase("answering");
    }
  }, [answer, currentQ, job.role, job.difficulty]);

  // Next question or finish
  const handleNext = useCallback(async () => {
    const completedAnswer = {
      questionId: currentQ.id,
      question: currentQ.question_text,
      answer: sanitizeInput(answer, LIMITS.ANSWER),
      feedback,
    };
    const updatedAnswers = [...answers, completedAnswer];
    setAnswers(updatedAnswers);
    setAnswer("");
    setFeedback(null);
    setShowImproved(false);

    if (updatedAnswers.length >= questions.length) {
      // All questions done — generate summary
      setPhase("loading");
      try {
        const { fetchJobSummary } = await getApiModule();
        let s = null;
        if (fetchJobSummary) {
          s = await fetchJobSummary(
            updatedAnswers,
            job.role,
            job.title,
            job.pass_threshold,
          );
        } else {
          // Compute simple summary
          const avg =
            updatedAnswers.reduce((a, c) => a + (c.feedback?.score || 0), 0) /
            updatedAnswers.length;
          s = {
            overallScore: Number(avg.toFixed(1)),
            passed: avg >= job.pass_threshold,
            hiringVerdict:
              avg >= 8
                ? "Strong Hire"
                : avg >= job.pass_threshold
                  ? "Hire"
                  : avg >= 5
                    ? "Maybe"
                    : "No Hire",
            topStrengths: [],
            concerns: [],
            recommendation:
              avg >= job.pass_threshold
                ? "Candidate met the pass threshold."
                : "Candidate did not meet the pass threshold.",
          };
        }

        // Save to database
        if (applicationId) {
          await Promise.all([
            completeApplication(db, applicationId, {
              score: s.overallScore,
              passed: s.passed,
              summary: s,
            }),
            saveApplicationAnswers(
              db,
              applicationId,
              job.id,
              userId,
              updatedAnswers,
            ),
          ]);
        }

        setSummary(s);
        if (s.passed) setShowConfetti(true);
        setPhase("summary");
      } catch (e) {
        setError(sanitizeError(e));
        setPhase("summary");
      }
    } else {
      setQIndex((i) => i + 1);
      setPhase("answering");
    }
  }, [
    currentQ,
    answer,
    feedback,
    answers,
    questions.length,
    job,
    applicationId,
    db,
    userId,
  ]);

  const scoreColor = (s) =>
    s >= 8
      ? "text-success"
      : s >= 6
        ? "text-accent"
        : s >= 4
          ? "text-warn"
          : "text-danger";

  // ── Confirm screen ─────────────────────────────────────────────────────────
  if (phase === "confirming") {
    return (
      <div className="min-h-screen bg-grid flex items-center justify-center px-4">
        <div className="relative z-10 w-full max-w-lg">
          <Card glow className="p-8">
            <div className="text-center mb-6">
              <div
                className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20
                flex items-center justify-center text-3xl mx-auto mb-4"
              >
                🏢
              </div>
              <h1 className="font-display text-2xl font-extrabold text-text mb-1">
                {job.title}
              </h1>
              <p className="text-muted text-sm">{job.companies?.name}</p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Role</span>
                <Badge color="accent">{roleLabel}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Level</span>
                <Badge color="gold">{job.difficulty}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Questions</span>
                <span className="text-text font-mono">{questions.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Pass score</span>
                <span className="text-success font-mono font-bold">
                  ≥ {job.pass_threshold}/10
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-warn/5 border border-warn/20 mb-6">
              <p className="text-xs text-warn/80 font-mono">
                ⚠ You can only attempt this interview once. Your answers will be
                sent to the recruiter.
              </p>
            </div>

            {/* Optional name */}
            <div className="mb-6">
              <label className="text-xs font-mono text-muted block mb-1.5">
                Your name (shown to recruiter)
              </label>
              <input
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="Enter your name..."
                maxLength={100}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-card
                  font-body text-sm text-text placeholder:text-muted
                  outline-none focus:border-accent"
              />
            </div>

            {error && (
              <p className="text-danger text-sm font-mono mb-4">⚠️ {error}</p>
            )}

            <div className="flex gap-3">
              <Button variant="ghost" onClick={onExit} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleStartInterview}
                className="flex-1"
                size="lg"
              >
                Start Interview →
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ── Summary screen ─────────────────────────────────────────────────────────
  if (phase === "summary" && summary) {
    const passed = summary.passed;
    return (
      <div className="min-h-screen bg-grid relative">
        <Confetti show={showConfetti} />
        <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">
          <div className="text-center mb-8 animate-fade-in">
            <div className={`text-6xl mb-4`}>{passed ? "🎉" : "📝"}</div>
            <h1 className="font-display text-3xl font-extrabold text-text mb-2">
              {passed ? "You Passed!" : "Interview Complete"}
            </h1>
            <p className="text-muted">
              {passed
                ? "You met the pass threshold. The recruiter has been notified."
                : `You needed ${job.pass_threshold}/10 to pass. Keep practicing!`}
            </p>
          </div>

          <Card glow={passed} className="p-8 mb-6 animate-slide-up">
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <ScoreRing score={Number(summary.overallScore)} size={130} />
              <div className="flex-1 text-center sm:text-left">
                <div
                  className={`font-display text-2xl font-extrabold mb-2
                  ${passed ? "text-success" : "text-text"}`}
                >
                  {summary.hiringVerdict}
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                  <Badge color={passed ? "success" : "danger"}>
                    {passed ? "✓ Passed" : "✕ Below threshold"}
                  </Badge>
                  <Badge color="muted">
                    Threshold: {job.pass_threshold}/10
                  </Badge>
                </div>
                {summary.recommendation && (
                  <p className="text-muted text-sm mt-3 italic leading-relaxed">
                    "{summary.recommendation}"
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Per-question scores */}
          <div className="space-y-3 mb-6 animate-slide-up stagger-2">
            <h2 className="font-display font-bold text-base text-text">
              Your Answers
            </h2>
            {answers.map((a, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-sm text-text/80 flex-1">{a.question}</p>
                  <span
                    className={`font-mono font-bold text-sm shrink-0 ${scoreColor(a.feedback?.score)}`}
                  >
                    {a.feedback?.score ?? "—"}/10
                  </span>
                </div>
                <ProgressBar
                  value={(a.feedback?.score || 0) * 10}
                  color={
                    (a.feedback?.score || 0) >= 8
                      ? "success"
                      : (a.feedback?.score || 0) >= 6
                        ? "accent"
                        : (a.feedback?.score || 0) >= 4
                          ? "warn"
                          : "danger"
                  }
                  height="h-1"
                />
              </Card>
            ))}
          </div>

          <Button onClick={onComplete} className="w-full" size="lg">
            {passed ? "← Back to Job Board" : "🔄 Practice More & Try Again"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Main interview ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-grid relative">
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2
        w-[600px] h-64 bg-accent/5 blur-[100px] rounded-full"
      />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {/* Top bar */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={onExit}
              className="text-muted hover:text-text transition-colors text-sm font-mono"
            >
              ← Exit
            </button>
            <span className="text-border">|</span>
            <Badge color="accent">{roleLabel}</Badge>
            <Badge color="gold">{job.difficulty}</Badge>
            <Badge color="muted">🏢 {job.companies?.name || "Company"}</Badge>
          </div>
          <span className="text-muted text-xs font-mono">
            {Math.min(qIndex + 1, questions.length)} / {questions.length}
          </span>
        </header>

        <ProgressBar
          value={progress}
          color="accent"
          height="h-1"
          className="mb-8"
        />

        {error && (
          <Card className="p-4 border-danger/30 bg-danger/5 mb-5">
            <p className="text-danger text-sm font-mono">⚠️ {error}</p>
          </Card>
        )}

        {phase === "loading" && (
          <Card className="p-16 flex items-center justify-center">
            <DotLoader
              label={
                answers.length >= questions.length - 1
                  ? "Calculating your results..."
                  : "Loading next question..."
              }
            />
          </Card>
        )}

        {(phase === "answering" ||
          phase === "evaluating" ||
          phase === "feedback") &&
          currentQ && (
            <div className="space-y-5 animate-fade-in">
              {/* Question */}
              <Card glow className="p-6">
                <p className="font-display text-xl font-semibold text-text leading-relaxed">
                  {currentQ.question_text}
                </p>
                {currentQ.weight > 1 && (
                  <div className="mt-3">
                    <Badge color="gold">Weight: {currentQ.weight}×</Badge>
                  </div>
                )}
              </Card>

              {/* Answer input */}
              {(phase === "answering" || phase === "evaluating") && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-mono text-muted">
                      Your Answer
                    </label>
                    {settings.voiceEnabled && (
                      <VoiceRecorder
                        onTranscript={(t) =>
                          setAnswer((p) => (p ? `${p} ${t}` : t))
                        }
                        disabled={phase !== "answering"}
                      />
                    )}
                  </div>
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    disabled={phase !== "answering"}
                    rows={7}
                    maxLength={LIMITS.ANSWER}
                    placeholder="Type your answer here..."
                    className={`w-full px-4 py-3 rounded-xl border bg-card font-body
                    text-sm text-text placeholder:text-muted outline-none
                    transition-all duration-200 resize-none
                    focus:border-accent focus:shadow-[0_0_0_3px_rgba(0,194,255,0.08)]
                    disabled:opacity-60
                    ${phase !== "answering" ? "border-border" : "border-border-light"}`}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs font-mono text-muted">
                      {answer.trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                    <span className="text-xs font-mono text-muted">
                      {answer.length}/{LIMITS.ANSWER}
                    </span>
                  </div>
                </div>
              )}

              {phase === "answering" && (
                <Button
                  onClick={handleSubmit}
                  disabled={answer.trim().length < 10}
                  className="w-full"
                  size="lg"
                >
                  Submit Answer
                </Button>
              )}

              {phase === "evaluating" && (
                <Card className="p-8 flex items-center justify-center">
                  <DotLoader label="Evaluating your answer..." />
                </Card>
              )}

              {/* Feedback */}
              {phase === "feedback" && feedback && (
                <div className="space-y-4 animate-slide-up">
                  <Card className="p-6">
                    <div className="flex items-center gap-8">
                      <ScoreRing score={feedback.score} size={100} />
                      <div className="flex-1 space-y-3">
                        {feedback.strengths?.length > 0 && (
                          <div>
                            <div className="text-xs font-mono text-success mb-1.5">
                              ✓ Strengths
                            </div>
                            {feedback.strengths.map((s, i) => (
                              <div
                                key={i}
                                className="text-sm text-text/80 flex gap-2 mb-1"
                              >
                                <span className="text-success shrink-0">+</span>
                                {s}
                              </div>
                            ))}
                          </div>
                        )}
                        {feedback.gaps?.length > 0 && (
                          <div>
                            <div className="text-xs font-mono text-danger mb-1.5">
                              ✗ Gaps
                            </div>
                            {feedback.gaps.map((g, i) => (
                              <div
                                key={i}
                                className="text-sm text-text/80 flex gap-2 mb-1"
                              >
                                <span className="text-danger shrink-0">−</span>
                                {g}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>

                  {feedback.improvedAnswer && (
                    <Card className="p-4">
                      <button
                        onClick={() => setShowImproved((v) => !v)}
                        className="w-full flex items-center justify-between
                        text-sm font-mono text-muted hover:text-accent transition-colors"
                      >
                        <span>💬 See improved answer</span>
                        <span>{showImproved ? "▲" : "▼"}</span>
                      </button>
                      {showImproved && (
                        <p
                          className="mt-3 text-sm text-text/80 leading-relaxed
                        border-t border-border pt-3"
                        >
                          {feedback.improvedAnswer}
                        </p>
                      )}
                    </Card>
                  )}

                  <Button onClick={handleNext} className="w-full" size="lg">
                    {answers.length + 1 >= questions.length
                      ? "Finish Interview →"
                      : `Next Question → (${answers.length + 1}/${questions.length})`}
                  </Button>
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
