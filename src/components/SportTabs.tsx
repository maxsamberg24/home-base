import Link from "next/link";
import { LEAGUES } from "@/lib/leagues";

export default function SportTabs({
  basePath,
  active,
}: {
  basePath: string;
  active: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {LEAGUES.map((sport) => (
        <Link
          key={sport.slug}
          href={`${basePath}?league=${sport.slug}`}
          className={`rounded-full border-[3px] px-4 py-1.5 font-display text-sm uppercase transition-colors ${
            sport.slug === active
              ? "border-ink bg-yellow"
              : "border-hairline text-muted hover:border-ink"
          }`}
        >
          {sport.shortName}
        </Link>
      ))}
    </div>
  );
}
