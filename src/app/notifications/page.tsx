import { getCurrentUser } from "@/lib/identity";
import { getFollowedTeams } from "@/lib/followedTeams";
import { getLeague } from "@/lib/leagues";
import { setPhoneNumber, setTeamNotificationPrefs, sendTestText, verifyPhone, resendPhoneCode } from "@/app/actions";
import { textingConfigured } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import TeamLogoBadge from "@/components/TeamLogoBadge";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ test?: string; verify?: string }>;
}) {
  const { test, verify } = await searchParams;
  const connected = textingConfigured();
  const user = await getCurrentUser();
  if (!user) return null;

  const [followed, favorites] = await Promise.all([
    getFollowedTeams(user.id),
    prisma.favoriteTeam.findMany({ where: { userId: user.id } }),
  ]);
  const prefsByKey = new Map(favorites.map((f) => [`${f.league}:${f.teamId}`, f]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl uppercase sm:text-4xl">
          <span className="mark-yellow">Text updates</span>
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          Your personal Locker Room agent can text you updates — pick which teams and what kind of
          updates you want. Reply STOP to any text to opt out.
        </p>
        <p
          className={`mt-3 inline-block rounded-full border-2 px-3 py-1 text-xs font-bold uppercase ${
            connected ? "border-ink bg-yellow" : "border-hairline text-muted"
          }`}
        >
          {connected ? "Texting is connected" : "Texting isn't connected yet — your picks are saved for when it is"}
        </p>
        {verify && (
          <p className="mt-3 rounded-lg border-[3px] border-ink bg-yellow px-3 py-2 text-sm font-medium">
            {verify === "sent" && "Code sent — enter the 6 digits below."}
            {verify === "ok" && "Number verified. Pick your alerts below."}
            {verify === "wrong" && "That code didn't match. Try again."}
            {verify === "expired" && "That code expired — send a new one."}
            {verify === "locked" && "Too many wrong tries — send a new code."}
            {verify === "wait" && "Hang on a minute before asking for another code."}
            {verify === "failed" && "Couldn't send the text. Double-check the number, or try again in a bit."}
            {verify === "notconfigured" && "Texting isn't connected yet."}
          </p>
        )}
        {test && (
          <p className="mt-3 rounded-lg border-[3px] border-ink bg-yellow px-3 py-2 text-sm font-medium">
            {test === "sent" && "Test text sent — check your phone."}
            {test === "failed" && "The test text failed to send. Check the number and try again."}
            {test === "nophone" && "Save and verify your phone number first."}
            {test === "notconfigured" && "Texting isn't connected yet."}
          </p>
        )}
      </div>

      <section className="rounded-2xl border-[3px] border-ink p-5">
        <h2 className="font-display uppercase mb-2">Your phone number</h2>
        <p className="mb-3 text-xs text-muted">
          Where updates go. We&apos;ll text you a code to confirm it&apos;s really your number.
        </p>
        <p className="mb-3 text-xs text-muted">
          By saving your number you agree to receive text alerts from The Locker Room about the teams
          and alert types you choose below (about a few per game day). Message &amp; data rates may
          apply. Reply STOP to cancel or HELP for help. We never share your number.
        </p>
        <form action={setPhoneNumber} className="flex flex-wrap gap-2">
          <input
            name="phoneNumber"
            type="tel"
            defaultValue={user.phoneNumber ?? ""}
            placeholder="e.g. (555) 123-4567"
            className="flex-1 min-w-[200px] rounded-md border-2 border-ink bg-transparent px-3 py-2 text-sm outline-none focus:bg-yellow-soft"
          />
          <button
            type="submit"
            className="rounded-full border-[3px] border-ink bg-ink px-4 py-2 font-display text-sm uppercase text-paper transition-colors hover:bg-yellow hover:text-ink"
          >
            {user.phoneNumber ? "Update" : "Save"}
          </button>
        </form>

        {user.phoneNumber && user.phoneVerified && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-full border-2 border-ink bg-yellow px-2 py-0.5 text-[10px] font-black uppercase">
              ✓ Verified
            </span>
            {connected && (
              <form action={sendTestText}>
                <button
                  type="submit"
                  className="rounded-full border-2 border-ink px-3 py-1 text-xs font-bold uppercase hover:bg-yellow-soft"
                >
                  Send me a test text
                </button>
              </form>
            )}
          </div>
        )}

        {user.phoneNumber && !user.phoneVerified && connected && (
          <div className="mt-4 rounded-xl border-2 border-dashed border-ink p-3">
            <p className="mb-2 text-sm font-medium">Not verified yet — enter the code we texted you.</p>
            <div className="flex flex-wrap items-center gap-2">
              <form action={verifyPhone} className="flex gap-2">
                <input
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  placeholder="6-digit code"
                  className="w-32 rounded-md border-2 border-ink bg-transparent px-3 py-2 text-sm tracking-widest outline-none focus:bg-yellow-soft"
                />
                <button
                  type="submit"
                  className="rounded-full border-2 border-ink bg-ink px-4 py-2 font-display text-xs uppercase text-paper hover:bg-yellow hover:text-ink"
                >
                  Verify
                </button>
              </form>
              <form action={resendPhoneCode}>
                <button type="submit" className="text-xs text-muted underline hover:text-ink">
                  Send a new code
                </button>
              </form>
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display uppercase mb-1">Per-team alerts</h2>
        <p className="mb-4 text-sm text-muted">
          For each team you follow, choose what you want texted about it. Alerts only go out once your number is verified.
        </p>
        {followed.length === 0 ? (
          <p className="text-sm text-muted">Follow a team on the Home page to set alerts for it.</p>
        ) : (
          <div className="space-y-3">
            {followed.map((f) => {
              const prefs = prefsByKey.get(`${f.league}:${f.teamId}`);
              return (
                <div key={`${f.league}:${f.teamId}`} className="rounded-xl border-2 border-hairline p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <TeamLogoBadge src={f.team.logos?.[0]?.href} size={24} />
                    <span className="font-display uppercase">{f.team.displayName}</span>
                    <span className="text-[10px] font-bold uppercase text-muted">
                      {getLeague(f.league).shortName}
                    </span>
                  </div>
                  <form action={setTeamNotificationPrefs} className="flex flex-wrap gap-4 text-sm">
                    <input type="hidden" name="league" value={f.league} />
                    <input type="hidden" name="teamId" value={f.teamId} />
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="notifyGameStart"
                        defaultChecked={prefs?.notifyGameStart}
                        className="h-4 w-4 accent-yellow"
                      />
                      Game starting
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="notifyScoreUpdates"
                        defaultChecked={prefs?.notifyScoreUpdates}
                        className="h-4 w-4 accent-yellow"
                      />
                      Score updates
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="notifyFinalScore"
                        defaultChecked={prefs?.notifyFinalScore}
                        className="h-4 w-4 accent-yellow"
                      />
                      Final score
                    </label>
                    <button
                      type="submit"
                      className="rounded-full border-2 border-ink px-3 py-1 text-xs font-bold uppercase hover:bg-yellow-soft"
                    >
                      Save
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
