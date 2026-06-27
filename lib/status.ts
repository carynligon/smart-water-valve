export type FilterState = "ok" | "warning" | "due" | "unknown";

export type FilterStatus = {
  used: number;
  limit: number;
  remaining: number;
  ratio: number; // 0..(>1)
  pct: number; // clamped 0..100 for display
  state: FilterState;
};

const WARN_THRESHOLD = 0.9;

export function computeFilterStatus(
  latestCumulativeGallons: number | null,
  baselineGallons: number,
  limitGallons: number,
): FilterStatus {
  if (latestCumulativeGallons == null) {
    return {
      used: 0,
      limit: limitGallons,
      remaining: limitGallons,
      ratio: 0,
      pct: 0,
      state: "unknown",
    };
  }
  const used = Math.max(0, latestCumulativeGallons - baselineGallons);
  const ratio = limitGallons > 0 ? used / limitGallons : 0;
  const state: FilterState =
    ratio >= 1 ? "due" : ratio >= WARN_THRESHOLD ? "warning" : "ok";
  return {
    used,
    limit: limitGallons,
    remaining: Math.max(0, limitGallons - used),
    ratio,
    pct: Math.min(100, Math.round(ratio * 100)),
    state,
  };
}
