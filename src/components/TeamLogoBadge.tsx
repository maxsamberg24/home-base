// Team colors vary wildly, and plenty of logos have white or near-white
// elements that disappear on a light team color. A plain white circle with
// a thin border behind every logo guarantees it's always visible regardless
// of what's behind it.
export default function TeamLogoBadge({
  src,
  size = 16,
}: {
  src?: string;
  size?: number;
}) {
  if (!src) return null;
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full border border-ink bg-white shadow-[0_2px_6px_rgba(0,0,0,0.25)]"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" style={{ width: size * 0.68, height: size * 0.68 }} className="object-contain" />
    </span>
  );
}
