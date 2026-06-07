// components/recruiter/RecruiterDashboard.jsx
// Main dashboard for recruiters — shows their jobs and candidate pipeline
import { useState, useEffect } from "react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import DotLoader from "../ui/DotLoader";
import { useToast } from "../ui/Toast";
import {
  getMyCompany,
  getMyJobPostings,
  getApplicationsForJob,
  updateApplicationStatus,
} from "../../utils/db-recruiter";
import useDB from "../../hooks/useDB";
import { ROLES, DIFFICULTIES } from "../../utils/prompts";
import { SignedIn, UserButton } from "@clerk/clerk-react";

export default function RecruiterDashboard({
  onCreateJob,
  onEditJob,
  onViewCandidates,
}) {
  const { db, userId } = useDB();
  const toast = useToast();

  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeJob, setActiveJob] = useState(null); // job being viewed
  const [candidates, setCandidates] = useState([]);
  const [loadingC, setLoadingC] = useState(false);

  useEffect(() => {
    if (!db || !userId) return;
    (async () => {
      try {
        const [co, js] = await Promise.all([
          getMyCompany(db, userId),
          getMyJobPostings(db, userId),
        ]);
        setCompany(co);
        setJobs(js);
      } catch (e) {
        toast.error("Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, [db, userId]);

  const handleViewCandidates = async (job) => {
    setActiveJob(job);
    setLoadingC(true);
    try {
      const apps = await getApplicationsForJob(db, job.id);
      setCandidates(apps);
    } catch (e) {
      toast.error("Failed to load candidates.");
    } finally {
      setLoadingC(false);
    }
  };

  const handleStatusChange = async (appId, newStatus) => {
    try {
      await updateApplicationStatus(db, appId, newStatus);
      setCandidates((cs) =>
        cs.map((c) => (c.id === appId ? { ...c, status: newStatus } : c)),
      );
      toast.success(`Candidate marked as ${newStatus}.`);
    } catch (e) {
      toast.error("Failed to update status.");
    }
  };

  const handleCloseJob = async (jobId) => {
    try {
      const { updateJobPosting } = await import("../../utils/db-recruiter");
      await updateJobPosting(db, jobId, { status: "closed" });
      setJobs((js) =>
        js.map((j) => (j.id === jobId ? { ...j, status: "closed" } : j)),
      );
      toast.success("Job closed.");
    } catch (e) {
      toast.error("Failed to close job.");
    }
  };

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
            : "muted";

  const totalApps = jobs.reduce((a, j) => a + (j.application_count || 0), 0);
  const activeJobs = jobs.filter((j) => j.status === "active").length;

  if (loading)
    return (
      <div className="min-h-screen bg-grid flex items-center justify-center">
        <DotLoader label="Loading dashboard..." />
      </div>
    );

  // ── Candidates panel ──────────────────────────────────────────────────────
  if (activeJob) {
    return (
      <div className="min-h-screen bg-grid relative">
        <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">
          <button
            onClick={() => {
              setActiveJob(null);
              setCandidates([]);
            }}
            className="text-muted hover:text-text text-sm font-mono mb-6
              flex items-center gap-1 transition-colors"
          >
            ← Back to Dashboard
          </button>

          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-2xl font-extrabold">
                {activeJob.title}
              </h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge color="accent">{roleLabel(activeJob.role)}</Badge>
                <Badge color="gold">{activeJob.difficulty}</Badge>
                <Badge
                  color={activeJob.status === "active" ? "success" : "muted"}
                >
                  {activeJob.status}
                </Badge>
                <span className="text-muted text-xs font-mono">
                  Pass threshold: {activeJob.pass_threshold}/10
                </span>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEditJob(activeJob)}
            >
              Edit Job
            </Button>
          </div>

          {loadingC ? (
            <Card className="p-12 flex items-center justify-center">
              <DotLoader label="Loading candidates..." />
            </Card>
          ) : candidates.length === 0 ? (
            <Card className="p-16 text-center">
              <div className="text-4xl mb-4">👥</div>
              <p className="font-display font-bold text-lg text-text mb-2">
                No candidates yet
              </p>
              <p className="text-muted text-sm">
                Share your job posting to start receiving applications.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <MiniStat label="Total" value={candidates.length} />
                <MiniStat
                  label="Passed"
                  value={candidates.filter((c) => c.passed).length}
                  color="text-success"
                />
                <MiniStat
                  label="Shortlisted"
                  value={
                    candidates.filter((c) => c.status === "shortlisted").length
                  }
                  color="text-gold"
                />
                <MiniStat
                  label="Avg Score"
                  value={`${(candidates.filter((c) => c.overall_score).reduce((a, c) => a + Number(c.overall_score), 0) / (candidates.filter((c) => c.overall_score).length || 1)).toFixed(1)}/10`}
                  color="text-accent"
                />
              </div>

              {candidates.map((c) => (
                <Card key={c.id} className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-full bg-accent/20 text-accent
                      font-bold text-sm flex items-center justify-center shrink-0"
                    >
                      {c.candidate_name?.[0]?.toUpperCase() || "?"}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-semibold text-sm text-text">
                        {c.candidate_name || "Anonymous Candidate"}
                      </div>
                      <div className="text-muted text-xs font-mono mt-0.5">
                        {c.candidate_email || "—"} ·{" "}
                        {c.completed_at
                          ? new Date(c.completed_at).toLocaleDateString()
                          : "In progress"}
                      </div>
                    </div>

                    {/* Score */}
                    {c.overall_score && (
                      <div className="text-right shrink-0">
                        <div
                          className={`font-display font-extrabold text-lg
                          ${
                            Number(c.overall_score) >= activeJob.pass_threshold
                              ? "text-success"
                              : "text-danger"
                          }`}
                        >
                          {c.overall_score}/10
                        </div>
                        <div className="text-muted text-xs font-mono">
                          {Number(c.overall_score) >= activeJob.pass_threshold
                            ? "✓ Pass"
                            : "✕ Fail"}
                        </div>
                      </div>
                    )}

                    {/* Status badge */}
                    <Badge color={statusColor(c.status)}>{c.status}</Badge>

                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                      {c.status !== "shortlisted" && c.passed && (
                        <Button
                          size="sm"
                          variant="gold"
                          onClick={() =>
                            handleStatusChange(c.id, "shortlisted")
                          }
                        >
                          Shortlist
                        </Button>
                      )}
                      {c.status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleStatusChange(c.id, "rejected")}
                        >
                          Reject
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Summary if available */}
                  {c.summary?.recommendation && (
                    <p className="text-xs text-muted mt-3 pt-3 border-t border-border italic">
                      AI: "{c.summary.recommendation}"
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Main Dashboard ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-grid relative overflow-hidden">
      <div
        className="pointer-events-none absolute -top-40 -right-40
        w-96 h-96 rounded-full bg-gold/5 blur-[120px]"
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10 animate-fade-in">
          <div>
            <h1 className="font-display text-3xl font-extrabold">
              Recruiter <span className="text-gradient-gold">Dashboard</span>
            </h1>
            {company && (
              <p className="text-muted text-sm mt-1 font-mono">
                {company.name}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 mb-6 animate-fade-in">
            <Button onClick={onCreateJob} size="md">
              + Post New Job
            </Button>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <MiniStat
            label="Active Jobs"
            value={activeJobs}
            color="text-success"
          />
          <MiniStat label="Total Jobs" value={jobs.length} />
          <MiniStat
            label="Applications"
            value={totalApps}
            color="text-accent"
          />
          <MiniStat
            label="Company"
            value={company ? "✓ Set up" : "✕ Missing"}
            color={company ? "text-success" : "text-danger"}
          />
        </div>

        {/* No company warning */}
        {!company && (
          <Card className="p-4 border-warn/20 bg-warn/5 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-warn text-xl">⚠️</span>
              <div>
                <div className="font-display font-bold text-sm text-warn">
                  Company profile not set up
                </div>
                <p className="text-xs text-muted mt-0.5">
                  Candidates see your company info when browsing jobs. Set it up
                  before posting.
                </p>
              </div>
              <Button
                size="sm"
                variant="gold"
                onClick={onCreateJob}
                className="ml-auto"
              >
                Set Up
              </Button>
            </div>
          </Card>
        )}

        {/* Jobs list */}
        {jobs.length === 0 ? (
          <Card className="p-16 text-center animate-fade-in">
            <div className="text-4xl mb-4">📋</div>
            <p className="font-display font-bold text-lg text-text mb-2">
              No job postings yet
            </p>
            <p className="text-muted text-sm mb-6">
              Post your first job to start receiving candidates.
            </p>
            <Button onClick={onCreateJob}>Post a Job →</Button>
          </Card>
        ) : (
          <div className="space-y-4">
            <h2 className="font-display font-bold text-lg text-text">
              Your Job Postings
            </h2>
            {jobs.map((job) => (
              <Card key={job.id} className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-display font-bold text-base text-text">
                        {job.title}
                      </h3>
                      <Badge
                        color={job.status === "active" ? "success" : "muted"}
                      >
                        {job.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge color="accent">{roleLabel(job.role)}</Badge>
                      <Badge color="gold">{job.difficulty}</Badge>
                      {job.location && (
                        <Badge color="muted">📍 {job.location}</Badge>
                      )}
                      {job.salary_range && (
                        <Badge color="muted">💰 {job.salary_range}</Badge>
                      )}
                    </div>
                    <div className="text-muted text-xs font-mono mt-2">
                      Pass threshold: {job.pass_threshold}/10 ·{" "}
                      {job.total_questions} questions · Posted{" "}
                      {new Date(job.created_at).toLocaleDateString()}
                      {job.deadline &&
                        ` · Deadline: ${new Date(job.deadline).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleViewCandidates(job)}
                    >
                      👥 Candidates
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEditJob(job)}
                    >
                      Edit
                    </Button>
                    {job.status === "active" && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleCloseJob(job.id)}
                      >
                        Close
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, color = "text-text" }) {
  return (
    <Card className="p-4 text-center">
      <div className={`font-display font-extrabold text-2xl ${color}`}>
        {value}
      </div>
      <div className="text-muted text-xs font-mono mt-1">{label}</div>
    </Card>
  );
}
