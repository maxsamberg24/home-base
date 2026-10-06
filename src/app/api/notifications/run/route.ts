import { NextResponse } from "next/server";
import { runNotifications } from "@/lib/notificationRunner";
import { textingConfigured } from "@/lib/notifications";

// Called every few minutes by netlify/functions/send-text-updates.mts.
// Protected by CRON_SECRET so nobody else can trigger sends. Add ?dry=1 to
// see what *would* be sent without sending (and &now=<ISO time> to test as
// of a different moment).
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const dry = url.searchParams.get("dry") === "1";
  if (!dry && !textingConfigured()) {
    return NextResponse.json({ error: "Texting isn't configured (missing Twilio env vars)." }, { status: 503 });
  }

  // A fixed "now" is only honored for dry runs or when pointed at a fake
  // Twilio (local testing) — never for real sends in production.
  const nowParam = dry || process.env.TWILIO_API_BASE ? url.searchParams.get("now") : null;
  const now = nowParam ? new Date(nowParam) : undefined;
  const results = await runNotifications({ dry, now });
  return NextResponse.json({ dry, count: results.length, results });
}
