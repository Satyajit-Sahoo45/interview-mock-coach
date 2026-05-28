export default function Badge({ children, color = "accent", className = "" }) {
  const colors = {
    accent: "bg-accent/10  text-accent  border-accent/20",
    gold: "bg-gold/10   text-gold   border-gold/20",
    success: "bg-success/10 text-success border-success/20",
    danger: "bg-danger/10  text-danger  border-danger/20",
    warn: "bg-warn/10   text-warn   border-warn/20",
    muted: "bg-subtle     text-muted   border-border",
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full
        text-xs font-mono font-medium border
        ${colors[color] || colors.muted}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
