import { prisma } from "@/lib/prisma";

// Keyed by `${league}:${eventId}` for quick lookup when rendering game rows.
export async function getGoingKeys(userId: string): Promise<Set<string>> {
  const rows = await prisma.gameAttendance.findMany({ where: { userId } });
  return new Set(rows.map((r) => `${r.league}:${r.eventId}`));
}
