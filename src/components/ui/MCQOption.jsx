// Single MCQ option button with 3 visual states: default, selected-correct, selected-wrong
// revealed state shows correct/wrong after user picks

const LETTERS = ["A", "B", "C", "D"];

export default function MCQOption({
  index,
  text,
  state, // 'default' | 'selected' | 'correct' | 'wrong' | 'reveal-correct'
  onClick,
  disabled = false,
}) {
  const letter = LETTERS[index];

  const stateStyles = {
    default: `
      border-border bg-card text-text
      hover:border-accent/50 hover:bg-accent/5
      cursor-pointer
    `,
    selected: `
      border-accent bg-accent/10 text-accent
      cursor-pointer
    `,
    correct: `
      border-success bg-success/10 text-success
      cursor-default shadow-[0_0_20px_rgba(0,230,118,0.15)]
    `,
    wrong: `
      border-danger bg-danger/10 text-danger
      cursor-default opacity-80
    `,
    "reveal-correct": `
      border-success/50 bg-success/5 text-success/70
      cursor-default
    `,
  };

  const letterStyles = {
    default: "bg-subtle text-muted",
    selected: "bg-accent text-bg",
    correct: "bg-success text-bg",
    wrong: "bg-danger text-bg",
    "reveal-correct": "bg-success/40 text-success",
  };

  const icon =
    state === "correct"
      ? "✓"
      : state === "wrong"
        ? "✕"
        : state === "reveal-correct"
          ? "✓"
          : null;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border
        font-body text-sm text-left
        transition-all duration-200
        disabled:cursor-default
        ${stateStyles[state] || stateStyles.default}
      `}
    >
      {/* Letter badge */}
      <span
        className={`
        w-7 h-7 rounded-lg flex items-center justify-center
        font-display font-bold text-xs shrink-0
        transition-all duration-200
        ${letterStyles[state] || letterStyles.default}
      `}
      >
        {icon || letter}
      </span>

      {/* Option text */}
      <span className="flex-1 leading-snug">{text}</span>
    </button>
  );
}
