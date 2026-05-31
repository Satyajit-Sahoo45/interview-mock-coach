import { useState } from "react";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Modal from "./ui/Modal";
import { ROLES, INTERVIEW_TYPES, DIFFICULTIES } from "../utils/prompts";
import { loadAllSessions, loadSettings } from "../utils/storage";
import { sanitizeConfig } from "../utils/sanitize";
import { useToast } from "./ui/Toast";
import UserMenu from "./auth/UserMenu";
import { SignedIn, UserButton } from "@clerk/clerk-react";

export default function Home({ onStart, onHistory, onSettings }) {
  const settings = loadSettings();
  const toast = useToast();
  const pastCount = loadAllSessions().length;

  const [role, setRole] = useState(null);
  const [type, setType] = useState(null);
  const [difficulty, setDifficulty] = useState(null);
  const [showJD, setShowJD] = useState(false);
  const [jobDesc, setJobDesc] = useState("");
  const [jdSaved, setJdSaved] = useState(false);

  const canStart = role && type && difficulty;

  const handleStart = () => {
    if (!canStart) {
      toast.warn("Complete all steps first.");
      return;
    }

    // Sanitize + validate all config values before use
    const safeConfig = sanitizeConfig({
      role,
      type,
      difficulty,
      jobDescription: jobDesc,
    });
    onStart(safeConfig);
  };

  return (
    <div className="min-h-screen bg-grid relative overflow-hidden">
      <div
        className="pointer-events-none absolute -top-40 -left-40
        w-96 h-96 rounded-full bg-accent/5 blur-[120px]"
      />
      <div
        className="pointer-events-none absolute top-1/2 -right-40
        w-96 h-96 rounded-full bg-gold/5 blur-[120px]"
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        {/* Top bar */}
        <div className="flex justify-end gap-2 mb-6 animate-fade-in">
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
          <button
            onClick={onSettings}
            className="flex items-center gap-2 text-sm font-mono text-muted
              hover:text-text transition-colors border border-border
              hover:border-border-light px-3 py-1.5 rounded-lg bg-card/50"
          >
            ⚙️ Settings
          </button>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>

        {/* Header */}
        <div className="text-center mb-14 animate-fade-in">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
            border border-accent/20 bg-accent/5 text-accent text-xs font-mono mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-slow" />
            AI-Powered Mock Interviewer
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-extrabold leading-tight mb-4">
            Practice Like It's{" "}
            <span className="text-gradient-accent">Real.</span>
          </h1>
          <p className="text-muted text-lg max-w-xl mx-auto">
            Cheat sheets · Voice input · Follow-ups · Resume tips · MCQ quizzes
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
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3">
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
                  flex-1 min-w-[100px] py-3 rounded-xl border
                  font-display font-semibold text-sm
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

        {/* Step 4 — Job Description (optional) */}
        <section className="mb-10 animate-slide-up stagger-4">
          <div className="flex items-center justify-between">
            <Label step="04" title="Job Description" />
            <span className="text-xs font-mono text-muted/60">Optional</span>
          </div>
          <button
            onClick={() => setShowJD(true)}
            className={`
              mt-3 w-full flex items-center gap-3 px-4 py-3 rounded-xl
              border text-left transition-all duration-200
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
                {jdSaved
                  ? "Job description added — AI will tailor questions"
                  : "Paste job description"}
              </div>
              <div className="text-xs opacity-60 mt-0.5">
                {jdSaved
                  ? `${jobDesc.trim().split(/\s+/).filter(Boolean).length} words`
                  : "Skip for generic questions"}
              </div>
            </div>
            <span className="ml-auto text-xs">
              {jdSaved ? "Edit →" : "Add →"}
            </span>
          </button>
        </section>

        {/* CTA */}
        <div className="flex flex-col gap-3 animate-slide-up">
          <button
            disabled={!canStart}
            onClick={handleStart}
            className={`
              w-full py-4 rounded-xl font-display font-bold text-base
              transition-all duration-200 cursor-pointer
              disabled:opacity-40 disabled:cursor-not-allowed
              ${
                canStart
                  ? "bg-accent text-bg shadow-[0_0_30px_rgba(0,194,255,0.35)] hover:shadow-[0_0_45px_rgba(0,194,255,0.5)] hover:bg-accent-dim"
                  : "bg-accent/30 text-bg/60 border border-accent/20"
              }
            `}
          >
            {type === "mcq"
              ? canStart
                ? "🎯 Start MCQ Quiz →"
                : "Complete all steps above"
              : canStart
                ? "📋 Get Cheat Sheet & Start →"
                : "Complete all steps above"}
          </button>
        </div>

        {/* Feature pills */}
        <div className="mt-12 flex flex-wrap justify-center gap-2 animate-fade-in">
          {[
            "🎤 Voice Input",
            "💬 Follow-ups",
            "🔄 Retry",
            "📋 Cheat Sheet",
            "📄 Resume Tips",
            "🎯 MCQ Quiz",
            "📊 History",
            "⚙️ Settings",
            "🔒 Secure",
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

      {/* Job Description Modal */}
      <Modal
        isOpen={showJD}
        onClose={() => setShowJD(false)}
        title="Paste Job Description"
        width="max-w-2xl"
      >
        <p className="text-muted text-sm mb-4">
          AI will tailor every question to the exact skills and responsibilities
          mentioned.
        </p>
        <textarea
          value={jobDesc}
          onChange={(e) => setJobDesc(e.target.value)}
          rows={10}
          maxLength={3000}
          placeholder="Paste the full job description here..."
          className="w-full px-4 py-3 rounded-xl border border-border bg-bg
            font-body text-sm text-text placeholder:text-muted
            outline-none transition-all
            focus:border-accent focus:shadow-[0_0_0_3px_rgba(0,194,255,0.08)]"
        />
        <div className="flex items-center justify-between mt-4">
          <span
            className={`text-xs font-mono ${jobDesc.length > 2700 ? "text-warn" : "text-muted"}`}
          >
            {jobDesc.length} / 3000 chars
          </span>
          <div className="flex gap-2">
            {jobDesc && (
              <Button size="sm" variant="ghost" onClick={() => setJobDesc("")}>
                Clear
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                setJdSaved(!!jobDesc.trim());
                setShowJD(false);
              }}
            >
              {jobDesc.trim() ? "Save & Use" : "Skip"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

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
        py-3 px-2 rounded-xl border text-center
        transition-all duration-200 cursor-pointer
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
        p-4 rounded-xl border text-left
        transition-all duration-200 cursor-pointer
        ${
          selected
            ? "border-accent bg-accent/10 shadow-[0_0_25px_rgba(0,194,255,0.12)]"
            : "border-border bg-card hover:border-border-light"
        }
      `}
    >
      <div className="text-2xl mb-2">{item.icon}</div>
      <div
        className={`font-display font-bold text-sm mb-1
        ${selected ? "text-accent" : "text-text"}`}
      >
        {item.label}
      </div>
      <div className="text-muted text-xs leading-relaxed">{item.desc}</div>
    </button>
  );
}
