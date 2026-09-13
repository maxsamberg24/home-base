import { getCurrentUser } from "@/lib/identity";
import { prisma } from "@/lib/prisma";
import { ensureTrophiesForUser } from "@/lib/trophies";
import { getLeague, LEAGUES } from "@/lib/leagues";
import {
  uploadPhoto,
  setPublicSlot,
  unpinPhoto,
  deletePhoto,
  addGameLogEntry,
  deleteGameLogEntry,
  setLockerNote,
} from "@/app/actions";
import LockerPreview from "@/components/LockerPreview";

export default async function LockerPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  await ensureTrophiesForUser(user.id);

  const [photos, trophies, medals, gameLog] = await Promise.all([
    prisma.photo.findMany({ where: { userId: user.id }, include: { gameLog: true }, orderBy: { createdAt: "desc" } }),
    prisma.trophy.findMany({ where: { userId: user.id }, orderBy: { awardedAt: "desc" } }),
    prisma.medal.findMany({ where: { userId: user.id }, orderBy: { awardedAt: "desc" } }),
    prisma.gameLogEntry.findMany({
      where: { userId: user.id },
      include: { photos: true },
      orderBy: { gameDate: "desc" },
    }),
  ]);

  const slots = [1, 2, 3].map((slot) => photos.find((p) => p.publicSlot === slot) ?? null);
  const storagePhotos = photos.filter((p) => p.publicSlot == null);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl uppercase sm:text-4xl">
          <span className="mark-yellow">My Locker</span>
        </h1>
        <p className="mt-2 text-muted">
          Your personal hub — photos, trophies, a whiteboard, and every game you&apos;ve been to.
        </p>
      </div>

      <LockerPreview name={user.name} photos={slots} note={user.lockerNote} trophies={trophies} medals={medals} />

      <section className="rounded-2xl border-[3px] border-ink p-5">
        <h2 className="font-display uppercase mb-1">Locker door photos</h2>
        <p className="mb-3 text-xs text-muted">
          Up to 3 public photos — upload straight into an empty slot, or pin one from storage below.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {slots.map((photo, i) => {
            const slot = i + 1;
            return (
              <div key={slot} className="rounded-xl border-2 border-dashed border-hairline p-3 text-center">
                {photo ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/photos/${photo.id}`}
                      alt=""
                      className="mx-auto mb-2 h-24 w-24 rounded border-2 border-ink object-cover"
                    />
                    <form action={unpinPhoto}>
                      <input type="hidden" name="photoId" value={photo.id} />
                      <button type="submit" className="text-xs text-muted underline hover:text-ink">
                        Remove from door
                      </button>
                    </form>
                  </>
                ) : (
                  <form action={uploadPhoto} className="space-y-2">
                    <input type="hidden" name="publicSlot" value={slot} />
                    <input type="file" name="file" accept="image/*" required className="w-full text-xs" />
                    <button
                      type="submit"
                      className="rounded-full border-2 border-ink bg-yellow px-3 py-1 text-[10px] font-bold uppercase hover:bg-yellow-soft"
                    >
                      Upload to slot {slot}
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border-[3px] border-ink p-5">
        <h2 className="font-display uppercase mb-2">Whiteboard</h2>
        <p className="mb-3 text-xs text-muted">30 words max — keep it tight.</p>
        <form action={setLockerNote} className="flex flex-col gap-2 sm:flex-row">
          <input
            name="text"
            defaultValue={user.lockerNote ?? ""}
            placeholder="e.g. Let's run it back this year."
            className="flex-1 rounded-md border-2 border-ink bg-transparent px-3 py-2 text-sm outline-none focus:bg-yellow-soft"
          />
          <button
            type="submit"
            className="rounded-full border-[3px] border-ink bg-ink px-4 py-2 font-display text-xs uppercase text-paper transition-colors hover:bg-yellow hover:text-ink"
          >
            Save
          </button>
        </form>
      </section>

      <section className="rounded-2xl border-[3px] border-ink p-5">
        <h2 className="font-display uppercase mb-1">Photo storage</h2>
        <p className="mb-3 text-xs text-muted">
          Unlimited storage — pin any of these to one of your 3 public door slots above.
        </p>
        {storagePhotos.length === 0 ? (
          <p className="mb-4 text-sm text-muted">Nothing in storage yet.</p>
        ) : (
          <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {storagePhotos.map((p) => (
              <div key={p.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/photos/${p.id}`}
                  alt=""
                  className="aspect-square w-full rounded-lg border-2 border-hairline object-cover"
                />
                {p.gameLog && (
                  <div className="mt-1 truncate text-[9px] text-muted" title={p.gameLog.opponent}>
                    📎 {p.gameLog.opponent}
                  </div>
                )}
                <div className="mt-1 flex flex-wrap gap-1">
                  {[1, 2, 3].map((slot) => (
                    <form key={slot} action={setPublicSlot}>
                      <input type="hidden" name="photoId" value={p.id} />
                      <input type="hidden" name="slot" value={slot} />
                      <button
                        type="submit"
                        className="rounded-full border border-ink px-1.5 py-0.5 text-[9px] font-bold hover:bg-yellow-soft"
                      >
                        Pin {slot}
                      </button>
                    </form>
                  ))}
                  <form action={deletePhoto}>
                    <input type="hidden" name="photoId" value={p.id} />
                    <button type="submit" className="text-[9px] text-muted underline hover:text-ink">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
        <form action={uploadPhoto} className="flex flex-wrap items-center gap-2">
          <input type="file" name="file" accept="image/*" required className="text-xs" />
          <button
            type="submit"
            className="rounded-full border-2 border-ink px-3 py-1 text-xs font-bold uppercase hover:bg-yellow-soft"
          >
            Add to storage
          </button>
        </form>
      </section>

      <section className="rounded-2xl border-[3px] border-ink p-5">
        <h2 className="font-display uppercase mb-3">Games you&apos;ve been to</h2>
        <form action={addGameLogEntry} className="mb-4 grid gap-2 sm:grid-cols-5">
          <input
            type="date"
            name="gameDate"
            required
            className="rounded-md border-2 border-ink bg-transparent px-2 py-1.5 text-sm outline-none focus:bg-yellow-soft"
          />
          <input
            name="opponent"
            required
            placeholder="e.g. vs Cowboys"
            className="rounded-md border-2 border-ink bg-transparent px-2 py-1.5 text-sm outline-none focus:bg-yellow-soft sm:col-span-2"
          />
          <select
            name="league"
            defaultValue=""
            className="rounded-md border-2 border-ink bg-transparent px-2 py-1.5 text-sm outline-none"
          >
            <option value="">League (optional)</option>
            {LEAGUES.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.shortName}
              </option>
            ))}
          </select>
          <input
            name="note"
            placeholder="Note (optional)"
            className="rounded-md border-2 border-ink bg-transparent px-2 py-1.5 text-sm outline-none focus:bg-yellow-soft"
          />
          <button
            type="submit"
            className="rounded-full border-[3px] border-ink bg-ink px-4 py-1.5 font-display text-xs uppercase text-paper transition-colors hover:bg-yellow hover:text-ink sm:col-span-5"
          >
            Add to log
          </button>
        </form>

        {gameLog.length === 0 ? (
          <p className="text-sm text-muted">No games logged yet.</p>
        ) : (
          <div className="space-y-3">
            {gameLog.map((entry) => (
              <div key={entry.id} className="rounded-xl border-2 border-hairline p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display text-sm uppercase">
                      {entry.opponent}
                      {entry.league && ` · ${getLeague(entry.league).shortName}`}
                    </div>
                    <div className="text-xs text-muted">
                      {entry.gameDate.toLocaleDateString(undefined, {
                        timeZone: "America/New_York",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    {entry.note && <p className="mt-1 text-sm">{entry.note}</p>}
                  </div>
                  <form action={deleteGameLogEntry}>
                    <input type="hidden" name="id" value={entry.id} />
                    <button type="submit" className="shrink-0 text-xs text-muted underline hover:text-ink">
                      Remove
                    </button>
                  </form>
                </div>
                {entry.photos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {entry.photos.map((p) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={p.id}
                        src={`/api/photos/${p.id}`}
                        alt=""
                        className="h-16 w-16 rounded border-2 border-ink object-cover"
                      />
                    ))}
                  </div>
                )}
                <form action={uploadPhoto} className="mt-2 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="gameLogId" value={entry.id} />
                  <input type="file" name="file" accept="image/*" required className="text-xs" />
                  <button
                    type="submit"
                    className="rounded-full border border-ink px-2 py-0.5 text-[10px] font-bold uppercase hover:bg-yellow-soft"
                  >
                    Add photo
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
