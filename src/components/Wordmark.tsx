/*
 * Brand marks. Outlined SVGs in public/brand (generated from General Sans
 * Semibold), so they render identically before web fonts load.
 */
/* eslint-disable @next/next/no-img-element -- static SVG logos, no optimisation needed */
import Link from "next/link";
import { SITE } from "@/lib/site";

const LOGOS = {
  meet: { src: "/brand/meet.svg", ratio: 541 / 153, label: SITE.name },
  brand: { src: "/brand/watch-and-meet.svg", ratio: 1256 / 158, label: SITE.brand },
  watch: { src: "/brand/watch.svg", ratio: 623 / 158, label: "Watch" },
} as const;

export function Logo({ kind = "meet", height = 26, className }: { kind?: keyof typeof LOGOS; height?: number; className?: string }) {
  const l = LOGOS[kind];
  return <img src={l.src} alt={l.label} height={height} width={Math.round(height * l.ratio)} className={className} style={{ height, width: "auto" }} />;
}

export default function Wordmark({ href = "/", kind = "meet", height = 26, sub = false }: { href?: string; kind?: keyof typeof LOGOS; height?: number; sub?: boolean }) {
  return (
    <Link href={href} className="inline-flex flex-col items-start gap-1.5" aria-label={`${LOGOS[kind].label} home`}>
      <Logo kind={kind} height={height} />
      {sub && <span className="text-[11px] text-faint">by {SITE.brand}</span>}
    </Link>
  );
}
