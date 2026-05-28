import { useState } from "react";
import Home from "./components/Home";
import InterviewRoom from "./components/InterviewRoom";
import SessionReport from "./components/SessionReport";
import History from "./components/History";
import { saveSession } from "./utils/storage";

export default function App() {
  // Screens: 'home' | 'interview' | 'report'
  const [screen, setScreen] = useState("home");
  const [config, setConfig] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [summary, setSummary] = useState(null);

  const handleStart = (cfg) => {
    setConfig(cfg);
    setSessions([]);
    setSummary(null);
    setScreen("interview");
  };

  const handleComplete = (completedSessions, sessionSummary) => {
    setSessions(completedSessions);
    setSummary(sessionSummary);
    // V2: auto-save to localStorage
    saveSession({
      config,
      sessions: completedSessions,
      summary: sessionSummary,
    });
    setScreen("report");
  };

  const handleRestart = () => {
    setScreen("home");
    setConfig(null);
    setSessions([]);
    setSummary(null);
  };

  return (
    <div className="min-h-screen bg-bg text-text font-body">
      {screen === "home" && (
        <Home onStart={handleStart} onHistory={() => setScreen("history")} />
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
    </div>
  );
}
