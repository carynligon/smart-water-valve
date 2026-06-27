import Link from "next/link";

export function SetupNotice({ error }: { error?: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
      <h2 className="text-lg font-semibold text-amber-900">
        Finish setting up the database
      </h2>
      <p className="mt-2 text-sm text-amber-800">
        FlowGuard can&apos;t reach the database yet. Make sure you have:
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-amber-800">
        <li>
          Set <code className="rounded bg-amber-100 px-1">DATABASE_URL</code> in{" "}
          <code className="rounded bg-amber-100 px-1">.env</code> (copy{" "}
          <code className="rounded bg-amber-100 px-1">.env.example</code>).
        </li>
        <li>
          Run{" "}
          <code className="rounded bg-amber-100 px-1">pnpm db:migrate</code> to
          create the tables.
        </li>
      </ol>
      <p className="mt-3 text-sm text-amber-800">
        Then head to <Link href="/settings" className="font-medium underline">Settings</Link>{" "}
        to link your Tuya account.
      </p>
      {error ? (
        <pre className="mt-3 overflow-x-auto rounded bg-amber-100 p-2 text-xs text-amber-900">
          {error}
        </pre>
      ) : null}
    </div>
  );
}
