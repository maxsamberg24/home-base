// Netlify Scheduled Function: every 5 minutes, ask the app to check for
// anything worth texting about. All the logic lives in the app itself
// (src/lib/notificationRunner.ts); this just pokes it on a timer.
const handler = async () => {
  const base = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.log("send-text-updates: missing URL or CRON_SECRET, skipping");
    return;
  }
  const res = await fetch(`${base}/api/notifications/run`, {
    method: "POST",
    headers: { "x-cron-secret": secret },
  });
  console.log("send-text-updates:", res.status, (await res.text()).slice(0, 500));
};

export default handler;

export const config = { schedule: "*/5 * * * *" };
