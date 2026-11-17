"use client";

/*
 * Someone else's profile. Social actions (like, connect, message) and the
 * booking card are deliberately separate: connecting never implies booking.
 */
import {
  ArrowLeft01Icon,
  ArrowUp01Icon,
  Bookmark02Icon,
  Calendar03Icon,
  Clock01Icon,
  FavouriteIcon,
  Flag02Icon,
  Location01Icon,
  Message01Icon,
  MoreVerticalIcon,
  UserAdd01Icon,
  UserBlock01Icon,
} from "@hugeicons/core-free-icons";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useConfirm } from "@/components/Confirm";
import Flag from "@/components/Flag";
import { buttonClass, cx, ErrorState, Icon, IconButton, LivePill, Photo, RankBadge, Skeleton, Stars, Tag, Verified, Avatar } from "@/components/ui";
import { api } from "@/lib/api/client";
import { qk, useCategories, usePerson, useReviews } from "@/lib/api/hooks";
import { DURATIONS, type Profile } from "@/lib/api/types";
import { countryByCode } from "@/lib/countries";
import { distance, hoursLabel, money, timeAgo } from "@/lib/format";
import { arrangementLabel, genderLabel, intentionLabel, languageName } from "@/lib/labels";
import { ConnectDialog, MatchDialog } from "./bits";
import ReportDialog from "./ReportDialog";
import ChatButton from "@/components/chats/ChatButton";

export default function PersonProfile({ id }: { id: string }) {
  const person = usePerson(id);
  if (person.isPending)
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,460px)_1fr]">
        <Skeleton className="aspect-[3/4] rounded-[36px]" />
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-56" />
        </div>
      </div>
    );
  if (person.isError) return <ErrorState error={person.error} retry={() => person.refetch()} />;
  return <Loaded p={person.data} />;
}

