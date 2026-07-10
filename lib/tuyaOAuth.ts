import crypto from "node:crypto";
import { prisma } from "./prisma";

/**
 * Tuya OAuth 2.0 "Authorization Code" flow (grant_type=2).
 *
 * A device owner opens the authorization page (an H5 page Tuya hosts for our
 * cloud project), logs into their Smart Life account, and picks which home /
 * devices to share. Tuya then redirects the browser back to our callback with
 * `?code=...&state=...`. We exchange the code for a per-user access/refresh
 * token and use that token to read *that user's* devices.
 *
 * Docs: https://developer.tuya.com/en/docs/iot/authorization-code-page-usage
 *       https://developer.tuya.com/en/docs/iot/authentication-method
 */

const BASE_URLS: Record<string, string> = {
  us: "https://openapi.tuyaus.com",
  eu: "https://openapi.tuyaeu.com",
  cn: "https://openapi.tuyacn.com",
  in: "https://openapi.tuyain.com",
};

export function baseUrl(region = "us"): string {
  return BASE_URLS[region] ?? BASE_URLS.us;
}

/**
 * The client_id / secret used to SIGN the token exchange. This must match the
 * "authorization key" selected in the Tuya console under
 * Devices > Link App Account > Configure OAuth 2.0 Authorization.
 *
 * Defaults to the cloud project key (TUYA_ACCESS_KEY/SECRET). If OAuth is tied
 * to a distinct App Authorization key, set TUYA_OAUTH_CLIENT_ID / SECRET.
 */
export function oauthCredentials(): { clientId: string; secret: string } {
  const clientId =
    process.env.TUYA_OAUTH_CLIENT_ID || process.env.TUYA_ACCESS_KEY || "";
  const secret =
    process.env.TUYA_OAUTH_CLIENT_SECRET || process.env.TUYA_SECRET_KEY || "";
  if (!clientId || !secret) {
    throw new Error(
      "Tuya OAuth credentials missing. Set TUYA_ACCESS_KEY/TUYA_SECRET_KEY " +
        "(or TUYA_OAUTH_CLIENT_ID/TUYA_OAUTH_CLIENT_SECRET).",
    );
  }
  return { clientId, secret };
}

const EMPTY_BODY_HASH = crypto.createHash("sha256").update("").digest("hex");

/**
 * Sign and send a Tuya Cloud API request (v2, HMAC-SHA256).
 *
 * - Token management calls (get/refresh token) pass no accessToken.
 * - Business calls pass the user's accessToken; it is folded into the signature.
 */
async function signedRequest<T = unknown>(opts: {
  region: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string; // includes sorted query string, e.g. /v1.0/token?grant_type=2&code=x
  accessToken?: string;
  body?: unknown;
}): Promise<TuyaResponse<T>> {
  const { clientId, secret } = oauthCredentials();
  const t = Date.now().toString();
  const bodyStr = opts.body == null ? "" : JSON.stringify(opts.body);
  const contentHash = opts.body
    ? crypto.createHash("sha256").update(bodyStr).digest("hex")
    : EMPTY_BODY_HASH;

  // stringToSign = METHOD \n contentSHA256 \n <signed headers> \n url
  const stringToSign = `${opts.method}\n${contentHash}\n\n${opts.path}`;
  const signStr = opts.accessToken
    ? clientId + opts.accessToken + t + stringToSign
    : clientId + t + stringToSign;
  const sign = crypto
    .createHmac("sha256", secret)
    .update(signStr, "utf8")
    .digest("hex")
    .toUpperCase();

  const headers: Record<string, string> = {
    client_id: clientId,
    sign,
    t,
    sign_method: "HMAC-SHA256",
    "Content-Type": "application/json",
  };
  if (opts.accessToken) headers.access_token = opts.accessToken;

  const res = await fetch(`${baseUrl(opts.region)}${opts.path}`, {
    method: opts.method,
    headers,
    body: opts.body ? bodyStr : undefined,
    cache: "no-store",
  });
  return (await res.json()) as TuyaResponse<T>;
}

type TuyaResponse<T> = {
  success: boolean;
  result?: T;
  code?: number;
  msg?: string;
  t?: number;
};

type TokenResult = {
  access_token: string;
  refresh_token: string;
  uid: string;
  expire_time: number; // seconds until expiry
  platform_url?: string;
};

