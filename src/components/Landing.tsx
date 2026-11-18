"use client";

/*
 * Public homepage, in a clean editorial-retail style: black announcement bar,
 * logo with a row of small uppercase links, full-bleed photo hero with a
 * centred serif headline and an outlined pill, square photo tiles, a split
 * editorial block, a product-style carousel of companions, two-up promos,
 * a value row and a full footer. Serif headings at regular weight, plain sans
 * body, square photos. Every image comes from PHOTOS (src/lib/photos.ts).
 * Nothing moves on its own; carousels move only when the visitor taps or drags.
 */
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  CheckmarkBadge01Icon,
  Location01Icon,
  Menu01Icon,
  Search01Icon,
  Shield01Icon,
  User03Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import Flag from "@/components/Flag";
import { Reveal } from "@/components/motion";
import { useSession } from "@/components/Providers";
import { Avatar, buttonClass, cx, Icon, Photo } from "@/components/ui";
import { Logo } from "@/components/Wordmark";
import { api } from "@/lib/api/client";
import { useMyProfile } from "@/lib/api/hooks";
import { openCookieSettings } from "@/lib/consent";
import { COUNTRIES_BY_NAME } from "@/lib/countries";
import { PHOTOS, PLANS, type PhotoSlot } from "@/lib/photos";
import { SITE } from "@/lib/site";

/**
 * Where calls to action go. Visitors are sent to register; signed-in people
 * go to their dashboard.
 */
function useDest() {
  const { account } = useSession();
  const dashboard = !account ? "/register" : account.roles.length ? "/admin" : account.contactVerified ? "/home" : "/verify-otp";
  return {
    signedIn: !!account,
    dashboard,
    join: account ? dashboard : "/register",
  };
}

const NAV: [string, string][] = [
  ["Companions", "#companions"],
  ["Experiences", "#experiences"],
  ["How it works", "#how"],
  ["For companions", "#join"],
  ["Safety", "#safety"],
  ["Countries", "#countries"],
];

/** Outlined pill, the site's call-to-action shape. `light` for use over photos. */
const pill = (light = false, extra?: string) =>
  cx(
    "inline-flex h-10 items-center justify-center rounded-full px-5 text-[13px] font-medium tracking-[0.02em] uppercase transition-colors",
    light ? "text-white shadow-[inset_0_0_0_1px_white] hover:bg-white hover:text-[#181818]" : "text-cream shadow-[inset_0_0_0_1px_var(--color-cream)] hover:bg-cream hover:text-ink",
    extra,
  );

export default function Landing() {
  return (
    <div className="overflow-x-clip bg-ink">
      <Announcement />
      <Header />
      <main>
        <Hero />
        <Experiences />
        <Editorial />
        <Companions />
        <Promos />
        <Values />
        <Safety />
        <Countries />
      </main>
      <Footer />
    </div>
  );
}

const Wrap = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cx("mx-auto w-full max-w-[1440px] px-4 sm:px-5", className)}>{children}</div>;

const Heading = ({ children, className }: { children: ReactNode; className?: string }) => <h2 className={cx("display text-center text-[34px] sm:text-[44px]", className)}>{children}</h2>;

/* ---- top of page ------------------------------------------------------------ */

function Announcement() {
  return (
    <div className="bg-[#181818] text-white">
      <Wrap className="relative flex h-9 items-center justify-center">
        <p className="truncate font-mono text-[12.5px] font-bold tracking-[0.02em] uppercase">
          Free to join | Verified adults {SITE.minAge}+ |{" "}
          <Link href="/safety" className="underline underline-offset-2">
            Safety
          </Link>
        </p>
        <a href="#countries" className="absolute right-5 hidden items-center gap-1.5 text-[12px] lg:flex">
          <Flag code="NG" className="h-3 w-4.5" /> Africa | 55 countries
        </a>
      </Wrap>
    </div>
  );
}

