import { FilterState } from "@/lib/status";

const STATE_STYLES: Record<
  FilterState,
  { label: string; bar: string; badge: string }
> = {
  ok: {
    label: "Healthy",
    bar: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-700",
  },
  warning: {
    label: "Replace soon",
    bar: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700",
  },
  due: {
    label: "Change filter",
    bar: "bg-rose-500",
    badge: "bg-rose-100 text-rose-700",
  },
  unknown: {
    label: "No data yet",
    bar: "bg-slate-300",
    badge: "bg-slate-100 text-slate-500",
  },
};

export function StateBadge({ state }: { state: FilterState }) {
  const s = STATE_STYLES[state];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.badge}`}
    >
      {s.label}
    </span>
  );
}

export function UsageBar({ state, pct }: { state: FilterState; pct: number }) {
  const s = STATE_STYLES[state];
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all ${s.bar}`}
        style={{ width: `${Math.max(2, pct)}%` }}
      />
    </div>
  );
}

export function OnlineDot({ online }: { online: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
      <span
        className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-slate-300"}`}
      />
      {online ? "Online" : "Offline"}
    </span>
  );
}

export function Battery({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-xs text-slate-400">—</span>;
  const color =
    pct <= 20 ? "text-rose-600" : pct <= 50 ? "text-amber-600" : "text-slate-600";
  return (
    <span className={`text-xs font-medium ${color}`}>🔋 {pct}%</span>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
