import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { computeFilterStatus } from "@/lib/status";
import { fmtGallons } from "@/lib/units";
import {
  Battery,
  Card,
  OnlineDot,
  StateBadge,
  UsageBar,
} from "@/app/components/ui";
import { SubmitButton } from "@/app/components/SubmitButton";
import { SetupNotice } from "@/app/components/SetupNotice";
import { pollNow, syncAllAccounts } from "@/app/actions";

export const dynamic = "force-dynamic";

type ServiceType = "COMMERCIAL" | "RESIDENTIAL";

async function getData() {
  const devices = await prisma.device.findMany({
    orderBy: { name: "asc" },
    include: {
      customer: true,
      filters: { where: { active: true }, take: 1 },
      readings: { orderBy: { recordedAt: "desc" }, take: 1 },
    },
  });
  const accountCount = await prisma.tuyaAccount.count();
  return { devices, accountCount };
}

export default async function Dashboard() {
  let data: Awaited<ReturnType<typeof getData>>;
  try {
    data = await getData();
  } catch (e) {
    return <SetupNotice error={e instanceof Error ? e.message : String(e)} />;
  }

  const { devices, accountCount } = data;

  const rows = devices.map((d) => {
    const filter = d.filters[0];
    const latest = d.readings[0];
    const status = computeFilterStatus(
      latest?.cumulativeGallons ?? null,
      filter?.baselineGallons ?? 0,
      filter?.limitGallons ?? 0,
      filter?.warnGallonsRemaining,
    );
    return { device: d, filter, latest, status };
  });

  const dueCount = rows.filter((r) => r.status.state === "due").length;
  const warnCount = rows.filter((r) => r.status.state === "warning").length;

  const groups: { type: ServiceType | "UNASSIGNED"; title: string }[] = [
    { type: "COMMERCIAL", title: "Commercial" },
    { type: "RESIDENTIAL", title: "Residential" },
    { type: "UNASSIGNED", title: "Unassigned devices" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Filter dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Water usage and filter health across all connected meters.
          </p>
        </div>
        <form action={syncAllAccounts}>
          <SubmitButton variant="secondary" pendingText="Syncing…">
            Sync devices from Tuya
          </SubmitButton>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Meters" value={String(devices.length)} />
        <Stat label="Filters due" value={String(dueCount)} tone="rose" />
        <Stat label="Replace soon" value={String(warnCount)} tone="amber" />
        <Stat label="Linked accounts" value={String(accountCount)} />
      </div>

      {devices.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">
            No meters connected yet.{" "}
            <Link href="/settings" className="font-medium text-blue-600 underline">
              Link a Tuya account
            </Link>{" "}
            to pull in your Restmo water meters.
          </p>
        </Card>
      ) : (
        groups.map((group) => {
          const groupRows = rows.filter((r) =>
            group.type === "UNASSIGNED"
              ? !r.device.customer
              : r.device.customer?.type === group.type,
          );
          if (groupRows.length === 0) return null;
          return (
            <section key={group.type} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {group.title}
                <span className="ml-2 text-slate-400">{groupRows.length}</span>
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {groupRows.map(({ device, filter, latest, status }) => (
                  <Card key={device.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/devices/${device.id}`}
                          className="font-semibold text-slate-900 hover:text-blue-600"
                        >
                          {device.name}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {device.customer?.name ?? "No customer assigned"}
                        </p>
                      </div>
                      <StateBadge state={status.state} />
                    </div>

                    <div className="mt-4">
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                        <span>{filter?.label ?? "Water filter"}</span>
                        <span>
                          {fmtGallons(status.used)} /{" "}
                          {fmtGallons(status.limit)} gal
                        </span>
                      </div>
                      <UsageBar state={status.state} pct={status.pct} />
                      <p className="mt-1 text-xs text-slate-400">
                        {status.state === "unknown"
                          ? "Awaiting first reading"
                          : `${fmtGallons(status.remaining)} gal until replacement`}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <div className="flex items-center gap-3">
                        <OnlineDot online={device.online} />
                        <Battery pct={device.batteryPct} />
                      </div>
                      <form action={pollNow}>
                        <input
                          type="hidden"
                          name="deviceId"
                          value={device.id}
                        />
                        <SubmitButton variant="secondary" pendingText="…">
                          Refresh
                        </SubmitButton>
                      </form>
                    </div>
                    {latest ? (
                      <p className="mt-2 text-[11px] text-slate-400">
                        Last reading {latest.recordedAt.toLocaleString()}
                      </p>
                    ) : null}
                  </Card>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "rose" | "amber";
}) {
  const tones = {
    slate: "text-slate-900",
    rose: "text-rose-600",
    amber: "text-amber-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold ${tones[tone]}`}>{value}</p>
    </div>
  );
}
