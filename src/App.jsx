import { useEffect, useState } from "react";
import Home from "./components/Home";
import InterviewRoom from "./components/InterviewRoom";
import SessionReport from "./components/SessionReport";
import History from "./components/History";
import { loadSettings, saveSession } from "./utils/storage";
import Settings from "./components/Settings";
import { ToastProvider } from "./components/ui/Toast";
import CheatSheet from "./components/CheatSheet";
import { saveSessionToDB, loadSettingsFromDB } from "./utils/db";
import useDB from "./hooks/useDB";
import { useAuth } from "@clerk/clerk-react";
import SignInPage from "./components/auth/SignInPage";

export default function App() {
  const { isLoaded, isSignedIn } = useAuth();
  const { db, userId, loading: dbLoading } = useDB(); // authenticated DB client

  // Screens: 'home' | 'interview' | 'report'
  const [screen, setScreen] = useState("home");
  const [config, setConfig] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [summary, setSummary] = useState(null);

  // ── V3: Apply saved theme on every app load ─────────────────────────────
  // Without this, refreshing the page would revert to dark even if the user
  // had saved light in Settings.
  useEffect(() => {
    const { theme } = loadSettings();
    document.documentElement.setAttribute("data-theme", theme || "dark");
  }, []);

  // ── V4: When user signs in, pull their settings from Supabase ─────────────
  // This syncs cloud settings → localStorage so the rest of the app
  // (which reads from localStorage) gets the right values immediately.
  useEffect(() => {
    if (!db || !userId || dbLoading) return;
    (async () => {
      try {
        const cloudSettings = await loadSettingsFromDB(db, userId);
        if (cloudSettings) {
          // Cloud settings win — they're the source of truth for signed-in users
          saveSettings(cloudSettings);
          document.documentElement.setAttribute(
            "data-theme",
            cloudSettings.theme || "dark",
          );
        } else {
          // First sign-in: no cloud settings yet — they'll be saved when user opens Settings
        }
      } catch (e) {
        console.warn("Could not load settings from DB:", e.message);
      }
    })();
  }, [db, userId, dbLoading]);

  // ── Show loading spinner while Clerk initializes ───────────────────────────
  if (!isLoaded) {
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

  // ── Show sign-in page if not authenticated ─────────────────────────────────
  if (!isSignedIn) {
    return (
      <ToastProvider>
        <div className="min-h-screen bg-bg text-text font-body">
          <SignInPage />
        </div>
      </ToastProvider>
    );
  }

  const handleStart = (cfg) => {
    setConfig(cfg);
    setSessions([]);
    setSummary(null);
    setScreen("cheatsheet");
  };

  const handleStartInterview = () => setScreen("interview");

  const handleComplete = async (completedSessions, sessionSummary) => {
    setSessions(completedSessions);
    setSummary(sessionSummary);

    const { autoSave } = loadSettings();
    if (autoSave && db && userId) {
      try {
        // ← V4: save to Supabase instead of (or in addition to) localStorage
        await saveSessionToDB(db, {
          userId,
          config,
          sessions: completedSessions,
          summary: sessionSummary,
        });
      } catch (e) {
        console.warn("Could not save session to DB:", e.message);
        // Graceful degradation — session still shows in report even if save fails
      }
    }
    setScreen("report");
  };

  const handleRestart = () => {
    setScreen("home");
    setConfig(null);
    setSessions([]);
    setSummary(null);
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-bg text-text font-body">
        {screen === "home" && (
          <Home
            onStart={handleStart}
            onHistory={() => setScreen("history")}
            onSettings={() => setScreen("settings")}
          />
        )}
        {screen === "cheatsheet" && config && (
          <CheatSheet
            config={config}
            onBack={() => setScreen("home")}
            onStartInterview={handleStartInterview}
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
        {screen === "settings" && (
          <Settings
            onBack={() => setScreen("home")} // V3: when Settings saves a new theme, re-apply it immediately
            onThemeChange={(theme) => {
              document.documentElement.setAttribute("data-theme", theme);
            }}
          />
        )}
      </div>
    </ToastProvider>
  );
}
