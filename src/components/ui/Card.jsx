export default function Card({ children, className = "", glow = false }) {
  return (
    <div
      className={`
        glass-card rounded-2xl
        ${glow ? "glow-accent" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