function Loaded({ p }: { p: Profile }) {
  const router = useRouter();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [photo, setPhoto] = useState(0);
  const [bioOpen, setBioOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [match, setMatch] = useState<string | null>(null);
  const [liked, setLiked] = useState(p.viewer.liked);
  const [saved, setSaved] = useState(p.viewer.saved);
  const c = countryByCode(p.country);
  const refresh = () => qc.invalidateQueries({ queryKey: qk.person(p.id) });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,460px)_1fr] lg:gap-8">
      <div className="space-y-3 lg:sticky lg:top-8 lg:self-start">
        <div className="relative overflow-hidden rounded-[36px] bg-char ring-1 ring-white/10">
          <Photo src={p.photos[photo] ?? p.photos[0]} alt={`${p.displayName}, photo ${photo + 1}`} className="aspect-[3/4] w-full" />
          <div className="photo-shade absolute inset-0" />
          <div className="absolute inset-x-4 top-4 flex items-center justify-between">
            <IconButton icon={ArrowLeft01Icon} label="Back" tone="glass" onClick={() => router.back()} />
            <div className="relative flex gap-2">
              <IconButton
                icon={Bookmark02Icon}
                label={saved ? "Saved" : "Save"}
                tone={saved ? "white" : "glass"}
                onClick={async () => {
                  setSaved(await api.discovery.toggleSave(p.id));
                  qc.invalidateQueries({ queryKey: qk.saved });
                }}
              />
              <IconButton icon={MoreVerticalIcon} label="More options" tone="glass" onClick={() => setMenu((m) => !m)} />
              {menu && (
                <div className="glass-dark absolute top-12 right-0 z-10 w-48 overflow-hidden rounded-2xl p-1.5 text-sm">
                  <button type="button" onClick={() => { setMenu(false); setReporting(true); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-white/10">
                    <Icon icon={Flag02Icon} size={16} /> Report
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setMenu(false);
                      const ok = await confirm({ title: `Block ${p.displayName}?`, body: `${p.displayName} will no longer see you or be able to message you, and any connection between you ends. They are not told.`, confirmLabel: "Block", tone: "danger" });
                      if (!ok) return;
                      await api.safety.block(p.id);
                      qc.invalidateQueries({ queryKey: ["discovery"] });
                      router.replace("/discover");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-bad hover:bg-white/10"
                  >
                    <Icon icon={UserBlock01Icon} size={16} /> Block
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="absolute inset-x-4 bottom-4">
            <p className="flex items-center gap-1.5 text-[13px] text-white/85">
              <Icon icon={Location01Icon} size={14} />
              {[p.city, c?.name].filter(Boolean).join(", ")}
              {distance(p.distanceKm) && <span className="text-white/60">· {distance(p.distanceKm)}</span>}
            </p>
            <p className="mt-1.5 flex items-center gap-2 text-[38px] leading-none font-semibold tracking-tight">
              {p.displayName}
              {p.age !== null && <span className="font-light text-white/70">{p.age}</span>}
              {p.verified && <Verified size={28} />}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.activeRecently && <LivePill />}
              {p.provider && <RankBadge rank={p.provider.rank} size="sm" className="glass-dark" />}
            </div>
            <button type="button" onClick={() => setBioOpen((o) => !o)} aria-expanded={bioOpen} className="glass mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-medium lg:hidden">
              <Icon icon={ArrowUp01Icon} size={16} className={bioOpen ? "" : "rotate-180"} /> {bioOpen ? "Less biography" : "More biography"}
            </button>
          </div>
        </div>
        {p.photos.length > 1 && (
          <div className="grid grid-cols-4 gap-2.5">
            {p.photos.map((src, i) => (
              <button key={i} type="button" onClick={() => setPhoto(i)} aria-label={`Show photo ${i + 1}`} className={cx("overflow-hidden rounded-[18px] ring-2 transition", i === photo ? "ring-cream" : "ring-transparent opacity-70 hover:opacity-100")}>
                <Photo src={src} alt="" className="aspect-square w-full" />
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2.5">
          <button
            type="button"
            aria-pressed={liked}
            onClick={async () => {
              if (liked) return;
              setLiked(true);
              const r = await api.discovery.like(p.id).catch(() => null);
              if (r?.matched) {
                setMatch(r.connectionId);
                refresh();
                qc.invalidateQueries({ queryKey: qk.connections });
              }
            }}
            className={cx("flex h-14 flex-1 items-center justify-center gap-2 rounded-full font-semibold transition-all active:scale-[0.98]", liked ? "bg-char text-ember" : "bg-ember text-ink hover:bg-ember-hi")}
          >
            <Icon icon={FavouriteIcon} size={20} stroke={2.4} /> {liked ? "Liked" : "Like"}
          </button>
          {p.viewer.connectionId ? (
            <Link href={`/chats/${p.viewer.connectionId}`} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-cream font-semibold text-ink hover:bg-white">
              <Icon icon={Message01Icon} size={20} stroke={2} /> Message
            </Link>
          ) : p.provider ? (
            <ChatButton personId={p.id} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-cream font-semibold text-ink hover:bg-white">
              Message
            </ChatButton>
          ) : (
            <button
              type="button"
              disabled={!!p.viewer.requestPending}
              onClick={() => setConnecting(true)}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-cream font-semibold text-ink hover:bg-white disabled:bg-char disabled:text-mute"
            >
              <Icon icon={UserAdd01Icon} size={20} stroke={2} /> {p.viewer.requestPending === "sent" ? "Request sent" : p.viewer.requestPending === "received" ? "Wants to connect" : "Connect"}
            </button>
          )}
        </div>
      </div>

      <div className={cx("space-y-4", !bioOpen && "max-lg:[&>.bio-only]:hidden")}>
        <section className="surface bio-only rounded-[28px] p-6">
          <h2 className="text-lg font-semibold">About me</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-cream/80">{p.bio || `${p.displayName} has not written a bio yet.`}</p>
        </section>

        <section className="surface bio-only rounded-[28px] p-6">
          <h2 className="text-lg font-semibold">More info</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Tag>{genderLabel(p.gender)}</Tag>
            {c && (
              <Tag>
                <Flag code={c.code} className="h-3 w-4.5" /> {c.name}
              </Tag>
            )}
            {p.intentions.map((i) => (
              <Tag key={i} className="bg-ember/12 text-ember-hi">
                {intentionLabel(i)}
              </Tag>
            ))}
            {p.languages.map((l) => (
              <Tag key={l}>Speaks {languageName(l)}</Tag>
            ))}
          </div>
          {!![...p.interests, ...p.hobbies].length && (
            <>
              <h3 className="mt-6 text-sm font-medium text-mute">Into</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {[...p.interests, ...p.hobbies].map((i) => (
                  <Tag key={i}>{i}</Tag>
                ))}
              </div>
            </>
          )}
        </section>

        {p.provider && <BookingCard p={p} />}
        {p.provider && <Reviews id={p.id} />}
      </div>

      {connecting && <ConnectDialog person={p} open onClose={() => setConnecting(false)} onSent={refresh} />}
      {reporting && <ReportDialog person={p} open onClose={() => setReporting(false)} />}
      <MatchDialog person={match ? p : null} connectionId={match} onClose={() => setMatch(null)} />
    </div>
  );
}

function BookingCard({ p }: { p: Profile }) {
  const cats = useCategories();
  const pr = p.provider!;
  const offered = pr.categories.map((id) => cats.data?.find((c) => c.id === id)).filter(Boolean);
  return (
    <section id="book" className="scroll-mt-6 overflow-hidden rounded-[28px] bg-cream text-ink">
      <div className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Book an experience</h2>
            <p className="mt-0.5 text-sm text-ink/60">
              {arrangementLabel(pr.arrangement)} · {pr.completedBookings} completed {pr.completedBookings === 1 ? "booking" : "bookings"}
              {pr.responseMinutes ? ` · replies in about ${pr.responseMinutes} min` : ""}
            </p>
          </div>
          <span className="flex items-center gap-2">
            <RankBadge rank={pr.rank} className="bg-ink!" />
            <Stars value={pr.rating.average} count={pr.rating.count} />
          </span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {offered.map((c) => (
            <span key={c!.id} className="rounded-full bg-ink/7 px-3.5 py-2 text-[13px] font-medium">
              {c!.name}
            </span>
          ))}
        </div>

        {pr.arrangement !== "free" && (
          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {DURATIONS.map((h) => {
              const r = pr.rates.find((x) => x.hours === h);
              const on = r?.enabled && r.price;
              return (
                <li key={h} className={cx("flex items-center justify-between rounded-2xl px-4 py-3.5", on ? "bg-ink/6" : "bg-ink/3 text-ink/35")}>
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Icon icon={Clock01Icon} size={16} /> {hoursLabel(h)}
                  </span>
                  <span className="text-[17px] font-semibold tabular">{on ? money(r!.price) : "Not offered"}</span>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-5 space-y-1.5 text-[13px] text-ink/65">
          <p className="flex items-center gap-2">
            <Icon icon={Calendar03Icon} size={15} /> {pr.availabilitySummary}
          </p>
          {pr.negotiable && <p>Rates are open to discussion before you confirm.</p>}
          {pr.expensesNote && <p>Extra costs, agreed in advance: {pr.expensesNote}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 bg-ink/5 px-6 py-4">
        <p className="max-w-sm text-xs leading-relaxed text-ink/55">Chat with {p.displayName} first to agree on the day, time and place. You pay through Meet only after {p.displayName} accepts. A booking is for time and company, never physical contact.</p>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          {p.viewer.connectionId ? (
            <Link href={`/chats/${p.viewer.connectionId}`} className={buttonClass("secondary", "lg", "!bg-ink !text-cream")}>
              Chat first
            </Link>
          ) : (
            <ChatButton personId={p.id} className={buttonClass("secondary", "lg", "!bg-ink !text-cream")}>
              Chat first
            </ChatButton>
          )}
          <Link href={`/book/${p.id}`} className={buttonClass("accent", "lg", "max-sm:px-4")}>
            Book now
          </Link>
        </div>
      </div>
    </section>
  );
}

function Reviews({ id }: { id: string }) {
  const reviews = useReviews(id);
  if (!reviews.data?.length) return null;
  return (
    <section className="surface rounded-[28px] p-6">
      <h2 className="text-lg font-semibold">Reviews</h2>
      <ul className="mt-5 space-y-6">
        {reviews.data.map((r) => (
          <li key={r.id}>
            <div className="flex items-center gap-3">
              <Avatar src={r.author.photo} name={r.author.displayName} size={40} />
              <div className="flex-1">
                <p className="text-sm font-semibold">{r.author.displayName}</p>
                <p className="text-xs text-mute">{timeAgo(r.at)}</p>
              </div>
              <Stars value={r.rating} />
            </div>
            <p className="mt-3 text-[14.5px] leading-relaxed text-cream/80">{r.body}</p>
            {r.response && <p className="mt-3 rounded-2xl bg-char p-3.5 text-[13px] text-mute">Reply: {r.response}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
