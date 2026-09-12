import { prisma } from "@/lib/prisma";
import type { User } from "@/generated/prisma/client";

export async function getFriendIds(userId: string): Promise<Set<string>> {
  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
  });
  return new Set(friendships.map((f) => (f.userAId === userId ? f.userBId : f.userAId)));
}

export async function getFriends(userId: string): Promise<User[]> {
  const ids = [...(await getFriendIds(userId))];
  if (ids.length === 0) return [];
  return prisma.user.findMany({ where: { id: { in: ids } } });
}
