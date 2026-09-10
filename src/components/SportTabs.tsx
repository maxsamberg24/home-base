const SPORTS = [
  { label: "NFL", active: true },
  { label: "NBA", active: false },
  { label: "MLB", active: false },
  { label: "NHL", active: false },
];

export default function SportTabs() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {SPORTS.map((sport) =>
        sport.active ? (
          <span
            key={sport.label}
            className="rounded-full border-[3px] border-ink bg-yellow px-4 py-1.5 font-display text-sm uppercase"
          >
            {sport.label}
          </span>
        ) : (
          <span
            key={sport.label}
            title="Coming soon"
            className="flex items-center gap-1.5 rounded-full border-[3px] border-hairline px-4 py-1.5 font-display text-sm uppercase text-muted"
          >
            {sport.label}
            <span className="rounded-full bg-hairline px-1.5 py-0.5 text-[9px] font-sans font-bold normal-case tracking-wide text-muted">
              Soon
            </span>
          </span>
        )
      )}
    </div>
  );
}
