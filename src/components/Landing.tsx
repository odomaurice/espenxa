"use client";
import {
  ArrowRight01Icon,
  Cancel01Icon,
  Clock01Icon,
  FavouriteIcon,
  FilterHorizontalIcon,
  FireIcon,
  Location01Icon,
  Message01Icon,
  PlayIcon,
  Shield01Icon,
  ArrowDown01Icon,
  UserAdd01Icon,
} from "@hugeicons/core-free-icons";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { EASE, Reveal, rise, Spotlight, Stagger, Tilt } from "@/components/motion";
import Flag from "@/components/Flag";
import { useSession } from "@/components/Providers";
import { openCookieSettings } from "@/lib/consent";
import { useMyProfile } from "@/lib/api/hooks";
import { Avatar, buttonClass, cx, Icon, LinkButton, LivePill, Photo, RankBadge, RankMark, Verified } from "@/components/ui";
import { Logo } from "@/components/Wordmark";
import { DURATIONS, type Rank } from "@/lib/api/types";
import { COUNTRIES_BY_NAME } from "@/lib/countries";
import { hoursLabel } from "@/lib/format";
import { INTENTIONS, RANKS } from "@/lib/labels";
import { SITE } from "@/lib/site";

const SAMPLE_RATES = ["₦15,000", "₦25,000", "₦40,000", "₦70,000", "₦120,000", "₦210,000"];

/**
 * Where calls to action go. Visitors are sent to register; signed-in people
 * go to their dashboard, and approved members straight to profiles.
 */
function useDest() {
  const { account } = useSession();
  const dashboard = !account ? "/register" : account.roles.length ? "/admin" : account.contactVerified ? "/home" : "/verify-otp";
  const open = !!account && account.onboarded && account.verification === "verified";
  return {
    signedIn: !!account,
    dashboard,
    join: account ? dashboard : "/register",
    joinLabel: account ? "Go to my dashboard" : "Get started",
    person: (p: { id: string; name: string }) => (!account ? `/register?to=${encodeURIComponent(p.name)}` : open ? `/people/${p.id}` : dashboard),
  };
}

export default function Landing() {
  return (
    <div className="overflow-x-clip">
      <Nav />
      <Hero />
      <AvailableNow />
      <LiveNow />
      <PeopleToMeet />
      <Products />
      <Bento />
      <Countries />
      <Cta />
      <Footer />
    </div>
  );
}

const Wrap = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cx("mx-auto w-full max-w-310 px-5 sm:px-8", className)}>{children}</div>;

function Nav() {
  const { account } = useSession();
  const me = useMyProfile(!!account?.contactVerified);
  const dest = useDest();
  return (
    <header className="sticky top-0 z-40 bg-ink/70 backdrop-blur-xl">
      <Wrap className="flex h-16 items-center justify-between sm:h-18">
        <a href="#top" aria-label={`${SITE.brand} home`}>
          <Logo kind="brand" height={21} />
        </a>
        <nav className="hidden items-center gap-1 rounded-full bg-char p-1 text-sm md:flex" aria-label="Sections">
          {[
            ["#meet", "Meet"],
            ["#watch", "Watch"],
            ["#features", "Features"],
            ["#safety", "Safety"],
          ].map(([h, l]) => (
            <a key={h} href={h} className="rounded-full px-4 py-2 text-mute transition-colors hover:bg-smoke hover:text-cream">
              {l}
            </a>
          ))}
        </nav>
        {account ? (
          <Link href={dest.dashboard} className="group flex items-center gap-2.5 rounded-full bg-char py-1.5 pr-5 pl-1.5 transition-colors hover:bg-smoke" aria-label="Go to your dashboard">
            <Avatar src={me.data?.photos[0]} name={account.fullName} size={34} />
            <span className="text-sm font-semibold">Dashboard</span>
            <Icon icon={ArrowRight01Icon} size={15} className="text-mute transition-transform group-hover:translate-x-0.5 group-hover:text-cream" />
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <LinkButton href="/login" variant="ghost" className="max-sm:h-10 max-sm:px-3 max-sm:text-[14px]">
              Sign in
            </LinkButton>
            <LinkButton href={dest.join} variant="primary" className="max-sm:h-10 max-sm:px-4 max-sm:text-[14px]">
              Join Meet
            </LinkButton>
          </div>
        )}
      </Wrap>
    </header>
  );
}

const HEADLINE: [string, boolean][] = [
  ["Meet", false],
  ["people", false],
  ["worth", false],
  ["your", true],
  ["time.", true],
];

