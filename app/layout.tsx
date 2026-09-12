import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import { SessionProvider } from "@/providers/session-provider";
import { ToastProvider } from "@/providers/toast-provider";
import { StepUpProvider } from "@/providers/step-up-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  title: {
    default: "MediTrust: Zero-Trust Clinical Access",
    template: "%s MediTrust",
  },
  description:
    "Nobody has default access to any patient. Every access is explicit, scoped to one patient, and time-bound.",
  openGraph: {
    title: "MediTrust: Zero-Trust Clinical Access",
    description:
      "Nobody has default access to any patient. Every access is explicit, scoped to one patient, and time-bound.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${ibmPlexMono.variable}`}>
        <SessionProvider>
          <ToastProvider>
            <StepUpProvider>{children}</StepUpProvider>
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}