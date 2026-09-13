import type { Metadata } from "next";
import { Archivo_Black, Inter, Permanent_Marker } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { getCurrentUser } from "@/lib/identity";
import { getFollowedTeams } from "@/lib/followedTeams";
import { TEAM_FILTER_COOKIE, teamKey, parseFilterCookie } from "@/lib/teamFilter";
import Nav from "@/components/Nav";
import NameGate from "@/components/NameGate";
import TeamFilterBar from "@/components/TeamFilterBar";

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  weight: "400",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const marker = Permanent_Marker({
  variable: "--font-permanent-marker",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Locker Room",
  description: "Every team you follow, your schedule, standings, friends, and games — in one hub.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  const followed = user ? await getFollowedTeams(user.id) : [];
  const store = await cookies();
  const allKeys = followed.map((f) => teamKey(f.league, f.teamId));
  const selected = parseFilterCookie(store.get(TEAM_FILTER_COOKIE)?.value, allKeys);

  return (
    <html lang="en" className={`${archivoBlack.variable} ${inter.variable} ${marker.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-paper text-ink">
        {user ? (
          <>
            <Nav user={user} />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
            <TeamFilterBar
              teams={followed.map((f) => ({
                league: f.league,
                teamId: f.teamId,
                abbreviation: f.team.abbreviation,
                logo: f.team.logos?.[0]?.href,
              }))}
              selected={selected}
            />
          </>
        ) : (
          <NameGate />
        )}
      </body>
    </html>
  );
}
