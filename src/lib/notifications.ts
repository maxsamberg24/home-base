// Text-message sending isn't wired up yet — there's no SMS provider account
// configured (Twilio is the standard choice: needs its own account, a phone
// number, and API keys that only the app owner can provision). Preferences
// (phone number + per-team toggles for game start / score updates / final
// score) are already collected and stored — see setPhoneNumber and
// setTeamNotificationPrefs in src/app/actions.ts, and the /notifications
// page — so turning this on later is just filling in the body below and
// calling it from wherever the trigger should live (e.g. a Netlify
// Scheduled Function polling for games starting/ending).
export async function sendTextUpdate(to: string, message: string): Promise<void> {
  void to;
  void message;
  throw new Error(
    "Text sending isn't configured yet — set TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER and implement this function."
  );
}
