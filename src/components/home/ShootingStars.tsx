/** 4 つの角の星 */
function Star({ x, y, r }: { x: number; y: number; r: number }) {
  const k = r * 0.22;
  return (
    <path
      d={`M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r} Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r}Z`}
    />
  );
}

/** LIVE のカードの右上の流れ星(デザインの案の飾り) */
export function ShootingStars({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 60"
      aria-hidden="true"
      className={className}
      fill="currentColor"
      stroke="currentColor"
    >
      <line x1="34" y1="34" x2="66" y2="2" strokeWidth="0.8" />
      <line x1="58" y1="22" x2="78" y2="2" strokeWidth="0.8" />
      <g stroke="none">
        <Star x={28} y={40} r={7} />
        <Star x={54} y={26} r={5} />
      </g>
    </svg>
  );
}
