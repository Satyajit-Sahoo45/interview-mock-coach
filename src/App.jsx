import { useEffect, useState } from "react";
import Home from "./components/Home";
import InterviewRoom from "./components/InterviewRoom";
import SessionReport from "./components/SessionReport";
import History from "./components/History";
import { loadSettings, saveSession } from "./utils/storage";
import Settings from "./components/Settings";
import { ToastProvider } from "./components/ui/Toast";
import CheatSheet from "./components/CheatSheet";

export default function App() {
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

  const handleStart = (cfg) => {
    setConfig(cfg);
    setSessions([]);
    setSummary(null);
    setScreen("cheatsheet");
  };

  const handleStartInterview = () => setScreen("interview");

  const handleComplete = (completedSessions, sessionSummary) => {
    setSessions(completedSessions);
    setSummary(sessionSummary);

    const { autoSave } = loadSettings();
    if (autoSave) {
      saveSession({
        config,
        sessions: completedSessions,
        summary: sessionSummary,
      });
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
