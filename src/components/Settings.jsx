import { useState } from "react";
import Card from "./ui/Card";
import Button from "./ui/Button";
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from "../utils/storage";
import { saveSettingsToDB } from "../utils/db";
import { validateSettings } from "../utils/sanitize";
import { useToast } from "./ui/Toast";
import useDB from "../hooks/useDB";

const PROVIDERS = [
  { id: "gemini", label: "Google Gemini", icon: "🔷", free: true },
  { id: "claude", label: "Anthropic Claude", icon: "🟠", free: false },
  { id: "openai", label: "OpenAI GPT-4o", icon: "🟢", free: false },
];

const QUESTION_COUNTS = [3, 5, 7, 10];
const THEMES = [
  { id: "dark", label: "Dark", icon: "🌑" },
  { id: "light", label: "Light", icon: "☀️" },
];

export default function Settings({ onBack }) {
  const toast = useToast();
  const { db, userId } = useDB();
  const [settings, setSettings] = useState(() => loadSettings());

  const set = (key, val) => setSettings((s) => ({ ...s, [key]: val }));

  const handleSave = async () => {
    // 1. Validate all values before saving — prevents arbitrary data in DB
    const safe = validateSettings(settings);

    // 2. Save validated settings locally
    saveSettings(safe);

    // 3. Apply theme immediately
    document.documentElement.setAttribute("data-theme", safe.theme);

    // 4. Save validated settings to Supabase
    if (db && userId) {
      try {
        await saveSettingsToDB(db, userId, safe);
        toast.success("Settings saved to cloud!");
      } catch (e) {
        toast.warn("Saved locally. Cloud sync failed.");
      }
    } else {
      toast.success("Settings saved!");
    }
  };

  const handleReset = () => {
    setSettings({ ...DEFAULT_SETTINGS });
    toast.info("Reset to defaults — click Save to apply.");
  };

  const savedProvider = loadSettings().provider;

  return (
    <div className="min-h-screen bg-grid relative overflow-hidden">
      <div
        className="pointer-events-none absolute -top-40 -right-40
        w-96 h-96 rounded-full bg-accent/5 blur-[120px]"
      />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="animate-fade-in mb-10">
          <button
            onClick={onBack}
            className="text-muted hover:text-text text-sm font-mono mb-4
              flex items-center gap-1 transition-colors"
          >
            ← Back
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-extrabold">
                ⚙️ <span className="text-gradient-accent">Settings</span>
              </h1>
              <p className="text-muted text-sm mt-1">
                Active provider:{" "}
                <span className="text-accent font-mono">{savedProvider}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* AI Provider */}
          <Section
            title="AI Provider"
            desc="Choose which AI model powers your interviews. Keys are configured server-side."
          >
            {/* Security note */}
            <div
              className="flex items-start gap-2 px-3 py-2.5 rounded-lg
              border border-success/20 bg-success/5 mb-4"
            >
              <span className="text-success shrink-0 mt-0.5">🔒</span>
              <p className="text-xs text-success/80">
                API keys are stored securely in server environment variables —
                never in your browser. Switch providers by updating your Vercel
                environment variables.
              </p>
            </div>

            <div className="space-y-2">
              {PROVIDERS.map((p) => {
                const isActive = settings.provider === p.id;
                const isSaved = savedProvider === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => set("provider", p.id)}
                    className={`
                      w-full flex items-center gap-3 p-4 rounded-xl border
                      text-left transition-all duration-200 cursor-pointer
                      ${
                        isActive
                          ? "border-accent bg-accent/5"
                          : "border-border bg-card hover:border-border-light"
                      }
                    `}
                  >
                    <span className="text-xl">{p.icon}</span>
                    <div className="flex-1">
                      <div
                        className={`font-display font-bold text-sm
                        ${isActive ? "text-accent" : "text-text"}`}
                      >
                        {p.label}
                      </div>
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        {p.free && (
                          <span
                            className="text-xs font-mono text-success
                            border border-success/20 px-1.5 py-0.5 rounded-full"
                          >
                            Free tier
                          </span>
                        )}
                        {isSaved && (
                          <span
                            className="text-xs font-mono text-accent
                            border border-accent/20 px-1.5 py-0.5 rounded-full"
                          >
                            ● Active
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex
                      items-center justify-center shrink-0
                      ${isActive ? "border-accent" : "border-border"}`}
                    >
                      {isActive && (
                        <div className="w-2 h-2 rounded-full bg-accent" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Interview Preferences */}
          <Section
            title="Interview Preferences"
            desc="Adjust how your sessions are structured."
          >
            <div className="space-y-5">
              <div>
                <label className="text-xs font-mono text-muted mb-2 block">
                  Questions per session
                </label>
                <div className="flex gap-2">
                  {QUESTION_COUNTS.map((n) => (
                    <button
                      key={n}
                      onClick={() => set("questionCount", n)}
                      className={`
                        flex-1 py-2.5 rounded-xl border font-display
                        font-bold text-sm transition-all duration-200 cursor-pointer
                        ${
                          settings.questionCount === n
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border text-muted hover:border-border-light hover:text-text"
                        }
                      `}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted/60 font-mono mt-1.5">
                  ~{settings.questionCount * 3}–{settings.questionCount * 5} min
                  per session
                </p>
              </div>

              <div className="space-y-3">
                <Toggle
                  label="Voice Input"
                  desc="Enable microphone for speaking answers"
                  value={settings.voiceEnabled}
                  onChange={(v) => set("voiceEnabled", v)}
                />
                <Toggle
                  label="Auto-save Sessions"
                  desc="Automatically save every completed session to history"
                  value={settings.autoSave}
                  onChange={(v) => set("autoSave", v)}
                />
                <Toggle
                  label="Show Ideal Topics"
                  desc="Display key topics to cover before you answer"
                  value={settings.showIdealTopics}
                  onChange={(v) => set("showIdealTopics", v)}
                />
              </div>
            </div>
          </Section>

          {/* Appearance */}
          <Section title="Appearance" desc="Choose your preferred color theme.">
            <div className="flex gap-3">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    set("theme", t.id);
                    document.documentElement.setAttribute("data-theme", t.id);
                  }}
                  className={`
                    flex-1 py-3 rounded-xl border font-display font-bold
                    text-sm transition-all duration-200 cursor-pointer
                    flex items-center justify-center gap-2
                    ${
                      settings.theme === t.id
                        ? "border-gold bg-gold/10 text-gold"
                        : "border-border text-muted hover:border-border-light hover:text-text"
                    }
                  `}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted/60 font-mono mt-2">
              💡 Preview updates live. Click Save to persist.
            </p>
          </Section>

          {/* Save / Reset */}
          <div className="flex gap-3">
            <Button onClick={handleSave} size="lg" className="flex-1">
              Save Settings
            </Button>
            <Button onClick={handleReset} variant="ghost" size="lg">
              Reset Defaults
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, desc, children }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="mb-4">
        <h2 className="font-display font-bold text-base text-text">{title}</h2>
        <p className="text-muted text-xs mt-0.5">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, desc, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-display font-semibold text-text">
          {label}
        </div>
        <div className="text-xs text-muted mt-0.5">{desc}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`
          relative w-11 h-6 rounded-full border
          transition-all duration-300 shrink-0 cursor-pointer
          ${value ? "bg-accent border-accent" : "bg-subtle border-border"}
        `}
      >
        <span
          className={`
          absolute top-0.5 w-5 h-5 rounded-full bg-white shadow
          transition-all duration-300
          ${value ? "left-5" : "left-0.5"}
        `}
        />
      </button>
    </div>
  );
}