function Header() {
  const { account } = useSession();
  const me = useMyProfile(!!account?.contactVerified);
  const dest = useDest();
  const [menu, setMenu] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-40 bg-white">
        <Wrap>
          <div className="flex h-16 items-center justify-between lg:h-[66px]">
            <Link href="/" aria-label={`${SITE.name} home`}>
              <Logo height={24} />
            </Link>
            <div className="flex items-center gap-1">
              <Link href={account ? "/discover?mode=browse" : "/register"} aria-label="Search people" className="grid size-10 place-items-center">
                <Icon icon={Search01Icon} size={20} stroke={1.6} />
              </Link>
              {account ? (
                <Link href={dest.dashboard} aria-label="Go to your dashboard" className="ml-1 flex items-center gap-2">
                  <Avatar src={me.data?.photos[0]} name={account.fullName} size={30} />
                  <span className="hidden text-[13px] uppercase sm:inline">Dashboard</span>
                </Link>
              ) : (
                <Link href="/login" aria-label="Sign in" className="grid size-10 place-items-center">
                  <Icon icon={User03Icon} size={20} stroke={1.6} />
                </Link>
              )}
              <button type="button" onClick={() => setMenu(true)} aria-label="Open menu" className="grid size-10 place-items-center lg:hidden">
                <Icon icon={Menu01Icon} size={22} stroke={1.6} />
              </button>
            </div>
          </div>
          <nav className="hidden h-11 items-center gap-7 lg:flex" aria-label="Sections">
            {NAV.map(([label, href]) => (
              <a key={href} href={href} className="text-[13px] tracking-[0.02em] uppercase hover:underline hover:underline-offset-4">
                {label}
              </a>
            ))}
            {!account && (
              <Link href="/register" className="text-[13px] tracking-[0.02em] uppercase underline underline-offset-4 hover:no-underline">
                Join free
              </Link>
            )}
          </nav>
        </Wrap>
      </header>
      <AnimatePresence>{menu && <MobileMenu onClose={() => setMenu(false)} />}</AnimatePresence>
    </>
  );
}

function MobileMenu({ onClose }: { onClose: () => void }) {
  const dest = useDest();
  return (
    <>
      <motion.div key="scrim" className="fixed inset-0 z-50 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.nav
        key="drawer"
        aria-label="Menu"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 360, damping: 38 }}
        className="fixed inset-y-0 right-0 z-50 flex w-[88%] max-w-sm flex-col bg-white"
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-4">
          <Logo height={22} />
          <button type="button" onClick={onClose} aria-label="Close menu" className="grid size-10 place-items-center">
            <Icon icon={Cancel01Icon} size={20} />
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto px-4">
          {NAV.map(([label, href]) => (
            <li key={href} className="border-b border-line">
              <a href={href} onClick={onClose} className="flex h-14 items-center justify-between text-[14px] tracking-[0.02em] uppercase">
                {label} <Icon icon={ArrowRight01Icon} size={16} className="text-faint" />
              </a>
            </li>
          ))}
        </ul>
        <div className="grid gap-2 border-t border-line p-4">
          <Link href={dest.join} className={buttonClass("primary", "lg")}>
            {dest.signedIn ? "Go to my dashboard" : "Join free"}
          </Link>
          {!dest.signedIn && (
            <Link href="/login" className={buttonClass("secondary", "lg")}>
              Sign in
            </Link>
          )}
        </div>
      </motion.nav>
    </>
  );
}

/* ---- hero ------------------------------------------------------------------- */

function Hero() {
  const dest = useDest();
  return (
    <section className="relative">
      <div className="relative h-[calc(100svh-100px)] max-h-[760px] min-h-[540px] overflow-hidden bg-char lg:h-[620px]">
        <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-[1.45fr_1fr]">
          {PHOTOS.hero.slice(0, 2).map((p, i) => (
            <motion.div key={p.src} className={cx("relative overflow-hidden", i > 0 && "hidden lg:block")} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: i * 0.15 }}>
              <Photo src={p.src} alt={p.alt} focus={p.focus} className="wash size-full" />
            </motion.div>
          ))}
        </div>
        <div className="absolute inset-0 bg-[#3a2f28]/20" />
        <div className="absolute inset-x-0 bottom-10 px-5 text-center text-white lg:inset-y-0 lg:right-[40.8%] lg:flex lg:flex-col lg:items-center lg:justify-center">
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.8 }} className="display text-[42px] [text-shadow:0_1px_18px_rgb(0_0_0/0.25)] sm:text-[56px]">
            Good company, well planned.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mx-auto mt-3 hidden max-w-md text-[15px] leading-snug sm:block">
            Dates, friendship and conversation, or a verified companion for a dinner, an event or a trip. Across Africa, for adults {SITE.minAge}+.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-5">
            <Link href={dest.join} className={pill(true)}>
              {dest.signedIn ? "Go to my dashboard" : "Join free"}
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ---- experiences (square photo tiles) ---------------------------------------- */

