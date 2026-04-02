// DepthMeter.tsx — Animated SVG arc depth-of-corroboration meter
interface Props {
  depth: number;   // 1–5
  maxDepth?: number;
}

export default function DepthMeter({ depth, maxDepth = 5 }: Props) {
  const fraction = Math.min(depth, maxDepth) / maxDepth;

  // SVG half-circle arc: cx=60, cy=60, r=44
  // Arc starts at 180° (left) and sweeps to 0° (right) = clockwise half circle
  const r = 44;
  const cx = 60;
  const cy = 60;
  const circumference = Math.PI * r; // half circle = π*r ≈ 138.2

  const filled = fraction * circumference;
  const gap = circumference - filled;

  // Color by depth
  const color =
    fraction >= 0.7 ? 'var(--green)' :
    fraction >= 0.4 ? 'var(--amber)' :
    'var(--red)';

  // Arc descriptor for a top half-circle (start left, end right)
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <div className="depth-meter-wrap">
      <svg className="depth-meter-svg" viewBox="0 20 120 60" aria-hidden="true">
        {/* Background arc */}
        <path
          d={arcPath}
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth="9"
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d={arcPath}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${gap + 0.1}`}
          strokeDashoffset="0"
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
        {/* Label */}
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          style={{ fill: color, fontSize: '18px', fontWeight: 900, fontFamily: 'Playfair Display, serif' }}
        >
          {depth}/{maxDepth}
        </text>
      </svg>
      <span className="depth-sublabel">Corroboration depth</span>
    </div>
  );
}
