import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeCode } from "@/lib/tuyaOAuth";
import { syncAccountDevices } from "@/lib/devices";

// Tuya redirects the device owner's browser here with ?code=...&state=...
// (state is the LinkRequest id). Node runtime: we use node:crypto for signing.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  // Where to send the owner afterwards. If we know the LinkRequest, land on its
  // status page; otherwise fall back to the admin settings page.
  const done = (extra: Record<string, string>) => {
    const target = state ? `/link/${state}` : "/settings";
    const dest = new URL(target, url.origin);
    for (const [k, v] of Object.entries(extra)) dest.searchParams.set(k, v);
    return NextResponse.redirect(dest);
  };

  const linkRequest = state
    ? await prisma.linkRequest.findUnique({ where: { id: state } })
    : null;

  if (!code) {
    const msg = url.searchParams.get("msg") || "Authorization was cancelled.";
    if (linkRequest) {
      await prisma.linkRequest.update({
        where: { id: linkRequest.id },
        data: { status: "error", error: msg },
      });
    }
    return done({ error: msg });
  }

  const region = linkRequest?.region ?? "us";

  try {
    const token = await exchangeCode(code, region);

    const account = await prisma.tuyaAccount.upsert({
      where: { uid: token.uid },
      create: {
        label: linkRequest?.label ?? `Smart Life (${token.uid.slice(0, 8)})`,
        uid: token.uid,
        region,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        tokenExpiresAt: new Date(Date.now() + token.expire_time * 1000),
        customerId: linkRequest?.customerId ?? undefined,
      },
      update: {
        region,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        tokenExpiresAt: new Date(Date.now() + token.expire_time * 1000),
        customerId: linkRequest?.customerId ?? undefined,
      },
    });

    if (linkRequest) {
      await prisma.linkRequest.update({
        where: { id: linkRequest.id },
        data: {
          status: "linked",
          error: null,
          accountId: account.id,
          linkedAt: new Date(),
        },
      });
    }

    // Import the owner's devices. Don't fail the whole link if this errors —
    // the token is saved and a manual "Sync" can retry.
    let deviceCount = 0;
    try {
      deviceCount = await syncAccountDevices(account.id);
    } catch (e) {
      console.error("Device sync after linking failed:", e);
    }

    return done({ linked: "1", devices: String(deviceCount) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (linkRequest) {
      await prisma.linkRequest.update({
        where: { id: linkRequest.id },
        data: { status: "error", error: msg },
      });
    }
    return done({ error: msg });
  }
}
