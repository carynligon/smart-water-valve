import { prisma } from "./prisma";
import { listUserDevices, getDeviceStatus } from "./tuya";
import {
  getValidAccessToken,
  listUserDevicesOAuth,
  getDeviceStatusOAuth,
} from "./tuyaOAuth";
import { rawToGallons } from "./units";
import { sendSms } from "./sms";

// Warn customers when a filter crosses this fraction of its limit.
const WARN_THRESHOLD = 0.9;

/**
 * Pull the device list for a linked Tuya account and upsert every device.
 * Ensures each device has an active filter so limits can be configured.
 */
export async function syncAccountDevices(accountId: string): Promise<number> {
  const account = await prisma.tuyaAccount.findUnique({
    where: { id: accountId },
  });
  if (!account) throw new Error("Tuya account not found");

  // OAuth-linked accounts read the owner's devices with their user token;
  // legacy accounts fall back to cloud-project (client-credential) signing.
  const devices = account.accessToken
    ? await listUserDevicesOAuth(
        account.uid,
        await getValidAccessToken(account.id),
        account.region,
      )
    : await listUserDevices(account.uid, account.region);

  for (const d of devices) {
    await prisma.device.upsert({
      where: { id: d.id },
      create: {
        id: d.id,
        name: d.name || "Unnamed device",
        productName: d.product_name,
        online: Boolean(d.online),
        accountId: account.id,
        // Auto-assign to the account's owning customer, if set.
        customerId: account.customerId ?? undefined,
      },
      update: {
        productName: d.product_name,
        online: Boolean(d.online),
        accountId: account.id,
      },
    });

    const activeFilter = await prisma.filter.findFirst({
      where: { deviceId: d.id, active: true },
    });
    if (!activeFilter) {
      await prisma.filter.create({ data: { deviceId: d.id } });
    }
  }

  return devices.length;
}

/**
 * Read the live status of a single device, record a time-series Reading,
 * update the device, and fire SMS notifications if its filter is due.
 */
export async function pollDevice(deviceId: string) {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    include: {
      account: true,
      customer: true,
      filters: { where: { active: true }, take: 1 },
    },
  });
  if (!device) throw new Error("Device not found");

  const region = device.account?.region ?? "us";
  const status =
    device.account?.accessToken && device.accountId
      ? await getDeviceStatusOAuth(
          deviceId,
          await getValidAccessToken(device.accountId),
          region,
        )
      : await getDeviceStatus(deviceId, region);
  const cumulativeGallons = rawToGallons(status.cumulativeRaw);

  await prisma.reading.create({
    data: {
      deviceId,
      cumulativeRaw: status.cumulativeRaw,
      cumulativeGallons,
      flowVelocityRaw: status.flowVelocityRaw,
      batteryPct: status.batteryPct,
      online: status.online,
    },
  });

  await prisma.device.update({
    where: { id: deviceId },
    data: {
      online: status.online,
      batteryPct: status.batteryPct,
      lastSeenAt: new Date(),
    },
  });

  const filter = device.filters[0];
  if (filter) {
    const used = Math.max(0, cumulativeGallons - filter.baselineGallons);
    const ratio = filter.limitGallons > 0 ? used / filter.limitGallons : 0;
    await maybeNotify({
      deviceId: device.id,
      deviceName: device.name,
      customerName: device.customer?.name ?? device.name,
      phone: device.customer?.contactPhone ?? "",
      filterId: filter.id,
      filterInstalledAt: filter.installedAt,
      limitGallons: filter.limitGallons,
      used,
      ratio,
    });
  }

  return { status, cumulativeGallons };
}

/** Poll every known device. Used by the Vercel cron endpoint. */
export async function pollAllDevices() {
  const devices = await prisma.device.findMany({ select: { id: true } });
  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const d of devices) {
    try {
      await pollDevice(d.id);
      results.push({ id: d.id, ok: true });
    } catch (e) {
      results.push({
        id: d.id,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return results;
}

type NotifyInput = {
  deviceId: string;
  deviceName: string;
  customerName: string;
  phone: string;
  filterId: string;
  filterInstalledAt: Date;
  limitGallons: number;
  used: number;
  ratio: number;
};

async function maybeNotify(input: NotifyInput) {
  const type =
    input.ratio >= 1
      ? "FILTER_DUE"
      : input.ratio >= WARN_THRESHOLD
        ? "FILTER_WARNING"
        : null;
  if (!type) return;

  // De-dupe: only one notification of each type per filter lifecycle
  // (i.e. since the filter was last installed/reset).
  const already = await prisma.notification.findFirst({
    where: {
      filterId: input.filterId,
      type,
      createdAt: { gte: input.filterInstalledAt },
    },
  });
  if (already) return;

  const limit = Math.round(input.limitGallons);
  const usedR = Math.round(input.used);
  const pct = Math.round(input.ratio * 100);
  const message =
    type === "FILTER_DUE"
      ? `Water filter for ${input.customerName} has reached its ${limit} gallon limit (${usedR} gal used). Time to replace the filter.`
      : `Heads up: the water filter for ${input.customerName} is at ${pct}% of its ${limit} gallon limit (${usedR} gal). Plan a replacement soon.`;

  const result = await sendSms(input.phone, message);

  await prisma.notification.create({
    data: {
      deviceId: input.deviceId,
      filterId: input.filterId,
      type,
      message,
      sentTo: input.phone || null,
      status: result.status,
    },
  });
}
