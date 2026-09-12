"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { customAlphabet } from "nanoid";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, SESSION_COOKIE } from "@/lib/identity";
import { getFriendIds } from "@/lib/friends";
import { TEAM_FILTER_COOKIE } from "@/lib/teamFilter";

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
  store.delete(TEAM_FILTER_COOKIE);
  const redirectTo = String(formData.get("redirectTo") ?? "/");
  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function followTeam(formData: FormData) {
  const userId = await requireUserId();
  const league = String(formData.get("league") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  if (!league || !teamId) throw new Error("league and teamId are required");

  await prisma.favoriteTeam.upsert({
    where: { userId_league_teamId: { userId, league, teamId } },
    create: { userId, league, teamId },
    update: {},
  });

  revalidatePath("/", "layout");
}

export async function unfollowTeam(formData: FormData) {
  const userId = await requireUserId();
  const league = String(formData.get("league") ?? "");
  const teamId = String(formData.get("teamId") ?? "");

  await prisma.favoriteTeam.deleteMany({ where: { userId, league, teamId } });
  revalidatePath("/", "layout");
}

// Persistent cross-page team filter. Called directly from a client component
// (not a <form>), which is fine for Server Actions — Next.js re-renders the
// current route after a cookie write inside one.
export async function toggleTeamFilterKey(key: string) {
  const store = await cookies();
  const current = store.get(TEAM_FILTER_COOKIE)?.value ?? "ALL";
  const userId = await requireUserId();
  const allKeys = (
    await prisma.favoriteTeam.findMany({ where: { userId }, select: { league: true, teamId: true } })
  ).map((f) => `${f.league}:${f.teamId}`);

  const selected = new Set(current === "ALL" ? allKeys : current.split(","));
  if (selected.has(key)) {
    selected.delete(key);
  } else {
    selected.add(key);
  }

  const next = allKeys.every((k) => selected.has(k)) ? "ALL" : [...selected].join(",");
  store.set(TEAM_FILTER_COOKIE, next || "NONE", { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
}

export async function setTeamFilterAll() {
  const store = await cookies();
  store.set(TEAM_FILTER_COOKIE, "ALL", { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
}

export async function saveTeamNote(formData: FormData) {
  const userId = await requireUserId();
  const league = String(formData.get("league") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const content = String(formData.get("content") ?? "");

  await prisma.teamNote.upsert({
    where: { userId_league_teamId: { userId, league, teamId } },
    create: { userId, league, teamId, content },
    update: { content },
  });

  revalidatePath(`/teams/${league}/${teamId}`);
}

export async function setVenmoHandle(formData: FormData) {
  const userId = await requireUserId();
  const venmoHandle = String(formData.get("venmoHandle") ?? "").trim();
  await prisma.user.update({ where: { id: userId }, data: { venmoHandle: venmoHandle || null } });
  revalidatePath("/friends");
  revalidatePath("/games");
}

export async function setFriendCode(formData: FormData) {
  const userId = await requireUserId();
  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { friendCode: true } });
  if (existing?.friendCode) throw new Error("You've already set your friend code.");

  const code = String(formData.get("friendCode") ?? "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z0-9]{3,12}$/.test(code)) {
    throw new Error("Use 3-12 letters/numbers, no spaces or symbols.");
  }

  try {
    await prisma.user.update({ where: { id: userId }, data: { friendCode: code } });
  } catch {
    throw new Error("That code is already taken — try another.");
  }

  revalidatePath("/friends");
}

export async function addFriend(formData: FormData) {
  const userId = await requireUserId();
  const code = String(formData.get("friendCode") ?? "")
    .trim()
    .toUpperCase();
  if (!code) throw new Error("Friend code is required");

  const friend = await prisma.user.findUnique({ where: { friendCode: code } });
  if (!friend) throw new Error("No one found with that friend code");
  if (friend.id === userId) throw new Error("That's your own code");

  const [userAId, userBId] = [userId, friend.id].sort();
  await prisma.friendship.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    create: { userAId, userBId },
    update: {},
  });

  revalidatePath("/friends");
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

  revalidatePath("/games");
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

  revalidatePath("/games");
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

export async function setSurvivorBuyIn(formData: FormData) {
  const userId = await requireUserId();
  const groupId = String(formData.get("groupId"));
  const buyIn = Number(formData.get("buyIn"));
  if (Number.isNaN(buyIn) || buyIn < 0) throw new Error("Enter a valid buy-in amount");

  const [group, membership] = await Promise.all([
    prisma.group.findUnique({ where: { id: groupId } }),
    prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } }),
  ]);
  if (!group) throw new Error("Group not found");
  if (!membership) throw new Error("Not a member of this group");
  if (group.survivorLocked) throw new Error("The pool is already locked");

  await prisma.group.update({ where: { id: groupId }, data: { survivorBuyIn: buyIn } });
  revalidatePath(`/games/groups/${groupId}/survivor`);
}

