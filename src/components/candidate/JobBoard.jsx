// Candidate-facing job listings page
import { useState, useEffect, useMemo } from "react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import DotLoader from "../ui/DotLoader";
import ProgressBar from "../ui/Progressbar";
import { useToast } from "../ui/Toast";
import { getActiveJobs } from "../../utils/db-recruiter";
import { ROLES, DIFFICULTIES } from "../../utils/prompts";
import useDB from "../../hooks/useDB";

export default function JobBoard({ onApply, onBack }) {
  const { db } = useDB();
  const toast = useToast();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [diffFilter, setDiffFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!db) return;
    (async () => {
      try {
        const data = await getActiveJobs(db);
        setJobs(data);
      } catch (e) {
        toast.error("Failed to load jobs.");
      } finally {
        setLoading(false);
      }
    })();
  }, [db]);

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      const matchRole = roleFilter === "all" || j.role === roleFilter;
      const matchDiff = diffFilter === "all" || j.difficulty === diffFilter;
      const matchSearch =
        !search.trim() ||
        j.title?.toLowerCase().includes(search.toLowerCase()) ||
        j.companies?.name?.toLowerCase().includes(search.toLowerCase());
      return matchRole && matchDiff && matchSearch;
    });
  }, [jobs, roleFilter, diffFilter, search]);

  const roleLabel = (id) => ROLES.find((r) => r.id === id)?.label || id;
  const diffColor = (d) =>
    d === "senior" ? "danger" : d === "mid" ? "warn" : "success";

  return (
    <div className="min-h-screen bg-grid relative overflow-hidden">
      <div
        className="pointer-events-none absolute -top-40 -right-40
        w-96 h-96 rounded-full bg-accent/5 blur-[120px]"
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <button
            onClick={onBack}
            className="text-muted hover:text-text text-sm font-mono mb-4
              flex items-center gap-1 transition-colors"
          >
            ← Back
          </button>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-extrabold">
                Job <span className="text-gradient-accent">Board</span>
              </h1>
              <p className="text-muted text-sm mt-1">
                {loading
                  ? "..."
                  : `${filtered.length} open position${filtered.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 animate-fade-in">
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs or companies..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-card
              font-body text-sm text-text placeholder:text-muted
              outline-none focus:border-accent transition-colors"
          />
          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-border bg-card
              font-mono text-xs text-text outline-none focus:border-accent"
          >
            <option value="all">All Roles</option>
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          {/* Difficulty filter */}
          <select
            value={diffFilter}
            onChange={(e) => setDiffFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-border bg-card
              font-mono text-xs text-text outline-none focus:border-accent"
          >
            <option value="all">All Levels</option>
            {DIFFICULTIES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {/* Loading */}
        {loading && (
          <Card className="p-16 flex items-center justify-center">
            <DotLoader label="Loading jobs..." />
          </Card>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <Card className="p-16 text-center animate-fade-in">
            <div className="text-4xl mb-4">🔍</div>
            <p className="font-display font-bold text-lg text-text mb-2">
              No jobs found
            </p>
            <p className="text-muted text-sm">
              {jobs.length === 0
                ? "No jobs posted yet. Check back soon!"
                : "Try adjusting your filters."}
            </p>
          </Card>
        )}

        {/* Job cards */}
        <div className="space-y-4 animate-slide-up">
          {filtered.map((job) => {
            const isOpen = expanded === job.id;
            const daysLeft = job.deadline
              ? Math.max(
                  0,
                  Math.floor(
                    (new Date(job.deadline) - new Date()) /
                      (1000 * 60 * 60 * 24),
                  ),
                )
              : null;

            return (
              <Card key={job.id} className="overflow-hidden">
                <div
                  className="p-5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => setExpanded(isOpen ? null : job.id)}
                >
                  {/* Top row */}
                  <div className="flex items-start gap-4">
                    {/* Company logo placeholder */}
                    <div
                      className="w-12 h-12 rounded-xl bg-accent/10 border border-border
                      flex items-center justify-center shrink-0 text-lg font-bold text-accent"
                    >
                      {job.companies?.name?.[0] || "?"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-display font-bold text-base text-text">
                            {job.title}
                          </h3>
                          <p className="text-muted text-sm mt-0.5">
                            {job.companies?.name}
                            {job.companies?.industry &&
                              ` · ${job.companies.industry}`}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onApply(job);
                          }}
                        >
                          Apply →
                        </Button>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        <Badge color="accent">{roleLabel(job.role)}</Badge>
                        <Badge color={diffColor(job.difficulty)}>
                          {job.difficulty}
                        </Badge>
                        {job.location && (
                          <Badge color="muted">📍 {job.location}</Badge>
                        )}
                        {job.salary_range && (
                          <Badge color="muted">💰 {job.salary_range}</Badge>
                        )}
                        {daysLeft !== null && (
                          <Badge color={daysLeft <= 3 ? "danger" : "muted"}>
                            {daysLeft === 0 ? "Last day!" : `${daysLeft}d left`}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="flex items-center gap-4 mt-3 text-xs font-mono text-muted">
                    <span>📝 {job.total_questions} questions</span>
                    <span>🎯 Pass score: {job.pass_threshold}/10</span>
                    <span className="ml-auto text-xs text-muted/60">
                      {isOpen ? "▲ Less" : "▼ Details"}
                    </span>
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-border p-5 space-y-4 animate-fade-in">
                    {/* Company info */}
                    {job.companies?.description && (
                      <div>
                        <div className="text-xs font-mono text-muted mb-1.5">
                          About the company
                        </div>
                        <p className="text-sm text-text/70 leading-relaxed">
                          {job.companies.description}
                        </p>
                      </div>
                    )}

                    {/* Job description */}
                    {job.description && (
                      <div>
                        <div className="text-xs font-mono text-muted mb-1.5">
                          About the role
                        </div>
                        <p className="text-sm text-text/70 leading-relaxed">
                          {job.description}
                        </p>
                      </div>
                    )}

                    {/* What to expect */}
                    <div className="p-3 rounded-xl bg-accent/5 border border-accent/10">
                      <div className="text-xs font-mono text-accent mb-2">
                        📋 What to expect
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-text/70">
                        <span>• {job.total_questions} interview questions</span>
                        <span>• AI evaluates your answers</span>
                        <span>
                          • Score ≥ {job.pass_threshold}/10 to qualify
                        </span>
                        <span>• Results sent to recruiter instantly</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => onApply(job)}
                      className="w-full"
                      size="lg"
                    >
                      Start Interview for this Job →
                    </Button>
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
