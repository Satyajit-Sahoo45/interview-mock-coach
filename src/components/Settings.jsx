import { useState } from "react";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from "../utils/storage";
import { useToast } from "./ui/Toast";
import useDB from "../hooks/useDB";
import { saveSettingsToDB } from "../utils/db";

const PROVIDERS = [
  {
    id: "gemini",
    label: "Google Gemini",
    icon: "🔷",
    keyPrefix: "AIza",
    keyName: "gemini_api_key",
    windowKey: "__GEMINI_API_KEY__",
    docsUrl: "https://aistudio.google.com/app/apikey",
    free: true,
    models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
  },
  {
    id: "claude",
    label: "Anthropic Claude",
    icon: "🟠",
    keyPrefix: "sk-ant",
    keyName: "claude_api_key",
    windowKey: "__CLAUDE_API_KEY__",
    docsUrl: "https://console.anthropic.com",
    free: false,
    models: ["claude-sonnet-4-20250514", "claude-haiku-4-5-20251001"],
  },
  {
    id: "openai",
    label: "OpenAI GPT-4o",
    icon: "🟢",
    keyPrefix: "sk-",
    keyName: "openai_api_key",
    windowKey: "__OPENAI_API_KEY__",
    docsUrl: "https://platform.openai.com/api-keys",
    free: false,
    models: ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
  },
];

const QUESTION_COUNTS = [3, 5, 7, 10];

const THEMES = [
  { id: "dark", label: "Dark", icon: "🌑" },
  { id: "light", label: "Light", icon: "☀️" },
];

