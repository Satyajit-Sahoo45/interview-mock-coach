import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import Home from "./components/Home";
import InterviewRoom from "./components/InterviewRoom";
import SessionReport from "./components/SessionReport";
import History from "./components/History";
import Settings from "./components/Settings";
import CheatSheet from "./components/CheatSheet";
import MCQRoom from "./components/MCQRoom";
import SignInPage from "./components/auth/SignInPage";

// Recruiter screens
import RoleSelector from "./components/recruiter/RoleSelector";
import RecruiterDashboard from "./components/recruiter/RecruiterDashboard";
import JobPostingForm from "./components/recruiter/JobPostingForm";

// Candidate job screens
import JobBoard from "./components/candidate/JobBoard";
import JobInterviewRoom from "./components/candidate/JobInterviewRoom";
import MyApplications from "./components/candidate/MyApplications";

import { ToastProvider } from "./components/ui/Toast";
import { loadSettings, saveSettings } from "./utils/storage";
import { saveSessionToDB, loadSettingsFromDB } from "./utils/db";
import { getUserRole } from "./utils/db-recruiter";
import useDB from "./hooks/useDB";

function AppInner() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { db, userId, loading: dbLoading } = useDB();

  const [screen, setScreen] = useState("home");
  const [config, setConfig] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'candidate' | 'recruiter' | null
  const [roleLoading, setRoleLoading] = useState(true);
  const [editingJob, setEditingJob] = useState(null); // job being edited
  const [selectedJob, setSelectedJob] = useState(null); // job being applied to

  // Apply theme on load
  useEffect(() => {
    const { theme } = loadSettings();
    document.documentElement.setAttribute("data-theme", theme || "dark");
  }, []);

  // On sign-in: load settings + user role
  useEffect(() => {
    if (!db || !userId || dbLoading) return;
    (async () => {
      try {
        // Load cloud settings
        const cloudSettings = await loadSettingsFromDB(db, userId);
        if (cloudSettings) {
          saveSettings(cloudSettings);
          document.documentElement.setAttribute(
            "data-theme",
            cloudSettings.theme || "dark",
          );
        }
        // Load user role
        const role = await getUserRole(db, userId);
        setUserRole(role);
        setScreen(role === "recruiter" ? "recruiter-dashboard" : "home");
      } catch (e) {
        console.warn("Init error:", e.message);
        setUserRole("candidate"); // safe default
      } finally {
        setRoleLoading(false);
      }
    })();
  }, [db, userId, dbLoading]);

  // Loading screen
  if (!isLoaded || (isSignedIn && roleLoading)) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="dot-loader flex gap-2">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  // Sign-in screen
  if (!isSignedIn) {
    return (
      <ToastProvider>
        <div className="min-h-screen bg-bg text-text font-body">
          <SignInPage />
        </div>
      </ToastProvider>
    );
  }

  // First-time role selection
  if (!userRole || userRole === null) {
    return (
      <ToastProvider>
        <div className="min-h-screen bg-bg text-text font-body">
          <RoleSelector
            onRoleSelected={(role) => {
              setUserRole(role);
              setScreen(role === "recruiter" ? "recruiter-dashboard" : "home");
            }}
          />
        </div>
      </ToastProvider>
    );
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleStart = (cfg) => {
    setConfig(cfg);
    setSessions([]);
    setSummary(null);
    setScreen(cfg.type === "mcq" ? "mcq" : "cheatsheet");
  };

  const handleStartInterview = () => setScreen("interview");

  const handleComplete = async (completedSessions, sessionSummary) => {
    setSessions(completedSessions);
    setSummary(sessionSummary);

    const { autoSave } = loadSettings();
    const shouldSave = settings.autoSave !== false;

    if (shouldSave) {
      // check db is available right now (fresh from useDB)
      if (db && userId) {
        try {
          await saveSessionToDB(db, {
            userId,
            config,
            sessions: completedSessions,
            summary: sessionSummary,
          });
          toast.success("✓ Session saved to your history!");
        } catch (e) {
          console.error("Session save error:", e);
          toast.error(`Could not save session: ${e.message}`);
        }
      } else {
        console.warn("Session save skipped: db not ready", {
          db: !!db,
          userId,
        });
        toast.warn("Not signed in — session not saved to cloud.");
      }
    }
    setScreen("report");
  };

  const handleMCQComplete = () => setScreen("home");

  const handleRestart = () => {
    setScreen("home");
    setConfig(null);
    setSessions([]);
    setSummary(null);
  };

  // ── Recruiter handlers ────────────────────────────────────────────────────

  const handleCreateJob = () => {
    setEditingJob(null);
    setScreen("recruiter-post-job");
  };

  const handleEditJob = (job) => {
    setEditingJob(job);
    setScreen("recruiter-edit-job");
  };

  const handleJobSaved = () => {
    setEditingJob(null);
    setScreen("recruiter-dashboard");
  };

  // ── Candidate job handlers ────────────────────────────────────────────────

  const handleApplyToJob = (job) => {
    setSelectedJob(job);
    setScreen("job-interview");
  };

  const handleJobInterviewComplete = () => {
    setSelectedJob(null);
    setScreen("my-applications");
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-bg text-text font-body transition-colors duration-300">
        {screen === "home" && (
          <Home
            onStart={handleStart}
            onHistory={() => setScreen("history")}
            onSettings={() => setScreen("settings")}
            userRole={userRole}
            extraNav={
              <div className="flex gap-2">
                <button
                  onClick={() => setScreen("job-board")}
                  className="flex items-center gap-1.5 text-sm font-mono text-muted
                    hover:text-accent transition-colors border border-border
                    hover:border-accent/40 px-3 py-1.5 rounded-lg bg-card/50"
                >
                  💼 Jobs
                </button>
                <button
                  onClick={() => setScreen("my-applications")}
                  className="flex items-center gap-1.5 text-sm font-mono text-muted
                    hover:text-text transition-colors border border-border
                    hover:border-border-light px-3 py-1.5 rounded-lg bg-card/50"
                >
                  📋 My Applications
                </button>
              </div>
            }
          />
        )}

        {screen === "cheatsheet" && config && (
          <CheatSheet
            config={config}
            onBack={() => setScreen("home")}
            onStartInterview={handleStartInterview}
          />
        )}
        {screen === "mcq" && config && (
          <MCQRoom
            config={config}
            onComplete={handleMCQComplete}
            onExit={handleRestart}
          />
        )}

        {screen === "interview" && config && (
          <InterviewRoom
            config={config}
            onComplete={handleComplete}
            onExit={handleRestart}
          />
        )}
        {screen === "report" && (
          <SessionReport
            sessions={sessions}
            summary={summary}
            config={config}
            onRestart={handleRestart}
            onHistory={() => setScreen("history")}
          />
        )}
        {screen === "history" && <History onBack={() => setScreen("home")} />}
        {screen === "settings" && <Settings onBack={() => setScreen("home")} />}

        {/* ── Job board (candidates) ── */}
        {screen === "job-board" && (
          <JobBoard
            onApply={handleApplyToJob}
            onBack={() => setScreen("home")}
          />
        )}

        {screen === "job-interview" && selectedJob && (
          <JobInterviewRoom
            job={selectedJob}
            onComplete={handleJobInterviewComplete}
            onExit={() => setScreen("job-board")}
          />
        )}

        {screen === "my-applications" && (
          <MyApplications
            onBack={() => setScreen("home")}
            onBrowseJobs={() => setScreen("job-board")}
          />
        )}

        {/* ── Recruiter screens ── */}
        {screen === "recruiter-dashboard" && (
          <RecruiterDashboard
            onCreateJob={handleCreateJob}
            onEditJob={handleEditJob}
            onViewCandidates={() => {}} // handled inside RecruiterDashboard
          />
        )}

        {(screen === "recruiter-post-job" ||
          screen === "recruiter-edit-job") && (
          <JobPostingForm
            existingJob={editingJob}
            onSaved={handleJobSaved}
            onBack={() => setScreen("recruiter-dashboard")}
          />
        )}
      </div>
    </ToastProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