const EXPERIENCES: { slug: keyof typeof PHOTOS.experiences; label: string }[] = [
  { slug: "dinner", label: "Dinner" },
  { slug: "conversation", label: "Coffee and conversation" },
  { slug: "events", label: "Events" },
  { slug: "concerts", label: "Concerts" },
  { slug: "travel", label: "Travel" },
  { slug: "sightseeing", label: "Sightseeing" },
  { slug: "outdoors", label: "Outdoors" },
  { slug: "gatherings", label: "Weddings and parties" },
];

function Experiences() {
  const dest = useDest();
  return (
    <section id="experiences" className="scroll-mt-28 pt-10 pb-12 sm:pt-12">
      <Heading>Find your plan</Heading>
      <Rail className="mt-6 sm:mt-8" step={0.5}>
        {EXPERIENCES.map((e) => {
          const p = PHOTOS.experiences[e.slug];
          return (
            <Link key={e.slug} href={dest.signedIn ? `/discover?category=cat_${e.slug}` : dest.join} className="group w-[31%] shrink-0 snap-start sm:w-[calc((100%-6*12px)/7.3)]">
              <span className="block overflow-hidden bg-[#efece7]">
                <Photo src={p.src} alt={p.alt} focus={p.focus} className="wash aspect-square w-full transition-transform duration-700 group-hover:scale-[1.04]" />
              </span>
              <span className="mt-2 block text-[13px] leading-snug font-semibold">{e.label}</span>
            </Link>
          );
        })}
      </Rail>
    </section>
  );
}

/** Horizontal row with arrow buttons on wide screens. Moves only when tapped or swiped. */
function Rail({ children, className, step = 0.8 }: { children: ReactNode; className?: string; step?: number }) {
  const row = useRef<HTMLDivElement>(null);
  const nudge = (dir: 1 | -1) => row.current?.scrollBy({ left: dir * row.current.clientWidth * step, behavior: "smooth" });
  return (
    <div className={cx("relative", className)}>
      <div ref={row} className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 sm:scroll-px-5 sm:px-5">
        {children}
      </div>
      {(["left", "right"] as const).map((side) => (
        <button
          key={side}
          type="button"
          onClick={() => nudge(side === "left" ? -1 : 1)}
          aria-label={side === "left" ? "Previous" : "Next"}
          className={cx("absolute top-[38%] hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-[0_1px_6px_rgb(0_0_0/0.15)] hover:bg-white sm:grid", side === "left" ? "left-7" : "right-7")}
        >
          <Icon icon={side === "left" ? ArrowLeft01Icon : ArrowRight01Icon} size={16} />
        </button>
      ))}
    </div>
  );
}

/* ---- editorial split ----------------------------------------------------------- */

function Editorial() {
  return (
    <section id="how" className="scroll-mt-28">
      <SplitBanner
        photo={PHOTOS.plan}
        title={
          <>
            Plan first,
            <br />
            pay later.
          </>
        }
        body="Chat with a companion before anything is booked. Agree the day, the time and the place. You only pay once they accept, and they are paid after your time together."
        cta="How booking works"
        href="/register"
      />
    </section>
  );
}

function SplitBanner({ photo, title, body, cta, href, reverse }: { photo: PhotoSlot; title: ReactNode; body: string; cta: string; href: string; reverse?: boolean }) {
  return (
    <div className="relative grid min-h-[560px] bg-[#f3f1ee] lg:h-[620px] lg:grid-cols-[1fr_1.6fr]">
      <div className={cx("relative h-[440px] lg:h-full", reverse ? "lg:order-first" : "lg:order-last")}>
        <Photo src={photo.src} alt={photo.alt} focus={photo.focus} className="wash absolute inset-0 size-full" />
      </div>
      <Reveal className="flex flex-col justify-center px-5 py-10 text-center lg:px-14 lg:text-left">
        <h2 className="display text-[40px] sm:text-[56px]">{title}</h2>
        <p className="mx-auto mt-4 max-w-sm text-[15px] leading-snug lg:mx-0">{body}</p>
        <div className="mt-6">
          <Link href={href} className={pill()}>
            {cta}
          </Link>
        </div>
      </Reveal>
    </div>
  );
}

