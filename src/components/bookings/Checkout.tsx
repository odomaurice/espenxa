"use client";

/*
 * Payment. In production this hands off to the payment provider and the
 * booking is confirmed only after server-side verification. Here the
 * gateway is simulated and the page says so.
 */
import { ArrowLeft01Icon, BankIcon, CheckmarkBadge01Icon, CreditCardIcon, LockPasswordIcon, SmartPhone01Icon } from "@hugeicons/core-free-icons";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useConfirm } from "@/components/Confirm";
import { Burst } from "@/components/motion";
import { Button, cx, DevNote, ErrorState, errorMessage, Icon, IconButton, Notice, Skeleton } from "@/components/ui";
import { api } from "@/lib/api/client";
import { useBooking, useCheckout } from "@/lib/api/hooks";
import { dateTime, hoursLabel, money } from "@/lib/format";

const METHOD_ICON = { card: CreditCardIcon, bank_transfer: BankIcon, mobile_money: SmartPhone01Icon } as const;

export default function Checkout({ id }: { id: string }) {
  const co = useCheckout(id);
  const b = useBooking(id);
  const router = useRouter();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [method, setMethod] = useState("card");
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (co.isPending || b.isPending) return <Skeleton className="mx-auto h-[520px] max-w-xl" />;
  if (co.isError) return <ErrorState error={co.error} />;
  if (b.isError) return <ErrorState error={b.error} />;
  const c = co.data;
  const bk = b.data;

  async function pay() {
    const ok = await confirm({ title: `Pay ${money(c.breakdown.total)}?`, body: `This confirms your booking with ${bk.provider.displayName}. The cancellation policy on the booking applies from now.`, confirmLabel: `Pay ${money(c.breakdown.total)}` });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await api.bookings.pay(id, method);
      setPaid(true);
      await qc.invalidateQueries({ queryKey: ["bookings"] });
      await qc.invalidateQueries({ queryKey: ["booking", id] });
      setTimeout(() => router.replace(`/bookings/${id}`), 1800);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-center gap-3">
        <IconButton icon={ArrowLeft01Icon} label="Back" tone="filled" onClick={() => router.back()} />
        <p className="text-sm text-mute">Checkout · {bk.reference}</p>
      </div>

      <AnimatePresence mode="wait">
        {paid ? (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="surface flex flex-col items-center rounded-[10px] px-6 py-16 text-center">
            <span className="relative grid size-24 place-items-center">
              <motion.span className="absolute inset-0 rounded-full bg-ok/15" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 12 }} />
              <motion.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.1 }} className="relative text-ok">
                <Icon icon={CheckmarkBadge01Icon} size={46} />
              </motion.span>
              <Burst k={1} color="var(--color-ok)" />
            </span>
            <p className="display mt-6 text-[32px]">Booking confirmed</p>
            <p className="mt-2 text-sm text-mute">Taking you to your booking…</p>
          </motion.div>
        ) : (
          <motion.div key="form" exit={{ opacity: 0, y: -10 }} className="space-y-5">
            <h1 className="display text-[36px]">Confirm and pay</h1>
            {error && <Notice tone="bad">{error}</Notice>}
            {!c.available && <Notice tone="warn">{c.unavailableReason}</Notice>}

            <section className="rounded-[10px] bg-cream p-6 text-ink">
              <p className="text-sm text-ink/55">
                {hoursLabel(bk.hours)} with {bk.provider.displayName} · {dateTime(bk.startAt, bk.timezone)}
              </p>
              <dl className="mt-4 space-y-2.5 text-[15px]">
                <div className="flex justify-between">
                  <dt>Companion price</dt>
                  <dd className="font-medium tabular">{money(c.breakdown.price)}</dd>
                </div>
                <div className="flex justify-between text-ink/55">
                  <dt>Booking fee</dt>
                  <dd>None</dd>
                </div>
                <div className="flex justify-between text-ink/55">
                  <dt>Taxes</dt>
                  <dd className="tabular">{c.breakdown.tax ? money(c.breakdown.tax) : "To be set"}</dd>
                </div>
              </dl>
              <div className="mt-4 flex items-baseline justify-between border-t border-ink/10 pt-4">
                <span className="font-semibold">Total</span>
                <span className="text-3xl font-semibold tabular">{money(c.breakdown.total)}</span>
              </div>
            </section>

            <section>
              <h2 className="mb-3 px-1 text-[15px] font-semibold">Pay with</h2>
              <div className="grid gap-2.5">
                {c.methods.map((m) => {
                  const on = method === m.id;
                  return (
                    <button key={m.id} type="button" aria-pressed={on} onClick={() => setMethod(m.id)} className={cx("flex items-center gap-4 rounded-[10px] p-4 text-left transition-colors", on ? "bg-char ring-2 ring-cream" : "bg-coal hover:bg-char")}>
                      <span className={cx("grid size-11 place-items-center rounded-full", on ? "bg-cream text-ink" : "bg-smoke")}>
                        <Icon icon={METHOD_ICON[m.kind]} size={19} />
                      </span>
                      <span className="flex-1 text-[15px] font-medium">{m.label}</span>
                      <span className={cx("size-5 rounded-full", on ? "bg-ember ring-4 ring-ember/25" : "ring-2 ring-smoke")} />
                    </button>
                  );
                })}
              </div>
            </section>

            {c.simulated && <DevNote>No payment gateway is connected. Paying here only simulates a verified payment; no money moves.</DevNote>}

            <Button variant="accent" size="lg" className="w-full" loading={busy} disabled={!c.available} onClick={pay}>
              <Icon icon={LockPasswordIcon} size={17} /> Pay {money(c.breakdown.total)}
            </Button>
            <p className="text-center text-xs leading-relaxed text-faint">
              Paid securely through {c.gateway === "paystack" ? "Paystack" : "Flutterwave"}. espenxa holds the money and pays {bk.provider.displayName} only after your time together is finished. If {bk.provider.displayName} cancels, you get everything back to the same card or account.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
