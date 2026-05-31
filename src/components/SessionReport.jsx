import { useState } from "react";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import Card from "./ui/Card";
import ScoreRing from "./ui/ScoreRing";
import { ROLES, INTERVIEW_TYPES } from "../utils/prompts";
import { useToast } from "./ui/Toast";
import ProgressBar from "./ui/Progressbar";
import Confetti from "./ui/Confetti";

export default function SessionReport({
  sessions,
  summary,
  config,
  onRestart,
  onHistory,
}) {
  const [expandedQ, setExpandedQ] = useState(null);
  const toast = useToast();

  const roleLabel =
    ROLES.find((r) => r.id === config?.role)?.label || config?.role || "";
  const typeLabel =
    INTERVIEW_TYPES.find((t) => t.id === config?.type)?.label ||
    config?.type ||
    "";

  const avgScore =
    summary?.overallScore ??
    (sessions.length
      ? (
          sessions.reduce((acc, s) => acc + (s.feedback?.score || 0), 0) /
          sessions.length
        ).toFixed(1)
      : 0);

  const isGreatScore = avgScore >= 1;

  const ratingColor = (r) =>
    r === "Excellent"
      ? "success"
      : r === "Good"
        ? "accent"
        : r === "Average"
          ? "warn"
          : "danger";

  const scoreColor = (s) =>
    s >= 8
      ? "text-success"
      : s >= 6
        ? "text-accent"
        : s >= 4
          ? "text-warn"
          : "text-danger";

  const handleExport = () => {
    const text = [
      `🎯 Interview Report — ${roleLabel} | ${typeLabel} | ${config?.difficulty}`,
      `Overall Score: ${avgScore}/10 — ${summary?.overallRating}`,
      "",
      ...sessions.map((s, i) =>
        [
          `Q${i + 1}: ${s.question}`,
          `Answer: ${s.answer}`,
          `Score: ${s.feedback?.score}/10`,
          s.followUpQ ? `Follow-up: ${s.followUpQ}` : "",
          "",
        ]
          .filter(Boolean)
          .join("\n"),
      ),
      summary?.motivationalNote ? `\n"${summary.motivationalNote}"` : "",
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = `interview-report-${Date.now()}.txt`;
    a.click();
    toast.success("Report downloaded!");
  };

  return (
    <div className="min-h-screen bg-grid relative overflow-hidden">
      {/* V3: Confetti for great scores */}
      <Confetti show={isGreatScore} />

      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-72
        bg-accent/4 blur-[120px] rounded-full"
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12">
        {/* ── Header ── */}
        <div className="text-center mb-12 animate-fade-in">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
            border border-success/20 bg-success/5 text-success text-xs font-mono mb-5"
          >
            ✓ Session Complete
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold mb-3">
            Your Interview <span className="text-gradient-accent">Report</span>
          </h1>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Badge color="accent">{roleLabel}</Badge>
            <Badge color="muted">{typeLabel}</Badge>
            <Badge color="gold">{config?.difficulty}</Badge>
            <Badge color="muted">{sessions.length} questions</Badge>
            {config?.jobDescription && (
              <Badge color="success">📋 JD Tailored</Badge>
            )}
          </div>
        </div>

        {/* ── Overall Score ── */}
        <Card glow className="p-8 mb-6 animate-slide-up">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <ScoreRing score={Number(avgScore)} size={140} />
            <div className="flex-1 text-center sm:text-left">
              <div className="text-muted text-xs font-mono mb-2">
                Overall Performance
              </div>
              <div className="font-display text-3xl font-extrabold text-text mb-1">
                {summary?.overallRating || "Review Complete"}
              </div>
              {/* V3: progress bar for overall score */}
              <ProgressBar
                value={avgScore * 10}
                color={isGreatScore ? "success" : "accent"}
                height="h-2"
                className="mb-3"
              />
              {summary?.motivationalNote && (
                <p className="text-muted text-sm leading-relaxed mt-3 italic">
                  "{summary.motivationalNote}"
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* ── Strengths + Improvements ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 animate-slide-up stagger-2">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-success text-lg">✦</span>
              <span className="font-display font-bold text-sm text-success">
                Top Strengths
              </span>
            </div>
            {summary?.topStrengths?.length > 0 ? (
              <ul className="space-y-2">
                {summary.topStrengths.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-text/80">
                    <span className="text-success/60 shrink-0 font-mono text-xs mt-0.5">
                      0{i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted text-sm">No summary available.</p>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-warn text-lg">⚡</span>
              <span className="font-display font-bold text-sm text-warn">
                Key Improvements
              </span>
            </div>
            {summary?.criticalImprovements?.length > 0 ? (
              <ul className="space-y-2">
                {summary.criticalImprovements.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-text/80">
                    <span className="text-warn/60 shrink-0 font-mono text-xs mt-0.5">
                      0{i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted text-sm">No improvements listed.</p>
            )}
          </Card>
        </div>

        {/* ── Study Topics ── */}
        {summary?.studyTopics?.length > 0 && (
          <Card className="p-5 mb-6 animate-slide-up stagger-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-accent text-lg">📚</span>
              <span className="font-display font-bold text-sm text-accent">
                Recommended Study Topics
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

        {/* ── Score Chart ── */}
        <Card className="p-5 mb-6 animate-slide-up stagger-4">
          <div className="font-display font-bold text-sm text-muted mb-4">
            Score per Question
          </div>
          <div className="flex items-end gap-2 h-24">
            {sessions.map((s, i) => {
              const score = s.feedback?.score ?? 0;
              const color =
                score >= 8
                  ? "#00E676"
                  : score >= 6
                    ? "#00C2FF"
                    : score >= 4
                      ? "#FF9800"
                      : "#FF4D6A";
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div className="text-xs font-mono" style={{ color }}>
                    {score}
                  </div>
                  <div
                    className="w-full rounded-t-sm"
                    style={{
                      height: `${Math.max((score / 10) * 70, 4)}px`,
                      background: color,
                      opacity: 0.8,
                      boxShadow: `0 0 8px ${color}66`,
                      minHeight: "4px",
                    }}
                  />
                  <div className="text-muted text-xs font-mono">Q{i + 1}</div>
                  {/* V2: show follow-up/retry indicators */}
                  <div className="flex gap-0.5">
                    {s.followUpQ && (
                      <span title="Had follow-up" className="text-[8px]">
                        💬
                      </span>
                    )}
                    {s.retryCount > 0 && (
                      <span
                        title={`Retried ${s.retryCount}x`}
                        className="text-[8px]"
                      >
                        🔄
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ── Per-Question Breakdown ── */}
        <div className="mb-8 animate-slide-up stagger-5">
          <h2 className="font-display font-bold text-lg text-text mb-4">
            Question Breakdown
          </h2>
          <div className="space-y-3">
            {sessions.map((s, i) => {
              const score = s.feedback?.score ?? 0;
              const rating = s.feedback?.rating ?? "N/A";
              const isOpen = expandedQ === i;

              return (
                <Card key={i} className="overflow-hidden">
                  <button
                    onClick={() => setExpandedQ(isOpen ? null : i)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-muted font-mono text-xs shrink-0">
                        Q{i + 1}
                      </span>
                      <span className="text-sm text-text truncate">
                        {s.question}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      {s.followUpQ && <Badge color="gold">💬</Badge>}
                      {s.retryCount > 0 && (
                        <Badge color="warn">🔄{s.retryCount}</Badge>
                      )}
                      <Badge color={ratingColor(rating)}>{rating}</Badge>
                      <span
                        className={`font-mono font-bold text-sm ${scoreColor(score)}`}
                      >
                        {score}/10
                      </span>
                      <span className="text-muted text-xs">
                        {isOpen ? "▲" : "▼"}
                      </span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-border p-4 space-y-4 animate-fade-in">
                      {s.category && <Badge color="muted">{s.category}</Badge>}

                      {/* User answer */}
                      <div>
                        <div className="text-xs font-mono text-muted mb-2">
                          Your Answer
                        </div>
                        <p className="text-sm text-text/70 leading-relaxed bg-subtle/40 rounded-lg p-3">
                          {s.answer}
                        </p>
                      </div>

                      {/* V3: score bar per question */}
                      <ProgressBar
                        value={score * 10}
                        color={
                          score >= 8
                            ? "success"
                            : score >= 6
                              ? "accent"
                              : score >= 4
                                ? "warn"
                                : "danger"
                        }
                        height="h-1.5"
                        showLabel
                      />

                      {/* Feedback */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {s.feedback?.strengths?.length > 0 && (
                          <div>
                            <div className="text-xs font-mono text-success mb-1.5">
                              ✓ Strengths
                            </div>
                            <ul className="space-y-1">
                              {s.feedback.strengths.map((str, j) => (
                                <li
                                  key={j}
                                  className="text-xs text-text/70 flex gap-1.5"
                                >
                                  <span className="text-success shrink-0">
                                    +
                                  </span>
                                  {str}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {s.feedback?.gaps?.length > 0 && (
                          <div>
                            <div className="text-xs font-mono text-danger mb-1.5">
                              ✗ Gaps
                            </div>
                            <ul className="space-y-1">
                              {s.feedback.gaps.map((g, j) => (
                                <li
                                  key={j}
                                  className="text-xs text-text/70 flex gap-1.5"
                                >
                                  <span className="text-danger shrink-0">
                                    −
                                  </span>
                                  {g}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Improved answer */}
                      {s.feedback?.improvedAnswer && (
                        <div>
                          <div className="text-xs font-mono text-accent mb-2">
                            💬 Improved Answer
                          </div>
                          <p className="text-xs text-text/70 leading-relaxed bg-accent/5 border border-accent/10 rounded-lg p-3">
                            {s.feedback.improvedAnswer}
                          </p>
                        </div>
                      )}

                      {/* V2: Follow-up block */}
                      {s.followUpQ && (
                        <div className="border border-gold/20 rounded-xl p-3 bg-gold/5 space-y-2">
                          <div className="text-xs font-mono text-gold">
                            💬 Follow-up asked
                          </div>
                          <p className="text-xs text-text/70">{s.followUpQ}</p>
                          {s.followUpAnswer && (
                            <>
                              <div className="text-xs font-mono text-muted">
                                Your follow-up answer
                              </div>
                              <p className="text-xs text-text/60 bg-subtle/40 rounded p-2">
                                {s.followUpAnswer}
                              </p>
                            </>
                          )}
                          {s.followUpFeedback && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-muted">
                                Follow-up score:
                              </span>
                              <span
                                className={`text-xs font-bold font-mono ${scoreColor(s.followUpFeedback.score)}`}
                              >
                                {s.followUpFeedback.score}/10
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-slide-up">
          <Button onClick={onRestart} variant="primary" size="lg">
            🔄 Practice Again
          </Button>
          <Button onClick={onHistory} variant="gold" size="lg">
            📊 View History
          </Button>
          <Button onClick={handleExport} variant="ghost" size="lg">
            ↓ Export
          </Button>
        </div>
      </div>
    </div>
  );
}