/** Exchange an authorization `code` for a user access/refresh token. */
export async function exchangeCode(
  code: string,
  region = "us",
): Promise<TokenResult> {
  const res = await signedRequest<TokenResult>({
    region,
    method: "GET",
    path: `/v1.0/token?grant_type=2&code=${encodeURIComponent(code)}`,
  });
  if (!res.success || !res.result) {
    throw new Error(
      `Tuya token exchange failed (code ${res.code}): ${res.msg ?? "unknown"}`,
    );
  }
  return res.result;
}

/** Refresh an expired/expiring user access token. */
export async function refreshUserToken(
  refreshToken: string,
  region = "us",
): Promise<TokenResult> {
  const res = await signedRequest<TokenResult>({
    region,
    method: "GET",
    path: `/v1.0/token/${encodeURIComponent(refreshToken)}`,
  });
  if (!res.success || !res.result) {
    throw new Error(
      `Tuya token refresh failed (code ${res.code}): ${res.msg ?? "unknown"}`,
    );
  }
  return res.result;
}

/**
 * Return a valid access token for an account, refreshing (and persisting the
 * new tokens) if the current one is missing or within 5 minutes of expiry.
 */
export async function getValidAccessToken(accountId: string): Promise<string> {
  const account = await prisma.tuyaAccount.findUnique({
    where: { id: accountId },
  });
  if (!account) throw new Error("Tuya account not found");
  if (!account.accessToken || !account.refreshToken) {
    throw new Error(
      `Account "${account.label}" has no OAuth token. Re-run the linking flow.`,
    );
  }

  const skewMs = 5 * 60 * 1000;
  const stillValid =
    account.tokenExpiresAt &&
    account.tokenExpiresAt.getTime() - Date.now() > skewMs;
  if (stillValid) return account.accessToken;

  const refreshed = await refreshUserToken(account.refreshToken, account.region);
  await prisma.tuyaAccount.update({
    where: { id: account.id },
    data: {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      tokenExpiresAt: new Date(Date.now() + refreshed.expire_time * 1000),
    },
  });
  return refreshed.access_token;
}

export type TuyaDevice = {
  id: string;
  name: string;
  product_name?: string;
  online?: boolean;
};

/** List the devices the authorized user shared, using their access token. */
export async function listUserDevicesOAuth(
  uid: string,
  accessToken: string,
  region = "us",
): Promise<TuyaDevice[]> {
  const res = await signedRequest<TuyaDevice[]>({
    region,
    method: "GET",
    path: `/v1.0/users/${encodeURIComponent(uid)}/devices`,
    accessToken,
  });
  if (!res.success) {
    throw new Error(
      `Tuya listUserDevices failed (code ${res.code}): ${res.msg ?? "unknown"}`,
    );
  }
  return res.result ?? [];
}

export type DeviceStatus = {
  cumulativeRaw: number;
  waterOnceRaw: number;
  flowVelocityRaw: number;
  batteryPct: number | null;
  online: boolean;
};

/** Live status of one device, using the account's user access token. */
export async function getDeviceStatusOAuth(
  deviceId: string,
  accessToken: string,
  region = "us",
): Promise<DeviceStatus> {
  const [statusRes, infoRes] = await Promise.all([
    signedRequest<{ code: string; value: number }[]>({
      region,
      method: "GET",
      path: `/v1.0/devices/${deviceId}/status`,
      accessToken,
    }),
    signedRequest<{ online?: boolean }>({
      region,
      method: "GET",
      path: `/v1.0/devices/${deviceId}`,
      accessToken,
    }),
  ]);

  const status = statusRes.result ?? [];
  const get = (code: string) => status.find((s) => s.code === code)?.value;
  const battery = get("voltage_current");

  return {
    cumulativeRaw: Number(get("water_use_data") ?? 0),
    waterOnceRaw: Number(get("water_once") ?? 0),
    flowVelocityRaw: Number(get("flow_velocity") ?? 0),
    batteryPct: battery == null ? null : Number(battery),
    online: Boolean(infoRes.result?.online),
  };
}

/**
 * Build the URL the device owner opens to authorize us.
 *
 * Tuya generates this authorization page URL in the console when you configure
 * OAuth 2.0 Authorization; paste it into TUYA_OAUTH_AUTHORIZE_URL. We append the
 * `state` (our LinkRequest id) so the callback can map the result to a customer.
 */
export function buildAuthorizeUrl(state: string): string {
  const base = process.env.TUYA_OAUTH_AUTHORIZE_URL;
  if (!base) {
    throw new Error(
      "TUYA_OAUTH_AUTHORIZE_URL is not set. Copy the authorization page URL " +
        "from the Tuya console (Configure OAuth 2.0 Authorization) into .env.",
    );
  }
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}state=${encodeURIComponent(state)}`;
}
