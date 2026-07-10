import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { TUYA_REGIONS } from "@/lib/tuya";
import { isSmsConfigured } from "@/lib/sms";
import { Card } from "@/app/components/ui";
import { SubmitButton } from "@/app/components/SubmitButton";
import { SetupNotice } from "@/app/components/SetupNotice";
import {
  linkAccount,
  removeAccount,
  syncAllAccounts,
  createLinkRequest,
  deleteLinkRequest,
} from "@/app/actions";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

/** Public base URL used to build shareable invite links. */
function appBaseUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

async function getData() {
  const [accounts, requests, customers] = await Promise.all([
    prisma.tuyaAccount.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { devices: true } },
        customer: { select: { name: true } },
      },
    }),
    prisma.linkRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { name: true } } },
    }),
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  // Pre-render a QR code (data URL) for each pending invite link.
  const base = appBaseUrl();
  const invites = await Promise.all(
    requests.map(async (r) => {
      const url = `${base}/link/${r.id}`;
      const qr =
        r.status === "linked" ? null : await QRCode.toDataURL(url, { width: 220 });
      return { ...r, url, qr };
    }),
  );

  return { accounts, invites, customers };
}

export default async function SettingsPage() {
  let data: Awaited<ReturnType<typeof getData>>;
  try {
    data = await getData();
  } catch (e) {
    return <SetupNotice error={e instanceof Error ? e.message : String(e)} />;
  }
  const { accounts, invites, customers } = data;

  const tuyaConfigured = Boolean(
    process.env.TUYA_ACCESS_KEY && process.env.TUYA_SECRET_KEY,
  );
  const oauthConfigured = Boolean(process.env.TUYA_OAUTH_AUTHORIZE_URL);
  const smsConfigured = isSmsConfigured();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Connect Tuya / Smart Life accounts and check integration status.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <ConfigStatus
          label="Tuya Cloud API"
          ok={tuyaConfigured}
          okText="Connected"
          badText="Set TUYA_ACCESS_KEY / TUYA_SECRET_KEY"
        />
        <ConfigStatus
          label="OAuth linking"
          ok={oauthConfigured}
          okText="Ready"
          badText="Set TUYA_OAUTH_AUTHORIZE_URL"
        />
        <ConfigStatus
          label="Twilio SMS alerts"
          ok={smsConfigured}
          okText="Enabled"
          badText="Set TWILIO_* env vars to send texts"
        />
      </div>

      {/* Invite device owners to link via OAuth ---------------------------- */}
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card>
          <h2 className="mb-1 font-semibold">Invite a device owner</h2>
          <p className="mb-3 text-xs text-slate-500">
            Generates a link + QR code. The customer opens it, signs into their
            Smart Life account, and picks which devices to share — no UID needed.
          </p>
          <form action={createLinkRequest} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Assign to customer (optional)
              </span>
              <select name="customerId" defaultValue="" className={inputCls}>
                <option value="">— Unassigned —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Label
              </span>
              <input
                name="label"
                placeholder="e.g. Jane's Smart Life account"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Data center region
              </span>
              <select name="region" defaultValue="us" className={inputCls}>
                {TUYA_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <SubmitButton pendingText="Creating…">
              Create invite link
            </SubmitButton>
          </form>
        </Card>

        <div className="space-y-3">
          <h2 className="font-semibold">Invitations</h2>
          {invites.length === 0 ? (
            <Card>
              <p className="text-sm text-slate-500">No invitations yet.</p>
            </Card>
          ) : (
            invites.map((inv) => (
              <Card key={inv.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{inv.label}</p>
                      <InviteBadge status={inv.status} />
                    </div>
                    <p className="text-xs text-slate-500">
                      {inv.customer ? inv.customer.name : "Unassigned"} ·{" "}
                      {inv.region.toUpperCase()}
                    </p>
                    {inv.status === "linked" ? (
                      <p className="mt-2 text-xs text-emerald-700">
                        Linked{" "}
                        {inv.linkedAt
                          ? `on ${inv.linkedAt.toLocaleDateString()}`
                          : ""}
                        .
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        <a
                          href={inv.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate font-mono text-xs text-blue-600 hover:underline"
                        >
                          {inv.url}
                        </a>
                        {inv.error ? (
                          <p className="text-xs text-rose-600">
                            Last error: {inv.error}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                  {inv.qr ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={inv.qr}
                      alt="Link QR code"
                      className="h-24 w-24 shrink-0 rounded-md border border-slate-200"
                    />
                  ) : null}
                  <form action={deleteLinkRequest}>
                    <input type="hidden" name="id" value={inv.id} />
                    <SubmitButton variant="danger" pendingText="…">
                      Delete
                    </SubmitButton>
                  </form>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card>
          <h2 className="mb-1 font-semibold">Link manually by UID</h2>
          <p className="mb-3 text-xs text-slate-500">
            Advanced / legacy. Prefer the OAuth invite above. Find the{" "}
            <strong>UID</strong> in iot.tuya.com → your Cloud Project → Devices →
            Link Tuya App Account.
          </p>
          <form action={linkAccount} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Label
              </span>
              <input
                name="label"
                placeholder="e.g. Main Smart Life account"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                App-account UID
              </span>
              <input name="uid" required className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Data center region
              </span>
              <select name="region" defaultValue="us" className={inputCls}>
                {TUYA_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <SubmitButton pendingText="Linking & syncing…">
              Link account & import devices
            </SubmitButton>
          </form>
        </Card>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Linked accounts</h2>
            {accounts.length > 0 ? (
              <form action={syncAllAccounts}>
                <SubmitButton variant="secondary" pendingText="Syncing…">
                  Sync all
                </SubmitButton>
              </form>
            ) : null}
          </div>
          {accounts.length === 0 ? (
            <Card>
              <p className="text-sm text-slate-500">
                No accounts linked yet.
              </p>
            </Card>
          ) : (
            accounts.map((a) => (
              <Card key={a.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{a.label}</p>
                    <p className="font-mono text-xs text-slate-500">{a.uid}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {a.region.toUpperCase()} · {a._count.devices} device
                      {a._count.devices === 1 ? "" : "s"}
                      {a.customer ? ` · ${a.customer.name}` : ""} ·{" "}
                      {a.accessToken ? "OAuth" : "Manual UID"}
                    </p>
                  </div>
                  <form action={removeAccount}>
                    <input type="hidden" name="id" value={a.id} />
                    <SubmitButton variant="danger" pendingText="…">
                      Unlink
                    </SubmitButton>
                  </form>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function InviteBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    linked: "bg-emerald-100 text-emerald-700",
    error: "bg-rose-100 text-rose-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
        styles[status] ?? "bg-slate-100 text-slate-500"
      }`}
    >
      {status}
    </span>
  );
}

function ConfigStatus({
  label,
  ok,
  okText,
  badText,
}: {
  label: string;
  ok: boolean;
  okText: string;
  badText: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
          ok ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-slate-400"}`}
        />
        {ok ? okText : badText}
      </span>
    </div>
  );
}
