"use client";

/*
 * One booking, from either side. The action panel only offers what the
 * backend allows in the current state, and every action that commits time
 * or money asks for confirmation first.
 */
import {
  ArrowLeft01Icon,
  Calendar03Icon,
  CheckmarkBadge01Icon,
  Clock01Icon,
  Location01Icon,
  Message01Icon,
  Shield01Icon,
  StarIcon,
} from "@hugeicons/core-free-icons";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useConfirm } from "@/components/Confirm";
import { Avatar, Badge, Button, buttonClass, cx, Dialog, ErrorState, Field, Icon, IconButton, Input, Notice, Select, Skeleton, Textarea } from "@/components/ui";
import { api } from "@/lib/api/client";
import type { BookingAction } from "@/lib/api/contract";
import { qk, useBooking, useBookingAction, useCategories, useConnections, useQuote } from "@/lib/api/hooks";
import { DURATIONS, type Booking, type DisputeKind, type DurationHours, type ProviderCancelReason } from "@/lib/api/types";
import { bookingEventText, dateTime, hoursLabel, money, timeAgo } from "@/lib/format";
import { useSession } from "@/components/Providers";
import { BOOKING_STATUS, DISPUTE_KINDS, PROVIDER_CANCEL_REASONS } from "@/lib/labels";

export default function BookingDetail({ id }: { id: string }) {
  const b = useBooking(id);
  if (b.isPending)
    return (
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <Skeleton className="h-96" />
        <Skeleton className="h-72" />
      </div>
    );
  if (b.isError) return <ErrorState error={b.error} retry={() => b.refetch()} />;
  return <Loaded b={b.data} />;
}

