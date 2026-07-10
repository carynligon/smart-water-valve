"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { syncAccountDevices, pollDevice } from "@/lib/devices";
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

// ---- OAuth link invitations ---------------------------------------------

export async function createLinkRequest(form: FormData) {
  const label = str(form, "label") || "Smart Life account";
  const region = str(form, "region") || "us";
  const customerId = str(form, "customerId") || null;
  await prisma.linkRequest.create({ data: { label, region, customerId } });
  revalidatePath("/settings");
}

export async function deleteLinkRequest(form: FormData) {
  const id = str(form, "id");
  if (!id) return;
  await prisma.linkRequest.delete({ where: { id } });
  revalidatePath("/settings");
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
  if (!filterId || !Number.isFinite(limit) || limit <= 0) {
    throw new Error("Enter a valid gallon limit greater than 0.");
  }
  await prisma.filter.update({
    where: { id: filterId },
    data: { label, limitGallons: limit },
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
  if (!name) throw new Error("Customer name is required.");

  const data = {
    name,
    type: type as "COMMERCIAL" | "RESIDENTIAL",
    address: address || null,
    contactName: contactName || null,
    contactPhone: contactPhone || null,
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