function Hero() {
  const dest = useDest();
  const stage = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: stage, offset: ["start end", "end start"] });
  const spread = useSpring(useTransform(scrollYProgress, [0.25, 0.65], [0, 1]), { stiffness: 120, damping: 24 });
  const leftX = useTransform(spread, [0, 1], ["-74%", "-92%"]);
  const rightX = useTransform(spread, [0, 1], ["74%", "92%"]);
  const leftR = useTransform(spread, [0, 1], [-7, -13]);
  const rightR = useTransform(spread, [0, 1], [7, 13]);
  const centreY = useTransform(spread, [0, 1], [0, -36]);
  const glow = useTransform(scrollYProgress, [0.2, 0.6], [0.6, 1]);

  return (
    <section id="top" className="relative overflow-x-clip pt-10 sm:pt-20">
      <motion.div style={{ opacity: glow }} className="pointer-events-none absolute inset-x-0 top-0 h-225 bg-[radial-gradient(50%_45%_at_50%_45%,rgb(255_90_54/0.24),transparent_70%)]" aria-hidden />
      <Wrap className="relative text-center">
        <motion.span initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, ease: EASE }} className="inline-flex items-center gap-2 rounded-full bg-char py-1.5 pr-4 pl-1.5 text-[13px] text-cream/85">
          <span className="rounded-full bg-ember px-2.5 py-0.5 text-[11px] font-semibold text-ink">New</span>
          Meet is opening across Africa
        </motion.span>
        <h1 className="display mx-auto mt-6 max-w-4xl text-[50px] leading-[1.02] sm:mt-7 sm:text-[80px] lg:text-[96px]" aria-label="Meet people worth your time.">
          {HEADLINE.map(([w, accent], i) => (
            <span key={w} className="inline-block overflow-hidden pb-[0.08em] align-bottom" aria-hidden>
              <motion.span className={cx("inline-block", accent && "text-ember")} initial={{ y: "105%", rotate: 4 }} animate={{ y: 0, rotate: 0 }} transition={{ delay: 0.15 + i * 0.08, duration: 0.85, ease: EASE }}>
                {w}
                {i < HEADLINE.length - 1 && " "}
              </motion.span>
            </span>
          ))}
        </h1>
        <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.7, ease: EASE }} className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-mute sm:mt-6 sm:text-[17px]">
          Dates, friends, conversation, a plus-one for the wedding or a guide for a new city. Verified adults, real plans, in {COUNTRIES_BY_NAME.length} countries.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, duration: 0.7, ease: EASE }} className="mx-auto mt-8 grid max-w-sm grid-cols-2 gap-2.5 sm:mt-9 sm:flex sm:max-w-none sm:flex-wrap sm:items-center sm:justify-center sm:gap-3">
          <LinkButton href={dest.join} variant="accent" size="lg" className="group max-sm:px-4">
            {dest.joinLabel} <Icon icon={ArrowRight01Icon} size={18} stroke={2.2} className="transition-transform group-hover:translate-x-1" />
          </LinkButton>
          <LinkButton href="#watch" variant="secondary" size="lg" className="max-sm:px-4">
            <Icon icon={PlayIcon} size={16} stroke={2.2} /> Preview Watch
          </LinkButton>
        </motion.div>
      </Wrap>

      <div ref={stage} className="relative mx-auto mt-12 flex h-[540px] max-w-275 items-start justify-center sm:mt-20 sm:h-175 md:h-197.5" aria-hidden>
        <motion.div className="absolute top-14 opacity-70 md:opacity-100" style={{ x: leftX, rotate: leftR }}>
          <motion.div initial={{ opacity: 0, y: 120 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, duration: 1, ease: EASE }}>
            <Phone className="scale-[0.74] sm:scale-100">
              <ExploreScreen />
            </Phone>
          </motion.div>
        </motion.div>
        <motion.div className="absolute top-14 opacity-70 md:opacity-100" style={{ x: rightX, rotate: rightR }}>
          <motion.div initial={{ opacity: 0, y: 120 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85, duration: 1, ease: EASE }}>
            <Phone className="scale-[0.74] sm:scale-100">
              <ProfileScreen />
            </Phone>
          </motion.div>
        </motion.div>
        <motion.div className="relative z-10" style={{ y: centreY }}>
          <motion.div initial={{ opacity: 0, y: 160, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.55, duration: 1.1, ease: EASE }}>
            <Phone className="scale-[0.86] sm:scale-100">
              <ForYouScreen />
            </Phone>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ---- phone mockups (real UI language, static content) -------------------- */

