function luminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Most team logos have white/light outlines, so a very light primary color
// (e.g. near-white) makes the logo disappear. Fall back to the alternate
// (secondary) color when that happens and it's actually darker.
export function pickCardBackground(primary?: string, alternate?: string): string {
  if (!primary) return "#111111";
  const primaryHex = `#${primary}`;
  if (luminance(primary) < 0.75) return primaryHex;
  if (alternate && luminance(alternate) < luminance(primary)) return `#${alternate}`;
  return primaryHex;
}
