"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { customAlphabet } from "nanoid";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, SESSION_COOKIE } from "@/lib/identity";

const inviteAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const nanoid = customAlphabet(inviteAlphabet, 6);

async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You need to set a display name first.");
  return user.id;
}

export async function createIdentity(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");

  const user = await prisma.user.create({ data: { name } });
  const store = await cookies();
  store.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  const redirectTo = String(formData.get("redirectTo") ?? "/");
  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function signOut(formData: FormData) {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  const redirectTo = String(formData.get("redirectTo") ?? "/");
  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function setFavoriteTeam(formData: FormData) {
  const userId = await requireUserId();
  const teamId = String(formData.get("teamId") ?? "");
  if (!teamId) throw new Error("teamId is required");
  await prisma.user.update({ where: { id: userId }, data: { favoriteTeamId: teamId } });
  revalidatePath("/team");
  revalidatePath("/", "layout");
}

export async function createGroup(formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Group name is required");

  const group = await prisma.group.create({
    data: {
      name,
      inviteCode: nanoid(),
      createdById: userId,
      members: { create: { userId } },
    },
  });

  revalidatePath("/games");
  redirect(`/games/groups/${group.id}`);
}

export async function joinGroup(formData: FormData) {
  const userId = await requireUserId();
  const code = String(formData.get("inviteCode") ?? "")
    .trim()
    .toUpperCase();
  if (!code) throw new Error("Invite code is required");

  const group = await prisma.group.findUnique({ where: { inviteCode: code } });
  if (!group) throw new Error("No group found with that invite code");

  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId } },
    create: { groupId: group.id, userId },
    update: {},
  });

  revalidatePath("/games");
  redirect(`/games/groups/${group.id}`);
}

export async function submitSeasonPrediction(formData: FormData) {
  const userId = await requireUserId();
  const season = Number(formData.get("season"));

  const winTotals: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("wins_")) {
      const teamId = key.slice("wins_".length);
      const wins = Number(value);
      if (!Number.isNaN(wins)) winTotals[teamId] = Math.max(0, Math.min(17, wins));
    }
  }

  await prisma.seasonPrediction.upsert({
    where: { userId_season: { userId, season } },
    create: { userId, season, winTotals: JSON.stringify(winTotals) },
    update: { winTotals: JSON.stringify(winTotals) },
  });

  revalidatePath("/predictions");
}

export async function submitAwardPredictions(formData: FormData) {
  const userId = await requireUserId();
  const season = Number(formData.get("season"));
  const categories = ["SB_WINNER", "MVP", "OROY", "DROY", "COACH_OY"];

  for (const category of categories) {
    const value = String(formData.get(category) ?? "").trim();
    if (!value) continue;
    await prisma.awardPrediction.upsert({
      where: { userId_season_category: { userId, season, category } },
      create: { userId, season, category, value },
      update: { value },
    });
  }

  revalidatePath("/predictions");
}

export async function submitLinePick(formData: FormData) {
  const userId = await requireUserId();
  const groupId = String(formData.get("groupId"));
  const eventId = String(formData.get("eventId"));
  const season = Number(formData.get("season"));
  const week = Number(formData.get("week"));
  const seasonType = Number(formData.get("seasonType"));
  const guessedSpread = Number(formData.get("guessedSpread"));

  if (Number.isNaN(guessedSpread)) throw new Error("Enter a numeric spread guess");

  await prisma.linePick.upsert({
    where: { groupId_userId_eventId: { groupId, userId, eventId } },
    create: { groupId, userId, eventId, season, week, seasonType, guessedSpread },
    update: { guessedSpread },
  });

  revalidatePath(`/games/groups/${groupId}/lines`);
}

export async function submitStraightPick(formData: FormData) {
  const userId = await requireUserId();
  const groupId = String(formData.get("groupId"));
  const eventId = String(formData.get("eventId"));
  const season = Number(formData.get("season"));
  const week = Number(formData.get("week"));
  const seasonType = Number(formData.get("seasonType"));
  const pickedTeamId = String(formData.get("pickedTeamId"));

  await prisma.straightPick.upsert({
    where: { groupId_userId_eventId: { groupId, userId, eventId } },
    create: { groupId, userId, eventId, season, week, seasonType, pickedTeamId },
    update: { pickedTeamId },
  });

  revalidatePath(`/games/groups/${groupId}/straight`);
}

export async function submitSurvivorPick(formData: FormData) {
  const userId = await requireUserId();
  const groupId = String(formData.get("groupId"));
  const eventId = String(formData.get("eventId"));
  const season = Number(formData.get("season"));
  const week = Number(formData.get("week"));
  const seasonType = Number(formData.get("seasonType"));
  const pickedTeamId = String(formData.get("pickedTeamId"));

  const usedAlready = await prisma.survivorPick.findFirst({
    where: {
      groupId,
      userId,
      season,
      pickedTeamId,
      week: { not: week },
    },
  });
  if (usedAlready) {
    redirect(
      `/games/groups/${groupId}/survivor?error=${encodeURIComponent(
        "You already used that team in an earlier week."
      )}`
    );
  }

  await prisma.survivorPick.upsert({
    where: { groupId_userId_season_week: { groupId, userId, season, week } },
    create: { groupId, userId, eventId, season, week, seasonType, pickedTeamId },
    update: { eventId, pickedTeamId },
  });

  revalidatePath(`/games/groups/${groupId}/survivor`);
}
