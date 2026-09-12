// Simple clip-art locker room bench mark, replacing the "ball in hand" icon.
export default function LockerBenchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="2" y="8.5" width="20" height="2.6" rx="1.3" fill="currentColor" />
      <path
        d="M5.5 11.5v7M18.5 11.5v7"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M4 18.5h3M17 18.5h3"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
