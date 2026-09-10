import { getTeams } from "@/lib/espn";
import { setFavoriteTeam } from "@/app/actions";
import TeamCard from "@/components/TeamCard";
import DivisionAccordion from "@/components/DivisionAccordion";
import SportTabs from "@/components/SportTabs";

export default async function TeamPicker() {
  const teams = await getTeams();

  return (
    <div>
      <h1 className="font-display text-3xl uppercase sm:text-4xl">
        Pick your <span className="mark-yellow">team</span>
      </h1>
      <p className="mt-2 max-w-xl text-muted">
        This sets up your news, scores, stats, and depth chart hub.
      </p>

      <div className="mt-6">
        <SportTabs />
      </div>

      <div className="mt-4">
        <DivisionAccordion
          teams={teams}
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
    </div>
  );
}
