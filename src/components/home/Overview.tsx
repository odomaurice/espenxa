"use client";

/*
 * The top of Home: what needs you now, in plain words, then your numbers.
 * Companions see earnings; members see what they have spent and booked.
 */
import { ArrowRight01Icon, Calendar03Icon, CheckmarkCircle02Icon, Message01Icon, UserAdd01Icon, Wallet01Icon } from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { AreaChart, BarList, ChartCard } from "@/components/charts/Charts";
import { Stagger, StaggerItem } from "@/components/motion";
import { useSession } from "@/components/Providers";
import { Badge, cx, Icon, Skeleton } from "@/components/ui";
import { api } from "@/lib/api/client";
import { useBookings, useCategories, useConnections, useEarnings, useRequests } from "@/lib/api/hooks";
import type { Booking } from "@/lib/api/types";
import { dateTime, money, moneyCompact } from "@/lib/format";

const SPENT: Booking["status"][] = ["confirmed", "in_progress", "provider_completed", "completed", "disputed"];

/** What needs you now. */
export default function Overview() {
  const { account } = useSession();
  return <ToDo companion={!!account?.isProvider} />;
}

/** Your numbers: earnings for companions, spending for members. */
export function Numbers() {
  const { account } = useSession();
  return account?.isProvider ? <CompanionNumbers /> : <MemberNumbers />;
}

type Item = { href: string; icon: IconSvgElement; text: string; tone: "ember" | "info" | "ok"; cta: string };

