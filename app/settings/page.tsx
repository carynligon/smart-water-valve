import { prisma } from "@/lib/prisma";
import { TUYA_REGIONS } from "@/lib/tuya";
import { isSmsConfigured } from "@/lib/sms";
import { Card } from "@/app/components/ui";
import { SubmitButton } from "@/app/components/SubmitButton";
import { SetupNotice } from "@/app/components/SetupNotice";
import { linkAccount, removeAccount, syncAllAccounts } from "@/app/actions";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

async function getData() {
  return prisma.tuyaAccount.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { devices: true } } },
  });
}

export default async function SettingsPage() {
  let accounts: Awaited<ReturnType<typeof getData>>;
  try {
    accounts = await getData();
  } catch (e) {
    return <SetupNotice error={e instanceof Error ? e.message : String(e)} />;
  }

  const tuyaConfigured = Boolean(
    process.env.TUYA_ACCESS_KEY && process.env.TUYA_SECRET_KEY,
  );
  const smsConfigured = isSmsConfigured();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Connect Tuya / Smart Life accounts and check integration status.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ConfigStatus
          label="Tuya Cloud API"
          ok={tuyaConfigured}
          okText="Connected"
          badText="Set TUYA_ACCESS_KEY / TUYA_SECRET_KEY"
        />
        <ConfigStatus
          label="Twilio SMS alerts"
          ok={smsConfigured}
          okText="Enabled"
          badText="Set TWILIO_* env vars to send texts"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card>
          <h2 className="mb-3 font-semibold">Link a Tuya account</h2>
          <p className="mb-3 text-xs text-slate-500">
            Find the <strong>UID</strong> in iot.tuya.com → your Cloud Project →
            Devices → Link Tuya App Account.
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
