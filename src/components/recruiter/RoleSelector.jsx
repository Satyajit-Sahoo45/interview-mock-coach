// components/recruiter/RoleSelector.jsx
// Shown on first sign-in — user picks Candidate or Recruiter
import { useState } from "react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { useToast } from "../ui/Toast";
import { setUserRole } from "../../utils/db-recruiter";
import useDB from "../../hooks/useDB";

export default function RoleSelector({ onRoleSelected }) {
  const { db, userId } = useDB();
  const toast = useToast();
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!selected || !db || !userId) return;
    setSaving(true);
    try {
      await setUserRole(db, userId, selected);
      onRoleSelected(selected);
    } catch (e) {
      toast.error("Failed to save role. Try again.");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-grid flex items-center justify-center px-4">
      <div
        className="pointer-events-none absolute -top-40 -left-40
        w-96 h-96 rounded-full bg-accent/5 blur-[120px]"
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0
        w-96 h-96 rounded-full bg-gold/5 blur-[120px]"
      />

      <div className="relative z-10 w-full max-w-xl">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-extrabold mb-3">
            Welcome to <span className="text-gradient-accent">InterviewAI</span>
          </h1>
          <p className="text-muted text-lg">
            How will you be using the platform?
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <RoleCard
            id="candidate"
            icon="🎯"
            title="I'm a Candidate"
            desc="Practice interviews, improve your skills, and apply to jobs posted by recruiters."
            perks={[
              "AI mock interviews",
              "MCQ quizzes",
              "Session history",
              "Apply to real job posts",
            ]}
            selected={selected === "candidate"}
            onSelect={() => setSelected("candidate")}
            color="accent"
          />
          <RoleCard
            id="recruiter"
            icon="🏢"
            title="I'm a Recruiter"
            desc="Post jobs with custom interview questions and find top candidates automatically."
            perks={[
              "Post job openings",
              "Custom questions",
              "Candidate ranking",
              "Shortlist top talent",
            ]}
            selected={selected === "recruiter"}
            onSelect={() => setSelected("recruiter")}
            color="gold"
          />
        </div>

        <Button
          onClick={handleConfirm}
          disabled={!selected || saving}
          className="w-full"
          size="lg"
        >
          {saving
            ? "Setting up your account..."
            : `Continue as ${selected === "recruiter" ? "Recruiter" : "Candidate"} →`}
        </Button>

        <p className="text-center text-muted text-xs mt-4 font-mono">
          You can switch roles later from your profile settings.
        </p>
      </div>
    </div>
  );
}

function RoleCard({ id, icon, title, desc, perks, selected, onSelect, color }) {
  const borderColor =
    color === "gold"
      ? selected
        ? "border-gold bg-gold/10"
        : "border-border hover:border-gold/40"
      : selected
        ? "border-accent bg-accent/10"
        : "border-border hover:border-accent/40";

  const titleColor =
    color === "gold"
      ? selected
        ? "text-gold"
        : "text-text"
      : selected
        ? "text-accent"
        : "text-text";

  return (
    <button
      onClick={onSelect}
      className={`p-6 rounded-2xl border text-left transition-all duration-200
        cursor-pointer ${borderColor}`}
    >
      <div className="text-4xl mb-3">{icon}</div>
      <div className={`font-display font-bold text-lg mb-2 ${titleColor}`}>
        {title}
      </div>
      <p className="text-muted text-sm leading-relaxed mb-4">{desc}</p>
      <ul className="space-y-1.5">
        {perks.map((p, i) => (
          <li key={i} className="text-xs text-text/70 flex items-center gap-2">
            <span className={color === "gold" ? "text-gold" : "text-accent"}>
              ✓
            </span>
            {p}
          </li>
        ))}
      </ul>
    </button>
  );
}
