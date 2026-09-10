import Link from "next/link";

const SEASON_TYPES = [
  { value: 1, label: "Preseason", maxWeek: 4 },
  { value: 2, label: "Regular", maxWeek: 18 },
  { value: 3, label: "Postseason", maxWeek: 5 },
];

export default function WeekSelector({
  basePath,
  season,
  seasonType,
  week,
}: {
  basePath: string;
  season: number;
  seasonType: number;
  week: number;
}) {
  const current = SEASON_TYPES.find((t) => t.value === seasonType) ?? SEASON_TYPES[1];
  const href = (w: number, st = seasonType) => `${basePath}?season=${season}&seasonType=${st}&week=${w}`;

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <div className="flex items-center gap-1 rounded-full border-[3px] border-ink p-1">
        {SEASON_TYPES.map((t) => (
          <Link
            key={t.value}
            href={href(1, t.value)}
            className={`rounded-full px-3 py-1 font-display text-xs uppercase transition-colors ${
              t.value === seasonType ? "bg-yellow" : "text-muted hover:bg-yellow-soft"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={href(Math.max(1, week - 1))}
          aria-disabled={week <= 1}
          className="rounded-full border-[3px] border-ink px-2.5 py-1 font-bold hover:bg-yellow-soft"
        >
          ←
        </Link>
        <span className="font-display uppercase">Week {week}</span>
        <Link
          href={href(Math.min(current.maxWeek, week + 1))}
          aria-disabled={week >= current.maxWeek}
          className="rounded-full border-[3px] border-ink px-2.5 py-1 font-bold hover:bg-yellow-soft"
        >
          →
        </Link>
      </div>
    </div>
  );
}
