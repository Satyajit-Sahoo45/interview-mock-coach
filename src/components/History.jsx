import { useState, useEffect, useMemo } from "react";
import {
  loadSessionsFromDB,
  deleteSessionFromDB,
  clearAllSessionsFromDB,
  loadMCQSessionsFromDB,
  deleteMCQSessionFromDB,
  computeStatsFromRows,
  computeMCQStatsFromRows,
} from "../utils/db";
import useDB from "../hooks/useDB";
import Card from "./ui/Card";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import ScoreRing from "./ui/ScoreRing";
import ProgressBar from "./ui/Progressbar";
import DotLoader from "./ui/DotLoader";
import Tabs from "./ui/Tabs";
import MCQOption from "./ui/MCQOption";
import { useToast } from "./ui/Toast";
import { ROLES, INTERVIEW_TYPES } from "../utils/prompts";

export default function History({ onBack }) {
  const { db, userId } = useDB();
  const toast = useToast();

  // ── Data ───────────────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState([]); // interview sessions
  const [mcqSessions, setMcqSessions] = useState([]); // mcq sessions
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [tab, setTab] = useState("all"); // 'all' | 'interview' | 'mcq'
  const [filter, setFilter] = useState("all"); // interview type filter
  const [sortBy, setSortBy] = useState("newest");
  const [expanded, setExpanded] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // ── Load BOTH session types from Supabase ──────────────────────────────────
  useEffect(() => {
    if (!db || !userId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch both in parallel
        const [interviewRows, mcqRows] = await Promise.all([
          loadSessionsFromDB(db, userId),
          loadMCQSessionsFromDB(db, userId),
        ]);
        if (!cancelled) {
          setSessions(interviewRows);
          setMcqSessions(mcqRows);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [db, userId]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const interviewStats = useMemo(
    () => computeStatsFromRows(sessions),
    [sessions],
  );
  const mcqStats = useMemo(
    () => computeMCQStatsFromRows(mcqSessions),
    [mcqSessions],
  );

  // ── Merge + filter + sort ──────────────────────────────────────────────────
  // Tag each row with a `_kind` field so we know how to render it
  const allRows = useMemo(() => {
    const interviews = sessions.map((s) => ({ ...s, _kind: "interview" }));
    const mcqs = mcqSessions.map((s) => ({ ...s, _kind: "mcq" }));
    return [...interviews, ...mcqs];
  }, [sessions, mcqSessions]);

  const visibleRows = useMemo(() => {
    let rows = allRows;

    // Tab filter
    if (tab === "interview") rows = rows.filter((r) => r._kind === "interview");
    if (tab === "mcq") rows = rows.filter((r) => r._kind === "mcq");

    // Interview-type sub-filter (only when tab is 'all' or 'interview')
    if (filter !== "all" && tab !== "mcq") {
      rows = rows.filter((r) => r._kind === "mcq" || r.config?.type === filter);
    }

    // Sort
    return [...rows].sort((a, b) => {
      const dateA = new Date(a.savedAt);
      const dateB = new Date(b.savedAt);
      const scoreA =
        a._kind === "mcq"
          ? a.percentage || 0
          : Number(a.summary?.overallScore || 0);
      const scoreB =
        b._kind === "mcq"
          ? b.percentage || 0
          : Number(b.summary?.overallScore || 0);

      if (sortBy === "newest") return dateB - dateA;
      if (sortBy === "oldest") return dateA - dateB;
      if (sortBy === "highest") return scoreB - scoreA;
      if (sortBy === "lowest") return scoreA - scoreB;
      return 0;
    });
  }, [allRows, tab, filter, sortBy]);

  // ── Delete handlers ────────────────────────────────────────────────────────
  const handleDelete = async (row) => {
    try {
      if (row._kind === "mcq") {
        await deleteMCQSessionFromDB(db, row.id);
        setMcqSessions((s) => s.filter((x) => x.id !== row.id));
      } else {
        await deleteSessionFromDB(db, row.id);
        setSessions((s) => s.filter((x) => x.id !== row.id));
      }
      if (expanded === row.id) setExpanded(null);
      toast.info("Session deleted.");
    } catch (e) {
      toast.error("Failed to delete: " + e.message);
    }
  };

  const handleClearAll = async () => {
    try {
      // Clear whichever tab is active, or both if on 'all'
      if (tab === "all" || tab === "interview") {
        await clearAllSessionsFromDB(db, userId);
        setSessions([]);
      }
      if (tab === "all" || tab === "mcq") {
        // Delete all MCQ sessions one by one (no bulk helper yet)
        await Promise.all(
          mcqSessions.map((s) => deleteMCQSessionFromDB(db, s.id)),
        );
        setMcqSessions([]);
      }
      setConfirmClear(false);
      setExpanded(null);
      toast.info("Sessions cleared.");
    } catch (e) {
      toast.error("Failed to clear: " + e.message);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
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
  const pctColor = (p) =>
    p >= 80
      ? "text-success"
      : p >= 60
        ? "text-accent"
        : p >= 40
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

  const totalCount = sessions.length + mcqSessions.length;

  // ── Tabs config ────────────────────────────────────────────────────────────
  const TABS = [
    { id: "all", label: "All", icon: "📋", badge: totalCount || undefined },
    {
      id: "interview",
      label: "Interview",
      icon: "🧠",
      badge: sessions.length || undefined,
    },
    {
      id: "mcq",
      label: "MCQ Quiz",
      icon: "🎯",
      badge: mcqSessions.length || undefined,
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-grid relative overflow-hidden">
      <div
        className="pointer-events-none absolute -top-40 -right-40
        w-96 h-96 rounded-full bg-gold/5 blur-[120px]"
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <button
              onClick={onBack}
              className="text-muted hover:text-text text-sm font-mono mb-3
                flex items-center gap-1 transition-colors"
            >
              ← Back
            </button>
            <h1 className="font-display text-3xl font-extrabold">
              Session <span className="text-gradient-gold">History</span>
            </h1>
            <p className="text-muted text-sm mt-1">
              {loading
                ? "Loading..."
                : `${visibleRows.length} of ${totalCount} sessions`}
            </p>
          </div>
          {totalCount > 0 &&
            !loading &&
            (confirmClear ? (
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
            ))}
        </div>

        {/* ── Tab switcher ── */}
        <div className="mb-6 animate-fade-in">
          <Tabs
            tabs={TABS}
            active={tab}
            onChange={(t) => {
              setTab(t);
              setExpanded(null);
            }}
          />
        </div>

        {/* ── Stats cards ── */}
        {!loading &&
          (tab === "all" || tab === "interview") &&
          interviewStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 animate-slide-up">
              <StatCard label="Interviews" value={interviewStats.total} />
              <StatCard
                label="Avg Score"
                value={`${interviewStats.avgScore}/10`}
                color="text-accent"
              />
              <StatCard
                label="Best Score"
                value={`${interviewStats.best}/10`}
                color="text-success"
              />
              <StatCard
                label="Top Role"
                value={roleLabel(interviewStats.topRole)}
                small
              />
            </div>
          )}

        {!loading && (tab === "all" || tab === "mcq") && mcqStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 animate-slide-up stagger-2">
            <StatCard label="MCQ Quizzes" value={mcqStats.total} />
            <StatCard
              label="Avg Score"
              value={`${mcqStats.avgPercent}%`}
              color="text-accent"
            />
            <StatCard
              label="Best Score"
              value={`${mcqStats.best}%`}
              color="text-success"
            />
            <StatCard
              label="Top Role"
              value={roleLabel(mcqStats.topRole)}
              small
            />
          </div>
        )}

        {/* ── Trend sparkline ── */}
        {!loading &&
          tab === "interview" &&
          interviewStats?.trend?.length > 1 && (
            <Card className="p-4 mb-6 animate-slide-up stagger-2">
              <div className="text-xs font-mono text-muted mb-3">
                Score trend (last 5 interviews)
              </div>
              <Sparkline values={interviewStats.trend} max={10} />
            </Card>
          )}

        {!loading && tab === "mcq" && mcqStats?.trend?.length > 1 && (
          <Card className="p-4 mb-6 animate-slide-up stagger-2">
            <div className="text-xs font-mono text-muted mb-3">
              Score trend (last 5 MCQ quizzes)
            </div>
            <Sparkline values={mcqStats.trend} max={100} isPercent />
          </Card>
        )}

        {/* ── Filter + Sort (only relevant for interview or all) ── */}
        {!loading && totalCount > 0 && tab !== "mcq" && (
          <div className="flex flex-wrap items-center gap-3 mb-5 animate-fade-in">
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
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono
                      transition-all cursor-pointer border
                      ${
                        filter === f.id
                          ? "bg-accent/20 text-accent border-accent/30"
                          : "text-muted border-border hover:text-text"
                      }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs font-mono text-muted">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs font-mono bg-card border border-border
                  rounded-lg px-2 py-1 text-text outline-none
                  focus:border-accent cursor-pointer"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="highest">Highest score</option>
                <option value="lowest">Lowest score</option>
              </select>
            </div>
          </div>
        )}

        {/* ── Sort only (for MCQ tab) ── */}
        {!loading && totalCount > 0 && tab === "mcq" && (
          <div className="flex items-center gap-2 mb-5 justify-end animate-fade-in">
            <span className="text-xs font-mono text-muted">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs font-mono bg-card border border-border
                rounded-lg px-2 py-1 text-text outline-none
                focus:border-accent cursor-pointer"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest score</option>
              <option value="lowest">Lowest score</option>
            </select>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <Card className="p-16 flex items-center justify-center">
            <DotLoader label="Loading your sessions from cloud..." />
          </Card>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <Card className="p-6 border-danger/30 bg-danger/5 mb-6">
            <p className="text-danger text-sm font-mono">⚠️ {error}</p>
          </Card>
        )}

        {/* ── Empty state ── */}
        {!loading && totalCount === 0 && !error && (
          <Card className="p-16 text-center animate-fade-in">
            <div className="text-4xl mb-4">🎯</div>
            <p className="font-display font-bold text-lg text-text mb-2">
              No sessions yet
            </p>
            <p className="text-muted text-sm">
              Complete your first interview or MCQ quiz to see history here.
            </p>
            <div className="mt-6">
              <Button onClick={onBack}>Start Practicing</Button>
            </div>
          </Card>
        )}

        {/* ── No results after filter ── */}
        {!loading && totalCount > 0 && visibleRows.length === 0 && (
          <Card className="p-10 text-center animate-fade-in">
            <p className="text-muted text-sm">No sessions match this filter.</p>
            <button
              onClick={() => {
                setFilter("all");
                setTab("all");
              }}
              className="text-accent text-xs font-mono mt-2 hover:underline"
            >
              Clear filters
            </button>
          </Card>
        )}

        {/* ── Session list ── */}
        <div className="space-y-3 animate-slide-up stagger-3">
          {visibleRows.map((row) =>
            row._kind === "mcq" ? (
              <MCQSessionCard
                key={`mcq-${row.id}`}
                session={row}
                isOpen={expanded === row.id}
                onToggle={() =>
                  setExpanded(expanded === row.id ? null : row.id)
                }
                onDelete={() => handleDelete(row)}
                roleLabel={roleLabel}
                pctColor={pctColor}
                ratingBadge={ratingBadge}
              />
            ) : (
              <InterviewSessionCard
                key={`iv-${row.id}`}
                session={row}
                isOpen={expanded === row.id}
                onToggle={() =>
                  setExpanded(expanded === row.id ? null : row.id)
                }
                onDelete={() => handleDelete(row)}
                roleLabel={roleLabel}
                typeLabel={typeLabel}
                scoreColor={scoreColor}
                ratingBadge={ratingBadge}
              />
            ),
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Interview Session Card ────────────────────────────────────────────────────
function InterviewSessionCard({
  session,
  isOpen,
  onToggle,
  onDelete,
  roleLabel,
  typeLabel,
  scoreColor,
  ratingBadge,
}) {
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
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 text-left
          hover:bg-white/[0.02] transition-colors"
      >
        <div className="shrink-0">
          <div
            className={`font-display font-extrabold text-xl ${scoreColor(score)}`}
          >
            {score || "—"}
          </div>
          <div className="text-muted text-xs font-mono">/ 10</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge color="accent">{roleLabel(session.config?.role)}</Badge>
            <Badge color="muted">{typeLabel(session.config?.type)}</Badge>
            <Badge color="gold">{session.config?.difficulty}</Badge>
            {rating !== "—" && (
              <Badge color={ratingBadge(rating)}>{rating}</Badge>
            )}
            {session.config?.jobDescription && (
              <Badge color="success">📋</Badge>
            )}
          </div>
          <div className="text-muted text-xs font-mono mt-1.5">
            {date} at {time} · {session.sessions?.length || 0} questions
          </div>
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

      {isOpen && (
        <div className="border-t border-border p-4 space-y-4 animate-fade-in">
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
                      className="text-xs text-text/70 flex gap-1.5 mb-0.5"
                    >
                      <span className="text-success shrink-0">+</span>
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
                  {session.summary.criticalImprovements.map((s, i) => (
                    <div
                      key={i}
                      className="text-xs text-text/70 flex gap-1.5 mb-0.5"
                    >
                      <span className="text-warn shrink-0">→</span>
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {session.summary?.studyTopics?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {session.summary.studyTopics.map((t, i) => (
                <Badge key={i} color="accent">
                  {t}
                </Badge>
              ))}
            </div>
          )}

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
                    className={`text-xs font-mono font-bold shrink-0 ${
                      (q.feedback?.score || 0) >= 8
                        ? "text-success"
                        : (q.feedback?.score || 0) >= 6
                          ? "text-accent"
                          : (q.feedback?.score || 0) >= 4
                            ? "text-warn"
                            : "text-danger"
                    }`}
                  >
                    {q.feedback?.score ?? "—"}/10
                  </span>
                </div>
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

          {session.summary?.motivationalNote && (
            <p className="text-sm text-muted italic border-t border-border pt-3">
              "{session.summary.motivationalNote}"
            </p>
          )}

          <div className="flex justify-end">
            <Button size="sm" variant="danger" onClick={onDelete}>
              Delete Session
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── MCQ Session Card ─────────────────────────────────────────────────────────
function MCQSessionCard({
  session,
  isOpen,
  onToggle,
  onDelete,
  roleLabel,
  pctColor,
  ratingBadge,
}) {
  const pct = session.percentage || 0;
  const rating = session.rating || "—";
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
    <Card className="overflow-hidden border-l-2 border-l-gold/40">
      {/* Left gold border distinguishes MCQ cards visually */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 text-left
          hover:bg-white/[0.02] transition-colors"
      >
        <div className="shrink-0">
          <div
            className={`font-display font-extrabold text-xl ${pctColor(pct)}`}
          >
            {pct}%
          </div>
          <div className="text-muted text-xs font-mono">quiz</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* MCQ badge makes it instantly identifiable */}
            <Badge color="gold">🎯 MCQ</Badge>
            <Badge color="accent">{roleLabel(session.config?.role)}</Badge>
            <Badge color="gold">{session.config?.difficulty}</Badge>
            {rating !== "—" && (
              <Badge color={ratingBadge(rating)}>{rating}</Badge>
            )}
          </div>
          <div className="text-muted text-xs font-mono mt-1.5">
            {date} at {time} · {session.totalQuestions} questions ·{" "}
            <span className="text-success">{session.correctCount} correct</span>
            {session.wrongCount > 0 && (
              <span className="text-danger"> · {session.wrongCount} wrong</span>
            )}
            {session.timedOutCount > 0 && (
              <span className="text-warn">
                {" "}
                · {session.timedOutCount} timed out
              </span>
            )}
          </div>
          {pct > 0 && (
            <ProgressBar
              value={pct}
              color={
                pct >= 80
                  ? "success"
                  : pct >= 60
                    ? "accent"
                    : pct >= 40
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

      {isOpen && (
        <div className="border-t border-border p-4 space-y-4 animate-fade-in">
          {/* AI summary */}
          {(session.summary?.strongAreas?.length > 0 ||
            session.summary?.weakAreas?.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {session.summary?.strongAreas?.length > 0 && (
                <div>
                  <div className="text-xs font-mono text-success mb-1.5">
                    ✓ Strong areas
                  </div>
                  {session.summary.strongAreas.map((a, i) => (
                    <div
                      key={i}
                      className="text-xs text-text/70 flex gap-1.5 mb-0.5"
                    >
                      <span className="text-success shrink-0">+</span>
                      {a}
                    </div>
                  ))}
                </div>
              )}
              {session.summary?.weakAreas?.length > 0 && (
                <div>
                  <div className="text-xs font-mono text-warn mb-1.5">
                    ⚡ Weak areas
                  </div>
                  {session.summary.weakAreas.map((a, i) => (
                    <div
                      key={i}
                      className="text-xs text-text/70 flex gap-1.5 mb-0.5"
                    >
                      <span className="text-warn shrink-0">→</span>
                      {a}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {session.summary?.studyTopics?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {session.summary.studyTopics.map((t, i) => (
                <Badge key={i} color="accent">
                  {t}
                </Badge>
              ))}
            </div>
          )}

          {/* Question review */}
          {session.results?.length > 0 && (
            <div>
              <div className="text-xs font-mono text-muted mb-2">
                Question breakdown
              </div>
              <div className="space-y-2">
                {session.results.map((r, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-3 text-xs
                      ${
                        r.correct
                          ? "border-success/20 bg-success/5"
                          : r.timedOut
                            ? "border-warn/20   bg-warn/5"
                            : "border-danger/20  bg-danger/5"
                      }`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`shrink-0 font-bold mt-0.5
                        ${r.correct ? "text-success" : r.timedOut ? "text-warn" : "text-danger"}`}
                      >
                        {r.correct ? "✓" : r.timedOut ? "⏱" : "✕"}
                      </span>
                      <div className="flex-1">
                        <p className="text-text/80 leading-snug">
                          {r.question}
                        </p>
                        {r.category && (
                          <span className="text-muted/60 font-mono">
                            {r.category}
                          </span>
                        )}
                        <div className="mt-1.5 space-y-1">
                          {r.options?.map((opt, j) => (
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
                          <p className="text-muted mt-2 leading-relaxed">
                            💡 {r.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {session.summary?.motivationalNote && (
            <p className="text-sm text-muted italic border-t border-border pt-3">
              "{session.summary.motivationalNote}"
            </p>
          )}

          <div className="flex justify-end">
            <Button size="sm" variant="danger" onClick={onDelete}>
              Delete Session
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────
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

function Sparkline({ values, max = 10, isPercent = false }) {
  return (
    <div className="flex items-end gap-1.5 h-12">
      {values.map((s, i) => {
        const pct = (s / max) * 100;
        const color = isPercent
          ? s >= 80
            ? "#00E676"
            : s >= 60
              ? "#00C2FF"
              : s >= 40
                ? "#FF9800"
                : "#FF4D6A"
          : s >= 8
            ? "#00E676"
            : s >= 6
              ? "#00C2FF"
              : s >= 4
                ? "#FF9800"
                : "#FF4D6A";
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t transition-all duration-700"
              style={{
                height: `${Math.max(pct * 0.44, 4)}px`,
                background: color,
                minHeight: "4px",
              }}
            />
            <span className="text-xs font-mono" style={{ color }}>
              {isPercent ? `${s}%` : s}
            </span>
          </div>
        );
      })}
    </div>
  );
}
