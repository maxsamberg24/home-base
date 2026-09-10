import Link from "next/link";
import type { User } from "@/generated/prisma/client";
import { signOut } from "@/app/actions";
import { getTeam } from "@/lib/espn";

const links = [
  { href: "/team", label: "My Team" },
  { href: "/predictions", label: "Predictions" },
  { href: "/games", label: "Games" },
];

export default async function Nav({ user }: { user: User }) {
  const favoriteTeam = user.favoriteTeamId
    ? await getTeam(user.favoriteTeamId).catch(() => null)
    : null;

  return (
    <header className="sticky top-0 z-20 border-b-[3px] border-ink bg-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-ink bg-yellow text-sm">
            🏈
          </span>
          <span className="font-display text-lg uppercase tracking-tight hidden sm:inline">
            NFL Hub
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-1.5 font-display text-xs uppercase tracking-wide hover:bg-yellow-soft transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          {favoriteTeam && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={favoriteTeam.logos?.[0]?.href}
              alt={favoriteTeam.displayName}
              title={favoriteTeam.displayName}
              className="h-7 w-7"
            />
          )}
          <span className="hidden sm:inline text-sm font-medium">{user.name}</span>
          <form action={signOut}>
            <input type="hidden" name="redirectTo" value="/" />
            <button
              type="submit"
              className="text-xs text-muted underline decoration-dotted hover:text-ink transition-colors"
            >
              switch user
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
