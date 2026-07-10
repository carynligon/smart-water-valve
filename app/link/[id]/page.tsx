import { prisma } from "@/lib/prisma";
import { buildAuthorizeUrl } from "@/lib/tuyaOAuth";
import { Card } from "@/app/components/ui";

export const dynamic = "force-dynamic";

export default async function LinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const justLinked = sp.linked === "1";
  const callbackError = typeof sp.error === "string" ? sp.error : null;
  const deviceCount = typeof sp.devices === "string" ? sp.devices : null;

  const req = await prisma.linkRequest.findUnique({
    where: { id },
    include: { customer: true },
  });

  if (!req) {
    return (
      <Centered>
        <Card>
          <h1 className="text-lg font-semibold">Link not found</h1>
          <p className="mt-2 text-sm text-slate-500">
            This linking invitation is invalid or has been removed. Please ask
            for a new link.
          </p>
        </Card>
      </Centered>
    );
  }

  // Success — either persisted as linked, or fresh off the callback redirect.
  if (justLinked || req.status === "linked") {
    return (
      <Centered>
        <Card>
          <div className="text-3xl">✅</div>
          <h1 className="mt-2 text-lg font-semibold">Account linked</h1>
          <p className="mt-2 text-sm text-slate-600">
            Thanks{req.customer ? `, ${req.customer.name}` : ""}! Your Smart Life
            account is now connected
            {deviceCount ? ` and ${deviceCount} device(s) were imported` : ""}.
            You can close this page.
          </p>
        </Card>
      </Centered>
    );
  }

  let authorizeUrl: string | null = null;
  let configError: string | null = null;
  try {
    authorizeUrl = buildAuthorizeUrl(req.id);
  } catch (e) {
    configError = e instanceof Error ? e.message : String(e);
  }

  return (
    <Centered>
      <Card>
        <div className="text-3xl">💧</div>
        <h1 className="mt-2 text-lg font-semibold">
          Connect your Smart Life account
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          FlowGuard monitors your water filter usage and alerts you when it&apos;s
          time to replace the filter. Tap continue to sign in to Smart Life and
          choose which devices to share.
        </p>

        {callbackError ? (
          <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
            Last attempt failed: {callbackError}. You can try again.
          </p>
        ) : null}

        {configError ? (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            This link isn&apos;t fully configured yet ({configError}).
          </p>
        ) : (
          <a
            href={authorizeUrl!}
            className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Continue to Smart Life login
          </a>
        )}
      </Card>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-md pt-8 text-center">{children}</div>;
}
