// Thin dispatch layer so every page can ask for "this league's teams /
// schedule / standings" without caring whether that league is backed by
// ESPN or one of the native-feed adapters (LNB, EuroLeague) — all three
// return the exact same shapes from src/lib/espn.ts.
import type { LeagueDef } from "./leagues";
import type { EspnTeamRef, EspnTeamDetail, ScheduleEvent, StandingsGroup, EspnArticle, EspnRosterGroup } from "./espn";
import * as espn from "./espn";
import * as lnb from "./lnb";
import * as euroleague from "./euroleague";

export async function getLeagueTeams(league: LeagueDef): Promise<EspnTeamRef[]> {
  switch (league.provider) {
    case "lnb":
      return lnb.getTeams(league.providerCompetitionId!);
    case "euroleague":
      return euroleague.getTeams();
    default:
      return espn.getTeams(league.sportPath);
  }
}

export async function getLeagueTeam(league: LeagueDef, teamId: string): Promise<EspnTeamDetail> {
  switch (league.provider) {
    case "lnb":
      return lnb.getTeam(league.providerCompetitionId!, teamId);
    case "euroleague":
      return euroleague.getTeam(league.providerCompetitionId!, teamId);
    default:
      return espn.getTeam(league.sportPath, teamId);
  }
}

export async function getLeagueTeamSchedule(league: LeagueDef, teamId: string): Promise<ScheduleEvent[]> {
  switch (league.provider) {
    case "lnb":
      return lnb.getTeamSchedule(league.providerCompetitionId!, teamId);
    case "euroleague":
      return euroleague.getTeamSchedule(league.providerCompetitionId!, teamId);
    default:
      return espn.getTeamSchedule(league.sportPath, teamId);
  }
}

export async function getLeagueStandings(league: LeagueDef): Promise<StandingsGroup[]> {
  switch (league.provider) {
    case "lnb":
      return lnb.getStandings(league.providerCompetitionId!);
    case "euroleague":
      return euroleague.getStandings();
    default:
      return espn.getStandings(league.sportPath);
  }
}

export async function getLeagueTeamNews(league: LeagueDef, teamId: string, limit = 10): Promise<EspnArticle[]> {
  switch (league.provider) {
    case "lnb":
      return lnb.getTeamNews();
    case "euroleague":
      return euroleague.getTeamNews();
    default:
      return espn.getTeamNews(league.sportPath, teamId, limit);
  }
}

export async function getLeagueTeamRoster(league: LeagueDef, teamId: string): Promise<EspnRosterGroup[]> {
  switch (league.provider) {
    case "lnb":
      return lnb.getTeamRoster();
    case "euroleague":
      return euroleague.getTeamRoster();
    default:
      return espn.getTeamRoster(league.sportPath, teamId);
  }
}
