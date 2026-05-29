/**
 * ProgressBar — reusable animated horizontal bar.
 *
 * Props:
 *  value      0–100
 *  color      'accent' | 'success' | 'warn' | 'danger' | 'gold'
 *  showLabel  bool — show percentage label on the right
 *  height     Tailwind height class, default 'h-1.5'
 *  animated   bool — pulse animation while < 100
 */
export default function ProgressBar({
  value = 0,
  color = "accent",
  showLabel = false,
  height = "h-1.5",
  animated = false,
  className = "",
}) {
  const pct = Math.max(0, Math.min(100, value));

  const colors = {
    accent: "bg-accent",
    success: "bg-success",
    warn: "bg-warn",
    danger: "bg-danger",
    gold: "bg-gold",
  };

  const glows = {
    accent: "shadow-[0_0_8px_rgba(0,194,255,0.5)]",
    success: "shadow-[0_0_8px_rgba(0,230,118,0.5)]",
    warn: "shadow-[0_0_8px_rgba(255,152,0,0.5)]",
    danger: "shadow-[0_0_8px_rgba(255,77,106,0.5)]",
    gold: "shadow-[0_0_8px_rgba(255,184,0,0.5)]",
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`flex-1 ${height} bg-border rounded-full overflow-hidden`}
      >
        <div
          className={`
            ${height} rounded-full transition-all duration-700 ease-out
            ${colors[color] || colors.accent}
            ${glows[color] || glows.accent}
            ${animated && pct < 100 ? "animate-pulse-slow" : ""}
          `}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-mono text-muted w-8 text-right">
          {pct}%
        </span>
      )}
    </div>
  );
}
