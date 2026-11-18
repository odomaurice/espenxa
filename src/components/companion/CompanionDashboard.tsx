"use client";

/*
 * My earnings: requests to answer first, then money, level and progress, performance, earnings (pending money
 * is never shown as withdrawable), incoming requests and recent score
 * changes with their reasons.
 */
import { ArrowRight01Icon, Calendar03Icon, Settings02Icon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { motion } from "framer-motion";
import Link from "next/link";
import { AreaChart, BarList, ChartCard, Sunburst, sunburstTable } from "@/components/charts/Charts";
import { Lift, Stagger, StaggerItem } from "@/components/motion";
import { Avatar, Badge, buttonClass, cx, DevNote, EmptyState, ErrorState, Icon, LinkButton, PageHeader, RankBadge, RankMark, Skeleton } from "@/components/ui";
import { useBookings, useEarnings, usePerformance, useProviderSettings } from "@/lib/api/hooks";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { Rank } from "@/lib/api/types";
import { dateTime, hoursLabel, money, moneyCompact, pct, timeAgo } from "@/lib/format";
import { BOOKING_STATUS, rankLabel, RANKS } from "@/lib/labels";

const RANK_TEXT: Record<Rank, string> = {
  bronze: "text-bronze",
  silver: "text-silver",
  gold: "text-gold",
  platinum: "text-platinum",
  diamond: "text-diamond",
};

export default function CompanionDashboard() {
  const perf = usePerformance();
  const earn = useEarnings();
  const settings = useProviderSettings();
  const bookings = useBookings("provider");

  if (perf.isPending || earn.isPending) return <Skeleton className="h-[600px]" />;
  if (perf.isError) return <ErrorState error={perf.error} retry={() => perf.refetch()} />;
  const p = perf.data;
  const e = earn.data;
  const requests = bookings.data?.filter((b) => ["requested", "adjustment_proposed"].includes(b.status)) ?? [];
  const upcoming = bookings.data?.filter((b) => ["accepted", "confirmed", "in_progress", "provider_completed"].includes(b.status)) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My earnings"
        sub={settings.data?.status === "active" ? "You are visible to members and taking requests." : "Finish your offer to start taking requests."}
        actions={
          <LinkButton href="/companion/settings" variant="secondary">
            <Icon icon={Settings02Icon} size={16} /> My offer and prices
          </LinkButton>
        }
      />

      {!!requests.length && (
        <section className="surface rounded-[10px] p-6">
          <h2 className="text-lg font-semibold">Waiting for your answer</h2>
          {!requests.length ? (
            <p className="mt-3 text-sm text-mute">No new requests right now.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {requests.map((b) => (
                <li key={b.id}>
                  <Lift y={-2} scale={1.005}>
                    <Link href={`/bookings/${b.id}`} className="flex items-center gap-3 rounded-[10px] bg-char p-3 transition-colors hover:bg-smoke">
                      <Avatar src={b.customer.photo} name={b.customer.displayName} size={44} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{b.customer.displayName}</span>
                        <span className="block text-xs text-mute">
                          {hoursLabel(b.hours)} · {dateTime(b.startAt, b.timezone)}
                        </span>
                      </span>
                      <Badge tone={BOOKING_STATUS[b.status].tone}>{BOOKING_STATUS[b.status].label}</Badge>
                    </Link>
                  </Lift>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="surface rounded-[10px] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Earnings</h2>
            <Icon icon={Wallet01Icon} size={20} className="text-mute" />
          </div>
          {e && (
            <>
              <Stagger className="mt-5 grid grid-cols-2 gap-3" inView={false} gap={0.06}>
                <StaggerItem className="rounded-[10px] bg-ok/10 p-4">
                  <p className="text-xs text-ok">Ready to withdraw</p>
                  <p className="mt-1.5 text-2xl font-semibold tabular">{money(e.available)}</p>
                </StaggerItem>
                <StaggerItem className="rounded-[10px] bg-char p-4">
                  <p className="text-xs text-mute">On the way (after the booking finishes)</p>
                  <p className="mt-1.5 text-2xl font-semibold tabular">{money(e.pending)}</p>
                </StaggerItem>
                <StaggerItem className="rounded-[10px] bg-char p-4">
                  <p className="text-xs text-mute">Paid to you</p>
                  <p className="mt-1.5 text-lg font-semibold tabular">{money(e.paidOut)}</p>
                </StaggerItem>
                <StaggerItem className="rounded-[10px] bg-char p-4">
                  <p className="text-xs text-mute">Paid when members cancelled late</p>
                  <p className="mt-1.5 text-lg font-semibold tabular">{money(e.compensation)}</p>
                </StaggerItem>
              </Stagger>
              <Link href="/companion/payouts" className={cx(buttonClass("accent", "lg"), "mt-5 w-full")}>
                Withdraw or change payout details
              </Link>
              {!!e.deductions.amountMinor && <p className="mt-2 text-center text-xs text-bad">Late cancellation penalties: −{money(e.deductions)}</p>}
              <ul className="mt-6 divide-y divide-line">
                {e.entries.slice(0, 5).map((x, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span>
                      <span className="block font-medium">{x.label}</span>
                      <span className="text-xs text-mute">{x.bookingRef}</span>
                    </span>
                    <span className="text-right">
                      <span className="block font-semibold tabular">{money(x.amount)}</span>
                      <Badge tone={x.state === "available" ? "ok" : x.state === "pending" ? "warn" : "mute"} className="mt-1 h-5 px-2 text-[10.5px]">
                        {x.state}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <DevNote>Earnings are calculated from simulated bookings. Real balances come from the payment provider.</DevNote>
              </div>
            </>
          )}
        </section>

        <section className="surface rounded-[10px] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Upcoming</h2>
            <Link href="/bookings" className="flex items-center gap-1 text-sm text-mute hover:text-cream">
              All bookings <Icon icon={ArrowRight01Icon} size={14} />
            </Link>
          </div>
          {!upcoming.length ? (
            <EmptyState icon={Calendar03Icon} title="Nothing scheduled" body="Confirmed bookings show up here." />
          ) : (
            <ul className="mt-4 space-y-2">
              {upcoming.map((b) => (
                <li key={b.id}>
                  <Link href={`/bookings/${b.id}`} className="flex items-center gap-3 rounded-[10px] bg-char p-3 transition-colors hover:bg-smoke">
                    <Avatar src={b.customer.photo} name={b.customer.displayName} size={40} />
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block font-semibold">{b.customer.displayName}</span>
                      <span className="block text-xs text-mute">{dateTime(b.startAt, b.timezone)}</span>
                    </span>
                    <Badge tone={BOOKING_STATUS[b.status].tone}>{BOOKING_STATUS[b.status].label}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[10px] bg-coal p-5 sm:p-8">
        <div className="pointer-events-none absolute -top-24 -right-16 size-80 rounded-full bg-gold/10 blur-3xl" aria-hidden />
        <div className="relative grid grid-cols-[auto_1fr] items-center gap-5 sm:gap-8">
          <motion.div
            initial={{ scale: 0.6, rotate: -10, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 14 }}
            className="grid size-20 place-items-center rounded-[10px] bg-char sm:size-32 sm:rounded-[10px]"
          >
            <RankMark rank={p.rank} className={cx("size-10 sm:size-16", RANK_TEXT[p.rank])} />
          </motion.div>
          <div>
            <RankBadge rank={p.rank} />
            <p className="display mt-2 text-[24px] leading-tight sm:mt-3 sm:text-[32px]">{rankLabel(p.rank)} companion</p>
            <p className="mt-1 text-sm text-mute">{RANKS.find((r) => r.id === p.rank)?.sub}</p>
            {p.nextRank ? (
              <div className="col-span-2 mt-1 sm:col-span-1 sm:mt-5">
                <div className="flex justify-between text-xs text-mute">
                  <span>Score {p.score}</span>
                  <span>
                    {Math.round(p.progressToNext * 100)}% to {rankLabel(p.nextRank)}
                  </span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-smoke">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-ember to-gold"
                    initial={{ width: 0 }}
                    animate={{ width: `${p.progressToNext * 100}%` }}
                    transition={{
                      duration: 1.2,
                      ease: [0.22, 1, 0.36, 1],
                      delay: 0.2,
                    }}
                  />
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-gold">Top level reached. Keep it up.</p>
            )}
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-2.5 sm:mt-8 sm:grid-cols-4 sm:gap-3">
          {[
            ["Bookings done", String(p.completedBookings)],
            ["Rating", p.rating.count ? `${p.rating.average.toFixed(1)} (${p.rating.count})` : "New"],
            ["Requests accepted", pct(p.acceptanceRate)],
            ["Cancelled by you", pct(p.cancellationRate)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-[10px] bg-char p-4">
              <p className="text-xs text-mute">{k}</p>
              <p className="mt-1.5 text-2xl font-semibold tabular">{v}</p>
            </div>
          ))}
        </div>
      </motion.section>

      <EarningsCharts />

      <section className="surface rounded-[10px] p-6">
        <h2 className="text-lg font-semibold">Why your level changed</h2>
        <p className="mt-1 text-xs text-mute">Your level depends on reliability and reviews, never on how much you earn. Member cancellations never count against you.</p>
        <ul className="mt-4 space-y-3">
          {p.events.slice(0, 6).map((ev, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className={cx("mt-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular", ev.delta >= 0 ? "bg-ok/15 text-ok" : "bg-bad/15 text-bad")}>
                {ev.delta >= 0 ? "+" : ""}
                {ev.delta}
              </span>
              <span className="flex-1">
                <span className="block">{ev.reason}</span>
                <span className="text-xs text-faint">{timeAgo(ev.at)}</span>
              </span>
            </li>
          ))}
          {!p.events.length && <li className="text-sm text-mute">No changes yet.</li>}
        </ul>
      </section>
    </div>
  );
}

function EarningsCharts() {
  const a = useQuery({
    queryKey: ["provider", "analytics"],
    queryFn: api.provider.analytics,
  });
  if (a.isPending) return <Skeleton className="h-[360px] rounded-[10px]" />;
  if (a.isError) return null;
  const d = a.data;
  const badge = d.simulated ? (
    <Badge tone="warn" className="h-5 px-2 text-[10px]">
      Simulated
    </Badge>
  ) : null;
  const total = d.weeks.reduce((n, w) => n + w.earnings.amountMinor, 0);
  const label = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  const ratingTotal = d.ratings.reduce((n, r) => n + r.count, 0);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <ChartCard
        title="Earnings"
        sub={`${money({ amountMinor: total, currency: d.currency })} over the last 12 weeks, before any fees`}
        badge={badge}
        table={{
          head: ["Week of", "Bookings", "Earnings"],
          rows: d.weeks.map((w) => [label(w.week), w.bookings, money(w.earnings)]),
        }}
      >
        <AreaChart
          label="Weekly earnings, last 12 weeks"
          points={d.weeks.map((w) => ({
            x: `Week of ${label(w.week)}`,
            tick: label(w.week),
            y: w.earnings.amountMinor,
          }))}
          format={(v) => moneyCompact({ amountMinor: v, currency: d.currency })}
          height={250}
        />
      </ChartCard>
      <ChartCard title="What members book" sub="By experience, then duration" badge={badge} table={sunburstTable(d.byExperience)}>
        <Sunburst root={d.byExperience} size={240} />
      </ChartCard>
      <ChartCard
        className="xl:col-span-2"
        title="Ratings"
        sub={ratingTotal ? `${ratingTotal} reviews` : "No reviews yet"}
        table={{
          head: ["Stars", "Reviews"],
          rows: d.ratings.map((r) => [`${r.stars} stars`, r.count]),
        }}
      >
        <BarList
          color="var(--color-gold)"
          items={d.ratings.map((r) => ({
            label: `${r.stars} star${r.stars > 1 ? "s" : ""}`,
            value: r.count,
            note: ratingTotal ? `${Math.round((r.count / ratingTotal) * 100)}%` : undefined,
          }))}
        />
      </ChartCard>
    </div>
  );
}