/* ---- companions (product-style carousel) ------------------------------------------- */

/** Popular plans: editorial photos with a plan and a city, never a person's name or price. */
function Companions() {
  const dest = useDest();
  return (
    <section id="companions" className="scroll-mt-28 pt-12 pb-14">
      <Heading>Popular plans this month</Heading>
      <Rail className="mt-6 sm:mt-8">
        {PLANS.map((p) => (
          <Link key={p.title} href={dest.signedIn ? "/discover?providers=1" : dest.join} className="group w-[47%] shrink-0 snap-start sm:w-[calc((100%-3*12px)/3.6)] lg:w-[calc((100%-4*12px)/5.2)]">
            <span className="relative block overflow-hidden bg-[#efece7]">
              <Photo src={p.photo.src} alt={p.photo.alt} focus={p.photo.focus} className="wash aspect-[4/5] w-full transition-transform duration-700 group-hover:scale-[1.03]" />
              <span className="absolute right-2.5 bottom-2.5 grid size-8 place-items-center rounded-full bg-white/90 text-[#181818]">
                <Icon icon={ArrowRight01Icon} size={15} />
              </span>
            </span>
            <span className="mt-2.5 block text-[13px] font-semibold">{p.title}</span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-mute">
              <Flag code={p.country} className="h-3 w-4.5" /> {p.city}
            </span>
            {p.tag && <span className="mt-1.5 inline-block bg-char px-1.5 py-0.5 text-[11px] text-mute">{p.tag}</span>}
          </Link>
        ))}
      </Rail>
      <p className="mt-6 px-5 text-center text-xs text-faint">Photos show models, not members. Find verified companions near you after you join.</p>
    </section>
  );
}

/* ---- two-up promos ------------------------------------------------------------------- */

function Promos() {
  const dest = useDest();
  const tiles = [
    { img: PHOTOS.members, title: "For members", body: "Meet people worth your time.", cta: "Join free", href: dest.join, light: true },
    { img: PHOTOS.companions, title: "For companions", body: "Offer your time, on your terms.", cta: "Become a companion", href: dest.signedIn ? "/become-a-companion" : "/register", light: true },
  ];
  return (
    <section id="join" className="grid scroll-mt-28 md:grid-cols-2">
      {tiles.map((t) => (
        <Link key={t.title} href={t.href} className="group relative block h-[420px] overflow-hidden sm:h-[520px]">
          <Photo src={t.img.src} alt={t.img.alt} focus={t.img.focus} className="wash absolute inset-0 size-full transition-transform duration-700 group-hover:scale-[1.03]" />
          <div className="absolute inset-0 bg-[#3a2f28]/25" />
          <div className={cx("absolute inset-x-5 bottom-10 sm:inset-x-8 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2", t.light && "text-white")}>
            <p className="display text-[40px] sm:text-[44px]">{t.title}</p>
            <p className="mt-1 text-[15px]">{t.body}</p>
            <span className={pill(t.light, "mt-4")}>{t.cta}</span>
          </div>
        </Link>
      ))}
    </section>
  );
}

/* ---- value row ----------------------------------------------------------------------- */

function Values() {
  const items: [IconSvgElement, string, string][] = [
    [CheckmarkBadge01Icon, "Verified adults", `ID and selfie checks. ${SITE.minAge}+ only.`],
    [Wallet01Icon, "Pay safely", "Through Paystack and Flutterwave. Never cash."],
    [Location01Icon, "Close, not exact", "Distances are rounded. Addresses never shown."],
    [Shield01Icon, "Help when you need it", "Report, block and trusted contacts."],
  ];
  return (
    <section className="border-b border-line">
      <Wrap className="grid grid-cols-2 gap-x-4 gap-y-8 py-12 lg:grid-cols-4">
        {items.map(([icon, t, s]) => (
          <div key={t} className="text-center">
            <Icon icon={icon} size={26} stroke={1.3} className="mx-auto" />
            <p className="mt-3 text-[13px] tracking-[0.02em] uppercase">{t}</p>
            <p className="mx-auto mt-1 max-w-[220px] text-[13px] leading-snug text-mute">{s}</p>
          </div>
        ))}
      </Wrap>
    </section>
  );
}

