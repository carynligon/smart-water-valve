export type EmailResult = {
  status: "sent" | "failed" | "skipped";
  detail?: string;
};

// Sends an email via Resend's REST API. If RESEND_API_KEY / EMAIL_FROM are
// missing, it no-ops with "skipped" so the app keeps working without creds.
// EMAIL_FROM must be a verified sender, e.g. "FlowGuard <alerts@yourdomain.com>"
// (or "onboarding@resend.dev" to test sends to your own account email).
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return { status: "skipped", detail: "Email not configured" };
  }
  if (!to) {
    return { status: "skipped", detail: "No destination email address" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text: body }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return { status: "failed", detail: `HTTP ${res.status}: ${detail.slice(0, 200)}` };
    }
    const data = (await res.json()) as { id?: string };
    return { status: "sent", detail: data.id };
  } catch (e) {
    return {
      status: "failed",
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}
