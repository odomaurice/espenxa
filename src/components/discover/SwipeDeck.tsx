"use client";

/*
 * For You: one profile at a time on a stacked card. Drag, use the buttons,
 * or the arrow keys. Nothing moves on its own.
 */
import {
  ArrowDown01Icon,
  Bookmark02Icon,
  Cancel01Icon,
  Compass01Icon,
  FavouriteIcon,
  Flag02Icon,
  Location01Icon,
  MoreVerticalIcon,
  UserAdd01Icon,
  UserBlock01Icon,
} from "@hugeicons/core-free-icons";
import { useQueryClient } from "@tanstack/react-query";
import { animate, AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { useConfirm } from "@/components/Confirm";
import { Burst } from "@/components/motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ConnectDialog, MatchDialog, PriceLine } from "@/components/people/bits";
import ReportDialog from "@/components/people/ReportDialog";
import { Button, cx, EmptyState, errorMessage, Icon, IconButton, LivePill, Notice, Photo, RankBadge, Stars, Tag, Verified } from "@/components/ui";
import { api } from "@/lib/api/client";
import { qk, useCategories } from "@/lib/api/hooks";
import type { Profile } from "@/lib/api/types";
import { countryByCode } from "@/lib/countries";
import { distance } from "@/lib/format";
import { intentionLabel, languageName } from "@/lib/labels";

export default function SwipeDeck({ people, onOpenFilters }: { people: Profile[]; onOpenFilters: () => void }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [index, setIndex] = useState(0);
  const [match, setMatch] = useState<{ p: Profile; id: string | null } | null>(null);
  const [connecting, setConnecting] = useState<Profile | null>(null);
  const [reporting, setReporting] = useState<Profile | null>(null);
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState(0);
  const [burst, setBurst] = useState(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-9, 9]);
  const likeOpacity = useTransform(x, [40, 140], [0, 1]);
  const passOpacity = useTransform(x, [-140, -40], [1, 0]);

  const p = people[index];
  const nextUp = people[index + 1];

  function advance() {
    setIndex((i) => i + 1);
    setPhoto(0);
    setMenu(false);
    x.set(0);
  }

  async function decide(kind: "like" | "pass") {
    if (!p) return;
    setError(null);
    await animate(x, kind === "like" ? 560 : -560, { duration: 0.24 });
    const current = p;
    advance();
    try {
      if (kind === "like") {
        const r = await api.discovery.like(current.id);
        if (r.matched) {
          setMatch({ p: current, id: r.connectionId });
          qc.invalidateQueries({ queryKey: qk.connections });
        }
      } else await api.discovery.pass(current.id);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function save() {
    if (!p) return;
    try {
      await api.discovery.toggleSave(p.id);
      qc.invalidateQueries({ queryKey: qk.saved });
      advance();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function block() {
    if (!p) return;
    setMenu(false);
    const ok = await confirm({ title: `Block ${p.displayName}?`, body: `${p.displayName} will no longer see you or be able to message you, and any connection between you ends. They are not told.`, confirmLabel: "Block", tone: "danger" });
    if (!ok) return;
    await api.safety.block(p.id).catch(() => {});
    qc.invalidateQueries({ queryKey: ["discovery"] });
    advance();
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select,dialog")) return;
      if (e.key === "ArrowRight") decide("like");
      if (e.key === "ArrowLeft") decide("pass");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!p)
    return (
      <>
        <EmptyState
          icon={Compass01Icon}
          title="You are all caught up"
          body="Widen your filters, or check Explore and Nearby. New people join every day."
          action={
            <Button variant="secondary" onClick={onOpenFilters}>
              Adjust filters
            </Button>
          }
        />
        <MatchDialog person={match?.p ?? null} connectionId={match?.id ?? null} onClose={() => setMatch(null)} />
      </>
    );

  const c = countryByCode(p.country);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,440px)_1fr] lg:items-start">
      <div className="mx-auto w-full max-w-[440px]">
        {error && (
          <Notice tone="bad" className="mb-3">
            {error}
          </Notice>
        )}
        <div className="relative pb-10">
          <div className="relative aspect-[3/4.3]">
            {nextUp && (
              <div className="absolute inset-x-5 -top-3 bottom-6 overflow-hidden rounded-[36px] opacity-45 ring-1 ring-white/10" aria-hidden>
                <Photo src={nextUp.photos[0]} alt="" className="size-full" />
              </div>
            )}
            <motion.div
              key={p.id}
              className="absolute inset-0 cursor-grab touch-pan-y overflow-hidden rounded-[36px] bg-char shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9)] ring-1 ring-white/10 active:cursor-grabbing"
              style={{ x, rotate }}
              initial={{ scale: 0.92, y: 18, opacity: 0.4 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              drag="x"
              dragSnapToOrigin
              onDragEnd={(_, info) => {
                if (info.offset.x > 120) decide("like");
                else if (info.offset.x < -120) decide("pass");
              }}
            >
              <AnimatePresence initial={false}>
                <motion.div key={photo} className="absolute inset-0" initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
                  <Photo src={p.photos[photo] ?? p.photos[0]} alt={`${p.displayName}, photo ${photo + 1} of ${p.photos.length}`} className="pointer-events-none size-full" />
                </motion.div>
              </AnimatePresence>
              {p.photos.length > 1 && (
                <>
                  <div className="absolute inset-x-6 top-3 flex gap-1.5" aria-hidden>
                    {p.photos.map((_, i) => (
                      <span key={i} className={cx("h-1 flex-1 rounded-full", i === photo ? "bg-white" : "bg-white/35")} />
                    ))}
                  </div>
                  <button type="button" aria-label="Previous photo" className="absolute inset-y-20 left-0 w-1/3" onClick={() => setPhoto((i) => Math.max(0, i - 1))} />
                  <button type="button" aria-label="Next photo" className="absolute inset-y-20 right-0 w-1/3" onClick={() => setPhoto((i) => Math.min(p.photos.length - 1, i + 1))} />
                </>
              )}

              <div className="absolute inset-x-4 top-6 flex items-start justify-between">
                <div className="relative">
                  <IconButton icon={MoreVerticalIcon} label="More options" tone="glass" onClick={() => setMenu((m) => !m)} />
                  {menu && (
                    <div className="glass-dark absolute top-12 left-0 z-10 w-48 overflow-hidden rounded-2xl p-1.5 text-sm">
                      <button type="button" onClick={() => { setMenu(false); setReporting(p); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-white/10">
                        <Icon icon={Flag02Icon} size={16} /> Report
                      </button>
                      <button type="button" onClick={block} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-bad hover:bg-white/10">
                        <Icon icon={UserBlock01Icon} size={16} /> Block
                      </button>
                    </div>
                  )}
                </div>
                <IconButton icon={Bookmark02Icon} label="Save for later" tone="glass" onClick={save} />
              </div>

              <motion.span style={{ opacity: likeOpacity }} className="absolute top-24 left-6 -rotate-12 rounded-2xl bg-ok/90 px-4 py-1.5 text-xl font-bold text-ink">
                Like
              </motion.span>
              <motion.span style={{ opacity: passOpacity }} className="absolute top-24 right-6 rotate-12 rounded-2xl bg-white/90 px-4 py-1.5 text-xl font-bold text-ink">
                Pass
              </motion.span>

              <div className="photo-shade pointer-events-none absolute inset-0" />
              <motion.div className="absolute inset-x-5 bottom-14" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
                {p.provider && <RankBadge rank={p.provider.rank} size="sm" className="glass-dark mb-3" />}
                <p className="flex items-center gap-2 text-[34px] leading-none font-semibold tracking-tight">
                  {p.displayName}
                  {p.age !== null && <span className="font-light text-white/75">{p.age}</span>}
                  {p.verified && <Verified size={26} />}
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    {p.activeRecently ? <LivePill /> : null}
                    <span className="glass-dark inline-flex h-7 min-w-0 items-center gap-1.5 rounded-full px-3 text-xs">
                      <Icon icon={Location01Icon} size={13} />
                      <span className="truncate">{[p.city || c?.name, distance(p.distanceKm)].filter(Boolean).join(" · ")}</span>
                    </span>
                  </div>
                  <Link href={`/people/${p.id}`} aria-label="Open full profile" className="glass-dark grid size-9 shrink-0 place-items-center rounded-full">
                    <Icon icon={ArrowDown01Icon} size={16} stroke={2} />
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          </div>

          <div className="absolute inset-x-0 bottom-0 flex justify-center">
            <div className="glass-dark flex items-center gap-2 rounded-full p-2 shadow-[0_20px_40px_-10px_rgb(0_0_0/0.8)]">
              <motion.button type="button" aria-label="Pass" onClick={() => decide("pass")} whileHover={{ rotate: -6 }} whileTap={{ scale: 0.86 }} transition={{ type: "spring", stiffness: 500, damping: 15 }} className="grid h-16 w-[84px] place-items-center rounded-full bg-white text-ink">
                <Icon icon={Cancel01Icon} size={26} stroke={2.2} />
              </motion.button>
              <motion.button
                type="button"
                aria-label="Send a connection request"
                disabled={!!p.viewer.requestPending || !!p.viewer.connectionId}
                onClick={() => setConnecting(p)}
                whileTap={{ scale: 0.86 }}
                className="grid size-12 place-items-center rounded-full bg-char text-cream disabled:opacity-35"
              >
                <Icon icon={UserAdd01Icon} size={20} stroke={2} />
              </motion.button>
              <motion.button
                type="button"
                aria-label="Like"
                onClick={() => {
                  setBurst((b) => b + 1);
                  decide("like");
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.86 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
                className="relative grid h-16 w-[84px] place-items-center rounded-full bg-ember text-ink shadow-[0_10px_30px_-6px_rgb(255_90_54/0.7)]"
              >
                <Icon icon={FavouriteIcon} size={26} stroke={2.4} />
                <Burst k={burst} />
              </motion.button>
            </div>
          </div>
        </div>
        <p className="mt-4 hidden text-center text-xs text-faint sm:block">Drag the card or use the arrow keys</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={p.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="hidden lg:block">
          <ProfileAside p={p} />
        </motion.div>
      </AnimatePresence>

      <MatchDialog person={match?.p ?? null} connectionId={match?.id ?? null} onClose={() => setMatch(null)} />
      {connecting && (
        <ConnectDialog
          person={connecting}
          open
          onClose={() => setConnecting(null)}
          onSent={() => {
            qc.invalidateQueries({ queryKey: qk.requests });
            qc.invalidateQueries({ queryKey: ["discovery"] });
          }}
        />
      )}
      {reporting && <ReportDialog person={reporting} open onClose={() => setReporting(null)} />}
    </div>
  );
}

function ProfileAside({ p }: { p: Profile }) {
  const cats = useCategories();
  const catNames = (p.provider?.categories ?? []).map((id) => cats.data?.find((c) => c.id === id)?.name).filter(Boolean) as string[];
  return (
    <aside className="hidden space-y-4 lg:block">
      {p.photos.length > 1 && (
        <div className="grid grid-cols-3 gap-3">
          {p.photos.slice(1, 4).map((src) => (
            <Photo key={src} src={src} alt="" className="aspect-square w-full rounded-[22px]" />
          ))}
        </div>
      )}
      <div className="surface rounded-[28px] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">About me</h2>
          <Link href={`/people/${p.id}`} className="text-sm text-mute hover:text-cream">
            Full profile
          </Link>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-cream/80">{p.bio || "No bio yet."}</p>
      </div>
      <div className="surface rounded-[28px] p-6">
        <h2 className="text-lg font-semibold">More info</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {p.intentions.map((i) => (
            <Tag key={i} className="bg-ember/12 text-ember-hi">
              {intentionLabel(i)}
            </Tag>
          ))}
          {[...p.interests, ...p.hobbies].map((i) => (
            <Tag key={i}>{i}</Tag>
          ))}
          {p.languages.map((l) => (
            <Tag key={l}>Speaks {languageName(l)}</Tag>
          ))}
        </div>
      </div>
      {p.provider && (
        <Link href={`/people/${p.id}#book`} className="surface block rounded-[28px] p-6 transition-colors hover:bg-char">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Offers experiences</h2>
            <Stars value={p.provider.rating.average} count={p.provider.rating.count} />
          </div>
          <p className="mt-2 text-sm text-mute">{catNames.join(" · ")}</p>
          <div className="mt-5 flex items-center justify-between">
            <PriceLine provider={p.provider} className="text-[15px]" />
            <span className="rounded-full bg-cream px-4 py-2 text-sm font-semibold text-ink">See rates</span>
          </div>
        </Link>
      )}
    </aside>
  );
}
