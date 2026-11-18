"use client";

/*
 * Platform-wide oversight for staff: overview, live activity, every
 * booking, money movement, safety reports, disputes and per-user history.
 * Private message contents are never shown here, only counts and reported
 * context. Every action asks for a reason and is written to the audit log.
 */
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  CheckmarkBadge01Icon,
  Coins01Icon,
  CreditCardIcon,
  Flag02Icon,
  Legal01Icon,
  LockPasswordIcon,
  Search01Icon,
  Shield01Icon,
  Task01Icon,
  Tick02Icon,
  UserAdd01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AreaChart, BarList, ChartCard, Legend, SERIES, StackedColumns, Sunburst, sunburstTable } from "@/components/charts/Charts";
import { useConfirm } from "@/components/Confirm";
import Flag from "@/components/Flag";
import { Stagger, StaggerItem } from "@/components/motion";
import { useSession } from "@/components/Providers";
import { Avatar, Badge, Button, cx, Dialog, EmptyState, ErrorState, errorMessage, Icon, IconButton, Input, Notice, PageHeader, Photo, RankBadge, Skeleton, Tabs, Textarea } from "@/components/ui";
import { api } from "@/lib/api/client";
import type { ActivityEvent, ActivityKind, AdminBooking, AdminBookingAction, AdminDispute, AdminReport, BookingStatus, LedgerEntry, ReportAction } from "@/lib/api/types";
import { countryByCode } from "@/lib/countries";
import { dateOnly, dateTime, hoursLabel, money, timeAgo } from "@/lib/format";
import { BOOKING_STATUS, DISPUTE_KINDS, REPORT_CATEGORIES, staffCan, staffRoleLabel, VERIFICATION } from "@/lib/labels";

const useAdmin = <T,>(key: unknown[], fn: () => Promise<T>) => useQuery({ queryKey: ["admin", ...key], queryFn: fn });

const KIND: Record<ActivityKind, { icon: IconSvgElement; tone: string; label: string }> = {
  signup: {
    icon: UserAdd01Icon,
    tone: "bg-info/15 text-info",
    label: "Sign-ups",
  },
  verification: {
    icon: CheckmarkBadge01Icon,
    tone: "bg-info/15 text-info",
    label: "Verification",
  },
  match: {
    icon: UserGroupIcon,
    tone: "bg-ember/15 text-ember",
    label: "Matches",
  },
  connection: {
    icon: UserAdd01Icon,
    tone: "bg-ember/15 text-ember",
    label: "Requests",
  },
  booking: {
    icon: Calendar03Icon,
    tone: "bg-ok/15 text-ok",
    label: "Bookings",
  },
  payment: {
    icon: CreditCardIcon,
    tone: "bg-ok/15 text-ok",
    label: "Payments",
  },
  refund: {
    icon: Coins01Icon,
    tone: "bg-warn/15 text-warn",
    label: "Refunds and cancellations",
  },
  report: { icon: Flag02Icon, tone: "bg-bad/15 text-bad", label: "Reports" },
  dispute: { icon: Legal01Icon, tone: "bg-bad/15 text-bad", label: "Disputes" },
  staff: {
    icon: Task01Icon,
    tone: "bg-char text-cream",
    label: "Staff actions",
  },
};

function ActivityRow({ e, i = 0 }: { e: ActivityEvent; i?: number }) {
  const k = KIND[e.kind];
  const body = (
    <span className="flex items-start gap-3.5 px-4 py-3 transition-colors hover:bg-char/60">
      <span className={cx("grid size-9 shrink-0 place-items-center rounded-full", k.tone)}>
        <Icon icon={k.icon} size={16} stroke={2} />
      </span>
      <span className="min-w-0 flex-1 text-[14px] leading-snug">{e.text}</span>
      <span className="shrink-0 text-[11px] text-faint">{timeAgo(e.at)}</span>
    </span>
  );
  return (
    <motion.li initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.025 }}>
      {e.href ? <Link href={e.href}>{body}</Link> : body}
    </motion.li>
  );
}

/* ---- overview ---------------------------------------------------------------------- */

const PIPELINE: { label: string; statuses: BookingStatus[]; tone: string }[] = [
  {
    label: "Requested",
    statuses: ["requested", "adjustment_proposed"],
    tone: "bg-warn",
  },
  { label: "Awaiting payment", statuses: ["accepted"], tone: "bg-info" },
  { label: "Confirmed", statuses: ["confirmed", "in_progress"], tone: "bg-ok" },
  {
    label: "Awaiting completion",
    statuses: ["provider_completed"],
    tone: "bg-info",
  },
  { label: "Completed", statuses: ["completed"], tone: "bg-cream" },
  { label: "In dispute", statuses: ["disputed"], tone: "bg-bad" },
  {
    label: "Cancelled or declined",
    statuses: ["customer_cancelled", "provider_cancelled", "platform_cancelled", "declined", "expired"],
    tone: "bg-smoke",
  },
];

