import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { computeFilterStatus } from "@/lib/status";
import { fmtGallons, rawFlowToGpm } from "@/lib/units";
import { Battery, Card, OnlineDot, StateBadge, UsageBar } from "@/app/components/ui";
import { SubmitButton } from "@/app/components/SubmitButton";
import { LineChart, BarChart } from "@/app/components/charts";
import { SetupNotice } from "@/app/components/SetupNotice";
import {
  assignDevice,
  pollNow,
  resetFilter,
  saveFilter,
  sendTestAlert,
} from "@/app/actions";

export const dynamic = "force-dynamic";

async function getData(id: string) {
  const device = await prisma.device.findUnique({
    where: { id },
    include: {
      customer: true,
      account: true,
      filters: { where: { active: true }, take: 1 },
      readings: { orderBy: { recordedAt: "asc" }, take: 500 },
      notifications: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });
  const customers = await prisma.customer.findMany({ orderBy: { name: "asc" } });
  return { device, customers };
}

function dailyUsage(readings: { recordedAt: Date; cumulativeGallons: number }[]) {
  const byDay = new Map<string, number>();
  for (let i = 1; i < readings.length; i++) {
    const delta =
      readings[i].cumulativeGallons - readings[i - 1].cumulativeGallons;
    if (delta <= 0) continue;
    const d = readings[i].recordedAt;
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    byDay.set(key, (byDay.get(key) ?? 0) + delta);
  }
  return Array.from(byDay.entries())
    .slice(-14)
    .map(([label, value]) => ({ label, value }));
}

export default async function DevicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let data: Awaited<ReturnType<typeof getData>>;
  try {
    data = await getData(id);
  } catch (e) {
    return <SetupNotice error={e instanceof Error ? e.message : String(e)} />;
  }

  const { device, customers } = data;
  if (!device) notFound();

  const filter = device.filters[0];
  const readings = device.readings;
  const latest = readings[readings.length - 1];
  const status = computeFilterStatus(
    latest?.cumulativeGallons ?? null,
    filter?.baselineGallons ?? 0,
    filter?.limitGallons ?? 0,
    filter?.warnGallonsRemaining,
  );

  const linePoints = readings.map((r) => ({
    t: r.recordedAt.getTime(),
    v: r.cumulativeGallons,
  }));
  const bars = dailyUsage(readings);
  const flowGpm = latest ? rawFlowToGpm(latest.flowVelocityRaw) : 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
          ← Dashboard
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {device.name}
            </h1>
            <p className="text-sm text-slate-500">
              {device.productName ?? "Water meter"} ·{" "}
              {device.customer?.name ?? "Unassigned"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <OnlineDot online={device.online} />
            <Battery pct={device.batteryPct} />
            <form action={pollNow}>
              <input type="hidden" name="deviceId" value={device.id} />
              <SubmitButton variant="secondary" pendingText="Refreshing…">
                Refresh now
              </SubmitButton>
            </form>
          </div>
        </div>
      </div>

      {/* Filter status summary */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Filter status</h2>
          <StateBadge state={status.state} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Metric label="Used this filter" value={`${fmtGallons(status.used)} gal`} />
          <Metric label="Gallons remaining" value={`${fmtGallons(status.remaining)} gal`} />
          <Metric label="Current flow" value={`${fmtGallons(flowGpm, 2)} gal/min`} />
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>{filter?.label ?? "Water filter"}</span>
            <span>{status.pct}% of limit</span>
          </div>
          <UsageBar state={status.state} pct={status.pct} />
        </div>
      </Card>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Cumulative water usage (gallons)
          </h3>
          <LineChart points={linePoints} unit="gal" />
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Daily usage (gallons)
          </h3>
          <BarChart bars={bars} color="#0ea5e9" unit="gal/day" />
        </Card>
      </div>

      {/* Config */}
      <div className="grid gap-4 lg:grid-cols-2">
        {filter ? (
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">
              Filter settings
            </h3>
            <form action={saveFilter} className="space-y-3">
              <input type="hidden" name="filterId" value={filter.id} />
              <input type="hidden" name="deviceId" value={device.id} />
              <Field label="Filter label">
                <input
                  name="label"
                  defaultValue={filter.label}
                  className={inputCls}
                />
              </Field>
              <Field label="Replacement limit (gallons)">
                <input
                  name="limitGallons"
                  type="number"
                  min={1}
                  step={1}
                  defaultValue={filter.limitGallons}
                  className={inputCls}
                />
              </Field>
              <Field label="Alert threshold (gallons before limit)">
                <input
                  name="warnGallonsRemaining"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={filter.warnGallonsRemaining}
                  className={inputCls}
                />
                <span className="mt-1 block text-xs text-slate-400">
                  e.g. 100 → alert the customer when {fmtGallons(
                    Math.max(0, status.limit - filter.warnGallonsRemaining),
                  )}{" "}
                  of {fmtGallons(status.limit)} gal have been used.
                </span>
              </Field>
              <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
            </form>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-sm font-medium text-slate-700">
                Replaced the filter?
              </p>
              <p className="mb-3 text-xs text-slate-500">
                Resets the usage counter to 0 from the latest reading and
                re-enables alerts for the new filter.
              </p>
              <form action={resetFilter}>
                <input type="hidden" name="filterId" value={filter.id} />
                <input type="hidden" name="deviceId" value={device.id} />
                <SubmitButton variant="secondary" pendingText="Resetting…">
                  Mark filter changed
                </SubmitButton>
              </form>
            </div>
          </Card>
        ) : null}

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Device & customer
          </h3>
          <form action={assignDevice} className="space-y-3">
            <input type="hidden" name="deviceId" value={device.id} />
            <Field label="Device name">
              <input
                name="name"
                defaultValue={device.name}
                className={inputCls}
              />
            </Field>
            <Field label="Assigned customer">
              <select
                name="customerId"
                defaultValue={device.customerId ?? ""}
                className={inputCls}
              >
                <option value="">— Unassigned —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type === "COMMERCIAL" ? "Commercial" : "Residential"})
                  </option>
                ))}
              </select>
            </Field>
            <SubmitButton pendingText="Saving…">Save</SubmitButton>
          </form>
          {customers.length === 0 ? (
            <p className="mt-3 text-xs text-slate-400">
              No customers yet —{" "}
              <Link href="/customers" className="underline">
                add one
              </Link>{" "}
              to enable SMS alerts.
            </p>
          ) : null}
        </Card>
      </div>

      {/* Notifications */}
      <Card>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-700">Recent alerts</h3>
          <form action={sendTestAlert}>
            <input type="hidden" name="deviceId" value={device.id} />
            <SubmitButton variant="secondary" pendingText="Sending…">
              Send test SMS
            </SubmitButton>
          </form>
        </div>
        {device.customer?.contactPhone ? null : (
          <p className="mb-3 text-xs text-amber-600">
            No contact phone on the assigned customer — a test will record as
            “skipped”.
          </p>
        )}
        {device.notifications.length === 0 ? (
          <p className="text-sm text-slate-400">No alerts sent yet.</p>
        ) : (
          <ul className="space-y-2">
            {device.notifications.map((n) => (
              <li
                key={n.id}
                className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 text-sm last:border-0"
              >
                <span className="text-slate-700">{n.message}</span>
                <span className="whitespace-nowrap text-xs text-slate-400">
                  {n.status} · {n.createdAt.toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