function Loaded({ b }: { b: Booking }) {
  const router = useRouter();
  const cats = useCategories();
  const conns = useConnections();
  const { account } = useSession();
  const other = b.role === "customer" ? b.provider : b.customer;
  const s = BOOKING_STATUS[b.status];
  const conn = conns.data?.find((c) => c.person.id === other.id);
  const cat = cats.data?.find((c) => c.id === b.categoryId)?.name ?? "Experience";

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <IconButton icon={ArrowLeft01Icon} label="Back to bookings" tone="filled" onClick={() => router.push("/bookings")} />
        <p className="text-sm text-mute">Booking {b.reference}</p>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[30px] bg-coal p-5 sm:p-8">
            <div className="pointer-events-none absolute -top-20 -right-20 size-64 rounded-full bg-ember/14 blur-3xl" aria-hidden />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar src={other.photo} name={other.displayName} size={64} ring />
                <div>
                  <p className="text-sm text-mute">{b.role === "customer" ? "You booked" : "Booked you"}</p>
                  <p className="text-xl font-semibold">{other.displayName}</p>
                </div>
              </div>
              <Badge tone={s.tone} className="h-8 px-3.5 text-[13px]">
                {s.label}
              </Badge>
            </div>
            <h1 className="display relative mt-5 text-[28px] leading-tight sm:mt-6 sm:text-[36px]">{cat}</h1>
            <div className="relative mt-5 grid gap-px overflow-hidden rounded-[20px] sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:rounded-none">
              {[
                [Calendar03Icon, "When", dateTime(b.startAt, b.timezone)],
                [Clock01Icon, "How long", hoursLabel(b.hours)],
                [Location01Icon, "Where", b.meetingArea],
              ].map(([icon, label, value]) => (
                <div key={label as string} className="flex items-center gap-3.5 bg-char px-4 py-3 sm:block sm:rounded-[20px] sm:p-4">
                  <Icon icon={icon as typeof Calendar03Icon} size={18} className="shrink-0 text-mute" />
                  <div className="min-w-0 sm:mt-3">
                    <p className="text-xs text-mute">{label as string}</p>
                    <p className="mt-0.5 text-[15px] font-medium">{value as string}</p>
                  </div>
                </div>
              ))}
            </div>
            {b.notes && <p className="relative mt-4 rounded-[20px] bg-char p-4 text-[14.5px] leading-relaxed text-cream/85">&ldquo;{b.notes}&rdquo;</p>}
            {conn && (
              <Link href={`/chats/${conn.id}`} className={buttonClass("secondary", "md", "relative mt-5")}>
                <Icon icon={Message01Icon} size={16} /> Message {other.displayName}
              </Link>
            )}
          </motion.section>

          <div className="lg:hidden">
            <Actions b={b} />
          </div>

          {b.proposal && (
            <Notice tone="warn" title={`${b.proposal.by === b.role ? "You" : other.displayName} proposed a change`}>
              {[b.proposal.startAt && `New time: ${dateTime(b.proposal.startAt, b.timezone)}`, b.proposal.hours && `Duration: ${hoursLabel(b.proposal.hours)}`, b.proposal.meetingArea && `Place: ${b.proposal.meetingArea}`, b.proposal.price && `Price: ${money(b.proposal.price)}`].filter(Boolean).join(" · ")}
              {b.proposal.note && <span className="mt-1 block">&ldquo;{b.proposal.note}&rdquo;</span>}
            </Notice>
          )}

          <section className="surface rounded-[28px] p-6">
            <h2 className="text-lg font-semibold">Timeline</h2>
            <ol className="relative mt-5 space-y-5 border-l border-line pl-6">
              {[...b.events].reverse().map((e, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative">
                  <span className={cx("absolute top-1 -left-[31px] size-3.5 rounded-full ring-4 ring-coal", i === 0 ? "bg-ember" : "bg-smoke")} />
                  <p className="text-[14.5px] font-medium">{bookingEventText(e.label, b, account?.id)}</p>
                  <p className="text-xs text-mute">{timeAgo(e.at)}</p>
                </motion.li>
              ))}
            </ol>
          </section>

          <section className="surface rounded-[28px] p-6">
            <h2 className="text-lg font-semibold">Cancellation policy</h2>
            <p className="mt-1 text-sm text-mute">What happens to the money if the member cancels after paying. If the companion cancels, the member always gets everything back.</p>
            <div className="mt-4 overflow-hidden rounded-[18px] bg-char">
              <table className="w-full text-sm">
                <thead className="text-xs text-mute">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Notice before start</th>
                    <th className="px-4 py-3 text-right font-medium">{b.role === "customer" ? "You get back" : "Member gets back"}</th>
                    <th className="px-4 py-3 text-right font-medium">{b.role === "customer" ? "Companion gets" : "You get"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {b.policy.tiers.map((t) => (
                    <tr key={t.minHours}>
                      <td className="px-4 py-3">{t.maxHours === null ? `More than ${t.minHours} hours` : t.minHours === 0 ? `Less than ${t.maxHours} hours` : `${t.minHours} to ${t.maxHours} hours`}</td>
                      <td className="px-4 py-3 text-right tabular">{t.refundPct}%</td>
                      <td className="px-4 py-3 text-right tabular">{pctText(t.compensationPct * (1 - b.rules.commissionPct / 100))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-faint">
              Meet keeps {b.rules.commissionPct}% of what the companion receives.{" "}
              {b.role === "provider" && `If you cancel less than ${b.rules.latePenalty.withinHours} hours before, ${b.rules.latePenalty.pct}% of the price is taken from your next payout.`}
            </p>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-8 lg:self-start">
          <section className="rounded-[28px] bg-cream p-6 text-ink">
            <h2 className="text-lg font-semibold">Payment</h2>
            {b.role === "customer" ? (
              <>
                <dl className="mt-4 space-y-2.5 text-[14.5px]">
                  <Row label={`${hoursLabel(b.hours)} with ${b.provider.displayName}`} value={b.breakdown.price.amountMinor ? money(b.breakdown.price) : "Free"} />
                  <Row label="Booking fee" value="None" muted />
                  {/* TODO(team): tax per market. */}
                  {b.breakdown.tax && <Row label="Taxes" value={money(b.breakdown.tax)} muted />}
                </dl>
                <div className="mt-4 flex items-baseline justify-between border-t border-ink/10 pt-4">
                  <span className="font-medium">{b.payment ? "You paid" : "Total"}</span>
                  <span className="text-2xl font-semibold tabular">{b.breakdown.total.amountMinor ? money(b.breakdown.total) : "Free"}</span>
                </div>
                {b.payment && <p className="mt-1 text-xs text-ink/55">With {b.payment.method}, through {b.payment.gateway === "paystack" ? "Paystack" : "Flutterwave"}.</p>}
              </>
            ) : (
              <>
                <dl className="mt-4 space-y-2.5 text-[14.5px]">
                  <Row label={`${hoursLabel(b.hours)}, booked by ${b.customer.displayName}`} value={b.breakdown.price.amountMinor ? money(b.breakdown.price) : "Free"} />
                  <Row label={`Meet's share (${b.rules.commissionPct}%)`} value={b.breakdown.commission ? `−${money(b.breakdown.commission)}` : "None"} muted />
                </dl>
                <div className="mt-4 flex items-baseline justify-between border-t border-ink/10 pt-4">
                  <span className="font-medium">You get</span>
                  <span className="text-2xl font-semibold tabular">{b.breakdown.price.amountMinor ? money(b.companionShare) : "Free"}</span>
                </div>
                <p className="mt-1 text-xs text-ink/55">Paid to you after the booking is finished.</p>
              </>
            )}
            {b.settlement && <Settlement b={b} />}
          </section>
          <div className="hidden lg:block">
            <Actions b={b} />
          </div>
          <p className="flex items-start gap-2 px-2 text-xs leading-relaxed text-faint">
            <Icon icon={Shield01Icon} size={15} className="mt-px shrink-0" /> A booking is for time and company in a public setting. It never includes physical contact, and either of you can end it at any time.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={muted ? "text-ink/55" : ""}>{label}</dt>
      <dd className={cx("tabular", muted ? "text-ink/55" : "font-medium")}>{value}</dd>
    </div>
  );
}

/* ---- actions --------------------------------------------------------------------- */

function Actions({ b }: { b: Booking }) {
  const act = useBookingAction(b.id);
  const confirm = useConfirm();
  const router = useRouter();
  const [dialog, setDialog] = useState<null | "cancel" | "propose" | "dispute" | "review" | "decline">(null);
  const [error, setError] = useState<string | null>(null);
  const customer = b.role === "customer";
  const other = customer ? b.provider.displayName : b.customer.displayName;
  const [now] = useState(() => Date.now());
  const started = now >= new Date(b.startAt).getTime();
  const checkInOpen = now >= new Date(b.startAt).getTime() - 2 * 3_600_000;
  const theirProposal = b.status === "adjustment_proposed" && b.proposal && b.proposal.by !== b.role;

  async function run(a: BookingAction, c?: Parameters<typeof confirm>[0]) {
    if (c && !(await confirm(c))) return;
    setError(null);
    try {
      await act.mutateAsync(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  const buttons: React.ReactNode[] = [];
  if (theirProposal) {
    buttons.push(
      <Button key="ap" variant="accent" size="lg" onClick={() => run({ type: "accept_proposal" }, { title: "Accept the change?", body: "The booking will be updated with the new details.", confirmLabel: "Accept change" })}>
        Accept change
      </Button>,
      <Button key="rp" variant="secondary" size="lg" onClick={() => run({ type: "reject_proposal" }, { title: "Keep the original request?", body: "The proposed change will be dismissed.", confirmLabel: "Keep original" })}>
        Keep original
      </Button>,
    );
  }
  if (!customer && b.status === "requested") {
    buttons.push(
      <Button key="acc" variant="accent" size="lg" onClick={() => run({ type: "accept" }, { title: `Accept ${other}'s request?`, body: `You are committing to ${hoursLabel(b.hours)} on ${dateTime(b.startAt, b.timezone)}. Cancelling a confirmed booking affects your companion level.`, confirmLabel: "Accept booking" })}>
        Accept request
      </Button>,
      <Button key="pro" variant="secondary" size="lg" onClick={() => setDialog("propose")}>
        Suggest a change
      </Button>,
      <Button key="dec" variant="quiet" onClick={() => setDialog("decline")}>
        Decline
      </Button>,
    );
  }
  if (customer && b.status === "requested")
    buttons.push(
      <Button key="pro" variant="secondary" size="lg" onClick={() => setDialog("propose")}>
        Change request
      </Button>,
    );
  if (customer && b.status === "accepted")
    buttons.push(
      <Button key="pay" variant="accent" size="lg" onClick={() => router.push(`/checkout/${b.id}`)}>
        Pay and confirm
      </Button>,
    );
  if (["confirmed", "in_progress"].includes(b.status) && checkInOpen && !b.checkIns[b.role])
    buttons.push(
      <Button key="ci" variant="primary" size="lg" onClick={() => run({ type: "check_in" }, { title: "Check in now?", body: `Let ${other} and Meet know you have arrived. Only check in once you are at the meeting place.`, confirmLabel: "Check in" })}>
        <Icon icon={Location01Icon} size={17} /> I have arrived
      </Button>,
    );
  if (!customer && ["confirmed", "in_progress"].includes(b.status) && started)
    buttons.push(
      <Button key="mc" variant="accent" size="lg" onClick={() => run({ type: "mark_completed" }, { title: "Mark this experience completed?", body: `${other} will be asked to confirm. Earnings stay pending until they do or a review closes.`, confirmLabel: "Mark completed" })}>
        Mark completed
      </Button>,
    );
  if (customer && b.status === "provider_completed")
    buttons.push(
      <Button key="cc" variant="accent" size="lg" onClick={() => run({ type: "confirm_completion" }, { title: "Confirm the experience happened?", body: `This releases payment to ${other}. If something went wrong, raise a dispute instead.`, confirmLabel: "Confirm completed" })}>
        <Icon icon={CheckmarkBadge01Icon} size={17} /> Confirm completed
      </Button>,
    );
  if (b.canReview)
    buttons.push(
      <Button key="rv" variant="primary" size="lg" onClick={() => setDialog("review")}>
        <Icon icon={StarIcon} size={17} /> Leave a review
      </Button>,
    );
  if (["requested", "adjustment_proposed", "accepted", "confirmed"].includes(b.status) && !started)
    buttons.push(
      <Button key="cx" variant="danger" onClick={() => setDialog("cancel")}>
        {b.status === "requested" || b.status === "adjustment_proposed" ? "Withdraw request" : "Cancel booking"}
      </Button>,
    );
  if (["confirmed", "in_progress", "provider_completed", "completed"].includes(b.status) && !b.disputeId)
    buttons.push(
      <Button key="dp" variant="quiet" onClick={() => setDialog("dispute")}>
        Report a problem
      </Button>,
    );

  return (
    <section className="surface rounded-[28px] p-6">
      <h2 className="text-lg font-semibold">What next</h2>
      <p className="mt-1 text-sm text-mute">{nextLine(b)}</p>
      {error && (
        <Notice tone="bad" className="mt-4">
          {error}
        </Notice>
      )}
      {buttons.length > 0 && <div className="mt-5 grid gap-2.5">{buttons}</div>}

      {dialog === "cancel" && <CancelDialog b={b} onClose={() => setDialog(null)} onDone={(a) => run(a).then(() => setDialog(null))} />}
      {dialog === "decline" && <DeclineDialog b={b} onClose={() => setDialog(null)} onDone={(a) => run(a).then(() => setDialog(null))} />}
      {dialog === "propose" && <ProposeDialog b={b} onClose={() => setDialog(null)} onDone={(a) => run(a).then(() => setDialog(null))} />}
      {dialog === "dispute" && <DisputeDialog b={b} onClose={() => setDialog(null)} />}
      {dialog === "review" && <ReviewDialog b={b} onClose={() => setDialog(null)} />}
    </section>
  );
}

function nextLine(b: Booking): string {
  const c = b.role === "customer";
  switch (b.status) {
    case "requested":
      return c ? `Waiting for ${b.provider.displayName} to respond. You will not be charged until they accept and you pay.` : "Accept, decline or suggest a different time.";
    case "adjustment_proposed":
      return b.proposal?.by === b.role ? "Waiting for a reply to your suggested change." : "A change was suggested. Accept it or keep the original.";
    case "accepted":
      return c ? "Accepted. Pay through Meet to confirm your booking." : "Waiting for the member to pay. The booking is confirmed once payment is verified.";
    case "confirmed":
      return "Confirmed. Check in when you arrive, and share your plans with a trusted contact.";
    case "in_progress":
      return "In progress. Either of you can end the experience at any time.";
    case "provider_completed":
      return c ? "Your companion marked this complete. Confirm it, or report a problem." : "Waiting for the member to confirm completion.";
    case "completed":
      return "Completed. Thank you for keeping Meet respectful and reliable.";
    case "disputed":
      return "Under review by our team. Payout is on hold until it is resolved.";
    default:
      return "This booking is closed.";
  }
}

/* ---- dialogs ---------------------------------------------------------------------------- */

const pctText = (n: number) => `${Math.round(n * 10) / 10}%`;

/** Where the money went, once a paid booking is cancelled or finished. */
function Settlement({ b }: { b: Booking }) {
  const s = b.settlement!;
  const customer = b.role === "customer";
  const rows: [string, string][] = customer
    ? [
        ["Refunded to you", money(s.refund)],
        [`${b.provider.displayName} received`, money(s.companion)],
        ["Meet kept", money(s.platform)],
      ]
    : [
        [`Refunded to ${b.customer.displayName}`, money(s.refund)],
        ["You received", money(s.companion)],
        ["Meet kept", money(s.platform)],
        ...(s.penalty ? ([["Late cancellation penalty", `−${money(s.penalty)}`]] as [string, string][]) : []),
      ];
  return (
    <div className="mt-5 rounded-[18px] bg-ink/6 p-4">
      <p className="text-sm font-semibold">What happened to the money</p>
      <dl className="mt-2 space-y-1.5 text-[13.5px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-ink/60">{k}</dt>
            <dd className="font-medium tabular">{v}</dd>
          </div>
        ))}
      </dl>
      {customer && s.refund.amountMinor > 0 && b.payment && <p className="mt-2 text-xs text-ink/55">Refunds go back the way you paid ({b.payment.method.replace(" (simulated)", "")}). Banks usually take 5 to 10 working days. Simulated: no money has moved.</p>}
    </div>
  );
}

function CancelDialog({ b, onClose, onDone }: { b: Booking; onClose: () => void; onDone: (a: BookingAction) => Promise<void> }) {
  const paid = ["confirmed", "in_progress"].includes(b.status);
  const customer = b.role === "customer";
  const quote = useQuote(b.id, paid);
  const [reason, setReason] = useState<ProviderCancelReason | "">("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onClose={onClose} title={paid ? "Cancel this booking?" : "Withdraw this request?"}>
      <div className="space-y-5">
        {paid && customer && (
          <div className="rounded-[20px] bg-char p-4">
            {quote.data ? (
              <>
                <p className="text-sm text-mute">Cancelling about {Math.floor(quote.data.noticeHours)} hours before the start:</p>
                <div className="mt-3 rounded-2xl bg-ok/10 p-3">
                  <p className="text-xs text-ok">You get back</p>
                  <p className="mt-1 text-2xl font-semibold tabular">{money(quote.data.refund)}</p>
                  {quote.data.refundTo && <p className="text-xs text-mute">Back to the way you paid: {quote.data.refundTo}</p>}
                </div>
                {quote.data.compensation.amountMinor + quote.data.platform.amountMinor > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-smoke p-3">
                      <p className="text-xs text-mute">{b.provider.displayName} gets</p>
                      <p className="mt-1 text-lg font-semibold tabular">{money(quote.data.compensation)}</p>
                      <p className="text-xs text-mute">For keeping the time free</p>
                    </div>
                    <div className="rounded-2xl bg-smoke p-3">
                      <p className="text-xs text-mute">Meet keeps</p>
                      <p className="mt-1 text-lg font-semibold tabular">{money(quote.data.platform)}</p>
                      <p className="text-xs text-mute">{b.rules.commissionPct}% of {b.provider.displayName}&apos;s part</p>
                    </div>
                  </div>
                )}
                <p className="mt-3 text-xs text-faint">{quote.data.feesNote}</p>
              </>
            ) : (
              <Skeleton className="h-24" />
            )}
          </div>
        )}
        {paid && !customer && (
          <>
            {quote.data ? (
              <div className="space-y-2">
                <div className="rounded-[20px] bg-char p-4 text-sm">
                  <p className="text-mute">{b.customer.displayName} gets everything back</p>
                  <p className="mt-1 text-2xl font-semibold tabular">{money(quote.data.refund)}</p>
                </div>
                {quote.data.penalty ? (
                  <Notice tone="bad" title={`Late cancellation: ${money(quote.data.penalty)} penalty`}>
                    You are cancelling less than {b.rules.latePenalty.withinHours} hours before. {b.rules.latePenalty.pct}% of the price is taken from your next payout, and your level score goes down. Real emergencies can be reviewed by our team.
                  </Notice>
                ) : (
                  <Notice tone="warn">You get nothing for this booking and your level score goes down. There is no money penalty because you are cancelling more than {b.rules.latePenalty.withinHours} hours ahead.</Notice>
                )}
              </div>
            ) : (
              <Skeleton className="h-28" />
            )}
            <Field label="Reason">
              {(id) => (
                <Select id={id} value={reason} onChange={(e) => setReason(e.target.value as ProviderCancelReason)}>
                  <option value="">Choose a reason</option>
                  {PROVIDER_CANCEL_REASONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </>
        )}
        {!paid && <p className="text-sm text-mute">Nothing has been charged, so there is no fee.</p>}
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" size="lg" onClick={onClose}>
            Keep booking
          </Button>
          <Button
            variant="danger"
            size="lg"
            className="bg-bad! text-white!"
            loading={busy}
            disabled={paid && !customer && !reason}
            onClick={async () => {
              setBusy(true);
              await onDone({ type: "cancel", reason: "", providerReason: reason || (customer ? undefined : "other") });
              setBusy(false);
            }}
          >
            {paid ? "Cancel booking" : "Withdraw"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function DeclineDialog({ b, onClose, onDone }: { b: Booking; onClose: () => void; onDone: (a: BookingAction) => Promise<void> }) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open onClose={onClose} title={`Decline ${b.customer.displayName}'s request?`}>
      <div className="space-y-5">
        <p className="text-sm text-mute">Declining requests does not affect your companion level. A short, kind note helps.</p>
        <Textarea aria-label="Note" rows={3} maxLength={200} placeholder="Sorry, I am not available then." value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" size="lg" className="bg-bad! text-white!" onClick={() => onDone({ type: "decline", reason })}>
            Decline
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ProposeDialog({ b, onClose, onDone }: { b: Booking; onClose: () => void; onDone: (a: BookingAction) => Promise<void> }) {
  const [when, setWhen] = useState(toLocalInput(b.startAt));
  const [hours, setHours] = useState<DurationHours>(b.hours);
  const [note, setNote] = useState("");
  const [place, setPlace] = useState(b.meetingArea);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onClose={onClose} title="Suggest a change">
      <div className="space-y-5">
        <Field label="New date and time">{(id) => <Input id={id} type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />}</Field>
        <Field label="Duration">
          {(id) => (
            <Select id={id} value={hours} onChange={(e) => setHours(Number(e.target.value) as DurationHours)}>
              {DURATIONS.map((h) => (
                <option key={h} value={h}>
                  {hoursLabel(h)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Where to meet" hint="A public place, like a restaurant or venue. Never a home address.">{(id) => <Input id={id} maxLength={120} value={place} onChange={(e) => setPlace(e.target.value)} />}</Field>
        <Textarea aria-label="Note" rows={2} maxLength={200} placeholder="Could we start a little later?" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            const startAt = new Date(when).toISOString();
            await onDone({ type: "propose", startAt: startAt !== b.startAt ? startAt : undefined, hours: hours !== b.hours ? hours : undefined, meetingArea: place.trim() && place.trim() !== b.meetingArea ? place.trim() : undefined, note });
            setBusy(false);
          }}
        >
          Send suggestion
        </Button>
      </div>
    </Dialog>
  );
}

function DisputeDialog({ b, onClose }: { b: Booking; onClose: () => void }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [kind, setKind] = useState<DisputeKind>("incomplete_experience");
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onClose={onClose} title="Report a problem">
      <div className="space-y-5">
        <p className="text-sm text-mute">Our team reviews every dispute. Any payout is held until it is resolved.</p>
        {err && <Notice tone="bad">{err}</Notice>}
        <Field label="What happened?">
          {(id) => (
            <Select id={id} value={kind} onChange={(e) => setKind(e.target.value as DisputeKind)}>
              {DISPUTE_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Textarea aria-label="Details" rows={4} maxLength={2000} placeholder="Tell us what happened, with times if you can." value={text} onChange={(e) => setText(e.target.value)} />
        <Button
          variant="accent"
          size="lg"
          className="w-full"
          loading={busy}
          onClick={async () => {
            if (!(await confirm({ title: "Open a dispute?", body: "The booking is put on hold and both of you will be contacted by our team.", confirmLabel: "Open dispute", tone: "danger" }))) return;
            setBusy(true);
            setErr(null);
            try {
              await api.bookings.openDispute(b.id, { kind, description: text });
              await qc.invalidateQueries({ queryKey: qk.booking(b.id) });
              onClose();
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Could not open the dispute.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Submit
        </Button>
      </div>
    </Dialog>
  );
}

const REVIEW_TAGS = ["Punctual", "Great company", "Great conversation", "Respectful", "Clear communication", "Professional"];

function ReviewDialog({ b, onClose }: { b: Booking; onClose: () => void }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onClose={onClose} title={`Review ${b.provider.displayName}`}>
      <div className="space-y-5">
        <div className="flex justify-center gap-2" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <motion.button key={n} type="button" aria-label={`${n} star${n > 1 ? "s" : ""}`} whileTap={{ scale: 0.8 }} whileHover={{ scale: 1.15 }} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)}>
              <svg viewBox="0 0 24 24" className={cx("size-10 transition-colors", (hover || rating) >= n ? "text-gold" : "text-smoke")}>
                <path fill="currentColor" d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.5l1.3-6.6L2.5 9.3l6.6-.8z" />
              </svg>
            </motion.button>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {REVIEW_TAGS.map((t) => (
            <button key={t} type="button" aria-pressed={tags.includes(t)} onClick={() => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])} className={cx("rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors", tags.includes(t) ? "bg-cream text-ink" : "bg-char hover:bg-smoke")}>
              {t}
            </button>
          ))}
        </div>
        <Textarea aria-label="Your review" rows={4} maxLength={1000} placeholder="What was the experience like?" value={text} onChange={(e) => setText(e.target.value)} />
        <p className="text-xs text-faint">Reviews are tied to this booking and moderated. Be honest and respectful.</p>
        <Button
          variant="accent"
          size="lg"
          className="w-full"
          disabled={!rating}
          loading={busy}
          onClick={async () => {
            setBusy(true);
            await api.bookings.review(b.id, { rating, body: text, tags });
            await qc.invalidateQueries({ queryKey: qk.booking(b.id) });
            setBusy(false);
            onClose();
          }}
        >
          Post review
        </Button>
      </div>
    </Dialog>
  );
}
