// The Restmo BT Water Meter (Tuya category "slj") reports water volume in
// units of 0.1 L. Spec confirmed via /v1.0/devices/{id}/specifications:
//   water_use_data  -> cumulative volume, unit 0.1 L
//   water_once      -> per-session volume, unit 0.1 L
//   flow_velocity   -> current flow, unit 0.1 L/min
//   voltage_current -> battery, unit %
//
// 0.1 L = 0.0264172 US gallons, so raw * 0.0264172 = gallons.
export const RAW_TO_GALLONS = 0.0264172;

export function rawToGallons(raw: number): number {
  return raw * RAW_TO_GALLONS;
}

// flow_velocity is 0.1 L/min; same scale factor converts to gallons/min.
export function rawFlowToGpm(raw: number): number {
  return raw * RAW_TO_GALLONS;
}

export function fmtGallons(n: number, digits = 1): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}
