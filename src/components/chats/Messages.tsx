"use client";
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  Calendar03Icon,
  Clock01Icon,
  Flag02Icon,
  LockIcon,
  Message01Icon,
  MoreVerticalIcon,
  Search01Icon,
  SentIcon,
  Shield01Icon,
  Tick02Icon,
  TickDouble02Icon,
  UserBlock01Icon,
  UserCircleIcon,
  UserRemove01Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useConfirm } from "@/components/Confirm";
import ReportDialog from "@/components/people/ReportDialog";
import { useSession } from "@/components/Providers";
import { Avatar, buttonClass, cx, DevNote, EmptyState, ErrorState, Icon, IconButton, Skeleton, Verified } from "@/components/ui";
import { api } from "@/lib/api/client";
import { qk, useConnections, useMessages } from "@/lib/api/hooks";
import type { Connection, Message, MessageStatus } from "@/lib/api/types";
import { BOOKING_STATUS } from "@/lib/labels";
import { realtime } from "@/lib/realtime";

/* ---- time helpers -------------------------------------------------------- */

const DAY = 86_400_000;
const startOfDay = (t: number) => new Date(new Date(t).toDateString()).getTime();
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function dayLabel(iso: string, now: number) {
  const d = startOfDay(new Date(iso).getTime());
  const today = startOfDay(now);
  if (d === today) return "Today";
  if (d === today - DAY) return "Yesterday";
  if (today - d < 6 * DAY) return new Date(iso).toLocaleDateString("en-GB", { weekday: "long" });
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function listTime(iso: string, now: number) {
  const d = startOfDay(new Date(iso).getTime());
  const today = startOfDay(now);
  if (d === today) return clock(iso);
  if (d === today - DAY) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function lastSeen(iso: string | null, now: number) {
  if (!iso) return "offline";
  const label = dayLabel(iso, now);
  const day = label === "Today" ? "today" : label === "Yesterday" ? "yesterday" : `on ${new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
  return `last seen ${day} at ${clock(iso)}`;
}

/** Ties the optimistic bubble to the server's echo. */
const newClientId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const statusOf = (m: Message): MessageStatus => (m.id.startsWith("tmp-") ? "sending" : m.readAt ? "read" : m.deliveredAt ? "delivered" : "sent");

/** Notes from espenxa are stored with the actor's name; the actor reads "You". */
const noteText = (m: Message, mine: boolean) => (mine ? m.body.replace(/^.+? (requested|accepted|declined|suggested)/, "You $1") : m.body);

/* ---- list ---------------------------------------------------------------- */

type Filter = "all" | "unread" | "bookings";

export default function Messages({ activeId }: { activeId?: string }) {
  const conns = useConnections();
  const [now] = useState(() => Date.now());
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [typing, setTyping] = useState<Record<string, boolean>>({});
  const qc = useQueryClient();

  // Keep the list fresh while chats arrive, and show "typing..." in the list.
  useEffect(() => {
    const rt = realtime();
    const offs = [
      rt.on("message:new", () => qc.invalidateQueries({ queryKey: qk.connections })),
      rt.on("message:status", () => qc.invalidateQueries({ queryKey: qk.connections })),
      rt.on("typing", ({ connectionId, typing: t }) => setTyping((s) => ({ ...s, [connectionId]: t }))),
    ];
    return () => offs.forEach((off) => off());
  }, [qc]);

  const list = useMemo(() => {
    const all = [...(conns.data ?? [])].sort((a, b) => (b.lastMessage?.at ?? b.since).localeCompare(a.lastMessage?.at ?? a.since));
    return all.filter((c) => (filter === "unread" ? c.unread > 0 : filter === "bookings" ? !!c.booking || c.companion : true) && c.person.displayName.toLowerCase().includes(q.trim().toLowerCase()));
  }, [conns.data, filter, q]);
  const active = conns.data?.find((c) => c.id === activeId) ?? null;

  return (
    <div className={cx("grid min-h-120 grid-cols-[minmax(0,1fr)] gap-4 lg:h-[calc(100dvh-7rem)] lg:grid-cols-[360px_minmax(0,1fr)]", activeId ? "h-[calc(100dvh-8.5rem)]" : "h-[calc(100dvh-11rem)]")}>
      <aside className={cx("surface flex min-h-0 flex-col overflow-hidden rounded-card", activeId && "hidden lg:flex")}>
        <div className="px-5 pt-5">
          <h1 className="display text-[28px]">Chats</h1>
          <label className="mt-4 flex h-11 items-center gap-2.5 rounded-full bg-char px-4 text-mute focus-within:ring-2 focus-within:ring-cream/20">
            <Icon icon={Search01Icon} size={17} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" aria-label="Search chats" className="h-full min-w-0 flex-1 bg-transparent text-[14.5px] text-cream placeholder:text-faint focus:outline-none" />
          </label>
          <div className="mt-3 flex gap-1.5 pb-3">
            {(
              [
                ["all", "All"],
                ["unread", "Unread"],
                ["bookings", "Bookings"],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setFilter(id)} aria-pressed={filter === id} className={cx("h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors", filter === id ? "bg-cream text-ink" : "bg-char text-mute hover:text-cream")}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {conns.isPending ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-17" />
              ))}
            </div>
          ) : conns.isError ? (
            <ErrorState error={conns.error} retry={() => conns.refetch()} />
          ) : !conns.data.length ? (
            <EmptyState icon={Message01Icon} title="No chats yet" body="Message a companion to plan a booking, or match with someone to start chatting." action={<Link href="/discover" className={buttonClass("primary", "md")}>Find people</Link>} />
          ) : !list.length ? (
            <p className="px-4 py-10 text-center text-sm text-mute">No chats here.</p>
          ) : (
            <ul>
              {list.map((c) => (
                <li key={c.id}>
                  <ChatRow c={c} on={c.id === activeId} typing={!!typing[c.id]} now={now} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <section className={cx("surface min-h-0 overflow-hidden rounded-card", !activeId && "hidden lg:block")}>
        {active ? (
          <Thread key={active.id} c={active} />
        ) : activeId && conns.data ? (
          <div className="grid h-full place-items-center">
            <EmptyState icon={Message01Icon} title="Chat not found" body="It may have ended. Pick another chat." />
          </div>
        ) : (
          <div className="chat-wallpaper grid h-full place-items-center p-8 text-center">
            <div className="max-w-sm">
              <span className="mx-auto grid size-20 place-items-center rounded-full bg-char text-mute">
                <Icon icon={Message01Icon} size={34} />
              </span>
              <h2 className="display mt-6 text-2xl">Your chats</h2>
              <p className="mt-2 text-[14.5px] leading-relaxed text-mute">Pick a chat on the left. With a companion, agree on the time, place and plan here first. You only pay once they accept.</p>
              <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-faint">
                <Icon icon={LockIcon} size={13} /> Only you and the other person can read your chats.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ChatRow({ c, on, typing, now }: { c: Connection; on: boolean; typing: boolean; now: number }) {
  const last = c.lastMessage;
  return (
    <Link href={`/chats/${c.id}`} className={cx("relative flex items-center gap-3 rounded-[10px] px-3 py-3 transition-colors", on ? "" : "hover:bg-char/60")}>
      {on && <motion.span layoutId="chat-active" className="absolute inset-0 rounded-[10px] bg-char" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
      <span className="relative shrink-0">
        <Avatar src={c.person.photo} name={c.person.displayName} size={52} />
        {c.presence.online && <span className="absolute right-0.5 bottom-0.5 size-3.5 rounded-full border-[2.5px] border-coal bg-ok" aria-label="Online" />}
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate font-semibold">{c.person.displayName}</span>
            {c.person.verified && <Verified size={14} />}
            {c.companion && <span className="shrink-0 rounded-full bg-ember/14 px-2 py-0.5 text-[10.5px] font-semibold text-ember-hi">Companion</span>}
          </span>
          <span className={cx("shrink-0 text-[11.5px]", c.unread ? "font-semibold text-ember" : "text-faint")}>{listTime(last?.at ?? c.since, now)}</span>
        </span>
        <span className="mt-1 flex items-center justify-between gap-2">
          <span className={cx("flex min-w-0 items-center gap-1 text-[13.5px]", c.unread ? "text-cream" : "text-mute")}>
            {typing ? (
              <span className="font-medium text-ember">typing...</span>
            ) : !last ? (
              <span className="truncate">{c.companion ? "Say hello and plan your booking" : "You matched. Say hello!"}</span>
            ) : last.kind === "system" ? (
              <>
                <Icon icon={Calendar03Icon} size={14} className="shrink-0" />
                <span className="truncate">{last.body}</span>
              </>
            ) : (
              <>
                {last.fromMe && <Ticks status={last.status} />}
                <span className="truncate">{last.body}</span>
              </>
            )}
          </span>
          {!!c.unread && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-ember px-1.5 text-[11px] font-bold text-ink">{c.unread}</span>}
        </span>
      </span>
    </Link>
  );
}

function Ticks({ status, className }: { status: MessageStatus; className?: string }) {
  const label = { sending: "Sending", sent: "Sent", delivered: "Delivered", read: "Read" }[status];
  return (
    <span role="img" aria-label={label} title={label} className={cx("inline-flex shrink-0", status === "read" ? "text-[#53bdeb]" : "text-faint", className)}>
      <Icon icon={status === "sending" ? Clock01Icon : status === "sent" ? Tick02Icon : TickDouble02Icon} size={status === "sending" ? 12 : 16} stroke={2} />
    </span>
  );
}

/* ---- conversation -------------------------------------------------------- */

function Thread({ c }: { c: Connection }) {
  const { account } = useSession();
  const me = account?.id;
  const msgs = useMessages(c.id);
  const qc = useQueryClient();
  const router = useRouter();
  const confirm = useConfirm();
  const [openedAt] = useState(() => new Date().toISOString());
  const [now] = useState(() => Date.now());
  const [unreadAtOpen] = useState(c.unread);
  const [text, setText] = useState("");
  const [menu, setMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [presence, setPresence] = useState(c.presence);
  const [atBottom, setAtBottom] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);
  const scroller = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rt = realtime();

  // Live events for this chat.
  useEffect(() => {
    const live = realtime();
    live.join(c.id);
    const offs = [
      live.on("message:new", ({ connectionId, message }) => {
        if (connectionId !== c.id) return;
        qc.setQueryData<Message[]>(qk.messages(c.id), (old = []) => (old.some((m) => m.id === message.id) ? old : [...old, message]));
        if (message.senderId !== me) {
          setPeerTyping(false);
          api.social.markRead(c.id).then(() => qc.invalidateQueries({ queryKey: qk.connections }));
          live.read(c.id);
        }
      }),
      live.on("message:status", ({ connectionId, messageIds, status }) => {
        if (connectionId !== c.id) return;
        const at = new Date().toISOString();
        qc.setQueryData<Message[]>(qk.messages(c.id), (old = []) => old.map((m) => (messageIds.includes(m.id) ? { ...m, deliveredAt: m.deliveredAt ?? at, readAt: status === "read" ? (m.readAt ?? at) : m.readAt } : m)));
      }),
      live.on("typing", ({ connectionId, userId, typing }) => {
        if (connectionId === c.id && userId === c.person.id) setPeerTyping(typing);
      }),
      live.on("presence", (p) => {
        if (p.userId === c.person.id) setPresence({ online: p.online, lastSeen: p.lastSeen });
      }),
    ];
    return () => {
      offs.forEach((off) => off());
      live.leave(c.id);
    };
  }, [c.id, c.person.id, me, qc]);

  // Opening the chat reads it.
  useEffect(() => {
    if (!c.unread) return;
    api.social.markRead(c.id).then(() => qc.invalidateQueries({ queryKey: qk.connections }));
    realtime().read(c.id);
  }, [c.id, c.unread, qc]);

  // Land at the bottom on open, and follow new messages while at the bottom.
  const count = msgs.data?.length ?? 0;
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.isSuccess]);
  useEffect(() => {
    const el = scroller.current;
    if (el && atBottom) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- follow only on new content
  }, [count, peerTyping]);

  function onType(v: string) {
    setText(v);
    if (!typingTimer.current) rt.typing(c.id, true);
    else clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      rt.typing(c.id, false);
      typingTimer.current = null;
    }, 2500);
  }

  async function send(body: string, retryOf?: string) {
    if (!body || !me) return;
    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
      typingTimer.current = null;
      rt.typing(c.id, false);
    }
    const clientId = retryOf ?? newClientId();
    setFailed((f) => f.filter((x) => x !== clientId));
    const temp: Message = { id: `tmp-${clientId}`, senderId: me, body, at: new Date().toISOString(), deliveredAt: null, readAt: null, kind: "text", clientId };
    qc.setQueryData<Message[]>(qk.messages(c.id), (old = []) => [...old.filter((m) => m.clientId !== clientId), temp]);
    setAtBottom(true);
    try {
      const saved = await api.social.send(c.id, body, clientId);
      qc.setQueryData<Message[]>(qk.messages(c.id), (old = []) => old.map((m) => (m.clientId === clientId ? { ...saved, clientId } : m)));
      rt.sent(c.id, saved);
    } catch {
      setFailed((f) => [...f, clientId]);
    } finally {
      qc.invalidateQueries({ queryKey: qk.connections });
    }
  }

  async function endChat(kind: "unmatch" | "block") {
    setMenu(false);
    const ok = await confirm(
      kind === "unmatch"
        ? { title: `End your chat with ${c.person.displayName}?`, body: "The chat closes for both of you and you will not be able to message each other again. This cannot be undone.", confirmLabel: "End chat", tone: "danger" }
        : { title: `Block ${c.person.displayName}?`, body: `${c.person.displayName} will no longer see you or be able to message you. They are not told.`, confirmLabel: "Block", tone: "danger" },
    );
    if (!ok) return;
    if (kind === "unmatch") await api.social.unmatch(c.id);
    else await api.safety.block(c.person.id);
    await qc.invalidateQueries({ queryKey: qk.connections });
    router.replace("/chats");
  }

  const groups = (msgs.data ?? []).reduce<{ day: string; items: Message[] }[]>((acc, m) => {
    const day = dayLabel(m.at, now);
    const last = acc[acc.length - 1];
    if (last?.day === day) last.items.push(m);
    else acc.push({ day, items: [m] });
    return acc;
  }, []);
  // Where the "unread" divider goes: before the first of the messages that were unread when you opened the chat.
  const incoming = (msgs.data ?? []).filter((m) => m.senderId !== me && m.kind === "text" && m.at <= openedAt);
  const firstUnread = unreadAtOpen ? incoming[incoming.length - unreadAtOpen]?.id : undefined;

  const status = peerTyping ? "typing..." : presence.online ? "online" : lastSeen(presence.lastSeen, now);

  return (
    <div className="flex h-full flex-col">
      <header className="relative z-10 flex items-center gap-2 border-b border-line bg-coal/80 px-3 py-2.5 backdrop-blur-xl sm:px-4">
        <IconButton icon={ArrowLeft01Icon} label="Back to chats" onClick={() => router.push("/chats")} className="lg:hidden" />
        <Link href={`/people/${c.person.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-full py-1 pr-2">
          <Avatar src={c.person.photo} name={c.person.displayName} size={44} />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 font-semibold">
              <span className="truncate">{c.person.displayName}</span> {c.person.verified && <Verified size={15} />}
            </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={status} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }} className={cx("block truncate text-xs", peerTyping ? "font-medium text-ember" : presence.online ? "text-ok" : "text-mute")}>
                {status}
              </motion.span>
            </AnimatePresence>
          </span>
        </Link>
        {c.companion && !c.booking && account && (
          <Link href={`/book/${c.person.id}`} className={buttonClass("accent", "sm", "hidden sm:inline-flex")}>
            <Icon icon={Calendar03Icon} size={16} stroke={2} /> Book
          </Link>
        )}
        <div className="relative">
          <IconButton icon={MoreVerticalIcon} label="Chat options" onClick={() => setMenu((m) => !m)} />
          <AnimatePresence>
            {menu && (
              <motion.div initial={{ opacity: 0, scale: 0.95, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-dark absolute top-12 right-0 z-20 w-56 rounded-2xl p-1.5 text-sm">
                <Link href={`/people/${c.person.id}`} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-cream/85/10">
                  <Icon icon={UserCircleIcon} size={16} /> View profile
                </Link>
                {c.booking && (
                  <Link href={`/bookings/${c.booking.id}`} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-cream/85/10">
                    <Icon icon={Calendar03Icon} size={16} /> View booking
                  </Link>
                )}
                <button type="button" onClick={() => (setMenu(false), setReporting(true))} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-cream/85/10">
                  <Icon icon={Flag02Icon} size={16} /> Report
                </button>
                {!c.booking && (
                  <button type="button" onClick={() => endChat("unmatch")} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-cream/85/10">
                    <Icon icon={UserRemove01Icon} size={16} /> End chat
                  </button>
                )}
                <button type="button" onClick={() => endChat("block")} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-bad hover:bg-cream/85/10">
                  <Icon icon={UserBlock01Icon} size={16} /> Block
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <PlanBar c={c} />

      <div className="relative min-h-0 flex-1">
        <div
          ref={scroller}
          onScroll={(e) => {
            const el = e.currentTarget;
            setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
          }}
          className="chat-wallpaper no-scrollbar h-full overflow-y-auto px-3 py-4 sm:px-8"
        >
          <p className="mx-auto mb-3 flex max-w-md items-start gap-2 rounded-xl bg-[#fbf1dc] px-3.5 py-2.5 text-center text-[12px] leading-relaxed text-[#7a5410]">
            <Icon icon={Shield01Icon} size={15} className="mt-px shrink-0" />
            <span>Keep chats and payments on espenxa. Never send money directly or share your home address before you meet.</span>
          </p>
          {rt.simulated && (
            <div className="mx-auto mb-3 max-w-md">
              <DevNote>The chat server is not connected yet, so the other side of this chat is simulated.</DevNote>
            </div>
          )}

          {msgs.isPending ? (
            <div className="space-y-3 pt-4">
              <Skeleton className="h-11 w-1/2" />
              <Skeleton className="ml-auto h-11 w-2/5" />
              <Skeleton className="h-11 w-1/3" />
            </div>
          ) : msgs.isError ? (
            <ErrorState error={msgs.error} retry={() => msgs.refetch()} />
          ) : (
            groups.map((g) => (
              <div key={g.day}>
                <div className="sticky top-1 z-1 my-3 flex justify-center">
                  <span className="rounded-lg bg-char/95 px-3 py-1 text-[11.5px] font-medium text-mute shadow-sm backdrop-blur">{g.day}</span>
                </div>
                {g.items.map((m, i) => {
                  const mine = m.senderId === me;
                  const prev = g.items[i - 1];
                  const first = !prev || prev.senderId !== m.senderId || prev.kind !== m.kind;
                  return (
                    <div key={m.clientId ?? m.id}>
                      {m.id === firstUnread && (
                        <div className="my-3 flex justify-center">
                          <span className="rounded-full bg-cream/90 px-3 py-1 text-[11.5px] font-semibold text-ink">
                            {unreadAtOpen} unread {unreadAtOpen === 1 ? "message" : "messages"}
                          </span>
                        </div>
                      )}
                      {m.kind === "system" ? (
                        <BookingNote m={m} mine={mine} />
                      ) : (
                        <Bubble m={m} mine={mine} first={first} fresh={m.at > openedAt} failed={!!m.clientId && failed.includes(m.clientId)} onRetry={() => send(m.body, m.clientId)} />
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <AnimatePresence>{peerTyping && <TypingBubble key="typing" />}</AnimatePresence>
        </div>

        <AnimatePresence>
          {!atBottom && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" })}
              aria-label="Go to the latest message"
              className="glass-dark absolute right-4 bottom-4 grid size-11 place-items-center rounded-full text-cream shadow-lg"
            >
              <Icon icon={ArrowDown01Icon} size={20} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <Composer value={text} onChange={onType} onSend={() => { const body = text.trim(); setText(""); send(body); }} name={c.person.displayName} />
      {reporting && <ReportDialog person={{ id: c.person.id, displayName: c.person.displayName }} open onClose={() => setReporting(false)} />}
    </div>
  );
}

/** What happens next with this person, in plain words. */
function PlanBar({ c }: { c: Connection }) {
  const name = c.person.displayName;
  const b = c.booking;
  if (!b) {
    if (!c.companion) return null;
    return (
      <div className="flex items-center gap-3 border-b border-line bg-char/60 px-4 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ember/15 text-ember">
          <Icon icon={Calendar03Icon} size={18} />
        </span>
        <p className="min-w-0 flex-1 text-[13px] leading-snug text-mute">
          <b className="font-semibold text-cream">Plan first, pay later.</b> Agree with {name} on the day, time and place here. You only pay after {name} accepts your booking.
        </p>
        <Link href={`/book/${c.person.id}`} className={buttonClass("accent", "sm", "shrink-0 sm:hidden")}>
          Book
        </Link>
      </div>
    );
  }
  const customer = b.role === "customer";
  const s = b.status;
  const next =
    s === "requested"
      ? customer
        ? `Waiting for ${name} to accept. Agree on the details here meanwhile.`
        : `${name} wants to book you. Agree on the details, then answer the request.`
      : s === "adjustment_proposed"
        ? "A change to the booking was suggested. Take a look."
        : s === "accepted"
          ? customer
            ? `${name} accepted. Pay to confirm the booking.`
            : `You accepted. Waiting for ${name} to pay.`
          : s === "confirmed"
            ? "Booked and paid. Enjoy your time together."
            : s === "in_progress"
              ? "Happening now."
              : s === "provider_completed"
                ? customer
                  ? `${name} marked it as finished. Please confirm.`
                  : `Waiting for ${name} to confirm it finished.`
                : "This booking is being reviewed by espenxa.";
  const action =
    s === "accepted" && customer ? (
      <Link href={`/checkout/${b.id}`} className={buttonClass("accent", "sm", "shrink-0")}>
        <Icon icon={Wallet01Icon} size={15} stroke={2} /> Pay now
      </Link>
    ) : (
      <Link href={`/bookings/${b.id}`} className={buttonClass(s === "requested" && !customer ? "primary" : "secondary", "sm", "shrink-0")}>
        {s === "requested" && !customer ? "Answer" : "View"}
      </Link>
    );
  const tone = BOOKING_STATUS[s].tone;
  return (
    <div className="flex items-center gap-3 border-b border-line bg-char/60 px-4 py-3">
      <span className={cx("grid size-9 shrink-0 place-items-center rounded-full", tone === "ok" ? "bg-ok/15 text-ok" : tone === "bad" ? "bg-bad/15 text-bad" : tone === "info" ? "bg-info/15 text-info" : "bg-warn/15 text-warn")}>
        <Icon icon={Calendar03Icon} size={18} />
      </span>
      <p className="min-w-0 flex-1 text-[13px] leading-snug text-mute">
        <b className="font-semibold text-cream">{customer ? `You booked ${name}` : `${name} booked you`}</b>
        <span className="text-faint"> · {b.reference}</span>
        <span className="block">{next}</span>
      </p>
      {action}
    </div>
  );
}

function Bubble({ m, mine, first, fresh, failed, onRetry }: { m: Message; mine: boolean; first: boolean; fresh: boolean; failed: boolean; onRetry: () => void }) {
  return (
    <motion.div
      initial={fresh ? { opacity: 0, y: 10, scale: 0.97 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 460, damping: 32 }}
      className={cx("flex", mine ? "justify-end" : "justify-start", first ? "mt-2.5" : "mt-0.5")}
    >
      <div
        className={cx(
          "relative max-w-[82%] rounded-[14px] px-3 pt-1.5 pb-2 text-[15px] leading-[1.4] shadow-[0_1px_0.5px_rgb(0_0_0/0.25)] sm:max-w-[65%]",
          mine ? "bg-bubble-mine text-cream" : "bg-smoke text-cream",
          first && (mine ? "rounded-tr-none" : "rounded-tl-none"),
        )}
      >
        {first && (
          <svg viewBox="0 0 8 13" aria-hidden className={cx("absolute top-0 h-3.25 w-2", mine ? "-right-2 -scale-x-100 text-bubble-mine" : "-left-2 text-smoke")} fill="currentColor">
            <path d="M8 0H1.53C.33 0-.37 1.36.33 2.33L8 13z" />
          </svg>
        )}
        <span className="wrap-break-word whitespace-pre-wrap">{m.body}</span>
        <span className={cx("inline-block align-bottom", mine ? "w-16" : "w-11")} aria-hidden />
        <span className="absolute right-2.5 bottom-1 flex items-center gap-1 text-[11px] text-cream/55">
          {clock(m.at)}
          {mine && <Ticks status={statusOf(m)} />}
        </span>
      </div>
      {failed && (
        <button type="button" onClick={onRetry} className="ml-2 self-center text-xs font-medium text-bad hover:underline">
          Not sent. Tap to retry
        </button>
      )}
    </motion.div>
  );
}

function BookingNote({ m, mine }: { m: Message; mine: boolean }) {
  return (
    <div className="my-3 flex justify-center">
      <div className="flex max-w-[88%] items-start gap-2.5 rounded-2xl bg-char/95 px-4 py-2.5 text-[13px] leading-snug text-cream/85 sm:max-w-md">
        <Icon icon={Calendar03Icon} size={16} className="mt-px shrink-0 text-ember" />
        <span>
          {noteText(m, mine)}
          {m.bookingId && (
            <Link href={`/bookings/${m.bookingId}`} className="ml-1.5 font-semibold text-ember-hi hover:underline">
              View booking
            </Link>
          )}
          <span className="ml-2 text-[11px] text-faint">{clock(m.at)}</span>
        </span>
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="mt-2.5 flex" aria-live="polite" aria-label="Typing">
      <div className="relative flex h-9.5 items-center gap-1 rounded-[14px] rounded-tl-none bg-smoke px-4">
        <svg viewBox="0 0 8 13" aria-hidden className="absolute top-0 -left-2 h-3.25 w-2 text-smoke" fill="currentColor">
          <path d="M8 0H1.53C.33 0-.37 1.36.33 2.33L8 13z" />
        </svg>
        {[0, 1, 2].map((i) => (
          // Functional status indicator: runs only while the other person is typing.
          <motion.span key={i} className="size-1.75 rounded-full bg-cream/60" animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.16 }} />
        ))}
      </div>
    </motion.div>
  );
}

function Composer({ value, onChange, onSend, name }: { value: string; onChange: (v: string) => void; onSend: () => void; name: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const can = !!value.trim();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [value]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (can) onSend();
      }}
      className="flex items-end gap-2 border-t border-line bg-coal/80 p-2.5 sm:p-3"
    >
      <label className="flex min-h-12 flex-1 items-center rounded-[10px] bg-char px-4 py-2.5">
        <textarea
          ref={ref}
          rows={1}
          aria-label={`Message ${name}`}
          placeholder="Type a message"
          maxLength={2000}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (can) onSend();
            }
          }}
          className="no-scrollbar max-h-35 w-full resize-none bg-transparent text-[15px] leading-[1.45] text-cream placeholder:text-faint focus:outline-none"
        />
      </label>
      <motion.button type="submit" whileTap={{ scale: 0.88 }} disabled={!can} aria-label="Send" className="grid size-12 shrink-0 place-items-center rounded-full bg-ember text-ink transition-opacity disabled:opacity-40">
        <Icon icon={SentIcon} size={20} stroke={2} />
      </motion.button>
    </form>
  );
}
