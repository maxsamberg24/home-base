"use client";

import { useState } from "react";

export default function CopyInviteButton({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(message);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // clipboard API unavailable — nothing reasonable to fall back to
        }
      }}
      className="rounded-full border-[3px] border-ink bg-ink px-4 py-2 font-display text-sm uppercase text-paper transition-colors hover:bg-yellow hover:text-ink"
    >
      {copied ? "Copied!" : "Copy invite message"}
    </button>
  );
}
