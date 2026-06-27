import { TuyaContext } from "@tuya/tuya-connector-nodejs";

const BASE_URLS: Record<string, string> = {
  us: "https://openapi.tuyaus.com",
  eu: "https://openapi.tuyaeu.com",
  cn: "https://openapi.tuyacn.com",
  in: "https://openapi.tuyain.com",
};

export const TUYA_REGIONS = Object.keys(BASE_URLS);

export function getTuya(region = "us"): TuyaContext {
  const accessKey = process.env.TUYA_ACCESS_KEY;
  const secretKey = process.env.TUYA_SECRET_KEY;
  if (!accessKey || !secretKey) {
    throw new Error(
      "TUYA_ACCESS_KEY / TUYA_SECRET_KEY are not configured (see .env.example).",
    );
  }
  return new TuyaContext({
    baseUrl: BASE_URLS[region] ?? BASE_URLS.us,
    accessKey,
    secretKey,
  });
}

export type TuyaDevice = {
  id: string;
  name: string;
  product_name?: string;
  online?: boolean;
};

export async function listUserDevices(
  uid: string,
  region = "us",
): Promise<TuyaDevice[]> {
  const tuya = getTuya(region);
  const res = await tuya.request({
    method: "GET",
    path: `/v1.0/users/${uid}/devices`,
  });
  if (!res.success) {
    throw new Error(`Tuya listUserDevices failed: ${JSON.stringify(res)}`);
  }
  return (res.result as TuyaDevice[]) ?? [];
}

export type DeviceStatus = {
  cumulativeRaw: number; // water_use_data (0.1 L)
  waterOnceRaw: number; // water_once (0.1 L)
  flowVelocityRaw: number; // flow_velocity (0.1 L/min)
  batteryPct: number | null; // voltage_current (%)
  online: boolean;
};

export async function getDeviceStatus(
  deviceId: string,
  region = "us",
): Promise<DeviceStatus> {
  const tuya = getTuya(region);
  const [statusRes, infoRes] = await Promise.all([
    tuya.request({ method: "GET", path: `/v1.0/devices/${deviceId}/status` }),
    tuya.request({ method: "GET", path: `/v1.0/devices/${deviceId}` }),
  ]);

  const status = (statusRes.result as { code: string; value: number }[]) ?? [];
  const get = (code: string) => status.find((s) => s.code === code)?.value;
  const battery = get("voltage_current");

  return {
    cumulativeRaw: Number(get("water_use_data") ?? 0),
    waterOnceRaw: Number(get("water_once") ?? 0),
    flowVelocityRaw: Number(get("flow_velocity") ?? 0),
    batteryPct: battery == null ? null : Number(battery),
    online: Boolean(
      (infoRes.result as { online?: boolean } | undefined)?.online,
    ),
  };
}
