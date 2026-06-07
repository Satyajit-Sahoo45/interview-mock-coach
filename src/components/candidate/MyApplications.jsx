// components/candidate/MyApplications.jsx
// Shows all jobs a candidate has applied to with their results
import { useState, useEffect } from "react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import DotLoader from "../ui/DotLoader";
import ProgressBar from "../ui/Progressbar";
import ScoreRing from "../ui/ScoreRing";
import { useToast } from "../ui/Toast";
import { getMyApplications } from "../../utils/db-recruiter";
import { ROLES } from "../../utils/prompts";
import useDB from "../../hooks/useDB";

export default function MyApplications({ onBack, onBrowseJobs }) {
  const { db, userId } = useDB();
  const toast = useToast();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!db || !userId) return;
    (async () => {
      try {
        const data = await getMyApplications(db, userId);
        setApplications(data);
      } catch (e) {
        toast.error("Failed to load applications.");
      } finally {
        setLoading(false);
      }
    })();
  }, [db, userId]);

  const roleLabel = (id) => ROLES.find((r) => r.id === id)?.label || id;
  const statusColor = (s) =>
    s === "passed"
      ? "success"
      : s === "shortlisted"
        ? "gold"
        : s === "failed"
          ? "danger"
          : s === "rejected"
            ? "danger"
            : s === "in_progress"
              ? "accent"
              : "muted";

  const scoreColor = (s) =>
    s >= 8
      ? "text-success"
      : s >= 6
        ? "text-accent"
        : s >= 4
          ? "text-warn"
          : "text-danger";

  const passedCount = applications.filter((a) => a.passed).length;
  const shortlistCount = applications.filter(
    (a) => a.status === "shortlisted",
  ).length;

  return (
    <div className="min-h-screen bg-grid relative overflow-hidden">
      <div
        className="pointer-events-none absolute -top-40 -left-40
        w-96 h-96 rounded-full bg-accent/5 blur-[120px]"
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
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
              My <span className="text-gradient-accent">Applications</span>
            </h1>
            <p className="text-muted text-sm mt-1">
              {loading
                ? "..."
                : `${applications.length} application${applications.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Button onClick={onBrowseJobs} variant="ghost">
            Browse Jobs →
          </Button>
        </div>

        {/* Stats */}
        {!loading && applications.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 animate-slide-up">
            <StatCard label="Applied" value={applications.length} />
            <StatCard label="Passed" value={passedCount} color="text-success" />
            <StatCard
              label="Shortlisted"
              value={shortlistCount}
              color="text-gold"
            />
            <StatCard
              label="Success Rate"
              value={
                applications.length
                  ? `${Math.round((passedCount / applications.length) * 100)}%`
                  : "—"
              }
              color="text-accent"
            />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <Card className="p-16 flex items-center justify-center">
            <DotLoader label="Loading your applications..." />
          </Card>
        )}

        {/* Empty */}
        {!loading && applications.length === 0 && (
          <Card className="p-16 text-center animate-fade-in">
            <div className="text-4xl mb-4">📋</div>
            <p className="font-display font-bold text-lg text-text mb-2">
              No applications yet
            </p>
            <p className="text-muted text-sm mb-6">
              Browse open jobs and start your first interview.
            </p>
            <Button onClick={onBrowseJobs}>Browse Jobs →</Button>
          </Card>
        )}

        {/* Application list */}
        <div className="space-y-4 animate-slide-up stagger-2">
          {applications.map((app) => {
            const isOpen = expanded === app.id;
            const job = app.job_postings;
            const score = Number(app.overall_score || 0);
            const date = new Date(app.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <Card key={app.id} className="overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : app.id)}
                  className="w-full flex items-center gap-4 p-5 text-left
                    hover:bg-white/[0.02] transition-colors"
                >
                  {/* Company avatar */}
                  <div
                    className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20
                    flex items-center justify-center shrink-0 text-lg font-bold text-gold"
                  >
                    {job?.companies?.name?.[0] || "?"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-base text-text truncate">
                      {job?.title || "Job"}
                    </div>
                    <div className="text-muted text-sm mt-0.5">
                      {job?.companies?.name} · {date}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      <Badge color="accent">{roleLabel(job?.role)}</Badge>
                      <Badge color="gold">{job?.difficulty}</Badge>
                      <Badge color={statusColor(app.status)}>
                        {app.status === "in_progress"
                          ? "⏳ In Progress"
                          : app.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Score */}
                  {score > 0 && (
                    <div className="text-right shrink-0">
                      <div
                        className={`font-display font-extrabold text-xl ${scoreColor(score)}`}
                      >
                        {score}
                      </div>
                      <div className="text-muted text-xs font-mono">/ 10</div>
                      <div className="w-16 mt-1">
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
                        />
                      </div>
                    </div>
                  )}

                  <span className="text-muted text-xs shrink-0">
                    {isOpen ? "▲" : "▼"}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-border p-5 space-y-5 animate-fade-in">
                    {/* Score ring + verdict */}
                    {score > 0 && app.summary && (
                      <div className="flex flex-col sm:flex-row items-center gap-6">
                        <ScoreRing score={score} size={100} />
                        <div className="flex-1 text-center sm:text-left">
                          <div
                            className={`font-display font-bold text-lg
                            ${app.passed ? "text-success" : "text-text"}`}
                          >
                            {app.summary.hiringVerdict ||
                              (app.passed ? "Passed" : "Not Selected")}
                          </div>
                          <div
                            className="flex items-center gap-2 mt-1 flex-wrap
                            justify-center sm:justify-start"
                          >
                            <Badge color={app.passed ? "success" : "danger"}>
                              {app.passed
                                ? "✓ Met threshold"
                                : `✕ Need ${job?.pass_threshold}/10`}
                            </Badge>
                          </div>
                          {app.summary.recommendation && (
                            <p className="text-muted text-sm mt-2 italic leading-relaxed">
                              "{app.summary.recommendation}"
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Strengths + Concerns */}
                    {app.summary && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {app.summary.topStrengths?.length > 0 && (
                          <div>
                            <div className="text-xs font-mono text-success mb-1.5">
                              ✓ Your strengths
                            </div>
                            {app.summary.topStrengths.map((s, i) => (
                              <div
                                key={i}
                                className="text-xs text-text/70 flex gap-1.5 mb-1"
                              >
                                <span className="text-success shrink-0">+</span>
                                {s}
                              </div>
                            ))}
                          </div>
                        )}
                        {app.summary.concerns?.length > 0 && (
                          <div>
                            <div className="text-xs font-mono text-warn mb-1.5">
                              ⚡ Areas to improve
                            </div>
                            {app.summary.concerns.map((c, i) => (
                              <div
                                key={i}
                                className="text-xs text-text/70 flex gap-1.5 mb-1"
                              >
                                <span className="text-warn shrink-0">→</span>
                                {c}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Status note */}
                    {app.status === "shortlisted" && (
                      <div className="p-3 rounded-xl bg-gold/10 border border-gold/20">
                        <p className="text-sm text-gold font-display font-semibold">
                          🌟 You've been shortlisted!
                        </p>
                        <p className="text-xs text-gold/70 mt-1">
                          The recruiter has added you to their shortlist. They
                          may reach out to you soon.
                        </p>
                      </div>
                    )}

                    {app.status === "rejected" && (
                      <div className="p-3 rounded-xl bg-danger/5 border border-danger/20">
                        <p className="text-sm text-danger/80">
                          This application was not moved forward. Keep
                          practicing and try other positions!
                        </p>
                      </div>
                    )}

                    {app.status === "in_progress" && (
                      <div className="p-3 rounded-xl bg-accent/5 border border-accent/20">
                        <p className="text-sm text-accent/80">
                          This application is still in progress.
                        </p>
                      </div>
                    )}
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

function StatCard({ label, value, color = "text-text" }) {
  return (
    <Card className="p-4 text-center">
      <div className={`font-display font-extrabold text-2xl ${color}`}>
        {value}
      </div>
      <div className="text-muted text-xs font-mono mt-1">{label}</div>
    </Card>
  );
}
