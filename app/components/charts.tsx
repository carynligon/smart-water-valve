// Lightweight dependency-free SVG charts (server components).

export function LineChart({
  points,
  height = 180,
  color = "#2563eb",
  fill = "#dbeafe",
  unit = "",
}: {
  points: { t: number; v: number }[];
  height?: number;
  color?: string;
  fill?: string;
  unit?: string;
}) {
  if (points.length < 2) {
    return <EmptyChart height={height} />;
  }
  const W = 600;
  const H = height;
  const pad = { top: 12, right: 12, bottom: 22, left: 44 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const ts = points.map((p) => p.t);
  const vs = points.map((p) => p.v);
  const tMin = Math.min(...ts);
  const tMax = Math.max(...ts);
  const vMin = 0;
  const vMax = Math.max(...vs) || 1;

  const x = (t: number) =>
    pad.left + ((t - tMin) / (tMax - tMin || 1)) * innerW;
  const y = (v: number) =>
    pad.top + innerH - ((v - vMin) / (vMax - vMin || 1)) * innerH;

  const line = points.map((p) => `${x(p.t)},${y(p.v)}`).join(" ");
  const area = `${pad.left},${pad.top + innerH} ${line} ${pad.left + innerW},${pad.top + innerH}`;

  const gridVals = [0, 0.5, 1].map((f) => vMin + f * (vMax - vMin));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      preserveAspectRatio="none"
      role="img"
    >
      {gridVals.map((gv, i) => (
        <g key={i}>
          <line
            x1={pad.left}
            x2={pad.left + innerW}
            y1={y(gv)}
            y2={y(gv)}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
          <text x={4} y={y(gv) + 3} fontSize={10} fill="#94a3b8">
            {Math.round(gv).toLocaleString()}
          </text>
        </g>
      ))}
      <polygon points={area} fill={fill} opacity={0.6} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={2} />
      <text
        x={pad.left + innerW}
        y={H - 6}
        fontSize={10}
        fill="#94a3b8"
        textAnchor="end"
      >
        {unit}
      </text>
    </svg>
  );
}

export function BarChart({
  bars,
  height = 180,
  color = "#2563eb",
  unit = "",
}: {
  bars: { label: string; value: number }[];
  height?: number;
  color?: string;
  unit?: string;
}) {
  if (bars.length === 0) return <EmptyChart height={height} />;
  const W = 600;
  const H = height;
  const pad = { top: 12, right: 12, bottom: 26, left: 44 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const vMax = Math.max(...bars.map((b) => b.value)) || 1;
  const bw = innerW / bars.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img">
      {[0, 0.5, 1].map((f, i) => {
        const gy = pad.top + innerH - f * innerH;
        return (
          <g key={i}>
            <line
              x1={pad.left}
              x2={pad.left + innerW}
              y1={gy}
              y2={gy}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            <text x={4} y={gy + 3} fontSize={10} fill="#94a3b8">
              {Math.round(f * vMax).toLocaleString()}
            </text>
          </g>
        );
      })}
      {bars.map((b, i) => {
        const bh = (b.value / vMax) * innerH;
        const bx = pad.left + i * bw + bw * 0.15;
        const by = pad.top + innerH - bh;
        return (
          <g key={i}>
            <rect
              x={bx}
              y={by}
              width={bw * 0.7}
              height={Math.max(0, bh)}
              rx={2}
              fill={color}
            />
            <text
              x={bx + bw * 0.35}
              y={H - 8}
              fontSize={9}
              fill="#94a3b8"
              textAnchor="middle"
            >
              {b.label}
            </text>
          </g>
        );
      })}
      <text
        x={pad.left + innerW}
        y={11}
        fontSize={10}
        fill="#94a3b8"
        textAnchor="end"
      >
        {unit}
      </text>
    </svg>
  );
}

function EmptyChart({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400"
      style={{ height }}
    >
      Not enough data yet — poll the device to start collecting readings.
    </div>
  );
}
