"use client";

/*
 * Money rules: Meet's share, the cancellation steps, the late cancellation
 * penalty for companions and the payout safety wait. A live example shows
 * exactly where the money goes before anyone saves. Changes apply to new
 * bookings only and are written to the audit log with a reason.
 */
import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useConfirm } from "@/components/Confirm";
import { useSession } from "@/components/Providers";
import { Button, cx, ErrorState, errorMessage, Field, Icon, IconButton, Input, Notice, PageHeader, Skeleton, Textarea } from "@/components/ui";
import { api } from "@/lib/api/client";
import type { CancellationTier, MoneyRules as Rules } from "@/lib/api/types";
import { dateTime, money } from "@/lib/format";

/** Example booking used by the preview. */
const EXAMPLE = { amountMinor: 10_000_000, currency: "NGN" };
const m = (n: number) => money({ amountMinor: n, currency: EXAMPLE.currency });
const share = (n: number, pct: number) => Math.floor((n * pct) / 100);

export default function MoneyRules() {
  const q = useQuery({ queryKey: ["admin", "money-rules"], queryFn: api.admin.moneyRules });
  if (q.isPending) return <Skeleton className="h-[600px]" />;
  if (q.isError) return <ErrorState error={q.error} retry={() => q.refetch()} />;
  return <Editor key={q.data.updatedAt} rules={q.data} />;
}

type Step = { minHours: number; refundPct: number };

