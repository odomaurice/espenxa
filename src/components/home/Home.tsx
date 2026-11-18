"use client";
import { ArrowLeft01Icon, ArrowRight01Icon, Calendar03Icon, Location01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AnimatePresence, Lift, motion, Reveal, Spotlight, Stagger, StaggerItem } from "@/components/motion";
import { fromPrice } from "@/components/people/bits";
import SetupDashboard from "./SetupDashboard";
import Overview, { Numbers } from "./Overview";
import PhotoCard, { PhotoCardSkeleton } from "@/components/people/PhotoCard";
import { useSession } from "@/components/Providers";
import { Avatar, Button, cx, Icon, IconButton, LinkButton, LivePill, Photo, RankBadge, SectionHead, Skeleton, Stars, Verified } from "@/components/ui";
import { api } from "@/lib/api/client";
import { qk, useBookings, useCategories, useDiscovery, useMyProfile, useRequests } from "@/lib/api/hooks";
import type { Profile } from "@/lib/api/types";
import { dateTime, distance, hoursLabel, money } from "@/lib/format";
import { intentionLabel } from "@/lib/labels";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function Home() {
  const { account } = useSession();
  if (account && !(account.onboarded && account.verification === "verified")) return <SetupDashboard />;
  return <Feed />;
}

function Feed() {
  const { account } = useSession();
  const me = useMyProfile();
  const people = useDiscovery("browse", {});
  const list = useMemo(() => people.data ?? [], [people.data]);
  const shared = (p: Profile) => p.interests.filter((i) => me.data?.interests.includes(i)).length;
  const likeYou = [...list].sort((a, b) => shared(b) - shared(a)).slice(0, 8);
  const providers = list.filter((p) => p.provider);
  const trending = [...list].sort((a, b) => (b.provider?.rating.count ?? 0) - (a.provider?.rating.count ?? 0)).slice(0, 7);
  const name = me.data?.displayName ?? account?.fullName.split(" ")[0] ?? "";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-11">
        <header className="flex items-end justify-between gap-4">
          <div>
            <motion.p className="text-sm text-mute" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              {greeting()},
            </motion.p>
            <h1 className="display mt-1 flex overflow-hidden text-[36px] md:text-[44px]" aria-label={name}>
              {name.split("").map((ch, i) => (
                <motion.span key={i} aria-hidden initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ delay: 0.08 + i * 0.035, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
                  {ch}
                </motion.span>
              ))}
              <motion.span aria-hidden className="text-ember" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15 + name.length * 0.035, type: "spring", stiffness: 500, damping: 14 }}>
                .
              </motion.span>
            </h1>
          </div>
          <LinkButton href="/discover" variant="secondary" className="hidden sm:inline-flex">
            <Icon icon={Search01Icon} size={17} /> Find people
          </LinkButton>
        </header>

        <Overview />

        {account?.isProvider && <Numbers />}

        <Stories people={list} loading={people.isPending} />

        <Reveal as="section">
          <SectionHead title="Trending this week" action={<SeeAll href="/discover?mode=browse" />} />
          {people.isPending ? <Skeleton className="h-125 rounded-[10px]" /> : <Trending people={trending} />}
        </Reveal>

        <Reveal as="section">
          <SectionHead title="People like you" action={<SeeAll href="/discover" />} />
          <Row>
            {people.isPending
              ? Array.from({ length: 4 }).map((_, i) => <PhotoCardSkeleton key={i} className="w-55 shrink-0" />)
              : likeYou.map((p, i) => (
                  <motion.div key={p.id} className="w-50 shrink-0 snap-start sm:w-55" initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
                    <PhotoCard p={p} />
                  </motion.div>
                ))}
          </Row>
        </Reveal>

        <Reveal as="section">
          <SectionHead title="Book an experience" action={<SeeAll href="/discover?providers=1" label="All companions" />} />
          <Row>
            {providers.map((p, i) => (
              <motion.div key={p.id} className="shrink-0 snap-start" initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
                <ExperienceCard p={p} />
              </motion.div>
            ))}
          </Row>
        </Reveal>
      </div>

      <RightRail />
      {!account?.isProvider && (
        <div className="min-w-0 xl:col-span-2">
          <Numbers />
        </div>
      )}
    </div>
  );
}

