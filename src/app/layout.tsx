import type { Metadata } from "next";
import { Archivo_Black, Inter } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/identity";
import Nav from "@/components/Nav";
import NameGate from "@/components/NameGate";

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  weight: "400",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NFL Hub",
  description: "Your favorite team, season predictions, and pick'em games with friends.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className={`${archivoBlack.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-paper text-ink">
        {user ? (
          <>
            <Nav user={user} />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
          </>
        ) : (
          <NameGate />
        )}
      </body>
    </html>
  );
}
