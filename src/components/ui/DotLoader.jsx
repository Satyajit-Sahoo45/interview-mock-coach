export default function DotLoader({ label = "Thinking..." }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="dot-loader flex gap-2">
        <span />
        <span />
        <span />
      </div>
      <p className="text-muted text-sm font-mono">{label}</p>
    </div>
  );
}
