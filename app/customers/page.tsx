import { prisma } from "@/lib/prisma";
import { Card } from "@/app/components/ui";
import { SubmitButton } from "@/app/components/SubmitButton";
import { SetupNotice } from "@/app/components/SetupNotice";
import { saveCustomer, deleteCustomer } from "@/app/actions";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

async function getData() {
  return prisma.customer.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: { _count: { select: { devices: true } } },
  });
}

export default async function CustomersPage() {
  let customers: Awaited<ReturnType<typeof getData>>;
  try {
    customers = await getData();
  } catch (e) {
    return <SetupNotice error={e instanceof Error ? e.message : String(e)} />;
  }


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="mt-1 text-sm text-slate-500">
          Commercial and residential accounts. The contact phone receives SMS
          filter alerts.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <h2 className="mb-3 font-semibold">Add customer</h2>
          <CustomerForm />
        </Card>

        <div className="space-y-3">
          {customers.length === 0 ? (
            <Card>
              <p className="text-sm text-slate-500">No customers yet.</p>
            </Card>
          ) : (
            customers.map((c) => (
              <Card key={c.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-slate-500">
                      {c.type === "COMMERCIAL" ? "Commercial" : "Residential"} ·{" "}
                      {c._count.devices} device
                      {c._count.devices === 1 ? "" : "s"}
                    </p>
                  </div>
                  <form action={deleteCustomer}>
                    <input type="hidden" name="id" value={c.id} />
                    <SubmitButton variant="danger" pendingText="…">
                      Delete
                    </SubmitButton>
                  </form>
                </div>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-blue-600">
                    Edit details
                  </summary>
                  <div className="mt-3">
                    <CustomerForm customer={c} />
                  </div>
                </details>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function CustomerForm({
  customer,
}: {
  customer?: {
    id: string;
    name: string;
    type: "COMMERCIAL" | "RESIDENTIAL";
    address: string | null;
    contactName: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    alertChannel: "SMS" | "EMAIL" | "BOTH";
  };
}) {
  return (
    <form action={saveCustomer} className="space-y-3">
      {customer ? (
        <input type="hidden" name="id" value={customer.id} />
      ) : null}
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Name
        </span>
        <input
          name="name"
          required
          defaultValue={customer?.name ?? ""}
          className={inputCls}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Type
        </span>
        <select
          name="type"
          defaultValue={customer?.type ?? "RESIDENTIAL"}
          className={inputCls}
        >
          <option value="RESIDENTIAL">Residential</option>
          <option value="COMMERCIAL">Commercial</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Service address
        </span>
        <input
          name="address"
          defaultValue={customer?.address ?? ""}
          className={inputCls}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Contact name
          </span>
          <input
            name="contactName"
            defaultValue={customer?.contactName ?? ""}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Contact phone
          </span>
          <input
            name="contactPhone"
            placeholder="+14155551234"
            defaultValue={customer?.contactPhone ?? ""}
            className={inputCls}
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Contact email
        </span>
        <input
          name="contactEmail"
          type="email"
          placeholder="name@example.com"
          defaultValue={customer?.contactEmail ?? ""}
          className={inputCls}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Alert delivery
        </span>
        <select
          name="alertChannel"
          defaultValue={customer?.alertChannel ?? "SMS"}
          className={inputCls}
        >
          <option value="SMS">SMS only</option>
          <option value="EMAIL">Email only</option>
          <option value="BOTH">SMS &amp; email</option>
        </select>
      </label>
      <SubmitButton pendingText="Saving…">
        {customer ? "Save changes" : "Add customer"}
      </SubmitButton>
    </form>
  );
}
