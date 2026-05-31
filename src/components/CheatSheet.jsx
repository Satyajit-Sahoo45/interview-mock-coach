import { useState, useEffect } from "react";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import DotLoader from "./ui/DotLoader";
import { ROLES, INTERVIEW_TYPES } from "../utils/prompts";
import { useToast } from "./ui/Toast";
import { loadSettings } from "../utils/storage";
import { sanitizeError } from "../utils/sanitize";

function getApiModule() {
  const provider = loadSettings().provider || "gemini";
  switch (provider) {
    case "claude":
      return import("../utils/api.js");
    case "openai":
      return import("../utils/api-openai.js");
    default:
      return import("../utils/api-gemini.js");
  }
}

export default function CheatSheet({ config, onBack, onStartInterview }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();

  const roleLabel =
    ROLES.find((r) => r.id === config?.role)?.label || config?.role || "";
  const typeLabel =
    INTERVIEW_TYPES.find((t) => t.id === config?.type)?.label ||
    config?.type ||
    "";

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { fetchCheatSheet } = await getApiModule();
        const d = await fetchCheatSheet(
          roleLabel,
          config.type,
          config.difficulty,
          config.jobDescription || "",
        );
        if (mounted) {
          setData(d);
          setLoading(false);
        }
      } catch (e) {
        if (mounted) {
          setError(sanitizeError(e));
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleCopy = () => {
    if (!data) return;
    const text = [
      `📋 Pre-Interview Cheat Sheet`,
      `Role: ${roleLabel} | Type: ${typeLabel} | Level: ${config.difficulty}`,
      "",
      "🎯 Key Topics:",
      ...(data.keyTopics || []).map((t) => `  • ${t}`),
      "",
      "💬 Power Phrases:",
      ...(data.powerPhrases || []).map((p) => `  • "${p}"`),
      "",
      "🚫 Avoid:",
      ...(data.commonMistakes || []).map((m) => `  • ${m}`),
      "",
      "❓ Ask the Interviewer:",
      ...(data.questionsToAsk || []).map((q) => `  • ${q}`),
    ].join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Cheat sheet copied!");
  };

  return (
    <div className="min-h-screen bg-grid relative overflow-hidden">
      <div
        className="pointer-events-none absolute top-0 right-0
        w-96 h-96 rounded-full bg-gold/5 blur-[120px]"
      />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">
        <div className="animate-fade-in mb-8">
          <button
            onClick={onBack}
            className="text-muted hover:text-text text-sm font-mono mb-4
              flex items-center gap-1 transition-colors"
          >
            ← Back
          </button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-extrabold">
                📋 <span className="text-gradient-gold">Cheat Sheet</span>
              </h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge color="accent">{roleLabel}</Badge>
                <Badge color="muted">{typeLabel}</Badge>
                <Badge color="gold">{config?.difficulty}</Badge>
                {config?.jobDescription && (
                  <Badge color="success">📋 JD Tailored</Badge>
                )}
              </div>
            </div>
            {data && (
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="ghost" onClick={handleCopy}>
                  📋 Copy
                </Button>
                <Button size="sm" onClick={onStartInterview}>
                  Start Interview →
                </Button>
              </div>
            )}
          </div>
          <p className="text-muted text-sm mt-3">
            Study this before you start. AI-generated based on your role and
            level.
          </p>
        </div>

        {loading && (
          <Card className="p-16 flex items-center justify-center">
            <DotLoader label="Generating your cheat sheet..." />
          </Card>
        )}

        {error && !loading && (
          <Card className="p-6 border-danger/30 bg-danger/5">
            <p className="text-danger text-sm font-mono mb-4">⚠️ {error}</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </Card>
        )}

        {data && !loading && (
          <div className="space-y-5 animate-slide-up">
            <Card className="p-5">
              <SectionHead
                icon="🎯"
                title="Key Topics to Cover"
                color="text-accent"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {data.keyTopics?.map((t, i) => (
                  <Badge key={i} color="accent">
                    {t}
                  </Badge>
                ))}
              </div>
            </Card>

            {data.starExamples?.length > 0 && (
              <Card className="p-5">
                <SectionHead
                  icon="⭐"
                  title="STAR Example to Prepare"
                  color="text-gold"
                />
                {data.starExamples.map((ex, i) => (
                  <div key={i} className="mt-3 space-y-2">
                    {["situation", "task", "action", "result"].map((k) => (
                      <div key={k} className="flex gap-3">
                        <span className="text-xs font-mono text-gold/70 w-16 shrink-0 uppercase pt-0.5">
                          {k}
                        </span>
                        <p className="text-sm text-text/80 leading-relaxed">
                          {ex[k]}
                        </p>
                      </div>
                    ))}
                  </div>
                ))}
              </Card>
            )}

            <Card className="p-5">
              <SectionHead
                icon="💬"
                title="Power Phrases to Use"
                color="text-success"
              />
              <ul className="mt-3 space-y-2">
                {data.powerPhrases?.map((p, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-text/80
                    px-3 py-2 rounded-lg bg-success/5 border border-success/10"
                  >
                    <span className="text-success shrink-0 mt-0.5">»</span>
                    <span className="italic">"{p}"</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-5">
              <SectionHead
                icon="🚫"
                title="Common Mistakes to Avoid"
                color="text-danger"
              />
              <ul className="mt-3 space-y-2">
                {data.commonMistakes?.map((m, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-text/80"
                  >
                    <span className="text-danger shrink-0 mt-0.5">✕</span>
                    {m}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-5">
              <SectionHead
                icon="❓"
                title="Questions to Ask the Interviewer"
                color="text-warn"
              />
              <ul className="mt-3 space-y-2">
                {data.questionsToAsk?.map((q, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-text/80"
                  >
                    <span className="text-warn shrink-0 mt-0.5 font-bold">
                      {i + 1}.
                    </span>
                    {q}
                  </li>
                ))}
              </ul>
            </Card>

            <Button onClick={onStartInterview} className="w-full" size="lg">
              I'm Ready — Start Interview →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHead({ icon, title, color }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xl">{icon}</span>
      <span className={`font-display font-bold text-sm ${color}`}>{title}</span>
    </div>
  );
}
