import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Providers from "@/components/Providers";
import { SITE } from "@/lib/site";
import "./globals.css";

// General Sans, self-hosted (src/fonts, ITF FFL: self-hosting permitted).
const sans = localFont({
  src: [{ path: "../fonts/GeneralSans-Variable.woff2", weight: "200 700", style: "normal" }],
  variable: "--font-general",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: `${SITE.name} | ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: SITE.description,
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
