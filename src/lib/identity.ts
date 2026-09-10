import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { User } from "@/generated/prisma/client";

export const SESSION_COOKIE = "nfl_hub_uid";

// Lightweight identity: no passwords. A random id in an httpOnly cookie maps
// to a User row that's really just a display name + favorite team.
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const uid = store.get(SESSION_COOKIE)?.value;
  if (!uid) return null;
  return prisma.user.findUnique({ where: { id: uid } });
}

export async function requireCurrentUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  return user;
}