export default function Settings({ onBack }) {
  const { db, userId } = useDB();
  const toast = useToast();
  const [settings, setSettings] = useState(() => loadSettings());
  const [apiKeys, setApiKeys] = useState(() => ({
    gemini: localStorage.getItem("gemini_api_key") || "",
    claude: localStorage.getItem("claude_api_key") || "",
    openai: localStorage.getItem("openai_api_key") || "",
  }));
  const [visible, setVisible] = useState({});

  const set = (key, val) => setSettings((s) => ({ ...s, [key]: val }));

  // const handleSave = () => {
  //   // 1. Persist settings
  //   saveSettings(settings);

  //   // 2. Save all API keys to localStorage
  //   PROVIDERS.forEach((p) => {
  //     if (apiKeys[p.id]) {
  //       localStorage.setItem(p.keyName, apiKeys[p.id].trim());
  //     }
  //   });

  //   // 3. V3 FIX: Inject the ACTIVE provider's key into window so the
  //   //    dynamic import in useInterview.js picks it up immediately
  //   const activeProvider = PROVIDERS.find((p) => p.id === settings.provider);
  //   if (activeProvider && apiKeys[activeProvider.id]) {
  //     window[activeProvider.windowKey] = apiKeys[activeProvider.id].trim();
  //   }

  //   // 4. Apply theme to <html> so CSS variables activate
  //   document.documentElement.setAttribute("data-theme", settings.theme);

  //   toast.success("Settings saved! New provider active for next interview.");
  // };

  const handleSave = async () => {
    // 1. Save to localStorage (existing behaviour)
    saveSettings(settings);

    // 2. Save all API keys to localStorage (existing behaviour)
    PROVIDERS.forEach((p) => {
      if (apiKeys[p.id]) localStorage.setItem(p.keyName, apiKeys[p.id].trim());
    });

    // 3. Inject active provider's key into window (existing behaviour)
    const activeProvider = PROVIDERS.find((p) => p.id === settings.provider);
    if (activeProvider && apiKeys[activeProvider.id]) {
      window[activeProvider.windowKey] = apiKeys[activeProvider.id].trim();
    }

    // 4. Apply theme (existing behaviour)
    document.documentElement.setAttribute("data-theme", settings.theme);

    // 5. V4 NEW: also save settings to Supabase
    if (db && userId) {
      try {
        await saveSettingsToDB(db, userId, settings);
        toast.success("Settings saved to cloud!");
      } catch (e) {
        // Graceful fallback — local save already happened
        toast.warn("Saved locally. Cloud sync failed: " + e.message);
      }
    } else {
      toast.success("Settings saved!");
    }
  };

  const handleReset = () => {
    setSettings({ ...DEFAULT_SETTINGS });
    toast.info("Reset to defaults — click Save to apply.");
  };

  // Show which provider is currently active (from saved settings, not just UI state)
  const savedProvider = loadSettings().provider;

  return (
    <div className="min-h-screen bg-grid relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -right-40 w-96 h-96 rounded-full bg-accent/5 blur-[120px]" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">
        {/* ── Header ── */}
        <div className="animate-fade-in mb-10">
          <button
            onClick={onBack}
            className="text-muted hover:text-text text-sm font-mono mb-4 flex items-center gap-1 transition-colors"
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
          {/* ── AI Provider ── */}
          <Section
            title="AI Provider"
            desc="Choose which AI powers your interviews. Changes take effect on next session."
          >
            <div className="space-y-3">
              {PROVIDERS.map((p) => {
                const isActive = settings.provider === p.id;
                const isSaved = savedProvider === p.id;
                const keyVal = apiKeys[p.id] || "";
                const isValid = keyVal.startsWith(p.keyPrefix);

                return (
                  <div
                    key={p.id}
                    className={`rounded-xl border p-4 transition-all duration-200
                      ${isActive ? "border-accent bg-accent/5" : "border-border bg-card"}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <button
                        onClick={() => set("provider", p.id)}
                        className="flex items-center gap-3 flex-1 text-left cursor-pointer"
                      >
                        <span className="text-xl">{p.icon}</span>
                        <div>
                          <div
                            className={`font-display font-bold text-sm ${isActive ? "text-accent" : "text-text"}`}
                          >
                            {p.label}
                          </div>
                          <div className="flex gap-1.5 mt-1 flex-wrap">
                            {p.free && <Badge color="success">Free tier</Badge>}
                            {isSaved && <Badge color="accent">● Active</Badge>}
                          </div>
                        </div>
                        <div className="ml-auto">
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
                            ${isActive ? "border-accent" : "border-border"}`}
                          >
                            {isActive && (
                              <div className="w-2 h-2 rounded-full bg-accent" />
                            )}
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* API Key input */}
                    <div className="relative">
                      <input
                        type={visible[p.id] ? "text" : "password"}
                        value={keyVal}
                        onChange={(e) =>
                          setApiKeys((k) => ({ ...k, [p.id]: e.target.value }))
                        }
                        placeholder={`${p.keyPrefix}...`}
                        className={`
                          w-full px-3 py-2 pr-10 rounded-lg border bg-bg font-mono text-xs
                          outline-none transition-all placeholder:text-muted text-text
                          focus:border-accent
                          ${keyVal && !isValid ? "border-danger" : "border-border"}
                        `}
                      />
                      <button
                        onClick={() =>
                          setVisible((v) => ({ ...v, [p.id]: !v[p.id] }))
                        }
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors text-sm"
                      >
                        {visible[p.id] ? "🙈" : "👁️"}
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-1.5">
                      {keyVal && (
                        <span
                          className={`text-xs font-mono ${isValid ? "text-success" : "text-danger"}`}
                        >
                          {isValid ? "✓ Valid format" : "✕ Invalid format"}
                        </span>
                      )}
                      <a
                        href={p.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-mono text-accent/70 hover:text-accent ml-auto"
                      >
                        Get key →
                      </a>
                    </div>

                    {/* Model selector — shown only for active provider */}
                    {isActive && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <label className="text-xs font-mono text-muted block mb-1.5">
                          Model
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {p.models.map((m) => (
                            <button
                              key={m}
                              onClick={() => set("model", m)}
                              className={`
                                px-2.5 py-1 rounded-lg text-xs font-mono border transition-all cursor-pointer
                                ${
                                  settings.model === m ||
                                  (settings.model === "auto" &&
                                    m === p.models[0])
                                    ? "border-accent bg-accent/10 text-accent"
                                    : "border-border text-muted hover:text-text"
                                }
                              `}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-muted/60 font-mono mt-1.5">
                          💡 First model is the default. Changing model requires
                          updating the api file's MODEL constant.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ── Interview Preferences ── */}
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
                        flex-1 py-2.5 rounded-xl border font-display font-bold text-sm
                        transition-all duration-200 cursor-pointer
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

          {/* ── Appearance ── */}
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
                    flex-1 py-3 rounded-xl border font-display font-bold text-sm
                    transition-all duration-200 cursor-pointer flex items-center justify-center gap-2
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
              💡 Preview updates live. Click Save Settings to persist across
              sessions.
            </p>
          </Section>

          {/* ── Save / Reset ── */}
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
    <Card className="p-5">
      <div className="mb-4">
        <h2 className="font-display font-bold text-base text-text">{title}</h2>
        <p className="text-muted text-xs mt-0.5">{desc}</p>
      </div>
      {children}
    </Card>
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
          relative w-11 h-6 rounded-full border transition-all duration-300 shrink-0 cursor-pointer
          ${value ? "bg-accent border-accent" : "bg-subtle border-border"}
        `}
      >
        <span
          className={`
          absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300
          ${value ? "left-5" : "left-0.5"}
        `}
        />
      </button>
    </div>
  );
}
