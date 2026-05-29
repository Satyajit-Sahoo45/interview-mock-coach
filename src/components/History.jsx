import { useMemo, useState } from "react";
import {
  loadAllSessions,
  deleteSession,
  clearAllSessions,
  computeStats,
} from "../utils/storage";
import Card from "./ui/Card";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import ScoreRing from "./ui/ScoreRing";
import { ROLES, INTERVIEW_TYPES } from "../utils/prompts";
import ProgressBar from "./ui/ProgressBar";
import { useToast } from "./ui/Toast";

export default function History({ onBack }) {
  const [sessions, setSessions] = useState(() => loadAllSessions());
  const [expanded, setExpanded] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const stats = computeStats();

  const toast = useToast();

  const handleDelete = (id) => {
    deleteSession(id);
    setSessions(loadAllSessions());
    if (expanded === id) setExpanded(null);
    // ← V3: ADD toast feedback
    toast.info("Session deleted.");
  };

  const handleClearAll = () => {
    clearAllSessions();
    setSessions([]);
    setConfirmClear(false);
    setExpanded(null);
    // ← V3: ADD toast feedback
    toast.info("All sessions cleared.");
  };

  // ── V3: ADD filtered + sorted sessions ──────────────────────────────────────
  // Place this block RIGHT BEFORE the return statement
  const filteredSessions = useMemo(() => {
    const filtered = sessions.filter(
      (s) => filter === "all" || s.config?.type === filter,
    );
    return [...filtered].sort((a, b) => {
      if (sortBy === "newest") return b.id - a.id;
      if (sortBy === "oldest") return a.id - b.id;
      if (sortBy === "highest")
        return (
          Number(b.summary?.overallScore || 0) -
          Number(a.summary?.overallScore || 0)
        );
      if (sortBy === "lowest")
        return (
          Number(a.summary?.overallScore || 0) -
          Number(b.summary?.overallScore || 0)
        );
      return 0;
    });
  }, [sessions, filter, sortBy]);

  const roleLabel = (id) => ROLES.find((r) => r.id === id)?.label || id;
  const typeLabel = (id) =>
    INTERVIEW_TYPES.find((t) => t.id === id)?.label || id;

  const scoreColor = (s) =>
    s >= 8
      ? "text-success"
      : s >= 6
        ? "text-accent"
        : s >= 4
          ? "text-warn"
          : "text-danger";

  const ratingBadge = (r) =>
    r === "Excellent"
      ? "success"
      : r === "Good"
        ? "accent"
        : r === "Average"
          ? "warn"
          : "danger";

  return (
    <div className="min-h-screen bg-grid relative overflow-hidden">
      {/* Ambient */}
      <div className="pointer-events-none absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gold/5 blur-[120px]" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-10 animate-fade-in">
          <div>
            <button
              onClick={onBack}
              className="text-muted hover:text-text text-sm font-mono mb-3 flex items-center gap-1 transition-colors"
            >
              ← Back
            </button>
            <h1 className="font-display text-3xl font-extrabold">
              Session <span className="text-gradient-gold">History</span>
            </h1>
            <p className="text-muted text-sm mt-1">
              {filteredSessions.length} of {sessions.length} session
              {sessions.length !== 1 ? "s" : ""} recorded
            </p>
          </div>
          {sessions.length > 0 && (
            <div>
              {confirmClear ? (
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-danger font-mono">Sure?</span>
                  <Button size="sm" variant="danger" onClick={handleClearAll}>
                    Yes, clear
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmClear(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmClear(true)}
                >
                  Clear All
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ── Stats Bar ── */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 animate-slide-up">
            <StatCard label="Sessions" value={stats.total} />
            <StatCard
              label="Avg Score"
              value={`${stats.avgScore}/10`}
              color="text-accent"
            />
            <StatCard
              label="Best Score"
              value={`${stats.best}/10`}
              color="text-success"
            />
            <StatCard label="Top Role" value={roleLabel(stats.topRole)} small />
          </div>
        )}

        {/* ── Trend Sparkline ── */}
        {stats?.trend?.length > 1 && (
          <Card className="p-4 mb-6 animate-slide-up stagger-2">
            <div className="text-xs font-mono text-muted mb-3">
              Score trend (last 5 sessions)
            </div>
            <div className="flex items-end gap-1.5 h-12">
              {stats.trend.map((s, i) => {
                const pct = (s / 10) * 100;
                const color =
                  s >= 8
                    ? "#00E676"
                    : s >= 6
                      ? "#00C2FF"
                      : s >= 4
                        ? "#FF9800"
                        : "#FF4D6A";
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full rounded-t transition-all duration-700"
                      style={{
                        height: `${Math.max(pct * 0.44, 4)}px`,
                        background: color,
                        minHeight: "4px",
                      }}
                    />
                    <span className="text-xs font-mono" style={{ color }}>
                      {s}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* ── V3: Filter + Sort Bar ────────────────────────────────────────────
            ADD this entire block — it's new in V3               ────────────── */}
        {sessions.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-5 animate-fade-in">
            {/* Filter by type */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted">Filter:</span>
              <div className="flex gap-1">
                {[
                  { id: "all", label: "All" },
                  { id: "behavioral", label: "Behavioral" },
                  { id: "technical", label: "Technical" },
                  { id: "hr", label: "HR" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer
                      ${
                        filter === f.id
                          ? "bg-accent/20 text-accent border border-accent/30"
                          : "text-muted border border-border hover:text-text"
                      }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs font-mono text-muted">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs font-mono bg-card border border-border rounded-lg
                  px-2 py-1 text-text outline-none focus:border-accent cursor-pointer"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="highest">Highest score</option>
                <option value="lowest">Lowest score</option>
              </select>
            </div>
          </div>
        )}

        {/* ── Empty State ── */}
        {sessions.length === 0 && (
          <Card className="p-16 text-center animate-fade-in">
            <div className="text-4xl mb-4">🎯</div>
            <p className="font-display font-bold text-lg text-text mb-2">
              No sessions yet
            </p>
            <p className="text-muted text-sm">
              Complete your first mock interview to see history here.
            </p>
            <div className="mt-6">
              <Button onClick={onBack}>Start Practicing</Button>
            </div>
          </Card>
        )}

        {/* ── No results after filter ── */}
        {sessions.length > 0 && filteredSessions.length === 0 && (
          <Card className="p-10 text-center animate-fade-in">
            <p className="text-muted text-sm">No sessions match this filter.</p>
            <button
              onClick={() => setFilter("all")}
              className="text-accent text-xs font-mono mt-2 hover:underline"
            >
              Clear filter
            </button>
          </Card>
        )}

        {/* ── Session List ── */}
        <div className="space-y-3 animate-slide-up stagger-3">
          {filteredSessions.map((session) => {
            const isOpen = expanded === session.id;
            const score = Number(session.summary?.overallScore || 0);
            const rating = session.summary?.overallRating || "—";
            const date = new Date(session.savedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const time = new Date(session.savedAt).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <Card key={session.id} className="overflow-hidden">
                {/* Row header */}
                <button
                  onClick={() => setExpanded(isOpen ? null : session.id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/[0.02] transition-colors"
                >
                  {/* Score */}
                  <div className="shrink-0">
                    <div
                      className={`font-display font-extrabold text-xl ${scoreColor(score)}`}
                    >
                      {score || "—"}
                    </div>
                    <div className="text-muted text-xs font-mono">/ 10</div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge color="accent">
                        {roleLabel(session.config?.role)}
                      </Badge>
                      <Badge color="muted">
                        {typeLabel(session.config?.type)}
                      </Badge>
                      <Badge color="gold">{session.config?.difficulty}</Badge>
                      {rating !== "—" && (
                        <Badge color={ratingBadge(rating)}>{rating}</Badge>
                      )}
                    </div>
                    <div className="text-muted text-xs font-mono mt-1.5">
                      {date} at {time} · {session.sessions?.length || 0}{" "}
                      questions
                    </div>
                    {/* ← V3: ADD inline score progress bar */}
                    {score > 0 && (
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
                        height="h-0.5"
                        className="mt-2 max-w-[160px]"
                      />
                    )}
                  </div>

                  <span className="text-muted text-xs shrink-0">
                    {isOpen ? "▲" : "▼"}
                  </span>
                </button>

                {/* Expanded Detail */}
                {isOpen && (
                  <div className="border-t border-border p-4 space-y-4 animate-fade-in">
                    {/* Summary row */}
                    <div className="flex gap-6 items-start">
                      <ScoreRing score={score} size={90} />
                      <div className="flex-1 space-y-3">
                        {session.summary?.topStrengths?.length > 0 && (
                          <div>
                            <div className="text-xs font-mono text-success mb-1">
                              ✓ Strengths
                            </div>
                            {session.summary.topStrengths.map((s, i) => (
                              <div
                                key={i}
                                className="text-xs text-text/70 flex gap-1.5"
                              >
                                <span className="text-success">+</span>
                                {s}
                              </div>
                            ))}
                          </div>
                        )}
                        {session.summary?.criticalImprovements?.length > 0 && (
                          <div>
                            <div className="text-xs font-mono text-warn mb-1">
                              ⚡ Improve
                            </div>
                            {session.summary.criticalImprovements.map(
                              (s, i) => (
                                <div
                                  key={i}
                                  className="text-xs text-text/70 flex gap-1.5"
                                >
                                  <span className="text-warn">→</span>
                                  {s}
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Study topics */}
                    {session.summary?.studyTopics?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {session.summary.studyTopics.map((t, i) => (
                          <Badge key={i} color="accent">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Q&A mini list */}
                    <div className="space-y-2">
                      {session.sessions?.map((q, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-border p-3 bg-subtle/30"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs text-text/70 leading-relaxed flex-1">
                              {q.question}
                            </p>
                            <span
                              className={`text-xs font-mono font-bold shrink-0 ${scoreColor(q.feedback?.score)}`}
                            >
                              {q.feedback?.score ?? "—"}/10
                            </span>
                          </div>
                          {/* ← V3: ADD per-question progress bar */}
                          {q.feedback?.score > 0 && (
                            <ProgressBar
                              value={(q.feedback.score / 10) * 100}
                              color={
                                q.feedback.score >= 8
                                  ? "success"
                                  : q.feedback.score >= 6
                                    ? "accent"
                                    : q.feedback.score >= 4
                                      ? "warn"
                                      : "danger"
                              }
                              height="h-0.5"
                              className="mt-2"
                            />
                          )}
                          <div className="flex gap-2 mt-1">
                            {q.retryCount > 0 && (
                              <span className="text-xs font-mono text-muted">
                                🔄 Retried {q.retryCount}×
                              </span>
                            )}
                            {q.followUpQ && (
                              <span className="text-xs font-mono text-accent/70">
                                💬 Follow-up asked
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Motivational note */}
                    {session.summary?.motivationalNote && (
                      <p className="text-sm text-muted italic border-t border-border pt-3">
                        "{session.summary.motivationalNote}"
                      </p>
                    )}

                    {/* Delete button */}
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(session.id)}
                      >
                        Delete Session
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color = "text-text", small = false }) {
  return (
    <Card className="p-4 text-center">
      <div
        className={`font-display font-extrabold ${small ? "text-sm" : "text-2xl"} ${color}`}
      >
        {value}
      </div>
      <div className="text-muted text-xs font-mono mt-1">{label}</div>
    </Card>
  );
}
