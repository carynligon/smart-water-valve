import { prisma } from "./prisma";
import { sendSms } from "./sms";
import { sendEmail } from "./email";

export type AlertChannel = "SMS" | "EMAIL" | "BOTH";
type NotificationType = "FILTER_DUE" | "FILTER_WARNING";

/**
 * Deliver an alert to a customer over their chosen channel(s) and record one
 * Notification row per channel. Channels that aren't configured (or missing a
 * destination) record as "skipped" rather than failing.
 */
export async function deliverAlert(opts: {
  deviceId: string;
  filterId: string | null;
  type: NotificationType;
  subject: string; // used for email
  message: string; // body for both SMS and email
  phone: string;
  email: string;
  channel: AlertChannel;
}): Promise<void> {
  const channels: ("SMS" | "EMAIL")[] =
    opts.channel === "BOTH" ? ["SMS", "EMAIL"] : [opts.channel];

  for (const channel of channels) {
    const result =
      channel === "SMS"
        ? await sendSms(opts.phone, opts.message)
        : await sendEmail(opts.email, opts.subject, opts.message);

    await prisma.notification.create({
      data: {
        deviceId: opts.deviceId,
        filterId: opts.filterId,
        type: opts.type,
        channel,
        message: opts.message,
        sentTo: (channel === "SMS" ? opts.phone : opts.email) || null,
        status: result.status,
      },
    });
  }
}
