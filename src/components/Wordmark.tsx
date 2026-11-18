/*
 * Brand marks. Outlined SVGs in public/brand (generated from General Sans
 * Medium), so they render identically before web fonts load.
 * `dark` is the default for the light site; `light` sits on photos and the
 * staff console.
 */
/* eslint-disable @next/next/no-img-element -- static SVG logos, no optimisation needed */
import Link from "next/link";
import { SITE } from "@/lib/site";

const LOGOS = {
  dark: { src: "/brand/espenxa.svg", ratio: 807 / 159 },
  light: { src: "/brand/espenxa-light.svg", ratio: 807 / 159 },
} as const;

export function Logo({ kind = "dark", height = 26, className }: { kind?: keyof typeof LOGOS; height?: number; className?: string }) {
  const l = LOGOS[kind];
  return <img src={l.src} alt={SITE.name} height={height} width={Math.round(height * l.ratio)} className={className} style={{ height, width: "auto" }} />;
}

export default function Wordmark({ href = "/", kind = "dark", height = 26 }: { href?: string; kind?: keyof typeof LOGOS; height?: number }) {
  return (
    <Link href={href} className="inline-flex items-center" aria-label={`${SITE.name} home`}>
      <Logo kind={kind} height={height} />
    </Link>
  );
}
