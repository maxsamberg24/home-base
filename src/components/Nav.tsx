import Link from "next/link";
import type { User } from "@/generated/prisma/client";
import { signOut } from "@/app/actions";
import LockerBenchIcon from "@/components/LockerBenchIcon";

const links = [
  { href: "/", label: "Home" },
  { href: "/locker", label: "My Locker" },
  { href: "/schedule", label: "Schedule" },
  { href: "/standings", label: "Standings" },
  { href: "/news", label: "News" },
  { href: "/friends", label: "Friends" },
  { href: "/games", label: "Games" },
];

export default function Nav({ user }: { user: User }) {
  return (
    <header className="sticky top-0 z-30 border-b-[3px] border-ink bg-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-ink bg-yellow">
            <LockerBenchIcon className="h-5 w-5 text-ink" />
          </span>
          <span className="font-display text-lg uppercase tracking-tight hidden sm:inline">
            The Locker Room
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm overflow-x-auto">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="shrink-0 rounded-full px-3 py-1.5 font-display text-xs uppercase tracking-wide hover:bg-yellow-soft transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:inline text-sm font-medium">{user.name}</span>
          <form action={signOut}>
            <input type="hidden" name="redirectTo" value="/" />
            <button
              type="submit"
              className="text-xs text-muted underline decoration-dotted hover:text-ink transition-colors"
            >
              log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
