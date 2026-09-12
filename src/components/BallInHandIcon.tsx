// Clip-art style "ball knowledge" mark: a sports ball resting in a cupped
// hand, riffing on the classic "knowledge is power" hand-and-globe photo.
export default function BallInHandIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="9" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 2.9v12.4M6.4 5.4c2.3 1.9 2.3 5.5 0 7.4M17.6 5.4c-2.3 1.9-2.3 5.5 0 7.4"
        stroke="currentColor"
        strokeWidth="1.1"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M3.2 16.8c0 2.9 3.9 5.1 8.8 5.1s8.8-2.2 8.8-5.1"
        stroke="currentColor"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
