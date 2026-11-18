import type { Metadata, Viewport } from "next";
import { Courier_Prime, Gelasio, Inter } from "next/font/google";
import Providers from "@/components/Providers";
import { SITE } from "@/lib/site";
import "./globals.css";

// Self-hosted at build time by next/font (no requests to Google at runtime). All three are SIL Open Font Licence.
const sans = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Gelasio({ subsets: ["latin"], variable: "--font-gelasio", display: "swap" });
const mono = Courier_Prime({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-courier", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${SITE.name} | ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: SITE.description,
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
