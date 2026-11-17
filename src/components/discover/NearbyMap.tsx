"use client";

/*
 * Nearby, as a map. Privacy by design: the map is a stylised backdrop, not
 * real geography. Each pin sits at its rounded distance from the centre but
 * at a scrambled angle, so no one's real direction or position is revealed.
 */
import { CrosshairIcon, Location01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useState } from "react";
import { Avatar, cx, Icon, LivePill, Photo, RankBadge, Verified } from "@/components/ui";
import type { Profile } from "@/lib/api/types";
import { distance } from "@/lib/format";

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 2 ** 32;
}

function place(p: Profile, maxKm: number) {
  const angle = hash(p.id + "angle") * Math.PI * 2;
  const r = 0.18 + 0.68 * Math.min(1, Math.log1p(p.distanceKm ?? 1) / Math.log1p(maxKm));
  return { left: 50 + Math.cos(angle) * r * 46, top: 50 + Math.sin(angle) * r * 44 };
}

export default function NearbyMap({ people, selfPhoto }: { people: Profile[]; selfPhoto?: string }) {
  const [sel, setSel] = useState<string | null>(people[0]?.id ?? null);
  const maxKm = Math.max(10, ...people.map((p) => p.distanceKm ?? 0));
  const current = people.find((p) => p.id === sel) ?? null;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[32px] bg-[#111113] sm:aspect-[16/11]">
        <MapBackdrop />
        <div className="pointer-events-none absolute top-1/2 left-1/2 size-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/8" aria-hidden />
        <div className="pointer-events-none absolute top-1/2 left-1/2 size-[38%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/10" aria-hidden />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="absolute inset-0 -m-3 rounded-full bg-ember/20" aria-hidden />
          <Avatar src={selfPhoto} name="You" size={44} className="relative ring-[3px] ring-ember" />
        </div>

        {people.map((p) => {
          const pos = place(p, maxKm);
          const on = p.id === sel;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSel(p.id)}
              aria-label={`${p.displayName}, ${distance(p.distanceKm) ?? "nearby"}`}
              aria-pressed={on}
              className={cx("absolute -translate-x-1/2 -translate-y-full transition-all duration-300", on ? "z-20" : "z-10 hover:z-20")}
              style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
            >
              {on ? (
                <span className="flex flex-col items-center">
                  <span className="rounded-full bg-ember p-1 shadow-[0_20px_40px_-10px_rgb(255_90_54/0.7)]">
                    <Photo src={p.photos[0]} alt="" className="size-[84px] rounded-full sm:size-[104px]" />
                  </span>
                  <svg width="22" height="14" viewBox="0 0 22 14" className="-mt-1 text-ember" aria-hidden>
                    <path d="M0 0h22L11 14z" fill="currentColor" />
                  </svg>
                </span>
              ) : (
                <span className="block rounded-full bg-white/15 p-[3px] backdrop-blur hover:bg-white/30">
                  <Photo src={p.photos[0]} alt="" className="size-12 rounded-full sm:size-14" />
                </span>
              )}
            </button>
          );
        })}

        <div className="absolute right-4 bottom-4 left-4 flex items-end justify-between gap-3">
          <p className="glass-dark rounded-full px-3 py-1.5 text-[11px] text-cream/75">Positions are approximate and shuffled for privacy</p>
          <span className="glass-dark grid size-11 shrink-0 place-items-center rounded-full" aria-hidden>
            <Icon icon={CrosshairIcon} size={19} />
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {current && (
          <Link href={`/people/${current.id}`} className="group relative block overflow-hidden rounded-[28px]">
            <Photo src={current.photos[0]} alt="" className="aspect-[4/3.4] w-full transition-transform duration-700 group-hover:scale-105 lg:aspect-[4/4.4]" />
            <div className="photo-shade absolute inset-0" />
            {current.provider && <RankBadge rank={current.provider.rank} size="sm" className="glass-dark absolute top-3 left-3" />}
            <div className="absolute inset-x-4 bottom-4">
              <p className="flex items-center gap-1.5 text-2xl font-semibold tracking-tight">
                {current.displayName}
                {current.age !== null && <span className="font-light text-white/75">{current.age}</span>}
                {current.verified && <Verified size={21} />}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {current.activeRecently && <LivePill />}
                <span className="glass-dark inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs">
                  <Icon icon={Location01Icon} size={13} />
                  {distance(current.distanceKm)}
                </span>
              </div>
            </div>
          </Link>
        )}
        <ul className="surface divide-y divide-line rounded-[28px] px-2 py-1">
          {people.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => setSel(p.id)} className={cx("flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors", p.id === sel ? "bg-char" : "hover:bg-char/60")}>
                <Avatar src={p.photos[0]} name={p.displayName} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-[15px] font-semibold">
                    {p.displayName}
                    {p.verified && <Verified size={15} />}
                  </span>
                  <span className="block truncate text-xs text-mute">{distance(p.distanceKm)}</span>
                </span>
                {p.activeRecently && <span className="size-2 rounded-full bg-ok" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Stylised night map: blocks, roads and water. Decorative only. */
function MapBackdrop() {
  return (
    <svg className="absolute inset-0 size-full" viewBox="0 0 800 560" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="800" height="560" fill="#111113" />
      <path d="M560 0c-20 60 30 90 10 150s-80 70-60 140 90 60 120 120 0 150 0 150h230V0z" fill="#16181d" />
      <path d="M-20 420c80-20 120 30 200 10s90-70 160-60 60 80 120 90" fill="none" stroke="#17191e" strokeWidth="38" strokeLinecap="round" />
      <g fill="none" stroke="#1d1d21" strokeWidth="2">
        {Array.from({ length: 14 }).map((_, i) => (
          <path key={`h${i}`} d={`M0 ${20 + i * 40} Q 400 ${10 + i * 40 + (i % 3) * 14} 800 ${24 + i * 40}`} />
        ))}
        {Array.from({ length: 20 }).map((_, i) => (
          <path key={`v${i}`} d={`M${20 + i * 40} 0 Q ${30 + i * 40 - (i % 4) * 10} 280 ${16 + i * 40} 560`} />
        ))}
      </g>
      <g fill="none" stroke="#26262b" strokeWidth="7" strokeLinecap="round">
        <path d="M-10 120 C 200 160, 380 60, 820 140" />
        <path d="M120 -10 C 160 200, 260 360, 220 570" />
        <path d="M-10 330 C 260 300, 520 380, 820 300" />
        <path d="M470 -10 C 430 160, 520 320, 470 570" />
      </g>
      <g fill="none" stroke="#2f2f35" strokeWidth="3" strokeLinecap="round" opacity="0.8">
        <path d="M0 220 L 800 250" />
        <path d="M330 0 L 360 560" />
      </g>
    </svg>
  );
}
