// Read-only locker visual: photo door, whiteboard, and trophy/medal shelf.
// Used both for your own locker (with edit controls layered around it on the
// /locker page) and for other members' lockers on a group page.
export interface LockerPhoto {
  id: string;
  caption?: string | null;
}

export interface LockerTrophy {
  id: string;
  season: number;
  title: string;
}

export interface LockerMedal {
  id: string;
  title: string;
}

const ROTATIONS = ["-rotate-3", "rotate-2", "-rotate-1"];

export default function LockerPreview({
  name,
  photos,
  note,
  trophies,
  medals,
  compact = false,
}: {
  name: string;
  photos: (LockerPhoto | null)[];
  note?: string | null;
  trophies: LockerTrophy[];
  medals: LockerMedal[];
  compact?: boolean;
}) {
  return (
    <div className={`rounded-2xl border-[6px] border-ink bg-neutral-200 ${compact ? "p-4" : "p-6"}`}>
      <div className="mb-3 flex justify-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 w-8 rounded-full bg-neutral-400" />
        ))}
      </div>
      {!compact && <div className="mb-4 text-center font-display text-sm uppercase">{name}&apos;s locker</div>}

      <div className="mb-4 flex flex-wrap justify-center gap-4">
        {photos.map((p, i) => (
          <div key={i} className={`relative ${ROTATIONS[i]} ${compact ? "h-16 w-16" : "h-28 w-28"}`}>
            {p ? (
              <>
                <span className="absolute -top-1.5 left-1/2 z-10 h-3 w-8 -translate-x-1/2 rotate-1 border border-ink/10 bg-yellow-soft/90" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/photos/${p.id}`}
                  alt={p.caption ?? ""}
                  className="h-full w-full border-4 border-white object-cover shadow-md"
                />
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded border-2 border-dashed border-neutral-400 text-[9px] text-neutral-500">
                empty
              </div>
            )}
          </div>
        ))}
      </div>

      {note && (
        <div className="mx-auto mb-4 max-w-[220px] rounded-md border-4 border-white bg-white p-3 shadow-inner">
          <p className="font-marker text-center leading-snug text-ink">{note}</p>
        </div>
      )}

      <div className="h-2.5 w-full rounded-sm bg-neutral-500" />
      <div className="flex min-h-9 flex-wrap items-end justify-center gap-2 pt-2">
        {trophies.map((t) => (
          <span key={t.id} title={`${t.title} · ${t.season}`} className="text-2xl leading-none">
            🏆
          </span>
        ))}
        {medals.map((m) => (
          <span key={m.id} title={m.title} className="text-xl leading-none">
            🥇
          </span>
        ))}
        {trophies.length === 0 && medals.length === 0 && (
          <span className="pb-1 text-[10px] text-neutral-500">Empty shelf — go win something.</span>
        )}
      </div>
    </div>
  );
}