export function Overview() {
  const { account } = useSession();
  const stats = useAdmin(["stats"], api.admin.stats);
  const can = (p: Parameters<typeof staffCan>[1]) => !!account && staffCan(account.roles, p);
  const activity = useQuery({
    queryKey: ["admin", "activity"],
    queryFn: api.admin.activity,
    enabled: can("activity"),
  });
  const finance = useQuery({
    queryKey: ["admin", "finance"],
    queryFn: api.admin.finance,
    enabled: can("finance"),
  });
  if (stats.isPending) return <Skeleton className="h-96" />;
  if (stats.isError) return <ErrorState error={stats.error} />;
  const s = stats.data;
  const total = Math.max(1, s.bookings);

  const kpis: [string, string | number, string | null][] = [
    ["Members", s.members, "/admin/users"],
    ["Companions", s.companions, "/admin/users"],
    ["Active connections", s.connections, null],
    ["Messages sent", s.messages, null],
    ["Bookings", s.bookings, "/admin/bookings"],
    ["Waiting for verification", s.pendingVerification, "/admin/verification"],
    ["Open reports", s.openReports, "/admin/reports"],
    ["Open disputes", s.openDisputes, "/admin/disputes"],
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={`Hello, ${account?.fullName.split(" ")[0]}`} sub={`${account?.roles.map(staffRoleLabel).join(", ")} · ${s.activeMarkets} of 55 markets active`} />

      <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-4" inView={false} gap={0.04}>
        {kpis.map(([label, value, href]) => {
          const urgent = (label === "Open reports" || label === "Open disputes" || label === "Waiting for verification") && Number(value) > 0;
          const body = (
            <>
              <p className="text-[13px] text-mute">{label}</p>
              <p className={cx("display mt-3 text-[36px] tabular", urgent && "text-ember")}>{value}</p>
            </>
          );
          return (
            <StaggerItem key={label}>
              {href ? (
                <Link href={href} className="surface block rounded-[24px] p-5 transition-colors hover:bg-char">
                  {body}
                </Link>
              ) : (
                <div className="surface rounded-[24px] p-5">{body}</div>
              )}
            </StaggerItem>
          );
        })}
      </Stagger>

      <AdminCharts />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="surface rounded-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Booking pipeline</h2>
            {can("bookings") && (
              <Link href="/admin/bookings" className="flex items-center gap-1 text-sm text-mute hover:text-cream">
                All bookings <Icon icon={ArrowRight01Icon} size={14} />
              </Link>
            )}
          </div>
          <ul className="mt-5 space-y-3.5">
            {PIPELINE.map((p, i) => {
              const n = p.statuses.reduce((a, k) => a + (s.byStatus[k] ?? 0), 0);
              return (
                <li key={p.label}>
                  <div className="flex justify-between text-sm">
                    <span>{p.label}</span>
                    <span className="font-semibold tabular">{n}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-char">
                    <motion.div
                      className={cx("h-full rounded-full", p.tone)}
                      initial={{ width: 0 }}
                      animate={{ width: `${(n / total) * 100}%` }}
                      transition={{
                        delay: 0.1 + i * 0.06,
                        duration: 0.8,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {finance.data && (
          <section className="surface rounded-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Money in motion</h2>
              <Link href="/admin/finance" className="flex items-center gap-1 text-sm text-mute hover:text-cream">
                Finance <Icon icon={ArrowRight01Icon} size={14} />
              </Link>
            </div>
            <div className="mt-5 space-y-3">
              {finance.data.summaries.map((f) => (
                <div key={f.currency} className="rounded-[20px] bg-char p-4">
                  <p className="text-xs text-mute">{f.currency}</p>
                  <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
                    <span>
                      <span className="block text-xs text-mute">Paid in</span>
                      <span className="font-semibold tabular">{money(f.volume)}</span>
                    </span>
                    <span>
                      <span className="block text-xs text-mute">Refunded</span>
                      <span className="font-semibold tabular">{money(f.refunds)}</span>
                    </span>
                    <span>
                      <span className="block text-xs text-mute">Held for companions</span>
                      <span className="font-semibold tabular">{money(f.hostPending)}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {activity.data && (
        <section className="surface rounded-card p-2">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-lg font-semibold">Live activity</h2>
            <Link href="/admin/activity" className="flex items-center gap-1 text-sm text-mute hover:text-cream">
              See all <Icon icon={ArrowRight01Icon} size={14} />
            </Link>
          </div>
          <ul>
            {activity.data.slice(0, 10).map((e, i) => (
              <ActivityRow key={e.id} e={e} i={i} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ---- analytics charts ------------------------------------------------------------------ */

const shortDay = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
const SimBadge = () => (
  <Badge tone="warn" className="h-5 px-2 text-[10px]">
    Simulated
  </Badge>
);
const RANK_FILL: Record<string, string> = {
  bronze: "var(--color-bronze)",
  silver: "var(--color-silver)",
  gold: "var(--color-gold)",
  platinum: "var(--color-platinum)",
  diamond: "var(--color-diamond)",
};

function AdminCharts() {
  const a = useAdmin(["analytics"], api.admin.analytics);
  if (a.isPending)
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-95 rounded-card" />
        <Skeleton className="h-95 rounded-card" />
      </div>
    );
  if (a.isError) return null;
  const d = a.data;
  const badge = d.simulated ? <SimBadge /> : null;
  const bookingKeys = [
    { id: "completed", label: "Completed", color: SERIES[0] },
    { id: "active", label: "Confirmed or in progress", color: SERIES[1] },
    { id: "cancelled", label: "Cancelled", color: SERIES[2] },
  ];
  const signups = d.days.reduce((n, x) => n + x.signups, 0);
  const funnelTop = d.funnel[0]?.value ?? 1;

  return (
    <div className="space-y-6">
      {d.simulated && <p className="text-xs text-faint">Charts marked Simulated use generated trend data for design. They switch to live figures when the analytics API is connected.</p>}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <ChartCard
          title="New members"
          sub={`${signups.toLocaleString("en")} in the last 30 days`}
          badge={badge}
          table={{
            head: ["Day", "New members"],
            rows: d.days.map((x) => [shortDay(x.date), x.signups]),
          }}
        >
          <AreaChart label="New members per day, last 30 days" points={d.days.map((x) => ({ x: shortDay(x.date), y: x.signups }))} height={260} />
        </ChartCard>
        <ChartCard title="Where members are" sub="By region, then country. Tap a region to zoom in." badge={badge} table={sunburstTable(d.membersByRegion)}>
          <Sunburst root={d.membersByRegion} size={260} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <ChartCard title="What people book" sub="By experience, then duration. Tap an experience to zoom in." badge={badge} table={sunburstTable(d.bookingsByExperience)}>
          <Sunburst root={d.bookingsByExperience} size={260} />
        </ChartCard>
        <ChartCard
          title="Bookings per day"
          sub="By outcome, last 30 days"
          badge={badge}
          legend={
            <Legend
              items={bookingKeys.map((k) => ({
                label: k.label,
                color: k.color,
              }))}
            />
          }
          table={{
            head: ["Day", ...bookingKeys.map((k) => k.label)],
            rows: d.days.map((x) => [shortDay(x.date), x.completed, x.active, x.cancelled]),
          }}
        >
          <StackedColumns
            label="Bookings per day by outcome"
            keys={bookingKeys}
            data={d.days.map((x) => ({
              x: shortDay(x.date),
              values: {
                completed: x.completed,
                active: x.active,
                cancelled: x.cancelled,
              },
            }))}
            height={260}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        <ChartCard
          title="Member journey"
          sub="How many reach each step"
          badge={badge}
          table={{
            head: ["Step", "Members", "Of registered"],
            rows: d.funnel.map((f) => [f.stage, f.value, `${Math.round((f.value / funnelTop) * 100)}%`]),
          }}
        >
          <BarList
            items={d.funnel.map((f, i) => ({
              label: f.stage,
              value: f.value,
              note: i ? `${Math.round((f.value / d.funnel[i - 1].value) * 100)}% of previous` : undefined,
            }))}
          />
        </ChartCard>
        <ChartCard
          title="Companions by level"
          sub="Levels reflect reliability, never earnings"
          badge={badge}
          table={{
            head: ["Level", "Companions"],
            rows: d.ranks.map((r) => [r.rank[0].toUpperCase() + r.rank.slice(1), r.count]),
          }}
        >
          <BarList
            items={d.ranks.map((r) => ({
              label: r.rank[0].toUpperCase() + r.rank.slice(1),
              value: r.count,
              color: RANK_FILL[r.rank],
            }))}
          />
        </ChartCard>
      </div>
    </div>
  );
}

/* ---- activity ------------------------------------------------------------------------ */

export function Activity() {
  const list = useAdmin(["activity"], api.admin.activity);
  const [kind, setKind] = useState<ActivityKind | "all">("all");
  const shown = (list.data ?? []).filter((e) => kind === "all" || e.kind === kind);
  return (
    <div>
      <PageHeader title="Activity" sub="Everything happening on espenxa, newest first. Message contents are private and never shown." />
      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
        {(["all", ...Object.keys(KIND)] as (ActivityKind | "all")[]).map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={cx("h-10 shrink-0 rounded-full px-4 text-[13px] font-medium transition-colors", kind === k ? "bg-cream text-ink" : "bg-char text-cream/80 hover:bg-smoke")}>
            {k === "all" ? "Everything" : KIND[k].label}
          </button>
        ))}
      </div>
      {list.isPending ? (
        <Skeleton className="h-96" />
      ) : list.isError ? (
        <ErrorState error={list.error} />
      ) : !shown.length ? (
        <EmptyState icon={Task01Icon} title="Nothing here yet" body="Activity of this kind will appear as it happens." />
      ) : (
        <ul className="surface divide-y divide-line overflow-hidden rounded-[24px]">
          {shown.map((e, i) => (
            <ActivityRow key={e.id} e={e} i={i} />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---- bookings ---------------------------------------------------------------------------- */

type BookingFilter = "all" | "active" | "requests" | "attention" | "closed";
const FILTERS: Record<BookingFilter, BookingStatus[] | null> = {
  all: null,
  requests: ["requested", "adjustment_proposed", "accepted"],
  active: ["confirmed", "in_progress", "provider_completed"],
  attention: ["disputed"],
  closed: ["completed", "customer_cancelled", "provider_cancelled", "platform_cancelled", "declined", "expired"],
};

export function Bookings() {
  const list = useAdmin(["bookings"], api.admin.bookings);
  const [filter, setFilter] = useState<BookingFilter>("all");
  const [q, setQ] = useState("");
  const rows = (list.data ?? []).filter(
    (b) => (!FILTERS[filter] || FILTERS[filter]!.includes(b.status) || (filter === "attention" && b.payoutHeld)) && (!q || [b.reference, b.customer.displayName, b.provider.displayName].join(" ").toLowerCase().includes(q.toLowerCase())),
  );
  const count = (f: BookingFilter) => (list.data ?? []).filter((b) => !FILTERS[f] || FILTERS[f]!.includes(b.status) || (f === "attention" && b.payoutHeld)).length;
  return (
    <div>
      <PageHeader title="Bookings" sub="Every booking on espenxa, from request to payout." />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Tabs
          value={filter}
          onChange={setFilter}
          items={[
            { id: "all", label: "All", count: count("all") },
            { id: "requests", label: "Requests", count: count("requests") },
            { id: "active", label: "Active", count: count("active") },
            {
              id: "attention",
              label: "Needs attention",
              count: count("attention"),
            },
            { id: "closed", label: "Closed" },
          ]}
        />
        <div className="relative min-w-60 flex-1">
          <Icon icon={Search01Icon} size={17} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-faint" />
          <Input aria-label="Search bookings" placeholder="Reference or name" className="h-11 pl-11" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {list.isPending ? (
        <Skeleton className="h-96" />
      ) : list.isError ? (
        <ErrorState error={list.error} />
      ) : !rows.length ? (
        <EmptyState icon={Calendar03Icon} title="No bookings match" body="Try another filter." />
      ) : (
        <>
          <ul className="space-y-2 sm:hidden">
            {rows.map((b) => (
              <li key={b.id}>
                <Link href={`/admin/bookings/${b.id}`} className="surface block rounded-[22px] p-4 transition-colors hover:bg-char">
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="flex shrink-0 -space-x-2">
                        <Avatar src={b.customer.photo} name={b.customer.displayName} size={32} className="ring-2 ring-coal" />
                        <Avatar src={b.provider.photo} name={b.provider.displayName} size={32} className="ring-2 ring-coal" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-semibold">
                          {b.customer.displayName} <span className="font-normal text-mute">with</span> {b.provider.displayName}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-mute">
                          <Flag code={b.country} className="h-3 w-4.5" /> {b.reference}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-[15px] font-semibold tabular">{b.price.amountMinor ? money(b.price) : "Free"}</span>
                  </span>
                  <span className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-mute">
                    <Badge tone={BOOKING_STATUS[b.status].tone}>{BOOKING_STATUS[b.status].label}</Badge>
                    {b.payoutHeld && <Badge tone="warn">Payout held</Badge>}
                    <span className="ml-1">
                      {dateTime(b.startAt, b.timezone)} · {hoursLabel(b.hours)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="surface hidden overflow-x-auto rounded-[24px] sm:block">
            <table className="w-full min-w-225 text-sm">
              <thead className="text-left text-xs text-mute">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Booking</th>
                  <th className="px-3 py-3.5 font-medium">People</th>
                  <th className="px-3 py-3.5 font-medium">When</th>
                  <th className="px-3 py-3.5 font-medium">Status</th>
                  <th className="px-3 py-3.5 text-right font-medium">Amount</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((b) => (
                  <tr key={b.id} className="transition-colors hover:bg-char/50">
                    <td className="px-5 py-3">
                      <span className="block font-medium">{b.reference}</span>
                      <span className="flex items-center gap-1.5 text-xs text-mute">
                        <Flag code={b.country} className="h-3 w-4.5" /> {hoursLabel(b.hours)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2">
                        <span className="flex -space-x-2">
                          <Avatar src={b.customer.photo} name={b.customer.displayName} size={30} className="ring-2 ring-coal" />
                          <Avatar src={b.provider.photo} name={b.provider.displayName} size={30} className="ring-2 ring-coal" />
                        </span>
                        <span className="text-[13px]">
                          {b.customer.displayName} <span className="text-mute">with</span> {b.provider.displayName}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[13px] text-mute">{dateTime(b.startAt, b.timezone)}</td>
                    <td className="px-3 py-3">
                      <span className="flex flex-wrap gap-1.5">
                        <Badge tone={BOOKING_STATUS[b.status].tone}>{BOOKING_STATUS[b.status].label}</Badge>
                        {b.payoutHeld && <Badge tone="warn">Payout held</Badge>}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular">{b.price.amountMinor ? money(b.price) : "Free"}</td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/admin/bookings/${b.id}`} className="inline-flex items-center gap-1 rounded-full bg-char px-3.5 py-2 text-xs font-semibold hover:bg-smoke">
                        Open <Icon icon={ArrowRight01Icon} size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export function BookingDetail({ id }: { id: string }) {
  const b = useAdmin(["booking", id], () => api.admin.booking(id));
  const router = useRouter();
  const qc = useQueryClient();
  const [action, setAction] = useState<AdminBookingAction | null>(null);
  if (b.isPending) return <Skeleton className="h-96" />;
  if (b.isError) return <ErrorState error={b.error} />;
  const x = b.data;
  const closed = ["completed", "customer_cancelled", "provider_cancelled", "platform_cancelled", "declined", "expired"].includes(x.status);

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <IconButton icon={ArrowLeft01Icon} label="Back to bookings" tone="filled" onClick={() => router.push("/admin/bookings")} />
        <p className="text-sm text-mute">Bookings</p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="surface rounded-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="display text-[30px]">{x.reference}</h1>
              <span className="flex gap-1.5">
                <Badge tone={BOOKING_STATUS[x.status].tone}>{BOOKING_STATUS[x.status].label}</Badge>
                {x.payoutHeld && <Badge tone="warn">Payout held</Badge>}
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Member", x.customer],
                ["Companion", x.provider],
              ].map(([label, p]) => {
                const person = p as AdminBooking["customer"];
                return (
                  <Link key={label as string} href={`/admin/users/${person.id}`} className="flex items-center gap-3 rounded-[20px] bg-char p-4 hover:bg-smoke">
                    <Avatar src={person.photo} name={person.displayName} size={44} />
                    <span>
                      <span className="block text-xs text-mute">{label as string}</span>
                      <span className="block font-semibold">{person.displayName}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-[18px] bg-char p-4">
                <dt className="text-xs text-mute">When</dt>
                <dd className="mt-1 font-medium">{dateTime(x.startAt, x.timezone)}</dd>
              </div>
              <div className="rounded-[18px] bg-char p-4">
                <dt className="text-xs text-mute">Duration</dt>
                <dd className="mt-1 font-medium">{hoursLabel(x.hours)}</dd>
              </div>
              <div className="rounded-[18px] bg-char p-4">
                <dt className="text-xs text-mute">Where</dt>
                <dd className="mt-1 font-medium">{x.meetingArea}</dd>
              </div>
            </dl>
          </section>
          <section className="surface rounded-card p-6">
            <h2 className="text-lg font-semibold">Timeline</h2>
            <ol className="relative mt-5 space-y-5 border-l border-line pl-6">
              {[...x.events].reverse().map((e, i) => (
                <li key={i} className="relative">
                  <span className={cx("absolute top-1 -left-7.75 size-3.5 rounded-full ring-4 ring-coal", e.actor === "staff" ? "bg-info" : i === 0 ? "bg-ember" : "bg-smoke")} />
                  <p className="text-[14.5px] font-medium">{e.label}</p>
                  <p className="text-xs text-mute">
                    {e.actor === "staff" ? "espenxa staff" : e.actor === "system" ? "System" : e.actor === "customer" ? x.customer.displayName : x.provider.displayName} · {timeAgo(e.at)}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <aside className="space-y-5 lg:sticky lg:top-8 lg:self-start">
          <section className="rounded-card bg-cream p-6 text-ink">
            <h2 className="text-lg font-semibold">Money</h2>
            <dl className="mt-4 space-y-2.5 text-[14.5px]">
              {[
                ["Booking price", money(x.price)],
                ["Paid by member", x.paid ? money(x.paid) : "Not paid"],
                ["Refunded to member", x.refunded ? money(x.refunded) : "None"],
                ["Companion compensation", x.compensation ? money(x.compensation) : "None"],
                ["Payout", x.payoutHeld ? "On hold" : closed ? "Settled" : "Pending completion"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-ink/60">{k}</dt>
                  <dd className="font-medium tabular">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="surface rounded-card p-6">
            <h2 className="text-lg font-semibold">Staff actions</h2>
            <p className="mt-1 text-sm text-mute">Each action needs a reason and is recorded in the audit log.</p>
            <div className="mt-5 grid gap-2.5">
              {x.disputeId && (
                <Link href="/admin/disputes" className="flex h-12 items-center justify-center gap-2 rounded-full bg-ember text-sm font-semibold text-ink">
                  <Icon icon={Legal01Icon} size={16} /> Review the dispute
                </Link>
              )}
              {!x.payoutHeld && !closed && (
                <Button variant="secondary" size="lg" onClick={() => setAction({ type: "hold_payout" })}>
                  Hold payout
                </Button>
              )}
              {x.payoutHeld && x.status !== "disputed" && (
                <Button variant="secondary" size="lg" onClick={() => setAction({ type: "release_payout" })}>
                  Release payout hold
                </Button>
              )}
              {!closed && (
                <Button variant="danger" size="lg" onClick={() => setAction({ type: "platform_cancel" })}>
                  Cancel on behalf of espenxa
                </Button>
              )}
              {closed && !x.payoutHeld && <p className="text-sm text-mute">This booking is closed. No further actions.</p>}
            </div>
          </section>
        </aside>
      </div>
      {action && (
        <ReasonDialog
          title={action.type === "platform_cancel" ? `Cancel ${x.reference}?` : action.type === "hold_payout" ? "Hold the companion payout?" : "Release the payout hold?"}
          body={
            action.type === "platform_cancel"
              ? "The member gets a full refund of anything paid, and the companion is not penalised. Both are notified."
              : action.type === "hold_payout"
                ? "The companion will not be paid for this booking until the hold is released."
                : "The companion can be paid once the booking completes normally."
          }
          confirmLabel={action.type === "platform_cancel" ? "Cancel booking" : action.type === "hold_payout" ? "Hold payout" : "Release hold"}
          danger={action.type === "platform_cancel"}
          onClose={() => setAction(null)}
          onSubmit={async (reason) => {
            await api.admin.bookingAction(x.id, action, reason);
            await qc.invalidateQueries({ queryKey: ["admin"] });
          }}
        />
      )}
    </div>
  );
}

/** Staff decision dialog with a required reason. */
function ReasonDialog({ title, body, confirmLabel, danger, onClose, onSubmit, children }: { title: string; body: string; confirmLabel: string; danger?: boolean; onClose: () => void; onSubmit: (reason: string) => Promise<void>; children?: React.ReactNode }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <Dialog open onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-mute">{body}</p>
        {children}
        {err && <Notice tone="bad">{err}</Notice>}
        <Textarea aria-label="Reason" rows={3} placeholder="Reason (recorded in the audit log)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            className={danger ? "bg-bad! text-white!" : undefined}
            size="lg"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              setErr(null);
              try {
                await onSubmit(reason);
                onClose();
              } catch (e) {
                setErr(errorMessage(e));
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

/* ---- finance ------------------------------------------------------------------------------- */

const LEDGER_KIND: Record<LedgerEntry["kind"], string> = {
  payment: "Payment",
  refund: "Refund",
  compensation: "Companion compensation",
  host_earning: "Companion earning",
  payout: "Payout",
  platform_fee: "espenxa's share",
  penalty: "Late cancellation penalty",
};

export function Finance() {
  const f = useAdmin(["finance"], api.admin.finance);
  const [kind, setKind] = useState<string>("all");
  if (f.isPending) return <Skeleton className="h-96" />;
  if (f.isError) return <ErrorState error={f.error} />;
  const ledger = f.data.ledger.filter((l) => kind === "all" || l.kind === kind);
  return (
    <div className="space-y-6">
      <PageHeader title="Finance" sub="Money paid in, refunded, held for companions and released. Amounts stay in each booking's own currency." />
      <Notice tone="warn">All amounts are simulated. Paystack and Flutterwave are not connected yet, so no money moves. espenxa&apos;s share follows the money rules each booking was made under.</Notice>
      {!!f.data.payoutReviews.length && (
        <section className="surface rounded-card p-6">
          <h2 className="text-lg font-semibold">Payout details to check</h2>
          <p className="mt-1 text-sm text-mute">Companions who typed their bank in by hand. No money goes out until someone checks the name matches their verified ID.</p>
          <ul className="mt-4 space-y-2">
            {f.data.payoutReviews.map((r) => (
              <li key={r.userId}>
                <Link href={`/admin/users/${r.userId}`} className="flex items-center justify-between gap-3 rounded-[18px] bg-char p-3.5 text-sm hover:bg-smoke">
                  <span>
                    <span className="block font-medium">{r.name}</span>
                    <span className="text-xs text-mute">
                      {r.institution} ending {r.last4} · {timeAgo(r.addedAt)}
                    </span>
                  </span>
                  <Badge tone="warn">Check</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {f.data.summaries.map((s) => (
        <section key={s.currency} className="surface rounded-card p-6">
          <h2 className="text-lg font-semibold">{s.currency}</h2>
          <Stagger className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4" inView={false} gap={0.04}>
            {[
              ["Paid in", money(s.volume), `${s.payments} payments`],
              ["Refunded", money(s.refunds), null],
              ["Companion compensation", money(s.compensation), "From late member cancellations"],
              ["Held for companions", money(s.hostPending), "Not yet withdrawable"],
              ["Available to companions", money(s.hostAvailable), null],
              ["Paid out", money(s.paidOut), "Sent to companions (simulated)"],
              ["espenxa's revenue", s.platformRevenue ? money(s.platformRevenue) : "None yet", "Share of finished bookings, cancellations and penalties"],
            ].map(([k, v, sub]) => (
              <StaggerItem key={k} className="rounded-[20px] bg-char p-4">
                <p className="text-xs text-mute">{k}</p>
                <p className="mt-1.5 text-xl font-semibold tabular">{v}</p>
                {sub && <p className="mt-0.5 text-[11px] text-faint">{sub}</p>}
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      ))}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Ledger</h2>
          <Tabs
            value={kind}
            onChange={setKind}
            items={[
              { id: "all", label: "All" },
              { id: "payment", label: "Payments" },
              { id: "refund", label: "Refunds" },
              { id: "compensation", label: "Compensation" },
              { id: "host_earning", label: "Companion earnings" },
              { id: "platform_fee", label: "espenxa's share" },
              { id: "penalty", label: "Penalties" },
              { id: "payout", label: "Payouts" },
            ]}
          />
        </div>
        <div className="surface overflow-x-auto rounded-card">
          <table className="w-full min-w-180 text-sm">
            <thead className="text-left text-xs text-mute">
              <tr>
                <th className="px-5 py-3.5 font-medium">When</th>
                <th className="px-3 py-3.5 font-medium">Type</th>
                <th className="px-3 py-3.5 font-medium">Booking</th>
                <th className="px-3 py-3.5 font-medium">Party</th>
                <th className="px-3 py-3.5 font-medium">Status</th>
                <th className="px-5 py-3.5 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ledger.map((l) => (
                <tr key={l.id}>
                  <td className="px-5 py-3 text-mute">{dateOnly(l.at)}</td>
                  <td className="px-3 py-3">{LEDGER_KIND[l.kind]}</td>
                  <td className="px-3 py-3 font-medium">{l.bookingRef}</td>
                  <td className="px-3 py-3">{l.party}</td>
                  <td className="px-3 py-3 text-mute">{l.status}</td>
                  <td className={cx("px-5 py-3 text-right font-semibold tabular", l.kind === "refund" && "text-warn")}>
                    {l.kind === "refund" || l.kind === "payout" ? "−" : ""}
                    {money(l.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ---- reports --------------------------------------------------------------------------- */

export function Reports() {
  const list = useAdmin(["reports"], api.admin.reports);
  const qc = useQueryClient();
  const [open, setOpen] = useState<{ r: AdminReport; a: ReportAction } | null>(null);
  const [tab, setTab] = useState<"open" | "closed">("open");
  const rows = (list.data ?? []).filter((r) => (tab === "open" ? r.status === "open" : r.status !== "open"));
  return (
    <div>
      <PageHeader title="Reports" sub="Safety reports from members. Urgent categories come first." />
      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-6"
        items={[
          {
            id: "open",
            label: "Open",
            count: list.data?.filter((r) => r.status === "open").length,
          },
          { id: "closed", label: "Closed" },
        ]}
      />
      {list.isPending ? (
        <Skeleton className="h-64" />
      ) : list.isError ? (
        <ErrorState error={list.error} />
      ) : !rows.length ? (
        <EmptyState icon={Shield01Icon} title={tab === "open" ? "No open reports" : "Nothing closed yet"} body="Reports from members appear here." />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          <AnimatePresence initial={false}>
            {rows.map((r) => (
              <motion.li key={r.id} layout exit={{ opacity: 0, x: 40 }} className={cx("surface rounded-[26px] p-5", r.urgent && r.status === "open" && "ring-2 ring-bad/40")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    {r.urgent && <Badge tone="bad">Urgent</Badge>}
                    <span className="font-semibold">{REPORT_CATEGORIES.find((c) => c.id === r.category)?.label}</span>
                  </span>
                  <span className="text-xs text-faint">{timeAgo(r.at)}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {[
                    ["Reported", r.target],
                    ["By", r.reporter],
                  ].map(([k, p]) => {
                    const person = p as AdminReport["target"];
                    return (
                      <Link key={k as string} href={`/admin/users/${person.id}`} className="flex items-center gap-2.5 rounded-2xl bg-char p-3 hover:bg-smoke">
                        <Avatar src={person.photo || undefined} name={person.displayName} size={34} />
                        <span>
                          <span className="block text-[11px] text-mute">{k as string}</span>
                          <span className="block text-sm font-semibold">{person.displayName}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
                <p className="mt-3 rounded-2xl bg-char p-3.5 text-sm text-cream/85">{r.details || "No details given."}</p>
                <p className="mt-2 text-xs text-mute">
                  {r.priorReports ? `${r.priorReports} other report${r.priorReports > 1 ? "s" : ""} about this person` : "First report about this person"}
                  {r.bookingRef && ` · booking ${r.bookingRef}`}
                </p>
                {r.status === "open" ? (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setOpen({ r, a: "dismiss" })}>
                      Dismiss
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setOpen({ r, a: "warn" })}>
                      Warn
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setOpen({ r, a: "suspend" })}>
                      Suspend
                    </Button>
                  </div>
                ) : (
                  <p className="mt-4 flex items-start gap-2 text-sm text-mute">
                    <Icon icon={Tick02Icon} size={15} className="mt-0.5 text-ok" /> {r.status === "dismissed" ? "Dismissed" : "Actioned"}: {r.resolution}
                  </p>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      {open && (
        <ReasonDialog
          title={open.a === "dismiss" ? "Dismiss this report?" : open.a === "warn" ? `Warn ${open.r.target.displayName}?` : `Suspend ${open.r.target.displayName}?`}
          body={open.a === "dismiss" ? "No action is taken against the reported person. The reporter is thanked." : open.a === "warn" ? "They receive your note as an official warning." : "They are blocked from using espenxa until reactivated. They can appeal."}
          confirmLabel={open.a === "dismiss" ? "Dismiss" : open.a === "warn" ? "Send warning" : "Suspend"}
          danger={open.a === "suspend"}
          onClose={() => setOpen(null)}
          onSubmit={async (note) => {
            await api.admin.resolveReport(open.r.id, open.a, note);
            await qc.invalidateQueries({ queryKey: ["admin"] });
          }}
        />
      )}
    </div>
  );
}

/* ---- disputes ------------------------------------------------------------------------------ */

export function Disputes() {
  const list = useAdmin(["disputes"], api.admin.disputes);
  const [open, setOpen] = useState<AdminDispute | null>(null);
  return (
    <div>
      <PageHeader title="Disputes" sub="Payouts on these bookings are held until a decision is recorded." />
      {list.isPending ? (
        <Skeleton className="h-40" />
      ) : list.isError ? (
        <ErrorState error={list.error} />
      ) : !list.data.length ? (
        <EmptyState icon={Tick02Icon} title="No disputes" body="When a member or companion reports a problem with a booking, it lands here." />
      ) : (
        <ul className="space-y-3">
          {list.data.map((d) => (
            <li key={d.id} className="surface rounded-[26px] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[16px] font-semibold">{DISPUTE_KINDS.find((k) => k.id === d.kind)?.label}</p>
                <Badge tone={d.status === "open" ? "bad" : d.status === "resolved" ? "ok" : "warn"}>{d.status.replace("_", " ")}</Badge>
              </div>
              <p className="mt-1 text-xs text-mute">
                <Link href={`/admin/bookings/${d.bookingId}`} className="underline-offset-2 hover:text-cream hover:underline">
                  {d.bookingRef}
                </Link>{" "}
                · {d.customer} (member) and {d.provider} (companion) · {money(d.amount)} · opened by the {d.openedBy === "customer" ? "member" : "companion"} {timeAgo(d.at)}
              </p>
              <p className="mt-3 rounded-2xl bg-char p-3.5 text-sm text-cream/85">{d.description}</p>
              {d.resolution ? (
                <p className="mt-3 flex items-start gap-2 text-sm text-mute">
                  <Icon icon={Tick02Icon} size={15} className="mt-0.5 text-ok" /> {d.resolution}
                </p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/admin/bookings/${d.bookingId}`} className="rounded-full bg-char px-4 py-2.5 text-sm font-medium hover:bg-smoke">
                    View booking
                  </Link>
                  <Button variant="accent" onClick={() => setOpen(d)}>
                    Resolve dispute
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {open && <ResolveDialog d={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function ResolveDialog({ d, onClose }: { d: AdminDispute; onClose: () => void }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [pct, setPct] = useState(50);
  const [score, setScore] = useState(0);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refund = Math.round((d.amount.amountMinor * pct) / 100);
  return (
    <Dialog open onClose={onClose} title={`Resolve ${d.bookingRef}`} wide>
      <div className="space-y-6">
        {err && <Notice tone="bad">{err}</Notice>}
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">Refund to the member</span>
            <span className="text-sm font-semibold tabular">{pct}%</span>
          </div>
          <input type="range" min={0} max={100} step={5} value={pct} onChange={(e) => setPct(Number(e.target.value))} aria-label="Refund percentage" className="mt-3 w-full accent-ember" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-ok/10 p-3">
              <p className="text-xs text-ok">{d.customer} gets back</p>
              <p className="mt-1 text-lg font-semibold tabular">{money({ ...d.amount, amountMinor: refund })}</p>
            </div>
            <div className="rounded-2xl bg-char p-3">
              <p className="text-xs text-mute">{d.provider} receives</p>
              <p className="mt-1 text-lg font-semibold tabular">
                {money({
                  ...d.amount,
                  amountMinor: d.amount.amountMinor - refund,
                })}
              </p>
            </div>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium">Companion score adjustment</p>
          <p className="text-xs text-mute">Only when the companion is found responsible. Disputes never count against a companion automatically.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[0, -10, -25, -50].map((v) => (
              <button key={v} type="button" aria-pressed={score === v} onClick={() => setScore(v)} className={cx("rounded-full px-4 py-2 text-sm font-medium", score === v ? "bg-cream text-ink" : "bg-char hover:bg-smoke")}>
                {v === 0 ? "No change" : v}
              </button>
            ))}
          </div>
        </div>
        <Textarea aria-label="Decision" rows={3} placeholder="Explain the decision. Both people will see this." value={note} onChange={(e) => setNote(e.target.value)} />
        <Button
          variant="accent"
          size="lg"
          className="w-full"
          loading={busy}
          onClick={async () => {
            if (
              !(await confirm({
                title: "Record this decision?",
                body: `${pct}% refund to ${d.customer}${score ? `, companion score ${score}` : ""}. Both people are notified and the payout is released accordingly.`,
                confirmLabel: "Record decision",
                tone: "danger",
              }))
            )
              return;
            setBusy(true);
            setErr(null);
            try {
              await api.admin.resolveDispute(d.id, {
                refundPct: pct,
                scoreDelta: score,
                note,
              });
              await qc.invalidateQueries({ queryKey: ["admin"] });
              onClose();
            } catch (e) {
              setErr(errorMessage(e));
              setBusy(false);
            }
          }}
        >
          Record decision
        </Button>
      </div>
    </Dialog>
  );
}

/* ---- user detail ------------------------------------------------------------------------- */

/** Hand-typed payout details: staff compare the account name with the verified ID before money can go out. */
function PayoutReview({ userId, verifiedName, accountName }: { userId: string; verifiedName: string; accountName: string }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const same = verifiedName.trim().toUpperCase() === accountName.trim().toUpperCase();
  async function decide(approve: boolean) {
    setError(null);
    if (reason.trim().length < 5) return setError("Write a short reason for the audit log.");
    const ok = await confirm({
      title: approve ? "Approve these payout details?" : "Reject these payout details?",
      body: approve ? "Money can then be sent to this account." : "The companion is told to add an account in their own name.",
      confirmLabel: approve ? "Approve" : "Reject",
      tone: approve ? undefined : "danger",
    });
    if (!ok) return;
    try {
      await api.admin.reviewPayoutAccount(userId, approve, reason);
      qc.invalidateQueries({ queryKey: ["admin"] });
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  return (
    <div className="mt-4 space-y-3 rounded-[20px] bg-char p-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <p>
          <span className="block text-xs text-mute">Verified ID name</span>
          {verifiedName}
        </p>
        <p>
          <span className="block text-xs text-mute">Name they typed</span>
          {accountName}
        </p>
      </div>
      <Notice tone={same ? "ok" : "warn"}>{same ? "The names match. Check the bank statement if you have any doubt." : "The names differ. Ask for a bank statement before approving."}</Notice>
      {error && <Notice tone="bad">{error}</Notice>}
      <Textarea aria-label="Reason" rows={2} maxLength={300} placeholder="Checked against the bank statement they sent." value={reason} onChange={(e) => setReason(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => decide(false)}>
          Reject
        </Button>
        <Button onClick={() => decide(true)}>Approve</Button>
      </div>
    </div>
  );
}

export function UserDetail({ id }: { id: string }) {
  const u = useAdmin(["user", id], () => api.admin.user(id));
  const router = useRouter();
  const { account } = useSession();
  const canKyc = !!account && staffCan(account.roles, "verification");
  if (u.isPending) return <Skeleton className="h-96" />;
  if (u.isError) return <ErrorState error={u.error} />;
  const d = u.data;
  const v = VERIFICATION[d.row.verification];
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <IconButton icon={ArrowLeft01Icon} label="Back to users" tone="filled" onClick={() => router.push("/admin/users")} />
        <p className="text-sm text-mute">Users</p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="overflow-hidden rounded-card bg-char">{d.photos[0] ? <Photo src={d.photos[0]} alt="" className="aspect-4/5 w-full" /> : <div className="grid aspect-4/5 place-items-center text-5xl font-semibold text-mute">{d.row.name[0]}</div>}</div>
          <div className="surface rounded-[24px] p-5">
            <p className="text-xl font-semibold">{d.row.name}</p>
            <p className="text-sm text-mute">
              @{d.row.username} · {d.row.email}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone={v.tone}>{v.label}</Badge>
              <Badge>{d.row.role === "companion" || d.isProvider ? "Companion" : "Member"}</Badge>
              {d.rank && <RankBadge rank={d.rank} size="sm" />}
              {!d.row.onboarded && <Badge tone="warn">Setup incomplete</Badge>}
            </div>
            <p className="mt-3 flex items-center gap-2 text-sm text-mute">
              <Flag code={d.row.country} className="h-3.5 w-5" /> {[d.city, countryByCode(d.row.country)?.name].filter(Boolean).join(", ")}
            </p>
            <p className="mt-1 text-xs text-faint">Joined {dateOnly(d.row.joinedAt)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["Connections", d.connections],
              ["Messages sent", d.messagesSent],
              ["Reports against", d.reportsAgainst],
              ["Reports made", d.reportsMade],
            ].map(([k, n]) => (
              <div key={k} className="surface rounded-[20px] p-4">
                <p className="text-[11px] text-mute">{k}</p>
                <p className={cx("mt-1 text-2xl font-semibold tabular", k === "Reports against" && Number(n) > 0 && "text-bad")}>{n}</p>
              </div>
            ))}
          </div>
        </aside>
        <div className="space-y-5">
          {canKyc && !d.row.staff.length && (
            <Link href={`/admin/verification/${d.row.id}`} className="surface group flex items-center gap-4 rounded-[26px] p-5 transition-colors hover:bg-char">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-warn/15 text-warn">
                <Icon icon={LockPasswordIcon} size={20} />
              </span>
              <span className="flex-1">
                <span className="block text-[16px] font-semibold">Identity documents</span>
                <span className="block text-sm text-mute">ID, selfie and the details they declared. Opening them is recorded in the audit log.</span>
              </span>
              <Icon icon={ArrowRight01Icon} size={18} className="text-faint transition-transform group-hover:translate-x-1" />
            </Link>
          )}
          {d.isProvider && (
            <section className="surface rounded-[26px] p-6">
              <h2 className="text-lg font-semibold">Payout details</h2>
              {d.payoutAccount ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[15px]">
                    {d.payoutAccount.institution} ending <span className="font-semibold tabular">{d.payoutAccount.last4}</span>
                    <span className="block text-xs text-mute">
                      {d.payoutAccount.accountName} · via {d.payoutAccount.gateway === "paystack" ? "Paystack" : "Flutterwave"} · added {dateOnly(d.payoutAccount.addedAt)}
                    </span>
                  </p>
                  {d.payoutAccount.check === "pending_review" ? (
                    <Badge tone="warn">Typed in by hand, needs a check</Badge>
                  ) : d.payoutAccount.check === "rejected" ? (
                    <Badge tone="bad">Rejected</Badge>
                  ) : d.payoutAccount.activeFrom > d.payoutAccount.addedAt ? (
                    <Badge tone="warn">Changed, payouts allowed from {dateTime(d.payoutAccount.activeFrom)}</Badge>
                  ) : (
                    <Badge tone="ok">Name confirmed by the bank</Badge>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-mute">Not added yet. They cannot be paid until they add a bank account or mobile money.</p>
              )}
              {d.payoutAccount?.check === "pending_review" && <PayoutReview userId={d.row.id} verifiedName={d.row.name} accountName={d.payoutAccount.accountName} />}
              <p className="mt-3 text-xs text-faint">Staff only see the last 4 digits. Full details are held by the payment partner.</p>
            </section>
          )}
          {d.bio && (
            <section className="surface rounded-[26px] p-6">
              <h2 className="text-lg font-semibold">Bio</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-cream/80">{d.bio}</p>
            </section>
          )}
          <section className="surface rounded-[26px] p-6">
            <h2 className="text-lg font-semibold">Bookings</h2>
            {!d.bookings.length ? (
              <p className="mt-2 text-sm text-mute">No bookings.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {d.bookings.map((b) => (
                  <li key={b.id}>
                    <Link href={`/admin/bookings/${b.id}`} className="flex items-center justify-between gap-3 rounded-[18px] bg-char p-3.5 text-sm hover:bg-smoke">
                      <span>
                        <span className="block font-medium">{b.reference}</span>
                        <span className="text-xs text-mute">
                          {b.customer.id === id ? `Booked ${b.provider.displayName}` : `Booked by ${b.customer.displayName}`} · {dateTime(b.startAt, b.timezone)}
                        </span>
                      </span>
                      <Badge tone={BOOKING_STATUS[b.status].tone}>{BOOKING_STATUS[b.status].label}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="surface rounded-[26px] p-2">
            <h2 className="px-4 pt-4 pb-2 text-lg font-semibold">Activity</h2>
            {!d.activity.length ? (
              <p className="px-4 pb-4 text-sm text-mute">No activity yet.</p>
            ) : (
              <ul>
                {d.activity.map((e, i) => (
                  <ActivityRow key={e.id} e={e} i={i} />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