function ToDo({ companion }: { companion: boolean }) {
  const conns = useConnections();
  const mine = useBookings("customer");
  const theirs = useBookings("provider", companion);
  const requests = useRequests();
  const [now] = useState(() => Date.now());

  const items: Item[] = [];
  const toAnswer = (theirs.data ?? []).filter((b) => b.status === "requested" || (b.status === "adjustment_proposed" && b.proposal?.by === "customer"));
  toAnswer.forEach((b) => items.push({ href: `/bookings/${b.id}`, icon: Calendar03Icon, tone: "ember", cta: "Answer", text: `${b.customer.displayName} wants to book you on ${dateTime(b.startAt, b.timezone)}` }));
  (mine.data ?? [])
    .filter((b) => b.status === "accepted")
    .forEach((b) => items.push({ href: `/checkout/${b.id}`, icon: Wallet01Icon, tone: "ember", cta: "Pay", text: `${b.provider.displayName} accepted. Pay to confirm your booking` }));
  (mine.data ?? [])
    .filter((b) => b.status === "provider_completed")
    .forEach((b) => items.push({ href: `/bookings/${b.id}`, icon: CheckmarkCircle02Icon, tone: "info", cta: "Confirm", text: `Did your time with ${b.provider.displayName} go well? Confirm it finished` }));
  const unread = (conns.data ?? []).filter((c) => c.unread);
  if (unread.length) items.push({ href: unread.length === 1 ? `/chats/${unread[0].id}` : "/chats", icon: Message01Icon, tone: "info", cta: "Read", text: unread.length === 1 ? `New message from ${unread[0].person.displayName}` : `${unread.length} chats have new messages` });
  const incoming = (requests.data ?? []).filter((r) => r.direction === "incoming");
  if (incoming.length) items.push({ href: "/connections", icon: UserAdd01Icon, tone: "info", cta: "See", text: incoming.length === 1 ? `${incoming[0].person.displayName} wants to connect` : `${incoming.length} people want to connect` });
  const next = [...(mine.data ?? []), ...(theirs.data ?? [])].filter((b) => b.status === "confirmed" && new Date(b.startAt).getTime() > now).sort((a, b) => a.startAt.localeCompare(b.startAt))[0];
  if (next) {
    const other = next.role === "customer" ? next.provider : next.customer;
    items.push({ href: `/bookings/${next.id}`, icon: Calendar03Icon, tone: "ok", cta: "View", text: `Next: ${other.displayName}, ${dateTime(next.startAt, next.timezone)}, ${next.meetingArea}` });
  }

  const loading = conns.isPending || mine.isPending;
  return (
    <div className="surface rounded-[10px] p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">For you to do</h2>
        {!loading && !!items.length && <span className="text-sm text-mute">{items.length}</span>}
      </div>
      {loading ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : !items.length ? (
        <p className="mt-3 flex items-center gap-2 text-[15px] text-mute">
          <Icon icon={CheckmarkCircle02Icon} size={18} className="text-ok" /> You are all caught up.
        </p>
      ) : (
        <Stagger className="mt-4 space-y-2" inView={false} gap={0.05}>
          {items.slice(0, 5).map((it) => (
            <StaggerItem key={it.href + it.text}>
              <Link href={it.href} className="group flex items-center gap-3 rounded-[10px] bg-char p-3 pr-4 transition-colors hover:bg-smoke">
                <span className={cx("grid size-10 shrink-0 place-items-center rounded-full", it.tone === "ember" ? "bg-ember/15 text-ember" : it.tone === "ok" ? "bg-ok/15 text-ok" : "bg-info/15 text-info")}>
                  <Icon icon={it.icon} size={18} />
                </span>
                <span className="min-w-0 flex-1 text-[14.5px] leading-snug">{it.text}</span>
                <span className={cx("flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-semibold", it.tone === "ember" ? "bg-ember text-ink" : "bg-cream text-ink")}>
                  {it.cta} <Icon icon={ArrowRight01Icon} size={13} stroke={2.2} />
                </span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}

function CompanionNumbers() {
  const earn = useEarnings();
  const a = useQuery({ queryKey: ["provider", "analytics"], queryFn: api.provider.analytics });
  if (earn.isPending || a.isPending) return <Skeleton className="h-[340px] rounded-[10px]" />;
  if (!earn.data || !a.data) return null;
  const e = earn.data;
  const d = a.data;
  const label = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const total = d.weeks.reduce((n, w) => n + w.earnings.amountMinor, 0);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <ChartCard
        title="My earnings"
        sub={`${money({ amountMinor: total, currency: d.currency })} in the last 12 weeks, before any fees`}
        badge={d.simulated ? <Badge tone="warn" className="h-5 px-2 text-[10px]">Simulated</Badge> : null}
        table={{ head: ["Week of", "Bookings", "Earnings"], rows: d.weeks.map((w) => [label(w.week), w.bookings, money(w.earnings)]) }}
      >
        <AreaChart label="Weekly earnings, last 12 weeks" points={d.weeks.map((w) => ({ x: `Week of ${label(w.week)}`, tick: label(w.week), y: w.earnings.amountMinor }))} format={(v) => moneyCompact({ amountMinor: v, currency: d.currency })} height={220} />
      </ChartCard>
      <div className="surface flex flex-col rounded-[10px] p-5 sm:p-6">
        <h2 className="text-lg font-semibold">My money</h2>
        <div className="mt-4 grid flex-1 grid-cols-2 gap-3">
          <div className="col-span-2 rounded-[10px] bg-ok/10 p-4">
            <p className="text-xs text-ok">Ready to withdraw</p>
            <p className="display mt-1 text-[32px] tabular">{money(e.available)}</p>
          </div>
          <div className="rounded-[10px] bg-char p-4">
            <p className="text-xs text-mute">On the way</p>
            <p className="mt-1 text-lg font-semibold tabular">{money(e.pending)}</p>
          </div>
          <div className="rounded-[10px] bg-char p-4">
            <p className="text-xs text-mute">Paid to you</p>
            <p className="mt-1 text-lg font-semibold tabular">{money(e.paidOut)}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-faint">&ldquo;On the way&rdquo; becomes ready after the booking is finished. Amounts are simulated until payments are connected.</p>
        <Link href="/companion/payouts" className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-ember py-3 text-sm font-semibold text-ink hover:bg-ember-hi">
          Withdraw
        </Link>
        <Link href="/companion" className="mt-2 flex items-center justify-center gap-1.5 rounded-full bg-char py-3 text-sm font-semibold text-cream hover:bg-smoke">
          See all my earnings <Icon icon={ArrowRight01Icon} size={14} stroke={2.2} />
        </Link>
      </div>
    </div>
  );
}

function MemberNumbers() {
  const bookings = useBookings("customer");
  const cats = useCategories();
  const [now] = useState(() => Date.now());
  if (bookings.isPending) return <Skeleton className="h-[320px] rounded-[10px]" />;
  const paid = (bookings.data ?? []).filter((b) => SPENT.includes(b.status));
  if (!paid.length) return null;
  const currency = paid[0].breakdown.total.currency;
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now);
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    return { key: `${d.getFullYear()}-${d.getMonth()}`, tick: d.toLocaleDateString("en-GB", { month: "short" }), full: d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) };
  });
  const byMonth = months.map((m) => ({
    ...m,
    y: paid.filter((b) => b.breakdown.total.currency === currency && `${new Date(b.startAt).getFullYear()}-${new Date(b.startAt).getMonth()}` === m.key).reduce((n, b) => n + b.breakdown.total.amountMinor, 0),
  }));
  const total = byMonth.reduce((n, m) => n + m.y, 0);
  const byCat = Object.entries(
    paid.reduce<Record<string, number>>((acc, b) => {
      acc[b.categoryId] = (acc[b.categoryId] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([id, n]) => ({ label: cats.data?.find((c) => c.id === id)?.name ?? "Other", value: n }))
    .sort((a, b) => b.value - a.value);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <ChartCard
        title="What I have spent"
        sub={`${money({ amountMinor: total, currency })} on bookings in the last 6 months`}
        badge={<Badge tone="warn" className="h-5 px-2 text-[10px]">Simulated</Badge>}
        table={{ head: ["Month", "Spent"], rows: byMonth.map((m) => [m.full, money({ amountMinor: m.y, currency })]) }}
      >
        <AreaChart label="Spending per month, last 6 months" points={byMonth.map((m) => ({ x: m.full, tick: m.tick, y: m.y }))} format={(v) => moneyCompact({ amountMinor: v, currency })} height={220} />
      </ChartCard>
      <ChartCard title="What I like to book" sub={`${paid.length} paid ${paid.length === 1 ? "booking" : "bookings"}`} table={{ head: ["Experience", "Bookings"], rows: byCat.map((c) => [c.label, c.value]) }}>
        <BarList items={byCat} />
      </ChartCard>
    </div>
  );
}
