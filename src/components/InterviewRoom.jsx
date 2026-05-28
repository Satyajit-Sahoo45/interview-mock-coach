import { useEffect } from "react";
import useInterview from "../hooks/useInterview";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import Card from "./ui/Card";
import DotLoader from "./ui/DotLoader";
import ScoreRing from "./ui/ScoreRing";
import VoiceRecorder from "./ui/VoiceRecorder";
import { ROLES, INTERVIEW_TYPES } from "../utils/prompts";

export default function InterviewRoom({ config, onComplete, onExit }) {
  const iv = useInterview(config);

  useEffect(() => {
    iv.startInterview();
  }, []);

  useEffect(() => {
    if (iv.state === "done" && iv.summary) {
      onComplete(iv.sessions, iv.summary);
    }
  }, [iv.state, iv.summary]);

  const roleLabel =
    ROLES.find((r) => r.id === config.role)?.label || config.role;
  const typeLabel =
    INTERVIEW_TYPES.find((t) => t.id === config.type)?.label || config.type;
  const progress = (iv.qIndex / iv.totalQuestions) * 100;

  return (
    <div className="min-h-screen bg-grid relative">
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-64
        bg-accent/5 blur-[100px] rounded-full"
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        {/* ── Top Bar ── */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={onExit}
              className="text-muted hover:text-text transition-colors text-sm font-mono"
            >
              ← Exit
            </button>
            <span className="text-border">|</span>
            <Badge color="accent">{roleLabel}</Badge>
            <Badge color="muted">{typeLabel}</Badge>
            <Badge color="gold">{config.difficulty}</Badge>
            {config.jobDescription && <Badge color="success">📋 JD</Badge>}
          </div>
          <div className="text-muted text-xs font-mono">
            {Math.min(iv.qIndex + 1, iv.totalQuestions)} / {iv.totalQuestions}
          </div>
        </header>

        {/* ── Progress Bar ── */}
        <div className="w-full h-1 bg-border rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* ── Error ── */}
        {iv.error && (
          <Card className="p-4 border-danger/30 bg-danger/5 mb-5">
            <p className="text-danger text-sm font-mono">⚠️ {iv.error}</p>
          </Card>
        )}

        {/* ── Loading ── */}
        {iv.state === "loading-question" && (
          <Card className="p-16 flex items-center justify-center">
            <DotLoader
              label={
                iv.qIndex === 0
                  ? "Preparing your first question..."
                  : iv.sessions.length >= iv.totalQuestions - 1
                    ? "Generating your report..."
                    : "Loading next question..."
              }
            />
          </Card>
        )}

        {/* ── Main Question + Answer ── */}
        {[
          "answering",
          "evaluating",
          "feedback",
          "followup-loading",
          "followup-answering",
          "followup-evaluating",
          "followup-feedback",
        ].includes(iv.state) &&
          iv.currentQ && (
            <div className="space-y-5 animate-fade-in">
              {/* Category + retry badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-muted text-xs font-mono">Category</span>
                  <Badge color="muted">{iv.currentQ.category}</Badge>
                </div>
                {iv.retryCount > 0 && (
                  <Badge color="warn">🔄 Retry #{iv.retryCount}</Badge>
                )}
              </div>

              {/* Question Card */}
              <Card glow className="p-6">
                <p className="font-display text-xl font-semibold text-text leading-relaxed">
                  {iv.currentQ.question}
                </p>
              </Card>

              {/* Ideal topics */}
              {iv.currentQ.idealTopics?.length > 0 &&
                iv.state === "answering" && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs font-mono text-muted/60 self-center">
                      Cover:
                    </span>
                    {iv.currentQ.idealTopics.map((t, i) => (
                      <Badge key={i} color="muted">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}

              {/* Hint toggle */}
              {iv.currentQ.hints?.length > 0 && iv.state === "answering" && (
                <div>
                  <button
                    onClick={() => iv.setShowHint((v) => !v)}
                    className="text-xs font-mono text-muted hover:text-accent transition-colors flex items-center gap-1"
                  >
                    {iv.showHint ? "▼ Hide hint" : "▶ Show hint"}
                  </button>
                  {iv.showHint && (
                    <div className="mt-2 p-3 rounded-lg border border-gold/20 bg-gold/5 text-xs text-gold/80 font-mono space-y-1">
                      {iv.currentQ.hints.map((h, i) => (
                        <div key={i}>💡 {h}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Answer Area ── */}
              {[
                "answering",
                "evaluating",
                "feedback",
                "followup-loading",
              ].includes(iv.state) && (
                <AnswerBlock
                  label="Your Answer"
                  value={iv.answer}
                  onChange={iv.setAnswer}
                  disabled={iv.state !== "answering"}
                  onVoiceTranscript={(t) =>
                    iv.setAnswer((prev) => (prev ? `${prev} ${t}` : t))
                  }
                />
              )}

              {/* Submit / evaluating */}
              {iv.state === "answering" && (
                <div className="flex gap-3">
                  <Button
                    onClick={iv.submitAnswer}
                    disabled={iv.answer.trim().length < 10}
                    className="flex-1"
                    size="lg"
                  >
                    Submit Answer
                  </Button>
                </div>
              )}

              {iv.state === "evaluating" && (
                <Card className="p-8 flex items-center justify-center">
                  <DotLoader label="Evaluating your answer..." />
                </Card>
              )}

              {/* ── Main Feedback Panel ── */}
              {iv.isFeedbackState && iv.feedback && (
                <FeedbackPanel
                  feedback={iv.feedback}
                  showImproved={iv.showImproved}
                  setShowImproved={iv.setShowImproved}
                  onRetry={iv.retryQuestion}
                  onFollowUp={iv.loadFollowUp}
                  onNext={iv.nextQuestion}
                  isLast={iv.sessions.length + 1 >= iv.totalQuestions}
                  state={iv.state}
                />
              )}

              {/* ── Follow-up loading ── */}
              {iv.state === "followup-loading" && (
                <Card className="p-8 flex items-center justify-center">
                  <DotLoader label="Generating follow-up question..." />
                </Card>
              )}

              {/* ── Follow-up Question ── */}
              {[
                "followup-answering",
                "followup-evaluating",
                "followup-feedback",
              ].includes(iv.state) &&
                iv.followUpQ && (
                  <FollowUpSection
                    followUpQ={iv.followUpQ}
                    followUpAnswer={iv.followUpAnswer}
                    setFollowUpAnswer={iv.setFollowUpAnswer}
                    followUpFeedback={iv.followUpFeedback}
                    onSubmit={iv.submitFollowUp}
                    onNext={iv.nextQuestion}
                    isLast={iv.sessions.length + 1 >= iv.totalQuestions}
                    state={iv.state}
                    onVoiceTranscript={(t) =>
                      iv.setFollowUpAnswer((prev) =>
                        prev ? `${prev} ${t}` : t,
                      )
                    }
                  />
                )}
            </div>
          )}
      </div>
    </div>
  );
}

// ─── Answer Block ──────────────────────────────────────────────────────────────

function AnswerBlock({ label, value, onChange, disabled, onVoiceTranscript }) {
  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-mono text-muted">{label}</label>
        <VoiceRecorder onTranscript={onVoiceTranscript} disabled={disabled} />
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={7}
        placeholder="Type your answer here or use voice input above..."
        className={`
          w-full px-4 py-3 rounded-xl border bg-card font-body text-sm text-text
          placeholder:text-muted outline-none transition-all duration-200
          focus:border-accent focus:shadow-[0_0_0_3px_rgba(0,194,255,0.08)]
          disabled:opacity-60
          ${disabled ? "border-border" : "border-border-light"}
        `}
      />
      <div className="flex justify-between items-center mt-1">
        <span className="text-xs font-mono text-muted">{wordCount} words</span>
        {wordCount < 30 && !disabled && (
          <span className="text-xs font-mono text-warn">
            Aim for at least 30 words
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Feedback Panel ────────────────────────────────────────────────────────────

function FeedbackPanel({
  feedback,
  showImproved,
  setShowImproved,
  onRetry,
  onFollowUp,
  onNext,
  isLast,
  state,
}) {
  const isInFollowUp = [
    "followup-loading",
    "followup-answering",
    "followup-evaluating",
    "followup-feedback",
  ].includes(state);

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Score row */}
      <Card className="p-6">
        <div className="flex items-center gap-8">
          <ScoreRing score={feedback.score} size={110} />
          <div className="flex-1 space-y-3">
            {feedback.strengths?.length > 0 && (
              <div>
                <div className="text-xs font-mono text-success mb-1.5">
                  ✓ Strengths
                </div>
                <ul className="space-y-1">
                  {feedback.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-text/80 flex gap-2">
                      <span className="text-success shrink-0">+</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {feedback.gaps?.length > 0 && (
              <div>
                <div className="text-xs font-mono text-danger mb-1.5">
                  ✗ Gaps
                </div>
                <ul className="space-y-1">
                  {feedback.gaps.map((g, i) => (
                    <li key={i} className="text-sm text-text/80 flex gap-2">
                      <span className="text-danger shrink-0">−</span>
                      {g}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Missed points */}
      {feedback.missedPoints?.length > 0 && (
        <Card className="p-4">
          <div className="text-xs font-mono text-warn mb-2">
            ⚠ Points you missed
          </div>
          <div className="flex flex-wrap gap-2">
            {feedback.missedPoints.map((p, i) => (
              <Badge key={i} color="warn">
                {p}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Improved answer */}
      {feedback.improvedAnswer && (
        <Card className="p-4">
          <button
            onClick={() => setShowImproved((v) => !v)}
            className="w-full flex items-center justify-between text-sm font-mono text-muted hover:text-accent transition-colors"
          >
            <span>💬 See improved answer</span>
            <span>{showImproved ? "▲" : "▼"}</span>
          </button>
          {showImproved && (
            <p className="mt-3 text-sm text-text/80 leading-relaxed border-t border-border pt-3">
              {feedback.improvedAnswer}
            </p>
          )}
        </Card>
      )}

      {/* Action buttons */}
      {!isInFollowUp && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Retry */}
          <Button variant="ghost" onClick={onRetry}>
            🔄 Retry
          </Button>

          {/* Follow-up */}
          <Button
            variant="gold"
            onClick={onFollowUp}
            disabled={!feedback.gaps?.length}
            title={
              !feedback.gaps?.length
                ? "No gaps to drill into"
                : "Get a follow-up question"
            }
          >
            💬 Drill Deeper
          </Button>

          {/* Next */}
          <Button onClick={onNext}>{isLast ? "Finish →" : "Next →"}</Button>
        </div>
      )}
    </div>
  );
}

// ─── Follow-up Section ────────────────────────────────────────────────────────

function FollowUpSection({
  followUpQ,
  followUpAnswer,
  setFollowUpAnswer,
  followUpFeedback,
  onSubmit,
  onNext,
  isLast,
  state,
  onVoiceTranscript,
}) {
  return (
    <div className="space-y-4 animate-slide-up">
      {/* Follow-up question card */}
      <div className="flex items-center gap-2 mb-1">
        <Badge color="gold">💬 Follow-up</Badge>
        {followUpQ.targetGap && (
          <span className="text-xs font-mono text-muted">
            Targeting: {followUpQ.targetGap}
          </span>
        )}
      </div>

      <Card className="p-5 border-gold/20 bg-gold/5">
        <p className="font-display text-lg font-semibold text-text leading-relaxed">
          {followUpQ.followUp}
        </p>
      </Card>

      {/* Answer */}
      {state !== "followup-feedback" && (
        <AnswerBlock
          label="Follow-up Answer"
          value={followUpAnswer}
          onChange={setFollowUpAnswer}
          disabled={state !== "followup-answering"}
          onVoiceTranscript={onVoiceTranscript}
        />
      )}

      {state === "followup-answering" && (
        <Button
          onClick={onSubmit}
          disabled={followUpAnswer.trim().length < 5}
          className="w-full"
          size="lg"
        >
          Submit Follow-up
        </Button>
      )}

      {state === "followup-evaluating" && (
        <Card className="p-8 flex items-center justify-center">
          <DotLoader label="Evaluating follow-up..." />
        </Card>
      )}

      {/* Follow-up feedback */}
      {state === "followup-feedback" && followUpFeedback && (
        <div className="space-y-3 animate-fade-in">
          <Card className="p-5">
            <div className="flex items-center gap-6">
              <ScoreRing score={followUpFeedback.score} size={90} />
              <div className="flex-1 space-y-2">
                {followUpFeedback.strengths?.map((s, i) => (
                  <div key={i} className="text-sm text-text/80 flex gap-2">
                    <span className="text-success">+</span>
                    {s}
                  </div>
                ))}
                {followUpFeedback.gaps?.map((g, i) => (
                  <div key={i} className="text-sm text-text/80 flex gap-2">
                    <span className="text-danger">−</span>
                    {g}
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Next after follow-up */}
          <Button onClick={onNext} className="w-full" size="lg">
            {isLast ? "Finish & See Report →" : "Next Question →"}
          </Button>
        </div>
      )}
    </div>
  );
}
