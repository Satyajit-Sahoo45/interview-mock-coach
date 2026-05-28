import { useState } from "react";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Tabs from "./ui/Tabs";
import Modal from "./ui/Modal";
import { ROLES, INTERVIEW_TYPES, DIFFICULTIES } from "../utils/prompts";
import { loadAllSessions } from "../utils/storage";

export default function Home({ onStart, onHistory }) {
  const [role, setRole] = useState(null);
  const [type, setType] = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("gemini_api_key") || "",
  );
  const [keyVisible, setKeyVisible] = useState(false);
  // V2: Job description
  const [showJDModal, setShowJDModal] = useState(false);
  const [jobDesc, setJobDesc] = useState("");
  const [jdSaved, setJdSaved] = useState(false);

  const pastCount = loadAllSessions().length;

  const canStart =
    role && type && difficulty && apiKey.trim().startsWith("AIza");

  const handleStart = () => {
    localStorage.setItem("gemini_api_key", apiKey.trim());
    window.__GEMINI_API_KEY__ = apiKey.trim();
    onStart({ role, type, difficulty, jobDescription: jobDesc });
  };

  const handleSaveJD = () => {
    setJdSaved(!!jobDesc.trim());
    setShowJDModal(false);
  };

  return (
    <div className="min-h-screen bg-grid relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full bg-accent/5 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-gold/5 blur-[120px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        {/* ── Top bar ── */}
        <div className="flex justify-end mb-6 animate-fade-in">
          <button
            onClick={onHistory}
            className="flex items-center gap-2 text-sm font-mono text-muted
              hover:text-accent transition-colors border border-border
              hover:border-accent/40 px-3 py-1.5 rounded-lg bg-card/50"
          >
            📊 History
            {pastCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-accent/20 text-accent text-xs">
                {pastCount}
              </span>
            )}
          </button>
        </div>

        {/* ── Header ── */}
        <div className="text-center mb-14 animate-fade-in">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
            border border-accent/20 bg-accent/5 text-accent text-xs font-mono mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-slow" />
            AI-Powered Mock Interviewer — V2
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-extrabold leading-tight mb-4">
            Practice Like It's{" "}
            <span className="text-gradient-accent">Real.</span>
          </h1>
          <p className="text-muted text-lg max-w-xl mx-auto">
            Voice input · Follow-up questions · Job-description tailoring · Full
            history
          </p>
        </div>

        {/* Step 1 — Role */}
        <section className="mb-8 animate-slide-up stagger-1">
          <Label step="01" title="Pick Your Role" />
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
            {ROLES.map((r) => (
              <RoleCard
                key={r.id}
                role={r}
                selected={role === r.id}
                onSelect={() => setRole(r.id)}
              />
            ))}
          </div>
        </section>

        {/* Step 2 — Interview Type */}
        <section className="mb-8 animate-slide-up stagger-2">
          <Label step="02" title="Interview Type" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            {INTERVIEW_TYPES.map((t) => (
              <TypeCard
                key={t.id}
                item={t}
                selected={type === t.id}
                onSelect={() => setType(t.id)}
              />
            ))}
          </div>
        </section>

        {/* Step 3 — Difficulty */}
        <section className="mb-8 animate-slide-up stagger-3">
          <Label step="03" title="Difficulty Level" />
          <div className="flex gap-3 mt-3 flex-wrap">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                onClick={() => setDifficulty(d.id)}
                className={`
                  flex-1 min-w-[100px] py-3 rounded-xl border font-display font-semibold text-sm
                  transition-all duration-200 cursor-pointer
                  ${
                    difficulty === d.id
                      ? "border-gold bg-gold/10 text-gold shadow-[0_0_20px_rgba(255,184,0,0.15)]"
                      : "border-border text-muted hover:border-border-light hover:text-text"
                  }
                `}
              >
                <div className="text-base">{d.label}</div>
                <div className="text-xs opacity-60 font-mono font-normal mt-0.5">
                  {d.range}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Step 4 — V2: Job Description (optional) */}
        <section className="mb-8 animate-slide-up stagger-4">
          <div className="flex items-center justify-between">
            <Label step="04" title="Job Description" />
            <span className="text-xs font-mono text-muted/60">Optional</span>
          </div>
          <div className="mt-3">
            <button
              onClick={() => setShowJDModal(true)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left
                transition-all duration-200
                ${
                  jdSaved
                    ? "border-success/30 bg-success/5 text-success"
                    : "border-border text-muted hover:border-border-light hover:text-text bg-card"
                }
              `}
            >
              <span className="text-lg">{jdSaved ? "✅" : "📋"}</span>
              <div>
                <div className="text-sm font-display font-semibold">
                  {jdSaved ? "Job description added" : "Paste job description"}
                </div>
                <div className="text-xs opacity-60 mt-0.5">
                  {jdSaved
                    ? "AI will tailor questions to this role"
                    : "AI will generate generic questions without it"}
                </div>
              </div>
              <span className="ml-auto text-xs">
                {jdSaved ? "Edit →" : "Add →"}
              </span>
            </button>
          </div>
        </section>

        {/* Step 5 — API Key */}
        <section className="mb-10 animate-slide-up stagger-5">
          <Label step="05" title="Gemini API Key" />
          <div className="mt-3 relative">
            <input
              type={keyVisible ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              className={`
                w-full px-4 py-3 pr-12 rounded-xl border bg-card font-mono text-sm
                outline-none transition-all duration-200 placeholder:text-muted text-text
                focus:border-accent focus:shadow-[0_0_0_3px_rgba(0,194,255,0.1)]
                ${
                  apiKey.trim() && !apiKey.trim().startsWith("AIza")
                    ? "border-danger"
                    : "border-border"
                }
              `}
            />
            <button
              onClick={() => setKeyVisible((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
            >
              {keyVisible ? "🙈" : "👁️"}
            </button>
          </div>
          <p className="text-muted text-xs mt-2 font-mono">
            Stored in your browser only. Get a free key at{" "}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              aistudio.google.com
            </a>
          </p>
        </section>

        <div className="flex flex-col sm:flex-row gap-3 justify-center animate-slide-up">
          <Button
            size="lg"
            disabled={!canStart}
            onClick={handleStart}
            className="flex-1 max-w-sm"
          >
            Start Interview →
          </Button>
        </div>

        {!canStart && (role || type || difficulty) && (
          <p className="text-center text-muted text-xs mt-3 font-mono">
            {!apiKey.trim().startsWith("AIza")
              ? "⚠️ Enter a valid Gemini API key (starts with AIza)"
              : "Complete all steps above to continue"}
          </p>
        )}

        {/* V2 feature pills */}
        <div className="mt-12 flex flex-wrap justify-center gap-2 animate-fade-in">
          {[
            "🎤 Voice Input",
            "💬 Follow-up Questions",
            "📋 JD Tailoring",
            "📊 History",
            "🔄 Retry",
          ].map((f) => (
            <span
              key={f}
              className="px-3 py-1.5 rounded-full border border-border
              bg-subtle/50 text-muted text-xs font-mono"
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* ── Job Description Modal ── */}
      <Modal
        isOpen={showJDModal}
        onClose={() => setShowJDModal(false)}
        title="Paste Job Description"
        width="max-w-2xl"
      >
        <p className="text-muted text-sm mb-4">
          The AI will read this and tailor interview questions to the exact
          skills, responsibilities, and requirements of the role.
        </p>
        <textarea
          value={jobDesc}
          onChange={(e) => setJobDesc(e.target.value)}
          rows={10}
          placeholder="Paste the full job description here...&#10;&#10;e.g. We are looking for a Senior Frontend Developer with 5+ years of experience in React..."
          className="w-full px-4 py-3 rounded-xl border border-border bg-bg
            font-body text-sm text-text placeholder:text-muted
            outline-none transition-all focus:border-accent
            focus:shadow-[0_0_0_3px_rgba(0,194,255,0.08)]"
        />
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs font-mono text-muted">
            {jobDesc.trim().split(/\s+/).filter(Boolean).length} words
            {jobDesc.length > 800 && " · Only first 800 chars used"}
          </span>
          <div className="flex gap-2">
            {jobDesc && (
              <Button size="sm" variant="ghost" onClick={() => setJobDesc("")}>
                Clear
              </Button>
            )}
            <Button size="sm" onClick={handleSaveJD}>
              {jobDesc.trim() ? "Save & Use" : "Skip"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Label({ step, title }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-mono text-muted/60">{step}</span>
      <h2 className="font-display font-bold text-lg text-text">{title}</h2>
    </div>
  );
}

function RoleCard({ role, selected, onSelect }) {
  return (
    <button
      onClick={onSelect}
      className={`
        py-3 px-2 rounded-xl border text-center transition-all duration-200 cursor-pointer
        ${
          selected
            ? "border-accent bg-accent/10 text-accent shadow-[0_0_20px_rgba(0,194,255,0.12)]"
            : "border-border bg-card text-muted hover:border-border-light hover:text-text"
        }
      `}
    >
      <div className="text-xl mb-1">{role.icon}</div>
      <div className="text-xs font-display font-semibold leading-tight">
        {role.label}
      </div>
    </button>
  );
}

function TypeCard({ item, selected, onSelect }) {
  return (
    <button
      onClick={onSelect}
      className={`
        p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer
        ${
          selected
            ? "border-accent bg-accent/10 shadow-[0_0_25px_rgba(0,194,255,0.12)]"
            : "border-border bg-card hover:border-border-light"
        }
      `}
    >
      <div className="text-2xl mb-2">{item.icon}</div>
      <div
        className={`font-display font-bold text-sm mb-1 ${selected ? "text-accent" : "text-text"}`}
      >
        {item.label}
      </div>
      <div className="text-muted text-xs leading-relaxed">{item.desc}</div>
    </button>
  );
}
