import twilio from "twilio";

export type SmsResult = { status: "sent" | "failed" | "skipped"; detail?: string };

// Sends an SMS via Twilio. If Twilio env vars are missing, it no-ops with
// "skipped" so the rest of the app keeps working in local/dev without credentials.
export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
    return { status: "skipped", detail: "Twilio not configured" };
  }
  if (!to) {
    return { status: "skipped", detail: "No destination phone number" };
  }

  try {
    const client = twilio(sid, token);
    const msg = await client.messages.create({ to, from, body });
    return { status: "sent", detail: msg.sid };
  } catch (e) {
    return {
      status: "failed",
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER,
  );
}