export async function lockSurvivorPool(formData: FormData) {
  const userId = await requireUserId();
  const groupId = String(formData.get("groupId"));

  const [group, membership] = await Promise.all([
    prisma.group.findUnique({ where: { id: groupId } }),
    prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } }),
  ]);
  if (!group) throw new Error("Group not found");
  if (!membership) throw new Error("Not a member of this group");
  if (group.survivorBuyIn == null) throw new Error("Set a buy-in amount first");

  await prisma.group.update({ where: { id: groupId }, data: { survivorLocked: true } });
  revalidatePath(`/games/groups/${groupId}/survivor`);
}

export async function submitSurvivorPick(formData: FormData) {
  const userId = await requireUserId();
  const groupId = String(formData.get("groupId"));
  const eventId = String(formData.get("eventId"));
  const season = Number(formData.get("season"));
  const week = Number(formData.get("week"));
  const seasonType = Number(formData.get("seasonType"));
  const pickedTeamId = String(formData.get("pickedTeamId"));

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (group?.survivorBuyIn != null && !group.survivorLocked) {
    redirect(
      `/games/groups/${groupId}/survivor?error=${encodeURIComponent(
        "This is a pool with a buy-in — lock it in before making picks."
      )}`
    );
  }

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

// --- Peer-to-peer wagers ---

export async function postWager(formData: FormData) {
  const userId = await requireUserId();
  const opponentId = String(formData.get("opponentId") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim();
  const type = String(formData.get("type") ?? "CUSTOM");
  const line = String(formData.get("line") ?? "").trim() || null;
  const stake = Number(formData.get("stake"));

  if (!description) throw new Error("Description is required");
  if (Number.isNaN(stake) || stake <= 0) throw new Error("Stake must be a positive number");

  if (opponentId) {
    const friends = await getFriendIds(userId);
    if (!friends.has(opponentId)) throw new Error("You can only wager against a friend");
  }

  await prisma.wager.create({
    data: { creatorId: userId, opponentId, description, type, line, stake },
  });

  revalidatePath("/games");
}

export async function acceptWager(formData: FormData) {
  const userId = await requireUserId();
  const wagerId = String(formData.get("wagerId"));

  const wager = await prisma.wager.findUnique({ where: { id: wagerId } });
  if (!wager || wager.status !== "OPEN") throw new Error("This pick is no longer open");
  if (wager.creatorId === userId) throw new Error("You can't accept your own pick");
  if (wager.opponentId && wager.opponentId !== userId) throw new Error("This pick isn't for you");

  if (!wager.opponentId) {
    const friends = await getFriendIds(wager.creatorId);
    if (!friends.has(userId)) throw new Error("You can only accept picks from friends");
  }

  await prisma.wager.update({
    where: { id: wagerId },
    data: { opponentId: userId, status: "ACCEPTED" },
  });

  revalidatePath("/games");
}

export async function declineWager(formData: FormData) {
  const userId = await requireUserId();
  const wagerId = String(formData.get("wagerId"));

  const wager = await prisma.wager.findUnique({ where: { id: wagerId } });
  if (!wager) throw new Error("Pick not found");
  if (wager.creatorId !== userId && wager.opponentId !== userId) {
    throw new Error("Not your pick to decline");
  }

  await prisma.wager.update({ where: { id: wagerId }, data: { status: "DECLINED" } });
  revalidatePath("/games");
}

export async function counterWager(formData: FormData) {
  const userId = await requireUserId();
  const wagerId = String(formData.get("wagerId"));
  const line = String(formData.get("line") ?? "").trim() || null;
  const stake = Number(formData.get("stake"));

  if (Number.isNaN(stake) || stake <= 0) throw new Error("Stake must be a positive number");

  const original = await prisma.wager.findUnique({ where: { id: wagerId } });
  if (!original || original.status !== "OPEN") throw new Error("This pick is no longer open");
  const otherSide = original.creatorId === userId ? original.opponentId : original.creatorId;
  if (original.creatorId !== userId && original.opponentId !== userId) {
    throw new Error("Not your pick to counter");
  }
  if (!otherSide) throw new Error("This pick has no specific opponent to counter back to");

  await prisma.$transaction([
    prisma.wager.update({ where: { id: wagerId }, data: { status: "COUNTERED" } }),
    prisma.wager.create({
      data: {
        creatorId: userId,
        opponentId: otherSide,
        description: original.description,
        type: original.type,
        line,
        stake,
        counterOfId: wagerId,
      },
    }),
  ]);

  revalidatePath("/games");
}

export async function settleWager(formData: FormData) {
  const userId = await requireUserId();
  const wagerId = String(formData.get("wagerId"));
  const result = String(formData.get("result")); // CREATOR_WON | OPPONENT_WON | PUSH

  const wager = await prisma.wager.findUnique({ where: { id: wagerId } });
  if (!wager || wager.status !== "ACCEPTED") throw new Error("This wager isn't live");
  if (wager.creatorId !== userId && wager.opponentId !== userId) {
    throw new Error("Not your wager to settle");
  }

  await prisma.wager.update({ where: { id: wagerId }, data: { status: "SETTLED", result } });
  revalidatePath("/games");
}
