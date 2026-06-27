import { NextResponse } from "next/server";
import { pollAllDevices } from "@/lib/devices";

// Polls every device, records readings, and fires SMS alerts for due filters.
// Wired to Vercel Cron via vercel.json. Protected by CRON_SECRET when set.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const results = await pollAllDevices();
    const ok = results.filter((r) => r.ok).length;
    return NextResponse.json({
      polled: results.length,
      ok,
      failed: results.length - ok,
      results,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
