// Text sending via Twilio's REST API (plain fetch — no SDK needed). Texting
// turns on automatically once these three env vars exist in Netlify:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
// Until then textingConfigured() is false and nothing is ever sent.

export function textingConfigured(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
}

// Twilio needs E.164 (+15551234567). Accept the ways people actually type a
// US number too; anything else must already include a +country code.
export function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (/^\+\d{8,15}$/.test(cleaned)) return cleaned;
  if (/^\d{10}$/.test(cleaned)) return `+1${cleaned}`;
  if (/^1\d{10}$/.test(cleaned)) return `+${cleaned}`;
  return null;
}

export async function sendTextUpdate(to: string, message: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) throw new Error("Texting isn't configured (missing Twilio env vars).");

  const res = await fetch(`${process.env.TWILIO_API_BASE ?? "https://api.twilio.com"}/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: message }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Twilio rejected the text (${res.status}): ${detail.slice(0, 300)}`);
  }
}
