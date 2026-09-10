import type { Metadata } from "next";
<<<<<<< HEAD
import { Inter, IBM_Plex_Mono } from "next/font/google";
=======
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
>>>>>>> origin/backend
import "./globals.css";
import { SessionProvider } from "@/providers/session-provider";

<<<<<<< HEAD
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});
=======

>>>>>>> origin/backend

export const metadata: Metadata = {
  title: "MediTrust",
  description: "Zero-trust clinical access platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
<<<<<<< HEAD
    <html lang="en">
      <body className={`${inter.variable} ${plexMono.variable} antialiased`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
=======
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
>>>>>>> origin/backend
    </html>
  );
}