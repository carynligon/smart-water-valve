export type FilterState = "ok" | "warning" | "due" | "unknown";

export type FilterStatus = {
  used: number;
  limit: number;
  remaining: number;
  ratio: number; // 0..(>1)
  pct: number; // clamped 0..100 for display
  state: FilterState;
};

// Fallback threshold when a filter doesn't specify one (gallons before limit).
export const DEFAULT_WARN_GALLONS_REMAINING = 100;

export function computeFilterStatus(
  latestCumulativeGallons: number | null,
  baselineGallons: number,
  limitGallons: number,
  warnGallonsRemaining: number = DEFAULT_WARN_GALLONS_REMAINING,
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
  const remaining = Math.max(0, limitGallons - used);
  // "due" once the limit is reached; "warning" once we're within the
  // configured gallons-remaining threshold of it.
  const state: FilterState =
    used >= limitGallons
      ? "due"
      : remaining <= warnGallonsRemaining
        ? "warning"
        : "ok";
  return {
    used,
    limit: limitGallons,
    remaining,
    ratio,
    pct: Math.min(100, Math.round(ratio * 100)),
    state,
  };
}
