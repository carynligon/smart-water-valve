"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { syncAccountDevices, pollDevice } from "@/lib/devices";
import { deliverAlert, type AlertChannel } from "@/lib/notify";
import { rawToGallons } from "@/lib/units";

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function refreshAll() {
  revalidatePath("/");
  revalidatePath("/customers");
  revalidatePath("/settings");
}

// ---- Tuya accounts -------------------------------------------------------

export async function linkAccount(form: FormData) {
  const label = str(form, "label") || "Tuya account";
  const uid = str(form, "uid");
  const region = str(form, "region") || "us";
  if (!uid) throw new Error("A Tuya app-account UID is required.");

  const account = await prisma.tuyaAccount.upsert({
    where: { uid },
    create: { label, uid, region },
    update: { label, region },
  });

  await syncAccountDevices(account.id);
  refreshAll();
}

export async function removeAccount(form: FormData) {
  const id = str(form, "id");
  if (!id) return;
  // Detach devices but keep their history; just unlink the account.
  await prisma.device.updateMany({
    where: { accountId: id },
    data: { accountId: null },
  });
  await prisma.tuyaAccount.delete({ where: { id } });
  refreshAll();
}

export async function syncAllAccounts() {
  const accounts = await prisma.tuyaAccount.findMany({ select: { id: true } });
  for (const a of accounts) {
    await syncAccountDevices(a.id);
  }
  refreshAll();
}

// ---- Devices -------------------------------------------------------------

export async function pollNow(form: FormData) {
  const deviceId = str(form, "deviceId");
  if (!deviceId) return;
  await pollDevice(deviceId);
  revalidatePath("/");
  revalidatePath(`/devices/${deviceId}`);
}

/**
 * Send a one-off test SMS to the device's customer right now, ignoring the
 * threshold and de-dupe. Recorded with filterId=null so it never suppresses a
 * real filter alert. Surfaces the send result (sent/failed/skipped) in the
 * device's "Recent alerts" list.
 */
export async function sendTestAlert(form: FormData) {
  const deviceId = str(form, "deviceId");
  if (!deviceId) return;

  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    include: {
      customer: true,
      filters: { where: { active: true }, take: 1 },
      readings: { orderBy: { recordedAt: "desc" }, take: 1 },
    },
  });
  if (!device) throw new Error("Device not found");

  const filter = device.filters[0];
  const latest = device.readings[0];
  const limit = filter?.limitGallons ?? 0;
  const used =
    filter && latest
      ? Math.max(0, latest.cumulativeGallons - filter.baselineGallons)
      : 0;
  const remaining = Math.max(0, Math.round(limit - used));
  const name = device.customer?.name ?? device.name;

  const message = `[Test] FlowGuard: the water filter for ${name} has about ${remaining} gallon${
    remaining === 1 ? "" : "s"
  } left before its ${Math.round(limit)} gallon limit (${Math.round(
    used,
  )} gal used). This is a test alert.`;

  // Sends over the customer's chosen channel(s); filterId=null keeps it out of
  // the real-alert de-dupe. deliverAlert records the Notification row(s).
  await deliverAlert({
    deviceId,
    filterId: null,
    type: "FILTER_WARNING",
    subject: "FlowGuard: test alert",
    message,
    phone: device.customer?.contactPhone ?? "",
    email: device.customer?.contactEmail ?? "",
    channel: device.customer?.alertChannel ?? "SMS",
  });

  revalidatePath(`/devices/${deviceId}`);
}

export async function assignDevice(form: FormData) {
  const deviceId = str(form, "deviceId");
  if (!deviceId) return;
  const name = str(form, "name");
  const customerId = str(form, "customerId");
  await prisma.device.update({
    where: { id: deviceId },
    data: {
      name: name || undefined,
      customerId: customerId || null,
    },
  });
  revalidatePath("/");
  revalidatePath(`/devices/${deviceId}`);
}

// ---- Filters -------------------------------------------------------------

export async function saveFilter(form: FormData) {
  const filterId = str(form, "filterId");
  const deviceId = str(form, "deviceId");
  const label = str(form, "label") || "Water filter";
  const limit = Number(str(form, "limitGallons"));
  const warn = Number(str(form, "warnGallonsRemaining"));
  if (!filterId || !Number.isFinite(limit) || limit <= 0) {
    throw new Error("Enter a valid gallon limit greater than 0.");
  }
  if (!Number.isFinite(warn) || warn < 0 || warn >= limit) {
    throw new Error(
      "Alert threshold must be between 0 and the replacement limit.",
    );
  }
  await prisma.filter.update({
    where: { id: filterId },
    data: { label, limitGallons: limit, warnGallonsRemaining: warn },
  });
  revalidatePath("/");
  if (deviceId) revalidatePath(`/devices/${deviceId}`);
}

/**
 * Mark the filter as changed: set the usage baseline to the latest cumulative
 * reading and reset installedAt so notifications can fire again next cycle.
 */
export async function resetFilter(form: FormData) {
  const filterId = str(form, "filterId");
  const deviceId = str(form, "deviceId");
  if (!filterId || !deviceId) return;

  const latest = await prisma.reading.findFirst({
    where: { deviceId },
    orderBy: { recordedAt: "desc" },
  });
  const baseline = latest
    ? latest.cumulativeGallons
    : rawToGallons(0); // no readings yet -> baseline 0

  await prisma.filter.update({
    where: { id: filterId },
    data: { baselineGallons: baseline, installedAt: new Date() },
  });
  revalidatePath("/");
  revalidatePath(`/devices/${deviceId}`);
}

// ---- Customers -----------------------------------------------------------

export async function saveCustomer(form: FormData) {
  const id = str(form, "id");
  const name = str(form, "name");
  const type = str(form, "type") === "COMMERCIAL" ? "COMMERCIAL" : "RESIDENTIAL";
  const address = str(form, "address");
  const contactName = str(form, "contactName");
  const contactPhone = str(form, "contactPhone");
  const contactEmail = str(form, "contactEmail");
  const channelRaw = str(form, "alertChannel");
  const alertChannel: AlertChannel = (
    ["SMS", "EMAIL", "BOTH"].includes(channelRaw) ? channelRaw : "SMS"
  ) as AlertChannel;
  if (!name) throw new Error("Customer name is required.");
  if ((alertChannel === "EMAIL" || alertChannel === "BOTH") && !contactEmail) {
    throw new Error("An email address is required for email alerts.");
  }
  if ((alertChannel === "SMS" || alertChannel === "BOTH") && !contactPhone) {
    throw new Error("A contact phone is required for SMS alerts.");
  }

  const data = {
    name,
    type: type as "COMMERCIAL" | "RESIDENTIAL",
    address: address || null,
    contactName: contactName || null,
    contactPhone: contactPhone || null,
    contactEmail: contactEmail || null,
    alertChannel,
  };

  if (id) {
    await prisma.customer.update({ where: { id }, data });
  } else {
    await prisma.customer.create({ data });
  }
  refreshAll();
}

export async function deleteCustomer(form: FormData) {
  const id = str(form, "id");
  if (!id) return;
  await prisma.customer.delete({ where: { id } });
  refreshAll();
}