/* ---- safety -------------------------------------------------------------------------- */

function Safety() {
  return (
    <section id="safety" className="scroll-mt-28">
      <SplitBanner
        photo={PHOTOS.safety}
        reverse
        title={
          <>
            Time and company.
            <br />
            Never consent for sale.
          </>
        }
        body="Meet in public and leave any time. Share your plans with someone you trust. Report or block in one tap. Every companion is identity-checked."
        cta="Read the community rules"
        href="/community-rules"
      />
    </section>
  );
}

/* ---- countries ----------------------------------------------------------------------- */

function Countries() {
  const markets = useQuery({ queryKey: ["reference", "markets"], queryFn: api.reference.markets, staleTime: 60_000 });
  const live = new Set((markets.data ?? []).filter((m) => m.status === "active").map((m) => m.country));
  const [all, setAll] = useState(false);
  return (
    <section id="countries" className="scroll-mt-28 py-14">
      <Wrap>
        <Heading>One continent, 55 countries</Heading>
        <p className="mx-auto mt-3 max-w-md text-center text-[15px] text-mute">Every African Union member state is part of the plan. Countries open as payments, verification and local rules are ready.</p>
        <ul className="mx-auto mt-8 grid max-w-5xl grid-cols-2 gap-x-6 sm:grid-cols-3 lg:grid-cols-5" aria-label="Countries">
          {COUNTRIES_BY_NAME.map((c, i) => (
            <li key={c.code} className={cx("flex items-center gap-2.5 border-b border-line py-2.5 text-[13.5px]", i >= 12 && !all && "max-sm:hidden")}>
              <Flag code={c.code} className="h-3.5 w-5 shrink-0" />
              <span className="truncate">{c.name}</span>
              {live.has(c.code) && <span className="ml-auto shrink-0 bg-char px-1.5 py-0.5 text-[10.5px] tracking-[0.02em] uppercase">Open</span>}
            </li>
          ))}
        </ul>
        {!all && (
          <div className="mt-6 text-center sm:hidden">
            <button type="button" onClick={() => setAll(true)} className={pill()}>
              Show all {COUNTRIES_BY_NAME.length}
            </button>
          </div>
        )}
      </Wrap>
    </section>
  );
}

/* ---- footer -------------------------------------------------------------------------- */

function Footer() {
  const dest = useDest();
  const cols: [string, [string, string | (() => void)][]][] = [
    [SITE.name, [["How it works", "#how"], ["Experiences", "#experiences"], ["Countries", "#countries"], [dest.signedIn ? "Dashboard" : "Join free", dest.join]]],
    ["Companions", [["Become a companion", dest.signedIn ? "/become-a-companion" : "/register"], ["Companion levels", "/register"], ["Payouts", "/register"]]],
    ["Help", [["Safety centre", "/safety"], ["Community rules", "/community-rules"], ["Contact us", `mailto:${SITE.supportEmail}`]]],
    ["Legal", [["Terms", "/community-rules"], ["Privacy", "/community-rules"], ["Cookie settings", openCookieSettings]]],
  ];
  return (
    <footer className="bg-[#f3f1ee]">
      <Wrap className="grid gap-x-6 gap-y-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(4,1fr)]">
        <div>
          <Logo height={24} />
          <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-mute">{SITE.description}</p>
        </div>
        {cols.map(([title, links]) => (
          <div key={title}>
            <p className="text-[13px] tracking-[0.02em] uppercase">{title}</p>
            <ul className="mt-4 space-y-2.5 text-[13.5px] text-mute">
              {links.map(([label, to]) => (
                <li key={label}>
                  {typeof to === "string" ? (
                    <a href={to} className="hover:text-cream hover:underline">
                      {label}
                    </a>
                  ) : (
                    <button type="button" onClick={to} className="hover:text-cream hover:underline">
                      {label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {/* TODO(team): link the final Terms and Privacy pages once legal signs them off. */}
      </Wrap>
      <div className="border-t border-line">
        <Wrap className="flex flex-col gap-2 py-5 text-[12.5px] text-mute sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.name}. Adults {SITE.minAge}+ only.
          </p>
          <p>Bookings are for time and company, never physical contact.</p>
        </Wrap>
      </div>
    </footer>
  );
}