function Editor({ rules }: { rules: Rules }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { account } = useSession();
  const canEdit = !!account?.roles.some((r) => r === "super_admin" || r === "finance");
  const [pct, setPct] = useState(rules.commissionPct);
  const [steps, setSteps] = useState<Step[]>(rules.tiers.map((t) => ({ minHours: t.minHours, refundPct: t.refundPct })));
  const [penalty, setPenalty] = useState(rules.latePenalty);
  const [hold, setHold] = useState(rules.payoutHoldHours);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sorted = [...steps].sort((a, b) => b.minHours - a.minHours);
  const tiers: CancellationTier[] = sorted.map((s, i) => ({ minHours: s.minHours, maxHours: i === 0 ? null : sorted[i - 1].minHours, refundPct: s.refundPct, compensationPct: 100 - s.refundPct }));
  const dirty = JSON.stringify({ pct, tiers, penalty, hold }) !== JSON.stringify({ pct: rules.commissionPct, tiers: rules.tiers, penalty: rules.latePenalty, hold: rules.payoutHoldHours });
  const problem =
    pct < 0 || pct > 50
      ? "Meet's share must be from 0 to 50%."
      : !sorted.length || sorted[sorted.length - 1].minHours !== 0
        ? "Add a step that starts at 0 hours, for last-minute cancellations."
        : new Set(sorted.map((s) => s.minHours)).size !== sorted.length
          ? "Two steps start at the same hour."
          : sorted.some((s) => s.refundPct < 0 || s.refundPct > 100)
            ? "Refunds must be from 0 to 100%."
            : null;

  const P = EXAMPLE.amountMinor;
  const preview: { when: string; member: number; companion: number; meet: number; note?: string }[] = [
    ...tiers.map((t) => {
      const gross = share(P, t.compensationPct);
      const meet = share(gross, pct);
      return { when: `Member cancels, ${notice(t)}`, member: P - gross, companion: gross - meet, meet };
    }),
    { when: "Booking finished", member: 0, companion: P - share(P, pct), meet: share(P, pct) },
    { when: `Companion cancels, ${penalty.withinHours} hours or more ahead`, member: P, companion: 0, meet: 0 },
    { when: `Companion cancels, less than ${penalty.withinHours} hours ahead`, member: P, companion: -share(P, penalty.pct), meet: share(P, penalty.pct), note: "Penalty taken from their next payout" },
  ];

  async function save() {
    setError(null);
    if (problem) return setError(problem);
    if (reason.trim().length < 5) return setError("Write a short reason for the audit log.");
    const ok = await confirm({
      title: "Save the new money rules?",
      body: "They apply to bookings made from now on. Existing bookings keep the rules they were made under. The change and your reason go in the audit log.",
      confirmLabel: "Save rules",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.admin.updateMoneyRules({ commissionPct: pct, tiers, latePenalty: penalty, payoutHoldHours: hold }, reason);
      await qc.invalidateQueries({ queryKey: ["admin"] });
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Money rules" sub={`How every booking's money is split. Last changed ${rules.updatedBy ? `by ${rules.updatedBy} on ${dateTime(rules.updatedAt)}` : "never (team defaults)"}.`} />
      {!canEdit && <Notice tone="info">You can see these rules. Only a Super Administrator or the finance team can change them.</Notice>}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-6">
          <section className="surface rounded-card p-6">
            <h2 className="text-lg font-semibold">Meet&apos;s share</h2>
            <p className="mt-1 text-sm text-mute">Taken from what the companion earns, on finished bookings and on cancellation compensation. Never added to the member&apos;s price.</p>
            <div className="mt-4 flex items-center gap-3">
              <PctInput value={pct} onChange={setPct} disabled={!canEdit} label="Meet's share" max={50} />
              <p className="text-sm text-mute">
                Companion keeps <b className="text-cream">{100 - pct}%</b>
              </p>
            </div>
          </section>

          <section className="surface rounded-card p-6">
            <h2 className="text-lg font-semibold">When a member cancels</h2>
            <p className="mt-1 text-sm text-mute">Each step sets how much the member gets back. The rest goes to the companion for the time they kept free, minus Meet&apos;s share.</p>
            <ul className="mt-4 space-y-2">
              {steps.map((s, i) => (
                <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[18px] bg-char p-3">
                  <span className="text-sm text-mute">From</span>
                  <Input aria-label="Hours before start" type="number" min={0} max={720} value={s.minHours} disabled={!canEdit} onChange={(e) => setSteps(steps.map((x, j) => (j === i ? { ...x, minHours: Math.max(0, Number(e.target.value) || 0) } : x)))} className="h-10! w-20! text-center tabular" />
                  <span className="text-sm text-mute">hours before, member gets back</span>
                  <PctInput value={s.refundPct} onChange={(v) => setSteps(steps.map((x, j) => (j === i ? { ...x, refundPct: v } : x)))} disabled={!canEdit} label="Refund" />
                  {canEdit && steps.length > 1 && <IconButton icon={Delete02Icon} label="Remove step" onClick={() => setSteps(steps.filter((_, j) => j !== i))} className="ml-auto" />}
                </li>
              ))}
            </ul>
            {canEdit && (
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => setSteps([...steps, { minHours: 0, refundPct: 0 }])}>
                <Icon icon={Add01Icon} size={15} /> Add a step
              </Button>
            )}
          </section>

          <section className="surface rounded-card p-6">
            <h2 className="text-lg font-semibold">When a companion cancels</h2>
            <p className="mt-1 text-sm text-mute">The member always gets everything back. If the companion cancels late, a penalty is taken from their next payout and their level score drops.</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[18px] bg-char p-3 text-sm text-mute">
              Less than
              <Input aria-label="Late cancellation hours" type="number" min={0} max={168} value={penalty.withinHours} disabled={!canEdit} onChange={(e) => setPenalty({ ...penalty, withinHours: Math.max(0, Number(e.target.value) || 0) })} className="h-10! w-20! text-center tabular" />
              hours ahead: penalty of
              <PctInput value={penalty.pct} onChange={(v) => setPenalty({ ...penalty, pct: v })} disabled={!canEdit} label="Penalty" max={50} />
              of the price
            </div>
          </section>

          <section className="surface rounded-card p-6">
            <h2 className="text-lg font-semibold">Payout safety wait</h2>
            <p className="mt-1 text-sm text-mute">When a companion changes their bank or mobile money details, payouts wait this long. It protects them if someone gets into their account.</p>
            <div className="mt-4 flex items-center gap-3 text-sm text-mute">
              <Input aria-label="Safety wait in hours" type="number" min={0} max={168} value={hold} disabled={!canEdit} onChange={(e) => setHold(Math.max(0, Number(e.target.value) || 0))} className="h-10! w-20! text-center tabular" /> hours
            </div>
          </section>
        </div>

        <div className="space-y-6 xl:sticky xl:top-8 xl:self-start">
          <section className="surface rounded-card p-6">
            <h2 className="text-lg font-semibold">Where the money goes</h2>
            <p className="mt-1 text-sm text-mute">Example: a {m(P)} booking, with the rules on the left.</p>
            <div className="mt-4 overflow-x-auto rounded-[18px] bg-char">
              <table className="w-full min-w-[460px] text-sm">
                <thead className="text-xs text-mute">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">What happens</th>
                    <th className="px-3 py-3 text-right font-medium">Member back</th>
                    <th className="px-3 py-3 text-right font-medium">Companion</th>
                    <th className="px-4 py-3 text-right font-medium">Meet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {preview.map((r) => (
                    <tr key={r.when}>
                      <td className="px-4 py-3">
                        {r.when}
                        {r.note && <span className="block text-xs text-faint">{r.note}</span>}
                      </td>
                      <td className="px-3 py-3 text-right tabular">{m(r.member)}</td>
                      <td className={cx("px-3 py-3 text-right tabular", r.companion < 0 && "text-bad")}>{r.companion < 0 ? `−${m(-r.companion)}` : m(r.companion)}</td>
                      <td className="px-4 py-3 text-right font-medium tabular">{m(r.meet)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-faint">Payment processing costs from Paystack and Flutterwave are paid by Meet out of its share. Tax is not included yet.</p>
            {/* TODO(team): tax per market, and whether processing costs on refunds are absorbed or passed on. */}
          </section>

          {canEdit && (
            <section className="surface rounded-card p-6">
              {error && (
                <Notice tone="bad" className="mb-4">
                  {error}
                </Notice>
              )}
              <Field label="Reason for the change" hint="Saved in the audit log.">
                {(id) => <Textarea id={id} rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Agreed in the finance meeting on 17 November." />}
              </Field>
              <Button variant="accent" size="lg" className="mt-4 w-full" loading={busy} disabled={!dirty} onClick={save}>
                {dirty ? "Save new rules" : "No changes"}
              </Button>
              <p className="mt-2 text-center text-xs text-faint">Applies to new bookings only.</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function notice(t: CancellationTier) {
  if (t.maxHours === null) return `${t.minHours} hours or more ahead`;
  if (t.minHours === 0) return `less than ${t.maxHours} hours ahead`;
  return `${t.minHours} to ${t.maxHours} hours ahead`;
}

function PctInput({ value, onChange, disabled, label, max = 100 }: { value: number; onChange: (v: number) => void; disabled?: boolean; label: string; max?: number }) {
  return (
    <span className="relative inline-flex items-center">
      <Input aria-label={`${label} percent`} type="number" min={0} max={max} step={1} value={value} disabled={disabled} onChange={(e) => onChange(Math.min(max, Math.max(0, Math.round(Number(e.target.value) || 0))))} className="h-10! w-20! pr-7 text-center tabular" />
      <span className="pointer-events-none absolute right-3 text-sm text-mute">%</span>
    </span>
  );
}
