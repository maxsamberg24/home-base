import { getCurrentUser } from "@/lib/identity";
import { getFollowedTeams } from "@/lib/followedTeams";
import { getLeague } from "@/lib/leagues";
import { setPhoneNumber, setTeamNotificationPrefs, sendTestText } from "@/app/actions";
import { textingConfigured } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import TeamLogoBadge from "@/components/TeamLogoBadge";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ test?: string }>;
}) {
  const { test } = await searchParams;
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
        {test && (
          <p className="mt-3 rounded-lg border-[3px] border-ink bg-yellow px-3 py-2 text-sm font-medium">
            {test === "sent" && "Test text sent — check your phone."}
            {test === "failed" && "Twilio rejected the test text. Check the number (and, on a trial account, that it's a verified number)."}
            {test === "nophone" && "Save your phone number first."}
            {test === "notconfigured" && "Texting isn't connected yet."}
          </p>
        )}
      </div>

      <section className="rounded-2xl border-[3px] border-ink p-5">
        <h2 className="font-display uppercase mb-2">Your phone number</h2>
        <p className="mb-3 text-xs text-muted">Where updates will go once texting is turned on.</p>
        <form action={setPhoneNumber} className="flex flex-wrap gap-2">
          <input
            name="phoneNumber"
            type="tel"
            defaultValue={user.phoneNumber ?? ""}
            placeholder="e.g. +1 555 123 4567"
            className="flex-1 min-w-[200px] rounded-md border-2 border-ink bg-transparent px-3 py-2 text-sm outline-none focus:bg-yellow-soft"
          />
          <button
            type="submit"
            className="rounded-full border-[3px] border-ink bg-ink px-4 py-2 font-display text-sm uppercase text-paper transition-colors hover:bg-yellow hover:text-ink"
          >
            Save
          </button>
        </form>
        {connected && user.phoneNumber && (
          <form action={sendTestText} className="mt-3">
            <button
              type="submit"
              className="rounded-full border-2 border-ink px-3 py-1 text-xs font-bold uppercase hover:bg-yellow-soft"
            >
              Send me a test text
            </button>
          </form>
        )}
      </section>

      <section>
        <h2 className="font-display uppercase mb-1">Per-team alerts</h2>
        <p className="mb-4 text-sm text-muted">
          For each team you follow, choose what you want texted about it.
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
