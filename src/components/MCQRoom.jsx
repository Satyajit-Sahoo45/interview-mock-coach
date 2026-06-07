import { useState, useEffect, useCallback } from "react";
import Card from "./ui/Card";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import DotLoader from "./ui/DotLoader";
import MCQOption from "./ui/MCQOption";
import Confetti from "./ui/Confetti";
import ProgressBar from "./ui/Progressbar";
import { useToast } from "./ui/Toast";
import { ROLES } from "../utils/prompts";
import { loadSettings } from "../utils/storage";
import { saveMCQSessionToDB } from "../utils/db";
import useDB from "../hooks/useDB";

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

const TOTAL_QUESTIONS = 10;

export default function MCQRoom({ config, onComplete, onExit }) {
  const toast = useToast();
  const { db, userId } = useDB();

  const [phase, setPhase] = useState("loading");
  const [currentQ, setCurrentQ] = useState(null);
  const [qIndex, setQIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [timer, setTimer] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [saving, setSaving] = useState(false);

  const roleLabel =
    ROLES.find((r) => r.id === config.role)?.label || config.role;
  const progress = (qIndex / TOTAL_QUESTIONS) * 100;

  // --------- Timer ------------------------
  useEffect(() => {
    if (!timerActive || phase !== "answering") return;
    if (timer <= 0) {
      handleTimeout();
      return;
    }
    const t = setTimeout(() => setTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timer, timerActive, phase]);

  useEffect(() => {
    loadQuestion([]);
  }, []);

  const loadQuestion = useCallback(
    async (resultsSoFar) => {
      setError(null);
      setSelectedIndex(null);
      setShowExplanation(false);
      setPhase("loading");
      setTimer(60);
      setTimerActive(false);

      try {
        const { fetchMCQQuestion } = await getApiModule();
        const previousQuestions = resultsSoFar.map((r) => r.question);
        const q = await fetchMCQQuestion(
          roleLabel,
          config.difficulty,
          previousQuestions,
          config.jobDescription || "",
        );
        setCurrentQ(q);
        setPhase("answering");
        setTimerActive(true);
      } catch (e) {
        setError(e.message || "Failed to load question.");
        setPhase("answering");
      }
    },
    [roleLabel, config.difficulty, config.jobDescription],
  );

  const handleSelect = useCallback(
    (optionIndex) => {
      if (phase !== "answering" || selectedIndex !== null) return;
      setTimerActive(false);
      setSelectedIndex(optionIndex);
      const correct = optionIndex === currentQ.correctIndex;
      if (correct) toast.success("✓ Correct!");
      else toast.warn("✕ Wrong — check the explanation.");
      setPhase("revealed");
    },
    [phase, selectedIndex, currentQ],
  );

  const handleTimeout = useCallback(() => {
    setTimerActive(false);
    setSelectedIndex(-1);
    toast.warn("⏱ Time's up!");
    setPhase("revealed");
  }, []);

  // ------------ Next question or finish --------------------
  const handleNext = useCallback(async () => {
    if (!currentQ) return;

    const result = {
      question: currentQ.question,
      category: currentQ.category,
      options: currentQ.options,
      correctIndex: currentQ.correctIndex,
      selectedIndex: selectedIndex,
      correct: selectedIndex === currentQ.correctIndex,
      timedOut: selectedIndex === -1,
      explanation: currentQ.explanation,
    };

    const updatedResults = [...results, result];
    setResults(updatedResults);

    if (updatedResults.length >= TOTAL_QUESTIONS) {
      setPhase("loading");
      try {
        // 1. Generate AI summary
        const { fetchMCQSummary } = await getApiModule();
        const s = await fetchMCQSummary(
          updatedResults,
          roleLabel,
          config.difficulty,
        );
        setSummary(s);

        // 2. ---------- SAVE TO SUPABASE ------------------
        if (db && userId) {
          setSaving(true);
          try {
            await saveMCQSessionToDB(db, {
              userId,
              config,
              results: updatedResults,
              summary: s,
            });
            toast.success("Quiz saved to your history!");
          } catch (saveErr) {
            // Non-blocking — quiz result still shows even if save fails
            console.warn("MCQ save failed:", saveErr.message);
            toast.warn("Could not save to cloud: " + saveErr.message);
          } finally {
            setSaving(false);
          }
        } else {
          // db not ready — this is why intermittent saves fail
          console.warn("MCQ save skipped: db or userId not available", {
            db: !!db,
            userId,
          });
          toast.warn("Not signed in — quiz not saved to cloud.");
        }
        // -------- END SAVE ---------------

        if (s.percentage >= 70) setShowConfetti(true);
        setPhase("summary");
      } catch (e) {
        setSummary(null);
        setPhase("summary");
      }
    } else {
      setQIndex((i) => i + 1);
      loadQuestion(updatedResults);
    }
  }, [
    currentQ,
    selectedIndex,
    results,
    roleLabel,
    config,
    db,
    userId,
    loadQuestion,
  ]);

  const handleFinish = () => onComplete(results, summary);

  const getOptionState = (optionIndex) => {
    if (phase === "answering") {
      return selectedIndex === optionIndex ? "selected" : "default";
    }
    if (phase === "revealed" || phase === "summary") {
      if (optionIndex === currentQ?.correctIndex) {
        return selectedIndex === optionIndex ? "correct" : "reveal-correct";
      }
      if (optionIndex === selectedIndex) return "wrong";
      return "default";
    }
    return "default";
  };

  const correctCount = results.filter((r) => r.correct).length;
  const timerColor =
    timer > 20 ? "text-success" : timer > 10 ? "text-warn" : "text-danger";
  const timerBarColor = timer > 20 ? "success" : timer > 10 ? "warn" : "danger";

  return (
    <div className="min-h-screen bg-grid relative">
      <Confetti show={showConfetti} />
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2
        w-[600px] h-64 bg-accent/5 blur-[100px] rounded-full"
      />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {/* ── Top Bar ── */}
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
            <Badge color="gold">{config.difficulty}</Badge>
            <Badge color="muted">🎯 MCQ Quiz</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-mono text-muted">Score</div>
              <div className="text-sm font-display font-bold text-accent">
                {correctCount}/{results.length || 0}
              </div>
            </div>
            <div className="text-muted text-xs font-mono">
              {Math.min(qIndex + 1, TOTAL_QUESTIONS)} / {TOTAL_QUESTIONS}
            </div>
          </div>
        </header>

        {/* ── Progress bar ── */}
        <ProgressBar
          value={progress}
          color="accent"
          height="h-1"
          className="mb-6"
        />

        {/* ── Error ── */}
        {error && (
          <Card className="p-4 border-danger/30 bg-danger/5 mb-5">
            <p className="text-danger text-sm font-mono">⚠️ {error}</p>
            <button
              onClick={() => loadQuestion(results)}
              className="text-accent text-xs font-mono mt-2 hover:underline"
            >
              Try again →
            </button>
          </Card>
        )}

        {/* ── Loading ── */}
        {phase === "loading" && !error && (
          <Card className="p-16 flex items-center justify-center">
            <DotLoader
              label={
                saving
                  ? "Saving your quiz to cloud..."
                  : results.length >= TOTAL_QUESTIONS
                    ? "Generating your results..."
                    : `Loading question ${qIndex + 1}...`
              }
            />
          </Card>
        )}

        {/* ── Question ── */}
        {(phase === "answering" || phase === "revealed") && currentQ && (
          <div className="space-y-4 animate-fade-in">
            {/* Category + timer */}
            <div className="flex items-center justify-between">
              <Badge color="muted">{currentQ.category}</Badge>

              {phase === "answering" && (
                <div className="flex items-center gap-2">
                  <div
                    className={`font-mono font-bold text-lg tabular-nums ${timerColor}`}
                  >
                    {timer}s
                  </div>
                  <div className="w-20">
                    <ProgressBar
                      value={(timer / 30) * 100}
                      color={timerBarColor}
                      height="h-1.5"
                      animated={timer <= 10}
                    />
                  </div>
                </div>
              )}

              {phase === "revealed" && (
                <Badge
                  color={
                    selectedIndex === currentQ.correctIndex
                      ? "success"
                      : "danger"
                  }
                >
                  {selectedIndex === -1
                    ? "⏱ Timed out"
                    : selectedIndex === currentQ.correctIndex
                      ? "✓ Correct"
                      : "✕ Wrong"}
                </Badge>
              )}
            </div>

            {/* Question card */}
            <Card glow className="p-6">
              <p className="font-display text-xl font-semibold text-text leading-relaxed">
                {currentQ.question}
              </p>
            </Card>

            {/* Options */}
            <div className="space-y-2.5">
              {currentQ.options.map((option, i) => (
                <MCQOption
                  key={i}
                  index={i}
                  text={option}
                  state={getOptionState(i)}
                  onClick={() => handleSelect(i)}
                  disabled={phase !== "answering"}
                />
              ))}
            </div>

            {/* Explanation */}
            {phase === "revealed" && currentQ.explanation && (
              <div className="animate-slide-up">
                <button
                  onClick={() => setShowExplanation((v) => !v)}
                  className="text-xs font-mono text-muted hover:text-accent
                    transition-colors flex items-center gap-1 mb-2"
                >
                  {showExplanation
                    ? "▼ Hide explanation"
                    : "▶ Show explanation"}
                </button>
                {showExplanation && (
                  <Card className="p-4 border-accent/20 bg-accent/5">
                    <p className="text-sm text-text/80 leading-relaxed">
                      💡 {currentQ.explanation}
                    </p>
                  </Card>
                )}
              </div>
            )}

            {/* Next button */}
            {phase === "revealed" && (
              <Button onClick={handleNext} className="w-full" size="lg">
                {results.length + 1 >= TOTAL_QUESTIONS
                  ? "Finish Quiz & See Results →"
                  : `Next Question → (${results.length + 1}/${TOTAL_QUESTIONS})`}
              </Button>
            )}
          </div>
        )}

        {/* ── Summary ── */}
        {phase === "summary" && (
          <MCQSummary
            results={results}
            summary={summary}
            roleLabel={roleLabel}
            difficulty={config.difficulty}
            onFinish={handleFinish}
            onRetry={() => {
              setResults([]);
              setQIndex(0);
              setSummary(null);
              setShowConfetti(false);
              loadQuestion([]);
            }}
          />
        )}
      </div>
    </div>
  );
}

// ----------------- MCQ Summary -----------------
function MCQSummary({
  results,
  summary,
  roleLabel,
  difficulty,
  onFinish,
  onRetry,
}) {
  const [expandedQ, setExpandedQ] = useState(null);
  const correct = results.filter((r) => r.correct).length;
  const wrong = results.filter((r) => !r.correct && !r.timedOut).length;
  const timedOut = results.filter((r) => r.timedOut).length;
  const pct =
    summary?.percentage ?? Math.round((correct / results.length) * 100);

  const ringColor =
    pct >= 80
      ? "#00E676"
      : pct >= 60
        ? "#00C2FF"
        : pct >= 40
          ? "#FF9800"
          : "#FF4D6A";

  const rating =
    summary?.rating ||
    (pct >= 80
      ? "Excellent"
      : pct >= 60
        ? "Good"
        : pct >= 40
          ? "Average"
          : "Needs Work");

  const ratingColor =
    rating === "Excellent"
      ? "text-success"
      : rating === "Good"
        ? "text-accent"
        : rating === "Average"
          ? "text-warn"
          : "text-danger";

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Score card */}
      <Card glow className="p-8">
        <div className="flex flex-col sm:flex-row items-center gap-8">
          <div className="flex flex-col items-center gap-2 shrink-0">
            <svg width="120" height="120" viewBox="0 0 140 140">
              <circle
                cx="70"
                cy="70"
                r="60"
                fill="none"
                stroke="#1C1E30"
                strokeWidth="12"
              />
              <circle
                cx="70"
                cy="70"
                r="60"
                fill="none"
                stroke={ringColor}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 60}`}
                strokeDashoffset={`${2 * Math.PI * 60 * (1 - pct / 100)}`}
                transform="rotate(-90 70 70)"
                style={{
                  transition: "stroke-dashoffset 1s ease",
                  filter: `drop-shadow(0 0 8px ${ringColor}88)`,
                }}
              />
              <text
                x="70"
                y="65"
                textAnchor="middle"
                fill="#EDF0FF"
                fontSize="26"
                fontWeight="700"
                fontFamily="Bricolage Grotesque"
              >
                {pct}%
              </text>
              <text
                x="70"
                y="83"
                textAnchor="middle"
                fill="#5A6080"
                fontSize="11"
                fontFamily="Plus Jakarta Sans"
              >
                {correct}/{results.length} correct
              </text>
            </svg>
            <span className={`text-sm font-mono font-bold ${ratingColor}`}>
              {rating}
            </span>
          </div>

          <div className="flex-1 space-y-3 text-center sm:text-left">
            <div className="font-display text-2xl font-extrabold text-text">
              Quiz Complete!
            </div>
            <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
              <StatPill
                icon="✓"
                label="Correct"
                value={correct}
                color="text-success"
              />
              <StatPill
                icon="✕"
                label="Wrong"
                value={wrong}
                color="text-danger"
              />
              {timedOut > 0 && (
                <StatPill
                  icon="⏱"
                  label="Timed out"
                  value={timedOut}
                  color="text-warn"
                />
              )}
            </div>
            {/* Saved to cloud indicator */}
            <div className="flex items-center gap-1.5 justify-center sm:justify-start">
              <span className="text-xs font-mono text-success">
                ✓ Saved to your history
              </span>
            </div>
            {summary?.motivationalNote && (
              <p className="text-muted text-sm italic leading-relaxed">
                "{summary.motivationalNote}"
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Strong + Weak areas */}
      {(summary?.strongAreas?.length > 0 || summary?.weakAreas?.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {summary?.strongAreas?.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-success text-lg">✦</span>
                <span className="font-display font-bold text-sm text-success">
                  Strong Areas
                </span>
              </div>
              <ul className="space-y-1.5">
                {summary.strongAreas.map((a, i) => (
                  <li key={i} className="text-sm text-text/80 flex gap-2">
                    <span className="text-success shrink-0">+</span>
                    {a}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {summary?.weakAreas?.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-warn text-lg">⚡</span>
                <span className="font-display font-bold text-sm text-warn">
                  Weak Areas
                </span>
              </div>
              <ul className="space-y-1.5">
                {summary.weakAreas.map((a, i) => (
                  <li key={i} className="text-sm text-text/80 flex gap-2">
                    <span className="text-warn shrink-0">→</span>
                    {a}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* Study topics */}
      {summary?.studyTopics?.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-accent text-lg">📚</span>
            <span className="font-display font-bold text-sm text-accent">
              Study These Topics
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.studyTopics.map((t, i) => (
              <Badge key={i} color="accent">
                {t}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Question review */}
      <div>
        <h2 className="font-display font-bold text-base text-text mb-3">
          Question Review
        </h2>
        <div className="space-y-2">
          {results.map((r, i) => {
            const isOpen = expandedQ === i;
            return (
              <Card key={i} className="overflow-hidden">
                <button
                  onClick={() => setExpandedQ(isOpen ? null : i)}
                  className="w-full flex items-center gap-3 p-3.5 text-left
                    hover:bg-white/[0.02] transition-colors"
                >
                  <span
                    className={`
                    w-6 h-6 rounded-full flex items-center justify-center
                    text-xs font-bold shrink-0
                    ${
                      r.correct
                        ? "bg-success/20 text-success"
                        : r.timedOut
                          ? "bg-warn/20 text-warn"
                          : "bg-danger/20 text-danger"
                    }
                  `}
                  >
                    {r.correct ? "✓" : r.timedOut ? "⏱" : "✕"}
                  </span>
                  <span className="text-sm text-text/80 flex-1 text-left truncate">
                    {r.question}
                  </span>
                  <Badge color="muted" className="shrink-0">
                    {r.category}
                  </Badge>
                  <span className="text-muted text-xs shrink-0">
                    {isOpen ? "▲" : "▼"}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-border p-4 space-y-3 animate-fade-in">
                    <div className="space-y-2">
                      {r.options.map((opt, j) => (
                        <MCQOption
                          key={j}
                          index={j}
                          text={opt}
                          state={
                            j === r.correctIndex && j === r.selectedIndex
                              ? "correct"
                              : j === r.correctIndex
                                ? "reveal-correct"
                                : j === r.selectedIndex
                                  ? "wrong"
                                  : "default"
                          }
                          disabled
                        />
                      ))}
                    </div>
                    {r.explanation && (
                      <Card className="p-3 border-accent/20 bg-accent/5">
                        <p className="text-xs text-text/70 leading-relaxed">
                          💡 {r.explanation}
                        </p>
                      </Card>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button onClick={onRetry} variant="ghost" size="lg">
          🔄 Retry Quiz
        </Button>
        <Button onClick={onFinish} variant="primary" size="lg">
          ← Back to Home
        </Button>
      </div>
    </div>
  );
}

function StatPill({ icon, label, value, color }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-subtle/50 border border-border">
      <span className={`text-sm font-bold ${color}`}>
        {icon} {value}
      </span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}