function Phone({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("w-75 origin-top rounded-[52px] bg-[#050505] p-2.5 shadow-[0_60px_120px_-30px_rgb(0_0_0/0.95)] ring-1 ring-white/12 sm:w-[320px]", className)}>
      <div className="relative h-155 overflow-hidden rounded-[42px] bg-ink sm:h-165">
        <div className="flex h-11 items-center justify-between px-7 pt-1 text-[13px] font-semibold">
          <span>9:41</span>
          <span className="absolute top-2.5 left-1/2 h-7 w-24 -translate-x-1/2 rounded-full bg-black" />
          <span className="flex items-center gap-1">
            <span className="flex items-end gap-px">
              {[4, 6, 8, 10].map((h) => (
                <span key={h} className="w-0.75 rounded-sm bg-cream" style={{ height: h }} />
              ))}
            </span>
            <span className="ml-1 h-2.75 w-5.5 rounded-[3px] border border-cream/70 p-px">
              <span className="block h-full w-3/4 rounded-[1px] bg-cream" />
            </span>
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

function ForYouScreen() {
  return (
    <div className="px-3">
      <div className="mt-1 flex rounded-full bg-char p-1 text-[13px] font-medium">
        <span className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-cream py-2 text-ink">
          <Icon icon={FireIcon} size={14} stroke={2.2} /> For you
        </span>
        <span className="flex flex-1 items-center justify-center gap-1.5 py-2 text-mute">
          <Icon icon={Location01Icon} size={14} /> Nearby
        </span>
      </div>
      <div className="relative mt-3 h-117.5 sm:h-126.25">
        <div className="absolute inset-x-4 top-0 bottom-8 overflow-hidden rounded-4xl opacity-40">
          <Photo src="/people/nia.webp" alt="" className="size-full" />
        </div>
        <div className="absolute inset-x-0 top-3 bottom-10 overflow-hidden rounded-4xl ring-1 ring-white/10">
          <Photo src="/people/amara.webp" alt="" className="size-full" />
          <div className="photo-shade absolute inset-0" />
          <div className="absolute inset-x-6 top-3 flex gap-1.5">
            {[1, 0, 0, 0].map((on, i) => (
              <span key={i} className={cx("h-1 flex-1 rounded-full", on ? "bg-white" : "bg-white/35")} />
            ))}
          </div>
          <div className="absolute inset-x-4 bottom-12">
            <p className="flex items-center gap-1.5 text-[11.5px] text-white/85">
              <Icon icon={Location01Icon} size={12} /> Lagos, Nigeria
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[30px] leading-none font-semibold tracking-tight">
              Amara <span className="font-light text-white/70">26</span> <Verified size={22} />
            </p>
            <div className="mt-2.5 flex gap-1.5">
              <LivePill />
              <RankBadge rank="gold" size="sm" className="glass-dark" />
            </div>
          </div>
          <span className="glass absolute inset-x-4 bottom-3 flex items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-medium">
            <Icon icon={ArrowDown01Icon} size={13} /> More biography
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex justify-center">
          <div className="glass-dark flex gap-2 rounded-full p-1.5">
            <span className="grid h-13 w-18 place-items-center rounded-full bg-white text-ink">
              <Icon icon={Cancel01Icon} size={22} stroke={2.2} />
            </span>
            <span className="grid h-13 w-18 place-items-center rounded-full bg-ember text-ink">
              <Icon icon={FavouriteIcon} size={22} stroke={2.4} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExploreScreen() {
  const cards = [
    ["zara", "Zara", 24],
    ["yara", "Yara", 24],
    ["mei", "Mei", 25],
    ["kai", "Kai", 32],
    ["sofia", "Sofia", 27],
    ["tobi", "Tobi", 29],
  ] as const;
  return (
    <div className="px-4">
      <div className="mt-1 flex items-center justify-between">
        <p className="text-[26px] font-semibold tracking-tight">Explore</p>
        <span className="grid size-9 place-items-center rounded-full bg-char">
          <Icon icon={FilterHorizontalIcon} size={16} />
        </span>
      </div>
      <div className="mt-3 flex gap-1.5 overflow-hidden">
        {["24 to 32", "Friendship", "Lagos"].map((c) => (
          <span key={c} className="flex shrink-0 items-center gap-1 rounded-full bg-char px-2.5 py-1.5 text-[11px]">
            <Icon icon={Cancel01Icon} size={10} stroke={2.4} /> {c}
          </span>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {cards.map(([id, name, age]) => (
          <div key={id} className="relative overflow-hidden rounded-xl">
            <Photo src={`/people/${id}.webp`} alt="" className="aspect-[3/4.1] w-full" />
            <div className="glass absolute inset-x-1.5 bottom-1.5 rounded-2xl p-2">
              <p className="text-[12.5px] font-semibold">
                {name} <span className="font-light text-white/70">{age}</span>
              </p>
              <div className="mt-1.5 flex gap-1">
                <span className="grid h-6 flex-1 place-items-center rounded-full bg-ember text-ink">
                  <Icon icon={FavouriteIcon} size={12} stroke={2.4} />
                </span>
                <span className="grid h-6 flex-1 place-items-center rounded-full bg-ink/85">
                  <Icon icon={Message01Icon} size={12} />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileScreen() {
  return (
    <div>
      <div className="relative mx-2 overflow-hidden rounded-[34px]">
        <Photo src="/people/dami.webp" alt="" className="aspect-[3/3.4] w-full" />
        <div className="photo-shade absolute inset-0" />
        <div className="absolute inset-x-4 bottom-4">
          <p className="flex items-center gap-1 text-[11px] text-white/80">
            <Icon icon={Location01Icon} size={11} /> Abuja, Nigeria
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[26px] leading-none font-semibold tracking-tight">
            Dami <span className="font-light text-white/70">30</span> <Verified size={20} />
          </p>
        </div>
      </div>
      <div className="mx-2 mt-2 grid grid-cols-3 gap-1.5">
        {["kai", "marcus", "tobi"].map((p) => (
          <Photo key={p} src={`/people/${p}.webp`} alt="" className="aspect-square w-full rounded-2xl opacity-90" />
        ))}
      </div>
      <div className="surface mx-2 mt-2 rounded-[22px] p-3.5">
        <p className="text-[13px] font-semibold">About me</p>
        <p className="mt-1 text-[11px] leading-relaxed text-mute">Architect, weekend golfer and a decent cook. Good company at a wedding, better company at dinner after.</p>
      </div>
      <div className="surface mx-2 mt-2 rounded-[22px] p-3.5">
        <p className="text-[13px] font-semibold">More info</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {["Dating", "Jazz", "Golf", "Fine dining", "Igbo"].map((t, i) => (
            <span key={t} className={cx("rounded-full px-2.5 py-1 text-[10.5px]", i === 0 ? "bg-ember/15 text-ember-hi" : "bg-char")}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---- people (static showcase; every photo is AI-generated) ------------------- */

type Showcase = { id: string; name: string; age: number; city: string; tags: string[]; companion?: Rank };
const PEOPLE: Showcase[] = [
  { id: "amara", name: "Amara", age: 26, city: "Lagos", tags: ["Companionship", "Dinner"], companion: "gold" },
  { id: "dami", name: "Dami", age: 30, city: "Abuja", tags: ["Dating", "Events"], companion: "diamond" },
  { id: "zara", name: "Zara", age: 24, city: "Lagos", tags: ["Concerts", "Friendship"], companion: "silver" },
  { id: "kai", name: "Kai", age: 32, city: "Nairobi", tags: ["Travel", "Dating"] },
  { id: "mei", name: "Mei", age: 25, city: "Johannesburg", tags: ["Sightseeing", "Travel"], companion: "platinum" },
  { id: "nia", name: "Nia", age: 26, city: "Accra", tags: ["Dating", "Books"] },
  { id: "marcus", name: "Marcus", age: 27, city: "Kigali", tags: ["Outdoors", "Travel"], companion: "silver" },
  { id: "yara", name: "Yara", age: 24, city: "Lagos", tags: ["Conversation", "Coffee"] },
  { id: "tobi", name: "Tobi", age: 29, city: "Lagos", tags: ["Running", "Friendship"], companion: "bronze" },
  { id: "sofia", name: "Sofia", age: 27, city: "Casablanca", tags: ["Art", "Networking"] },
];

function AvailableNow() {
  const dest = useDest();
  return (
    <section className="mt-8 pb-14 sm:mt-32 sm:pb-20">
      <Wrap>
        <Reveal className="flex items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-ok">
              <span className="size-2 rounded-full bg-ok shadow-[0_0_10px_var(--color-ok)]" /> Available now
            </p>
            <h2 className="display mt-2 text-[28px] leading-tight sm:text-[40px]">Online across Africa right now</h2>
          </div>
          <Link href={dest.join} className="hidden text-sm text-mute hover:text-cream sm:block">
            See everyone
          </Link>
        </Reveal>
        <Stagger className="no-scrollbar -mx-5 mt-8 flex gap-5 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0" gap={0.05}>
          {PEOPLE.map((p) => (
            <motion.div key={p.id} variants={rise} className="shrink-0">
              <Link href={dest.person(p)} className="group flex w-23 flex-col items-center gap-2.5 text-center">
                <motion.span whileHover={{ y: -4, scale: 1.04 }} transition={{ type: "spring", stiffness: 400, damping: 18 }} className="relative">
                  <span className="story-ring block rounded-full p-0.75">
                    <Photo src={`/people/${p.id}.webp`} alt={p.name} className="size-21 rounded-full ring-[3px] ring-ink" />
                  </span>
                  <span className="absolute right-1 bottom-1 size-4 rounded-full bg-ok ring-[3px] ring-ink" />
                </motion.span>
                <span>
                  <span className="block text-sm font-semibold">{p.name}</span>
                  <span className="block text-xs text-mute">{p.city}</span>
                </span>
              </Link>
            </motion.div>
          ))}
        </Stagger>
      </Wrap>
    </section>
  );
}

const LIVE = [
  { id: "zara", companion: "Zara", title: "Getting ready for a Lagos runway night", watching: "2.4k", tag: "Fashion" },
  { id: "kai", companion: "Kai", title: "Sunrise over Nairobi National Park", watching: "1.1k", tag: "Travel" },
  { id: "marcus", companion: "Marcus", title: "Kigali coffee crawl, live", watching: "860", tag: "Food" },
  { id: "mei", companion: "Mei", title: "Gallery walk in Maboneng", watching: "640", tag: "Art" },
];

function LiveNow() {
  const dest = useDest();
  const [lead, ...rest] = LIVE;
  return (
    <section className="pb-16 sm:pb-32">
      <Wrap>
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              <span className="rounded-md bg-bad px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-white">LIVE</span>
              <span className="text-mute">on</span> <Logo kind="watch" height={15} />
              <span className="rounded-full bg-char px-2.5 py-0.5 text-[11px] text-mute">Preview</span>
            </p>
            <h2 className="display mt-3 text-[28px] leading-tight sm:text-[40px]">Live sessions, happening now</h2>
          </div>
          <p className="max-w-sm text-sm text-mute">Live rooms are part of Watch, launching separately. Create your account to be first in.</p>
        </Reveal>

        <MobileLive />
        <Stagger className="mt-8 hidden gap-4 sm:grid lg:grid-cols-[1.35fr_1fr]" gap={0.08}>
          <motion.div variants={rise}>
            <Link href={dest.person({ id: lead.id, name: lead.companion })} className="group relative block overflow-hidden rounded-4xl">
              <Photo src={`/people/${lead.id}.webp`} alt="" className="aspect-4/5 w-full transition-transform duration-700 group-hover:scale-105 sm:aspect-[4/3.2] lg:aspect-auto lg:h-140" />
              <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-black/40" />
              <div className="absolute inset-x-5 top-5 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="rounded-md bg-bad px-2 py-1 text-xs font-bold tracking-wide text-white">LIVE</span>
                  <span className="glass-dark rounded-full px-3 py-1 text-xs font-medium">{lead.watching} watching</span>
                </span>
                <span className="glass-dark rounded-full px-3 py-1 text-xs">{lead.tag}</span>
              </div>
              <span className="glass absolute top-1/2 left-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full transition-transform group-hover:scale-110">
                <Icon icon={PlayIcon} size={30} stroke={2} />
              </span>
              <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <span className="flex items-center gap-2.5">
                    <span className="story-ring rounded-full p-0.5">
                      <Photo src={`/people/${lead.id}.webp`} alt="" className="size-10 rounded-full ring-2 ring-ink" />
                    </span>
                    <span className="text-[15px] font-semibold">{lead.companion}</span>
                    <Verified size={17} />
                  </span>
                  <p className="display mt-3 text-[26px] leading-tight sm:text-[32px]">{lead.title}</p>
                </div>
                <span className="hidden shrink-0 sm:block">
                  <span className={buttonClass("accent", "lg")}>Join live</span>
                </span>
              </div>
            </Link>
          </motion.div>

          <div className="grid gap-4">
            {rest.map((l) => (
              <motion.div key={l.id} variants={rise}>
                <Link href={dest.person({ id: l.id, name: l.companion })} className="group surface flex items-center gap-4 rounded-[26px] p-3 pr-5 transition-colors hover:bg-char">
                  <span className="relative h-37.5 w-28 shrink-0 overflow-hidden rounded-[20px]">
                    <Photo src={`/people/${l.id}.webp`} alt="" className="size-full transition-transform duration-700 group-hover:scale-110" />
                    <span className="absolute top-2 left-2 rounded bg-bad px-1.5 py-0.5 text-[10px] font-bold text-white">LIVE</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      {l.companion} <Verified size={14} />
                    </span>
                    <span className="mt-1 line-clamp-2 block text-[15px] leading-snug font-medium text-cream/90">{l.title}</span>
                    <span className="mt-3 flex items-center gap-2 text-xs text-mute">
                      <span className="rounded-full bg-char px-2.5 py-1">{l.tag}</span> {l.watching} watching
                    </span>
                  </span>
                  <Icon icon={ArrowRight01Icon} size={18} className="shrink-0 text-faint transition-transform group-hover:translate-x-1 group-hover:text-cream" />
                </Link>
              </motion.div>
            ))}
          </div>
        </Stagger>
      </Wrap>
    </section>
  );
}

/** Phones: one swipeable row instead of a tall stack. */
function MobileLive() {
  const dest = useDest();
  return (
    <div className="no-scrollbar -mx-5 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-1 sm:hidden">
      {LIVE.map((l) => (
        <Link key={l.id} href={dest.person({ id: l.id, name: l.companion })} className="relative w-[78%] shrink-0 snap-start overflow-hidden rounded-[30px]">
          <Photo src={`/people/${l.id}.webp`} alt="" className="aspect-[4/5] w-full" />
          <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/10 to-black/40" />
          <div className="absolute inset-x-4 top-4 flex items-center gap-2">
            <span className="rounded-md bg-bad px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-white">LIVE</span>
            <span className="glass-dark rounded-full px-2.5 py-0.5 text-[11px] font-medium">{l.watching} watching</span>
          </div>
          <span className="glass absolute top-1/2 left-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full">
            <Icon icon={PlayIcon} size={22} stroke={2} />
          </span>
          <div className="absolute inset-x-4 bottom-4">
            <span className="flex items-center gap-1.5 text-[14px] font-semibold">
              {l.companion} <Verified size={15} />
            </span>
            <p className="display mt-1.5 text-[21px] leading-tight">{l.title}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function PeopleToMeet() {
  const dest = useDest();
  return (
    <section className="pb-16 sm:pb-32">
      <Wrap>
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ember">Verified profiles</p>
            <h2 className="display mt-2 text-[28px] leading-tight sm:text-[40px]">People to meet</h2>
          </div>
          <LinkButton href={dest.join} variant="secondary" className="max-sm:hidden">
            Create your profile <Icon icon={ArrowRight01Icon} size={16} />
          </LinkButton>
        </Reveal>
        <Stagger className="no-scrollbar -mx-5 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-1 sm:mx-0 sm:mt-8 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 md:grid-cols-3 lg:grid-cols-5" gap={0.05}>
          {PEOPLE.map((p) => (
            <motion.div key={p.id} variants={rise} className="w-[46%] shrink-0 snap-start sm:w-auto">
              <Tilt className="group relative overflow-hidden rounded-card bg-char">
                <Link href={dest.person(p)} aria-label={`Connect with ${p.name}`} className="block">
                  <Photo src={`/people/${p.id}.webp`} alt="" className="aspect-[3/4.3] w-full transition-transform duration-700 group-hover:scale-105" />
                  <div className="photo-shade absolute inset-0" />
                  {p.companion && <RankBadge rank={p.companion} size="sm" className="glass-dark absolute top-3 left-3" />}
                  <div className="glass absolute inset-x-2.5 bottom-2.5 rounded-[20px] p-3">
                    <p className="flex items-center gap-1.5 text-[16px] font-semibold">
                      {p.name} <span className="font-light text-cream/75">{p.age}</span> <Verified size={15} />
                    </p>
                    <p className="mt-0.5 text-xs text-cream/70">{p.city}</p>
                    <span className="mt-2.5 flex h-9 items-center justify-center gap-1.5 rounded-full bg-cream text-[13px] font-semibold text-ink transition-colors group-hover:bg-ember">
                      <Icon icon={UserAdd01Icon} size={15} stroke={2.2} /> Connect
                    </span>
                  </div>
                </Link>
              </Tilt>
            </motion.div>
          ))}
        </Stagger>
        <LinkButton href={dest.join} variant="secondary" className="mt-6 w-full sm:hidden">
          Create your profile <Icon icon={ArrowRight01Icon} size={16} />
        </LinkButton>
      </Wrap>
    </section>
  );
}

/* ---- sections --------------------------------------------------------------- */

/** Bento tile: staggers in with its siblings, lifts on hover, glows under the pointer. */
/** Phones: bento tiles become a swipeable row with the next tile peeking in. */
const SWIPE = "w-[84%] shrink-0 snap-start sm:w-auto";

function Tile({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  const warm = className?.includes("bg-ember") || className?.includes("bg-cream");
  return (
    <Spotlight id={id} className={className} color={warm ? "255 255 255" : "255 90 54"} variants={rise} whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 300, damping: 26 }}>
      {children}
    </Spotlight>
  );
}

function Heading({ title, sub }: { title: string; sub: string }) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <h2 className="display text-[34px] leading-tight sm:text-[56px]">{title}</h2>
      <p className="mt-3 text-[16px] text-mute sm:mt-4 sm:text-[17px]">{sub}</p>
    </Reveal>
  );
}

function Products() {
  const dest = useDest();
  return (
    <section className="py-10 sm:py-32">
      <Wrap>
        <Heading title="Two apps. One home." sub={`Watch and Meet are separate products from ${SITE.brand}, each built for one thing and built properly.`} />
        <Stagger gap={0.08} className="mt-10 grid gap-4 sm:mt-14 sm:gap-5 lg:grid-cols-2">
          <Tile id="meet" className="scroll-mt-24 rounded-[32px] bg-coal p-6 sm:rounded-[36px] sm:p-10">
            <div className="flex items-center gap-3">
              <Logo kind="meet" height={30} />
              <span className="rounded-full bg-ember px-3 py-1 text-xs font-semibold text-ink">Open now</span>
            </div>
            <p className="display mt-5 max-w-sm text-[26px] leading-tight sm:mt-6 sm:text-[34px]">Find people, make plans, spend real time together.</p>
            <p className="mt-3 max-w-sm text-[15px] text-mute">Match and chat for free. When you want a plan, book a verified companion for dinner, an event, a day out or a trip.</p>
            <LinkButton href={dest.join} variant="primary" className="mt-7">
              Join Meet <Icon icon={ArrowRight01Icon} size={16} stroke={2.2} />
            </LinkButton>
            <div className="mt-7 flex items-end gap-2.5 sm:mt-10 sm:gap-3" aria-hidden>
              {["amara", "dami", "mei"].map((p, i) => (
                <div key={p} className={cx("relative flex-1 overflow-hidden rounded-[26px]", i === 1 ? "aspect-[3/4.4]" : "aspect-[3/3.8]")}>
                  <Photo src={`/people/${p}.webp`} alt="" className="size-full" />
                  <div className="photo-shade absolute inset-0" />
                  {i === 1 && (
                    <span className="glass absolute inset-x-2 bottom-2 flex items-center justify-center gap-1 rounded-full py-2 text-xs font-semibold">
                      Dami 30 <Verified size={14} />
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Tile>

          <Tile id="watch" className="scroll-mt-24 rounded-[32px] bg-coal p-6 sm:rounded-[36px] sm:p-10">
            <div className="flex items-center gap-3">
              <Logo kind="watch" height={30} />
              <span className="rounded-full bg-smoke px-3 py-1 text-xs font-semibold text-cream/80">Coming soon</span>
            </div>
            <p className="display mt-5 max-w-sm text-[26px] leading-tight sm:mt-6 sm:text-[34px]">Short films and live rooms from African creators.</p>
            <p className="mt-3 max-w-sm text-[15px] text-mute">Fashion in Lagos, food in Accra, sunrise in Nairobi. Launching separately, on its own timeline.</p>
            <span className="mt-7 inline-flex h-11 items-center rounded-full bg-char px-5 text-sm font-medium text-mute">Launching soon</span>
            <div className="mt-7 grid grid-cols-3 gap-2.5 sm:mt-10 sm:gap-3" aria-hidden>
              {[
                ["zara", "Backstage, Lagos", "0:42"],
                ["kai", "Nairobi at first light", "1:15"],
                ["marcus", "Kigali by bike", "0:58"],
              ].map(([p, t, d]) => (
                <div key={p} className="relative overflow-hidden rounded-[22px]">
                  <Photo src={`/people/${p}.webp`} alt="" className="aspect-9/14 w-full" />
                  <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-black/85" />
                  <span className="glass-dark absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] tabular">{d}</span>
                  <span className="glass absolute top-1/2 left-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full">
                    <Icon icon={PlayIcon} size={16} stroke={2.2} />
                  </span>
                  <span className="absolute inset-x-2.5 bottom-2.5 text-[11px] leading-tight font-medium">{t}</span>
                </div>
              ))}
            </div>
          </Tile>
        </Stagger>
      </Wrap>
    </section>
  );
}

function Bento() {
  return (
    <section id="features" className="scroll-mt-20 pb-16 sm:pb-32">
      <Wrap>
        <Heading title="Built for real life." sub="Everything you need to meet someone, and nothing that gets in the way." />

        <Stagger gap={0.08} className="no-scrollbar -mx-5 mt-8 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto scroll-px-5 px-5 pb-2 sm:mx-0 sm:mt-14 sm:grid sm:gap-5 sm:overflow-visible sm:px-0 md:grid-cols-6">
          <Tile className={cx(SWIPE, "rounded-4xl bg-coal p-6 sm:p-8 md:col-span-4")}>
            <p className="text-sm font-medium text-ember">Why people join</p>
            <p className="display mt-3 text-[26px] leading-tight sm:text-[30px]">Not everything is a date.</p>
            <p className="mt-2 max-w-md text-[15px] text-mute">Say why you are here and see people who want the same. Change it whenever you like.</p>
            <div className="mt-7 flex flex-wrap gap-2">
              {INTENTIONS.map((i, n) => (
                <span key={i.id} className={cx("rounded-full px-3.5 py-2 text-[13px] font-medium sm:px-4 sm:py-2.5 sm:text-sm", n === 2 ? "bg-cream text-ink" : "bg-char text-cream/85")}>
                  {i.label}
                </span>
              ))}
            </div>
          </Tile>

          <Tile className={cx(SWIPE, "rounded-4xl bg-coal p-6 sm:p-8 md:col-span-2")}>
            <p className="text-sm font-medium text-ember">Verified</p>
            <p className="display mt-3 text-[26px] leading-tight sm:text-[30px]">Real people only.</p>
            <p className="mt-2 text-[15px] text-mute">ID, selfie and liveness checks. Adults {SITE.minAge}+.</p>
            <div className="mt-7 flex items-center">
              {["nia", "kai", "mei", "tobi"].map((p, i) => (
                <Photo key={p} src={`/people/${p}.webp`} alt="" className={cx("size-14 rounded-full ring-4 ring-coal", i > 0 && "-ml-3")} />
              ))}
              <span className="-ml-3 grid size-14 place-items-center rounded-full bg-char ring-4 ring-coal">
                <Verified size={26} />
              </span>
            </div>
          </Tile>

          <Tile id="experiences" className={cx(SWIPE, "rounded-4xl bg-cream p-6 text-ink sm:p-8 md:col-span-3")}>
            <div className="flex items-center gap-3">
              <Photo src="/people/mei.webp" alt="" className="size-14 rounded-full" />
              <div className="flex-1">
                <p className="text-lg font-semibold">Mei</p>
                <p className="text-[13px] text-ink/55">Travel and sightseeing, Johannesburg</p>
              </div>
              <RankBadge rank="platinum" size="sm" className="bg-ink!" />
            </div>
            <ul className="mt-6 grid grid-cols-2 gap-2">
              {DURATIONS.map((h, i) => (
                <li key={h} className="flex flex-col gap-0.5 rounded-2xl bg-ink/6 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink/65 sm:text-[13px] sm:text-ink">
                    <Icon icon={Clock01Icon} size={14} /> {hoursLabel(h)}
                  </span>
                  <span className="text-[15px] font-semibold tabular">{SAMPLE_RATES[i]}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs leading-relaxed text-ink/55">Example rate card. Companions set their own prices. A booking pays for time and company, never for physical contact.</p>
          </Tile>

          <Tile className={cx(SWIPE, "rounded-4xl bg-coal p-6 sm:p-8 md:col-span-3")}>
            <p className="text-sm font-medium text-ember">Experiences</p>
            <p className="display mt-3 text-[26px] leading-tight sm:text-[30px]">Book time, not people.</p>
            <ol className="mt-6 space-y-3">
              {[
                ["Request", "Pick an experience, a duration and a time."],
                ["Agree", "Chat first, then the companion accepts or suggests a change."],
                ["Pay through Meet", "Every charge shown up front. Never cash."],
                ["Meet and confirm", "They are paid after the experience."],
              ].map(([t, s], i) => (
                <li key={t} className="flex items-center gap-4 rounded-2xl bg-char p-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-cream text-sm font-semibold text-ink">{i + 1}</span>
                  <span>
                    <span className="block text-sm font-semibold">{t}</span>
                    <span className="block text-[13px] text-mute">{s}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Tile>

          <Tile className={cx(SWIPE, "rounded-4xl bg-coal p-6 sm:p-8 md:col-span-2")}>
            <p className="text-sm font-medium text-ember">Nearby, privately</p>
            <p className="display mt-3 text-[26px] leading-tight sm:text-[30px]">Close, not exact.</p>
            <p className="mt-2 text-[15px] text-mute">Distances are rounded. Your home and live location are never shown.</p>
            <div className="relative mt-6 h-36 overflow-hidden rounded-[24px] bg-[#111113]" aria-hidden>
              <div className="absolute top-1/2 left-1/2 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/10" />
              <div className="absolute top-1/2 left-1/2 size-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/12" />
              <span className="absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember ring-8 ring-ember/20" />
              {[
                ["zara", "18%", "26%"],
                ["kai", "72%", "18%"],
                ["nia", "62%", "58%"],
              ].map(([p, left, top]) => (
                <span key={p} className="absolute" style={{ left, top }}>
                  <Photo src={`/people/${p}.webp`} alt="" className="size-11 rounded-full ring-[3px] ring-white/20" />
                </span>
              ))}
            </div>
          </Tile>

          <Tile className={cx(SWIPE, "rounded-4xl bg-coal p-6 sm:p-8 md:col-span-4")}>
            <p className="text-sm font-medium text-ember">Companion levels</p>
            <p className="display mt-3 text-[26px] leading-tight sm:text-[30px]">Reputations, earned.</p>
            <p className="mt-2 max-w-md text-[15px] text-mute">Levels reflect reliability, reviews and completed bookings. Never how much someone earns.</p>
            <div className="mt-7 grid grid-cols-5 gap-2">
              {RANKS.map((r) => (
                <div key={r.id} className="flex flex-col items-center gap-2 rounded-2xl bg-char py-4">
                  <RankMark rank={r.id} className={cx("size-7", { bronze: "text-bronze", silver: "text-silver", gold: "text-gold", platinum: "text-platinum", diamond: "text-diamond" }[r.id])} />
                  <span className="text-[11px] font-medium sm:text-xs">{r.label}</span>
                </div>
              ))}
            </div>
          </Tile>

          <Tile id="safety" className={cx(SWIPE, "scroll-mt-20 rounded-4xl bg-ember p-6 text-ink sm:p-10 md:col-span-6")}>
            <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
              <div>
                <Icon icon={Shield01Icon} size={30} stroke={2} />
                <p className="display mt-5 max-w-2xl text-[28px] leading-tight sm:text-[48px]">A booking pays for time and company. Consent is never for sale.</p>
              </div>
              <div className="grid shrink-0 gap-2 text-sm font-medium">
                {["Report and block in one tap", "Trusted contacts and check-ins", "Meet in public, leave any time"].map((s) => (
                  <span key={s} className="rounded-full bg-ink/10 px-4 py-2.5">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </Tile>
        </Stagger>
      </Wrap>
    </section>
  );
}

function Countries() {
  const dest = useDest();
  const row = COUNTRIES_BY_NAME;
  const [all, setAll] = useState(false);
  return (
    <section className="pb-16 sm:pb-32">
      <Wrap>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h2 className="display text-[34px] leading-tight sm:text-[56px]">All {row.length}. One by one.</h2>
            <p className="mt-3 max-w-lg text-[16px] text-mute sm:text-[17px]">Every African Union member state is part of the plan. Countries open as payments, verification and local rules are ready.</p>
          </div>
          <LinkButton href={dest.join} variant="secondary" className="max-sm:hidden">
            Check your country <Icon icon={ArrowRight01Icon} size={16} />
          </LinkButton>
        </div>
        <ul className="mt-7 flex flex-wrap gap-2 sm:mt-10" aria-label="Countries">
          {row.map((c, i) => (
            <li key={c.code} className={cx("flex items-center gap-2 rounded-full bg-coal py-1.5 pr-3.5 pl-1.5 text-[13px] text-cream/85", i >= 12 && !all && "max-sm:hidden")}>
              <Flag code={c.code} className="size-6 rounded-full" />
              {c.name}
            </li>
          ))}
        </ul>
        {!all && (
          <button type="button" onClick={() => setAll(true)} className={buttonClass("secondary", "md", "mt-4 w-full sm:hidden")}>
            Show all {row.length} countries
          </button>
        )}
      </Wrap>
    </section>
  );
}

function Cta() {
  const dest = useDest();
  return (
    <section className="pb-16 sm:pb-24">
      <Wrap>
        <div className="relative overflow-hidden rounded-[32px] bg-coal px-6 py-12 text-center sm:rounded-[40px] sm:px-8 sm:py-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_100%,rgb(255_90_54/0.25),transparent_70%)]" aria-hidden />
          <div className="relative">
            <div className="flex justify-center">
              {["amara", "kai", "zara", "dami", "mei"].map((p, i) => (
                <Photo key={p} src={`/people/${p}.webp`} alt="" className={cx("size-14 rounded-full ring-4 ring-coal", i > 0 && "-ml-3")} />
              ))}
            </div>
            <h2 className="display mx-auto mt-6 max-w-2xl text-[34px] leading-tight sm:mt-7 sm:text-[56px]">Your people are already here.</h2>
            <LinkButton href={dest.join} variant="accent" size="lg" className="mt-8">
              Create your profile <Icon icon={ArrowRight01Icon} size={18} stroke={2.2} />
            </LinkButton>
          </div>
        </div>
      </Wrap>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line">
      <Wrap className="flex flex-col gap-7 py-10 md:flex-row md:items-center md:justify-between md:py-12">
        <div>
          <Logo kind="brand" height={24} />
          <p className="mt-3 text-sm text-mute">
            © {new Date().getFullYear()} {SITE.brand}. Adults {SITE.minAge}+ only.
          </p>
        </div>
        <nav className="grid grid-cols-2 gap-x-6 gap-y-3.5 text-sm text-mute sm:flex sm:flex-wrap sm:gap-x-8 sm:gap-y-3" aria-label="Footer">
          <a href="#meet" className="hover:text-cream">
            Meet
          </a>
          <a href="#watch" className="hover:text-cream">
            Watch
          </a>
          <a href="/community-rules" className="hover:text-cream">
            Community rules
          </a>
          <a href="#safety" className="hover:text-cream">
            Safety
          </a>
          <button type="button" onClick={openCookieSettings} className="text-left hover:text-cream">
            Cookie settings
          </button>
          <a href="/login" className="hover:text-cream">
            Sign in
          </a>
        </nav>
      </Wrap>
    </footer>
  );
}
