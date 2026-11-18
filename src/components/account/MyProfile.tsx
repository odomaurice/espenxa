"use client";

import {
  ArrowRight01Icon,
  DashboardSquare01Icon,
  Edit02Icon,
  Globe02Icon,
  Logout03Icon,
  Settings02Icon,
  Shield01Icon,
  Store01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Lift } from "@/components/motion";
import { useSession } from "@/components/Providers";
import { Badge, buttonClass, cx, Icon, Photo, Skeleton, Tag, Verified } from "@/components/ui";
import { useSignOut } from "@/components/useSignOut";
import { useMyProfile } from "@/lib/api/hooks";
import { countryByCode } from "@/lib/countries";
import { ageFrom } from "@/lib/format";
import { intentionLabel, languageName, VERIFICATION } from "@/lib/labels";

export default function MyProfile() {
  const { account } = useSession();
  const me = useMyProfile();
  const signOut = useSignOut();
  if (!account || !me.data) return <Skeleton className="h-[520px]" />;
  const p = me.data;
  const v = VERIFICATION[account.verification];
  const c = countryByCode(account.country);

  const links: { href: string; label: string; sub: string; icon: IconSvgElement }[] = [
    account.isProvider
      ? { href: "/companion", label: "My work", sub: "Requests, earnings and your level", icon: DashboardSquare01Icon }
      : { href: "/become-a-companion", label: "Become a companion", sub: "Offer your time at your own prices", icon: Store01Icon },
    { href: "/connections", label: "Connections", sub: "Matches, requests and saved profiles", icon: UserGroupIcon },
    { href: "/settings", label: "Settings", sub: "Privacy, trusted contacts and account", icon: Settings02Icon },
    { href: "/safety", label: "Safety centre", sub: "Guidelines, reporting and help", icon: Shield01Icon },
    { href: "/", label: "espenxa homepage", sub: "Back to the public site", icon: Globe02Icon },
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 lg:sticky lg:top-8 lg:self-start">
        <div className="relative overflow-hidden rounded-[10px] bg-char">
          {p.photos[0] ? <Photo src={p.photos[0]} alt="Your main photo" className="aspect-[3/4] w-full" /> : <div className="aspect-[3/4] w-full" />}
          <div className="photo-shade absolute inset-0" />
          <Link href="/onboarding?step=photos" className="glass-dark absolute top-4 right-4 flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium">
            <Icon icon={Edit02Icon} size={15} /> Edit photos
          </Link>
          <div className="absolute inset-x-5 bottom-5">
            <p className="flex items-center gap-2 text-[34px] leading-none font-semibold tracking-tight">
              {p.displayName} <span className="font-light text-white/70">{ageFrom(account.dateOfBirth)}</span>
              {account.verification === "verified" && <Verified size={26} />}
            </p>
            <p className="mt-2 text-sm text-white/75">
              @{account.username} · {[account.city, c?.name].filter(Boolean).join(", ")}
            </p>
            <div className="mt-3 flex gap-2">
              <Badge tone={v.tone} className="glass-dark">
                {v.label}
              </Badge>
              <Badge className="glass-dark text-cream">{account.role === "companion" || account.isProvider ? "Companion" : "Member"}</Badge>
            </div>
          </div>
        </div>
        {p.photos.length > 1 && (
          <div className="grid grid-cols-5 gap-2">
            {p.photos.slice(1).map((src) => (
              <Photo key={src.slice(-24)} src={src} alt="" className="aspect-square w-full rounded-[16px]" />
            ))}
          </div>
        )}
      </motion.div>

      <div className="space-y-4">
        <section className="surface rounded-[10px] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">About me</h2>
            <Link href="/onboarding?step=about" className="text-sm text-mute hover:text-cream">
              Edit
            </Link>
          </div>
          <p className="mt-3 text-[15px] leading-relaxed text-cream/80">{p.bio || "Add a few lines so people know who you are."}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {p.intentions.map((i) => (
              <Tag key={i} className="bg-ember/12 text-ember-hi">
                {intentionLabel(i)}
              </Tag>
            ))}
            {p.interests.map((i) => (
              <Tag key={i}>{i}</Tag>
            ))}
            {p.languages.map((l) => (
              <Tag key={l}>Speaks {languageName(l)}</Tag>
            ))}
          </div>
        </section>

        <ul className="space-y-2.5">
          {links.map((l, i) => (
            <motion.li key={l.href} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
              <Lift y={-2} scale={1.005}>
                <Link href={l.href} className="surface flex items-center gap-4 rounded-[10px] p-4 transition-colors hover:bg-char">
                  <span className="grid size-11 place-items-center rounded-full bg-char">
                    <Icon icon={l.icon} size={19} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-[15px] font-semibold">{l.label}</span>
                    <span className="block text-xs text-mute">{l.sub}</span>
                  </span>
                  <Icon icon={ArrowRight01Icon} size={17} className="text-faint" />
                </Link>
              </Lift>
            </motion.li>
          ))}
        </ul>

        <button type="button" onClick={signOut} className={cx(buttonClass("danger", "lg"), "w-full")}>
          <Icon icon={Logout03Icon} size={18} /> Sign out
        </button>
      </div>
    </div>
  );
}