function SeeAll({ href, label = "See all" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1 text-sm text-mute transition-colors hover:text-cream">
      {label}
      <Icon icon={ArrowRight01Icon} size={14} className="transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-3 lg:px-3">{children}</div>;
}

function Stories({ people, loading }: { people: Profile[]; loading: boolean }) {
  const me = useMyProfile();
  const ordered = people.filter((p) => p.activeRecently).concat(people.filter((p) => !p.activeRecently));
  const item = { hidden: { opacity: 0, scale: 0.6, y: 10 }, show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 420, damping: 22 } } };
  return (
    <motion.div
      className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0"
      aria-label="People active now"
      initial="hidden"
      animate={loading ? "hidden" : "show"}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.045 } } }}
    >
      <motion.div variants={item} className="shrink-0">
        <Link href="/profile" className="flex w-18.5 shrink-0 flex-col items-center gap-2">
          <span className="relative p-[2.5px]">
            <Avatar src={me.data?.photos[0]} name="You" size={68} />
            <span className="absolute right-0 bottom-0 grid size-6 place-items-center rounded-full bg-cream text-[15px] leading-none font-semibold text-ink ring-[3px] ring-ink">+</span>
          </span>
          <span className="text-xs text-mute">You</span>
        </Link>
      </motion.div>
      {ordered.map((p) => (
        <motion.div key={p.id} variants={item} whileHover={{ y: -4 }} whileTap={{ scale: 0.94 }} className="shrink-0">
          <Link href={`/people/${p.id}`} className="flex w-18.5 shrink-0 flex-col items-center gap-2">
            <span className="relative">
              {p.activeRecently ? <Avatar src={p.photos[0]} name={p.displayName} size={68} ring /> : <span className="block rounded-full bg-smoke p-[2.5px]"><Avatar src={p.photos[0]} name={p.displayName} size={68} className="ring-[3px] ring-ink" /></span>}
              {p.activeRecently && <span className="absolute right-1 bottom-1 size-3.5 rounded-full bg-ok ring-[3px] ring-ink" />}
            </span>
            <span className="w-full truncate text-center text-xs text-cream/85">{p.displayName}</span>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}

/** Spring-animated fan. Cards glide between slots; drag, click a neighbour, or use the arrows. */
function Trending({ people }: { people: Profile[] }) {
  const [i, setI] = useState(0);
  const router = useRouter();
  const n = people.length;
  if (!n) return null;
  const idx = ((i % n) + n) % n;

  const slot = (offset: number) => {
    const a = Math.abs(offset);
    return {
      x: `${offset * 64}%`,
      rotate: offset * 7,
      scale: a === 0 ? 1 : a === 1 ? 0.84 : 0.7,
      opacity: a === 0 ? 1 : a === 1 ? 0.6 : 0,
      zIndex: 10 - a,
      filter: a === 0 ? "brightness(1)" : "brightness(0.6)",
    };
  };

  return (
    <Spotlight className="rounded-[10px] bg-coal px-4 pt-8 pb-6 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_0%,rgb(180_71_44/0.10),transparent_70%)]" aria-hidden />
      <div className="relative mx-auto h-100 max-w-160 sm:h-107.5">
        {people.map((p, k) => {
          let offset = k - idx;
          if (offset > n / 2) offset -= n;
          if (offset < -n / 2) offset += n;
          if (Math.abs(offset) > 2) return null;
          const centre = offset === 0;
          return (
            <motion.div
              key={p.id}
              className="absolute inset-x-0 top-0 mx-auto h-full w-62.5 sm:w-72.5"
              initial={false}
              animate={slot(offset)}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              drag={centre ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.5}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) setI((x) => x + 1);
                else if (info.offset.x > 60) setI((x) => x - 1);
              }}
            >
              <button
                type="button"
                onClick={() => (centre ? router.push(`/people/${p.id}`) : setI((x) => x + offset))}
                aria-label={centre ? `Open ${p.displayName}'s profile` : `Show ${p.displayName}`}
                className="relative block size-full overflow-hidden rounded-[10px] text-left shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)] ring-1 ring-white/10"
              >
                <Photo src={p.photos[0]} alt="" className="pointer-events-none size-full" />
                <div className="photo-shade absolute inset-0" />
                <AnimatePresence>
                  {centre && (
                    <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                      <div className="absolute inset-x-3 top-3 flex items-center justify-between">
                        {p.provider ? <RankBadge rank={p.provider.rank} size="sm" className="glass-dark" /> : <span />}
                        {p.activeRecently && <LivePill />}
                      </div>
                      <motion.div className="glass absolute inset-x-3 bottom-3 rounded-[10px] p-4" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12, type: "spring", stiffness: 300, damping: 26 }}>
                        <p className="flex items-center gap-1.5 text-[22px] font-semibold tracking-tight">
                          {p.displayName}
                          {p.age !== null && <span className="font-light text-cream/75">{p.age}</span>}
                          {p.verified && <Verified size={19} />}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-cream/75">
                          <Icon icon={Location01Icon} size={13} />
                          {[p.city, distance(p.distanceKm)].filter(Boolean).join(" · ")}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {p.intentions.slice(0, 2).map((x) => (
                            <span key={x} className="rounded-full bg-black/35 px-2.5 py-1 text-[11px]">
                              {intentionLabel(x)}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {!centre && (
                  <span className="absolute bottom-4 left-4 text-lg font-semibold">
                    {p.displayName} {p.age !== null && <span className="font-light text-cream/75">{p.age}</span>}
                  </span>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>
      <div className="relative mt-6 flex items-center justify-center gap-3">
        <IconButton icon={ArrowLeft01Icon} label="Previous" tone="filled" onClick={() => setI((x) => x - 1)} />
        <div className="flex gap-1.5" aria-hidden>
          {people.map((_, k) => (
            <motion.span key={k} className="h-1.5 rounded-full" animate={{ width: k === idx ? 24 : 6, backgroundColor: k === idx ? "#f6f6f7" : "#2a2a2e" }} transition={{ type: "spring", stiffness: 400, damping: 30 }} />
          ))}
        </div>
        <IconButton icon={ArrowRight01Icon} label="Next" tone="filled" onClick={() => setI((x) => x + 1)} />
      </div>
    </Spotlight>
  );
}

function ExperienceCard({ p }: { p: Profile }) {
  const cats = useCategories();
  const pr = p.provider!;
  const price = fromPrice(pr);
  const names = pr.categories.map((id) => cats.data?.find((c) => c.id === id)?.name).filter(Boolean).slice(0, 2).join(", ");
  return (
    <Lift>
      <Link href={`/people/${p.id}#book`} className="surface group flex w-75 gap-4 rounded-[10px] p-3 pr-5 transition-colors hover:bg-char">
        <span className="h-29 w-23 shrink-0 overflow-hidden rounded-[10px]">
          <Photo src={p.photos[0]} alt="" className="size-full transition-transform duration-700 group-hover:scale-110" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col py-1">
          <p className="flex items-center gap-1.5 font-semibold">
            <span className="truncate">{p.displayName}</span>
            {p.verified && <Verified size={16} />}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-mute">{names}</p>
          <div className="mt-auto flex items-center justify-between">
            <span className="text-sm font-semibold">{price ? money(price) : <span className="text-ok">Free</span>}</span>
            <Stars value={pr.rating.average} />
          </div>
          <RankBadge rank={pr.rank} size="sm" className="mt-2 self-start" />
        </div>
      </Link>
    </Lift>
  );
}

function RightRail() {
  const bookings = useBookings("customer");
  const requests = useRequests();
  const suggestions = useDiscovery("for_you", {});
  const qc = useQueryClient();
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const upcoming = bookings.data?.filter((b) => ["confirmed", "in_progress"].includes(b.status) && new Date(b.startAt) > new Date()).sort((a, b) => a.startAt.localeCompare(b.startAt))[0];
  const incoming = requests.data?.filter((r) => r.direction === "incoming") ?? [];

  return (
    <Stagger className="space-y-5 xl:sticky xl:top-8 xl:self-start" inView={false} delay={0.2} gap={0.1}>
      {upcoming && (
        <StaggerItem className="hidden xl:block">
          <Lift y={-4} scale={1.01}>
            <Link href={`/bookings/${upcoming.id}`} className="relative block overflow-hidden rounded-[10px] bg-ember p-5 text-ink">
              <span className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-white/18 blur-2xl" aria-hidden />
              <p className="relative flex items-center gap-2 text-xs font-semibold opacity-80">
                <Icon icon={Calendar03Icon} size={15} stroke={2.2} /> Next booking
              </p>
              <div className="relative mt-4 flex items-center gap-3">
                <Avatar src={upcoming.provider.photo} name={upcoming.provider.displayName} size={48} className="ring-2 ring-ink/20" />
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{upcoming.provider.displayName}</p>
                  <p className="text-[13px] opacity-80">
                    {hoursLabel(upcoming.hours)} · {dateTime(upcoming.startAt, upcoming.timezone)}
                  </p>
                </div>
              </div>
              <p className="relative mt-4 truncate rounded-full bg-ink/12 px-3 py-1.5 text-xs font-medium">{upcoming.meetingArea}</p>
            </Link>
          </Lift>
        </StaggerItem>
      )}

      {!!incoming.length && (
        <StaggerItem className="surface hidden rounded-[10px] p-5 xl:block">
          <p className="font-semibold">Connection requests</p>
          <ul className="mt-4 space-y-4">
            <AnimatePresence initial={false}>
              {incoming.slice(0, 3).map((r) => (
                <motion.li key={r.id} layout exit={{ opacity: 0, x: 40 }} className="flex items-center gap-3">
                  <Avatar src={r.person.photo} name={r.person.displayName} size={42} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.person.displayName}</p>
                    <p className="truncate text-xs text-mute">{r.message || "Wants to connect"}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={async () => {
                      await api.social.respond(r.id, true);
                      qc.invalidateQueries({ queryKey: qk.requests });
                      qc.invalidateQueries({ queryKey: qk.connections });
                    }}
                  >
                    Accept
                  </Button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </StaggerItem>
      )}

      <StaggerItem className="surface rounded-[10px] p-5">
        <div className="flex items-center justify-between">
          <p className="font-semibold">Suggested for you</p>
          <Link href="/discover" className="text-xs text-mute hover:text-cream">
            See all
          </Link>
        </div>
        <ul className="mt-4 space-y-1">
          {(suggestions.data ?? []).slice(0, 5).map((p) => {
            const done = sent[p.id] || !!p.viewer.requestPending;
            return (
              <li key={p.id} className="-mx-2 flex items-center gap-3 rounded-2xl px-2 py-1.5 transition-colors hover:bg-char">
                <Link href={`/people/${p.id}`}>
                  <Avatar src={p.photos[0]} name={p.displayName} size={42} />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-sm font-semibold">
                    {p.displayName}
                    {p.verified && <Verified size={14} />}
                  </p>
                  <p className="truncate text-xs text-mute">{p.city}</p>
                </div>
                <motion.button
                  type="button"
                  disabled={done}
                  whileTap={{ scale: 0.9 }}
                  onClick={async () => {
                    setSent((s) => ({ ...s, [p.id]: true }));
                    await api.social.sendRequest(p.id, "").catch(() => {});
                    qc.invalidateQueries({ queryKey: qk.requests });
                  }}
                  className={cx("rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors", done ? "text-mute" : "bg-ember/12 text-ember hover:bg-ember hover:text-ink")}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span key={String(done)} className="block" initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} transition={{ duration: 0.18 }}>
                      {done ? "Requested" : "Connect"}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              </li>
            );
          })}
        </ul>
      </StaggerItem>
    </Stagger>
  );
}
