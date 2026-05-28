export default function ScoreRing({ score, size = 120 }) {
  const radius = 60;
  const circ = 2 * Math.PI * radius; // ≈ 376.99
  const pct = Math.max(0, Math.min(score, 10)) / 10;
  const offset = circ * (1 - pct);

  const color =
    score >= 8
      ? "#00E676"
      : score >= 6
        ? "#00C2FF"
        : score >= 4
          ? "#FF9800"
          : "#FF4D6A";

  const label =
    score >= 8
      ? "Excellent"
      : score >= 6
        ? "Good"
        : score >= 4
          ? "Average"
          : "Needs Work";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox="0 0 140 140"
        style={{ "--target-offset": offset }}
      >
        {/* Track */}
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="#1C1E30"
          strokeWidth="10"
        />
        {/* Progress */}
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ}
          transform="rotate(-90 70 70)"
          className="score-ring"
          style={{
            "--target-offset": offset,
            filter: `drop-shadow(0 0 8px ${color}88)`,
          }}
        />
        {/* Score text */}
        <text
          x="70"
          y="65"
          textAnchor="middle"
          fill="#EDF0FF"
          fontSize="28"
          fontWeight="700"
          fontFamily="Bricolage Grotesque"
        >
          {score}
        </text>
        <text
          x="70"
          y="84"
          textAnchor="middle"
          fill="#5A6080"
          fontSize="11"
          fontFamily="Plus Jakarta Sans"
        >
          out of 10
        </text>
      </svg>
      <span className="text-sm font-mono" style={{ color }}>
        {label}
      </span>
    </div>
  );
}
