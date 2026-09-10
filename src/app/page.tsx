import Link from "next/link";
import { getCurrentUser } from "@/lib/identity";
import { getTeam, getTeams, getCurrentWeek } from "@/lib/espn";
import { prisma } from "@/lib/prisma";
import { CURRENT_SEASON } from "@/lib/constants";
import { setFavoriteTeam } from "@/app/actions";
import TeamCard from "@/components/TeamCard";
import SportTabs from "@/components/SportTabs";
import DivisionAccordion from "@/components/DivisionAccordion";
import { divisionForAbbreviation } from "@/lib/divisions";

const features = [
  {
    href: "/team",
    icon: "🏟️",
    title: "My Team",
    body: "News, scores, stats, and the depth chart for your favorite team.",
  },
  {
    href: "/predictions",
    icon: "🔮",
    title: "Predictions",
    body: "Call every team's win total, plus your Super Bowl and MVP futures.",
  },
  {
    href: "/games",
    icon: "🎯",
    title: "Games",
    body: "Weekly pick'em, spread guessing, and survivor pools with friends.",
  },
];

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [favoriteTeam, teams, currentWeek, groupCount, prediction] = await Promise.all([
    user.favoriteTeamId ? getTeam(user.favoriteTeamId).catch(() => null) : null,
    getTeams(),
    getCurrentWeek().catch(() => null),
    prisma.groupMember.count({ where: { userId: user.id } }),
    prisma.seasonPrediction.findUnique({
      where: { userId_season: { userId: user.id, season: CURRENT_SEASON } },
    }),
  ]);

  const favoriteDiv = user.favoriteTeamId
    ? divisionForAbbreviation(teams.find((t) => t.id === user.favoriteTeamId)?.abbreviation ?? "")
    : undefined;

  const stats = [
    { label: "Week", value: currentWeek ? currentWeek.week : "—" },
    { label: "My team", value: favoriteTeam?.abbreviation ?? "—" },
    { label: "Groups", value: groupCount },
    { label: "Predictions", value: prediction ? "Set" : "—" },
  ];

  return (
    <div className="space-y-14">
      {/* Hero */}
      <section>
        <h1 className="font-display text-4xl uppercase leading-[0.95] sm:text-6xl">
          Welcome back,
          <br />
          <span className="mark-yellow">{user.name}.</span>
        </h1>
        <p className="mt-4 max-w-lg text-lg text-muted">
          Here&apos;s everything for your {CURRENT_SEASON} NFL season.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-y-6 border-y-[3px] border-ink py-5 sm:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`px-4 border-ink ${i % 2 === 1 ? "border-l-[3px]" : "border-l-0"} sm:border-l-[3px] ${
                i === 0 ? "sm:border-l-0" : ""
              }`}
            >
              <div className="text-[11px] font-bold uppercase tracking-widest text-muted">
                {s.label}
              </div>
              <div className="font-display text-2xl uppercase">{s.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Favorite team banner */}
      {favoriteTeam ? (
        <Link
          href="/team"
          className="flex flex-col items-center gap-6 overflow-hidden rounded-2xl border-[3px] border-ink sm:flex-row"
        >
          <div
            className="flex w-full items-center justify-center p-8 sm:w-56"
            style={{ backgroundColor: favoriteTeam.color ? `#${favoriteTeam.color}` : "#111111" }}
          >
            {favoriteTeam.logos?.[0]?.href && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={favoriteTeam.logos[0].href} alt="" className="h-24 w-24 object-contain" />
            )}
          </div>
          <div className="flex-1 px-6 py-6 sm:py-0">
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted">
              Your team{favoriteDiv ? ` · ${favoriteDiv.conference} ${favoriteDiv.division}` : ""}
            </div>
            <div className="font-display text-2xl uppercase sm:text-3xl">
              {favoriteTeam.displayName}
            </div>
            {favoriteTeam.record?.items?.[0]?.summary && (
              <div className="mt-1 text-muted">{favoriteTeam.record.items[0].summary}</div>
            )}
          </div>
          <div className="hidden pr-6 font-display text-sm uppercase sm:block">View team →</div>
        </Link>
      ) : (
        <Link
          href="/team"
          className="block rounded-2xl border-[3px] border-dashed border-ink p-6 text-center font-display uppercase hover:bg-yellow-soft transition-colors"
        >
          Pick your favorite team →
        </Link>
      )}

      {/* Feature blocks */}
      <section className="grid gap-4 sm:grid-cols-3">
        {features.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="rounded-2xl border-[3px] border-ink bg-paper p-5 transition-transform hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#111111]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border-[3px] border-ink bg-yellow text-xl">
              {f.icon}
            </span>
            <div className="mt-3 font-display uppercase">{f.title}</div>
            <div className="mt-1 text-sm text-muted">{f.body}</div>
          </Link>
        ))}
      </section>

      {/* Browse the league */}
      <section>
        <h2 className="font-display text-2xl uppercase">Browse the league</h2>
        <p className="mt-1 text-muted">Pick a sport, then a division, to see the teams.</p>
        <div className="mt-4">
          <SportTabs />
        </div>
        <div className="mt-4">
          <DivisionAccordion
            teams={teams}
            openDivision={favoriteDiv ? `${favoriteDiv.conference} ${favoriteDiv.division}` : undefined}
            renderTeam={(team) => (
              <form action={setFavoriteTeam}>
                <input type="hidden" name="teamId" value={team.id} />
                <button type="submit" className="w-full text-left">
                  <TeamCard team={team} size="sm" />
                </button>
              </form>
            )}
          />
        </div>
      </section>

      {/* Connected accounts placeholder */}
      <section className="rounded-2xl border-[3px] border-ink p-5">
        <h2 className="font-display text-xl uppercase">Connect your accounts</h2>
        <p className="mt-1 text-muted">
          Link a sportsbook or fantasy league so bets and rosters sync automatically. Coming soon.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {["DraftKings", "Fantasy Football"].map((name) => (
            <button
              key={name}
              disabled
              title="Coming soon"
              className="flex cursor-not-allowed items-center gap-2 rounded-full border-[3px] border-hairline px-4 py-2 text-sm font-medium text-muted"
            >
              Connect {name}
              <span className="rounded-full bg-hairline px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                Soon
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
