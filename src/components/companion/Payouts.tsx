"use client";

/*
 * Payouts: where a companion's earnings go and the button to withdraw.
 * Details are checked with the bank or network (the name must match the
 * verified identity), confirmed with a code, and a change waits a safety
 * period before money can go to it. Only the last 4 digits come back.
 */
import { ArrowLeft01Icon, BankIcon, CheckmarkCircle02Icon, Alert02Icon, LockPasswordIcon, PencilEdit02Icon, Search01Icon, SmartPhone01Icon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { useConfirm } from "@/components/Confirm";
import { Badge, Button, cx, DevNote, errorMessage, ErrorState, Field, fieldErrors, Icon, Input, Notice, PageHeader, Skeleton } from "@/components/ui";
import { api, devTools } from "@/lib/api/client";
import { qk, useEarnings, usePayouts } from "@/lib/api/hooks";
import type { PayoutAccount, PayoutInstitution, PayoutKind, PayoutOptions } from "@/lib/api/types";
import { dateOnly, dateTime, money } from "@/lib/format";

const GATEWAY = { paystack: "Paystack", flutterwave: "Flutterwave" } as const;

export default function Payouts() {
  const options = useQuery({ queryKey: ["provider", "payout-options"], queryFn: api.provider.payoutOptions });
  const account = useQuery({ queryKey: ["provider", "payout-account"], queryFn: api.provider.payoutAccount });
  const earn = useEarnings();
  const history = usePayouts();
  const [editing, setEditing] = useState(false);
  const [now] = useState(() => Date.now());

  if (options.isPending || account.isPending || earn.isPending) return <Skeleton className="h-[520px]" />;
  if (options.isError) return <ErrorState error={options.error} retry={() => options.refetch()} />;
  const o = options.data;
  const acc = account.data ?? null;
  const e = earn.data;
  const waiting = !!acc && new Date(acc.activeFrom).getTime() > now;

  return (
    <div className="space-y-6">
      <Link href="/companion" className="inline-flex items-center gap-1.5 text-sm text-mute hover:text-cream">
        <Icon icon={ArrowLeft01Icon} size={15} /> My earnings
      </Link>
      <PageHeader title="Payouts" sub="Where your earnings are sent, and when." />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Withdraw available={e?.available ?? null} acc={acc} waiting={waiting} enabled={o.enabled} />
          <section className="surface rounded-card p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Your payout details</h2>
              {acc && !editing && (
                <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                  Change
                </Button>
              )}
            </div>
            <AnimatePresence mode="wait" initial={false}>
              {acc && !editing ? (
                <motion.div key="card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <AccountCard acc={acc} waiting={waiting} />
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <PayoutForm o={o} changing={!!acc} onDone={() => setEditing(false)} onCancel={acc ? () => setEditing(false) : undefined} />
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>

        <div className="space-y-6">
          <section className="surface rounded-card p-6">
            <h2 className="text-lg font-semibold">How payouts work</h2>
            <ol className="mt-4 space-y-3 text-[14.5px] leading-relaxed text-cream/85">
              {[
                "The member pays Meet when the booking is confirmed. The money is held safely.",
                "After the booking is finished and the member confirms, your share moves to Ready to withdraw.",
                `You withdraw to your bank or mobile money. ${GATEWAY[o.gateway]} sends it.`,
              ].map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-char text-xs font-semibold">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
            <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-faint">
              <Icon icon={LockPasswordIcon} size={14} className="mt-px shrink-0" /> Meet never stores your full account number. It is held by {GATEWAY[o.gateway]}, our payment partner in your country. Staff only see the last 4 digits.
            </p>
          </section>

          <section className="surface rounded-card p-6">
            <h2 className="text-lg font-semibold">Payouts sent</h2>
            {!history.data?.length ? (
              <p className="mt-2 text-sm text-mute">Nothing sent yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {history.data.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span>
                      <span className="block font-medium">{p.method}</span>
                      <span className="text-xs text-mute">{dateOnly(p.at)}</span>
                    </span>
                    <span className="text-right">
                      <span className="block font-semibold tabular">{money(p.amount)}</span>
                      <Badge tone={p.status === "paid" ? "ok" : p.status === "failed" ? "bad" : "warn"} className="mt-1 h-5 px-2 text-[10.5px]">
                        {p.status === "paid" ? "Sent" : p.status === "failed" ? "Failed" : "On the way"}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <DevNote>Payouts are simulated. {GATEWAY[o.gateway]} is not connected yet, so no money is sent.</DevNote>
        </div>
      </div>
    </div>
  );
}

function Withdraw({ available, acc, waiting, enabled }: { available: { amountMinor: number; currency: string } | null; acc: PayoutAccount | null; waiting: boolean; enabled: boolean }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const amount = available?.amountMinor ?? 0;
  const blocker = !enabled ? "Payouts are not open in your country yet." : !acc ? "Add your payout details below first." : acc.check === "pending_review" ? "Meet is checking your payout details. This usually takes 1 working day." : acc.check === "rejected" ? "Your payout details were not confirmed. Please add them again." : waiting ? `Your new details are in their safety wait until ${dateTime(acc.activeFrom)}.` : amount <= 0 ? "Nothing is ready to withdraw yet." : null;
  return (
    <section className="relative overflow-hidden rounded-card bg-coal p-6">
      <div className="pointer-events-none absolute -top-20 -right-16 size-64 rounded-full bg-ok/10 blur-3xl" aria-hidden />
      <p className="relative flex items-center gap-2 text-sm text-ok">
        <Icon icon={Wallet01Icon} size={17} /> Ready to withdraw
      </p>
      <p className="display relative mt-2 text-[44px] tabular">{available ? money(available) : "None"}</p>
      {error && (
        <Notice tone="bad" className="relative mt-3">
          {error}
        </Notice>
      )}
      {sent && (
        <Notice tone="ok" className="relative mt-3">
          {sent}
        </Notice>
      )}
      <Button
        variant="accent"
        size="lg"
        className="relative mt-5 w-full"
        loading={busy}
        disabled={!!blocker}
        onClick={async () => {
          if (!acc || !available) return;
          const ok = await confirm({ title: `Withdraw ${money(available)}?`, body: `It goes to ${acc.institution} ending ${acc.last4}, in the name ${acc.accountName}.`, confirmLabel: "Withdraw" });
          if (!ok) return;
          setBusy(true);
          setError(null);
          try {
            const p = await api.provider.withdraw();
            setSent(`${money(p.amount)} sent to ${acc.institution} ending ${acc.last4} (simulated).`);
            qc.invalidateQueries({ queryKey: qk.earnings });
            qc.invalidateQueries({ queryKey: qk.payouts });
          } catch (e) {
            setError(errorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        Withdraw
      </Button>
      {blocker && <p className="relative mt-2 text-center text-xs text-mute">{blocker}</p>}
    </section>
  );
}

function AccountCard({ acc, waiting }: { acc: PayoutAccount; waiting: boolean }) {
  const badge = acc.check === "pending_review" ? (["warn", "Being checked"] as const) : acc.check === "rejected" ? (["bad", "Not confirmed"] as const) : waiting ? (["warn", "Safety wait"] as const) : (["ok", "Ready"] as const);
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-4 rounded-[20px] bg-char p-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-cream text-ink">
          <Icon icon={acc.kind === "bank" ? BankIcon : SmartPhone01Icon} size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">
            {acc.institution} ending <span className="tabular">{acc.last4}</span>
          </span>
          <span className="block truncate text-sm text-mute">{acc.accountName}</span>
        </span>
        <Badge tone={badge[0]}>{badge[1]}</Badge>
      </div>
      {acc.check === "pending_review" && <Notice tone="warn">You typed these details in, so Meet checks that the account is in your name before sending money. This usually takes 1 working day.</Notice>}
      {acc.check === "rejected" && <Notice tone="bad">We could not confirm this account is in your name. Tap Change and add an account in your own name.</Notice>}
      {waiting && acc.check === "verified" && <Notice tone="warn">For your safety, money can go to these new details from {dateTime(acc.activeFrom)}. If you did not make this change, contact Meet support now.</Notice>}
      <p className="text-xs text-faint">Added {dateOnly(acc.addedAt)} · sent by {GATEWAY[acc.gateway]}</p>
    </div>
  );
}

type Stage = "details" | "checked" | "code";

/** Type to search the full list; "not listed" switches to typing the bank in by hand. */
function BankPicker({ items, value, onPick, onManual, kind, disabled }: { items: PayoutInstitution[]; value: string; onPick: (code: string) => void; onManual: () => void; kind: PayoutKind; disabled?: boolean }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const picked = items.find((i) => i.code === value);
  const shown = items.filter((i) => i.name.toLowerCase().includes(q.trim().toLowerCase()));
  const word = kind === "bank" ? "bank" : "network";
  return (
    <div className="relative">
      <label className={cx("flex h-12 items-center gap-2.5 rounded-2xl bg-char px-4 focus-within:ring-2 focus-within:ring-cream/25", disabled && "opacity-60")}>
        <Icon icon={Search01Icon} size={17} className="shrink-0 text-mute" />
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls="bank-list"
          aria-label={`Search for your ${word}`}
          disabled={disabled}
          value={open ? q : (picked?.name ?? q)}
          placeholder={`Search ${items.length} ${kind === "bank" ? "banks" : "networks"}`}
          onFocus={() => {
            setOpen(true);
            setQ("");
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-cream placeholder:text-faint focus:outline-none"
        />
      </label>
      <AnimatePresence>
        {open && (
          <motion.ul
            id="bank-list"
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute inset-x-0 top-14 z-20 max-h-72 overflow-y-auto rounded-2xl bg-smoke p-1.5 shadow-[0_20px_50px_-10px_rgb(0_0_0/0.8)]"
          >
            {shown.map((i) => (
              <li key={i.code} role="option" aria-selected={i.code === value}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onPick(i.code);
                    setQ("");
                    setOpen(false);
                  }}
                  className={cx("flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[14.5px] hover:bg-white/8", i.code === value && "bg-white/10 font-semibold")}
                >
                  {i.name}
                  {i.code === value && <Icon icon={CheckmarkCircle02Icon} size={16} className="text-ok" />}
                </button>
              </li>
            ))}
            {!shown.length && <li className="px-3 py-2.5 text-sm text-mute">No {word} called &ldquo;{q}&rdquo; in the list.</li>}
            <li>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setOpen(false);
                  onManual();
                }}
                className="mt-1 flex w-full items-center gap-2 rounded-xl border-t border-line px-3 py-3 text-left text-[14.5px] font-semibold text-ember-hi hover:bg-white/8"
              >
                <Icon icon={PencilEdit02Icon} size={16} /> My {word} is not listed
              </button>
            </li>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function PayoutForm({ o, changing, onDone, onCancel }: { o: PayoutOptions; changing: boolean; onDone: () => void; onCancel?: () => void }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const kinds = Array.from(new Set(o.institutions.map((i) => i.kind)));
  const [kind, setKind] = useState<PayoutKind>(kinds[0] ?? "bank");
  const [code, setCode] = useState("");
  const [manual, setManual] = useState(false);
  const [bankName, setBankName] = useState("");
  const [holder, setHolder] = useState("");
  const [mine, setMine] = useState(false);
  const [number, setNumber] = useState("");
  const [stage, setStage] = useState<Stage>("details");
  const [name, setName] = useState<{ accountName: string; matchesVerifiedName: boolean } | null>(null);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [code6, setCode6] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const list = o.institutions.filter((i) => i.kind === kind);
  const inst = list.find((i) => i.code === code);
  const digits = number.replace(/\D/g, "");
  const word = kind === "bank" ? "bank" : "network";

  const reset = () => {
    setStage("details");
    setName(null);
    setCode6("");
    setError(null);
  };

  async function check() {
    setBusy(true);
    setErrors({});
    setError(null);
    try {
      const r = await api.provider.resolveAccount(code, number);
      setName(r);
      setStage("checked");
    } catch (e) {
      setErrors(fieldErrors(e));
      setError(errorMessage(e));
      setLookupFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function sendCode() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.provider.requestPayoutCode();
      setSentTo(r.sentTo);
      setStage("code");
      if (devTools) {
        const box = await devTools.outbox();
        setDemoCode(box[0]?.body.match(/\d{6}/)?.[0] ?? null);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const label = `${manual ? bankName.trim() : inst?.name} ending ${digits.slice(-4)}`;
    const ok = await confirm(
      changing
        ? { title: "Change where you are paid?", body: `For your safety, money can only go to ${label} after ${o.holdHours} hours${manual ? ", and once Meet has checked the account is in your name" : ""}. We will also email you about this change.`, confirmLabel: "Change details" }
        : { title: "Save your payout details?", body: manual ? `Meet will check that ${label} is in your name before sending money. This usually takes 1 working day.` : `Your earnings will go to ${label}.`, confirmLabel: "Save" },
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await api.provider.setPayoutAccount({ kind, code: manual ? null : code, number, code6, manual: manual ? { institution: bankName, accountName: holder } : undefined });
      await qc.invalidateQueries({ queryKey: ["provider"] });
      onDone();
    } catch (e) {
      setErrors(fieldErrors(e));
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  const manualReady = bankName.trim().length >= 2 && holder.trim().length >= 3 && digits.length >= 6 && mine;

  return (
    <div className="mt-4 space-y-4">
      {!changing && <p className="text-sm text-mute">Add the bank account or mobile money number your earnings should go to. It must be in your own name, the same as your verified ID.</p>}
      {error && <Notice tone="bad">{error}</Notice>}

      {kinds.length > 1 && (
        <div className="grid grid-cols-2 gap-2">
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              disabled={stage === "code"}
              onClick={() => {
                setKind(k);
                setCode("");
                setManual(false);
                reset();
              }}
              className={cx("flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition-colors", kind === k ? "bg-cream text-ink" : "bg-char text-mute hover:text-cream")}
            >
              <Icon icon={k === "bank" ? BankIcon : SmartPhone01Icon} size={17} /> {k === "bank" ? "Bank account" : "Mobile money"}
            </button>
          ))}
        </div>
      )}

      {!manual ? (
        <Field label={kind === "bank" ? "Bank" : "Network"} error={errors.code}>
          {() => (
            <BankPicker
              items={list}
              value={code}
              kind={kind}
              disabled={stage === "code"}
              onPick={(c) => {
                setCode(c);
                reset();
              }}
              onManual={() => {
                setManual(true);
                reset();
              }}
            />
          )}
        </Field>
      ) : (
        <div className="space-y-4 rounded-[20px] bg-char/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-mute">Type your details exactly as your {word} shows them. Meet checks the account is in your name before the first payout.</p>
            <button
              type="button"
              disabled={stage === "code"}
              onClick={() => {
                setManual(false);
                setLookupFailed(false);
                reset();
              }}
              className="shrink-0 text-sm font-semibold text-ember-hi hover:underline"
            >
              Use the list
            </button>
          </div>
          <Field label={kind === "bank" ? "Bank name" : "Network name"}>{(id) => <Input id={id} maxLength={80} value={bankName} disabled={stage === "code"} onChange={(e) => setBankName(e.target.value)} placeholder={kind === "bank" ? "For example, Ecobank" : "For example, MTN Mobile Money"} />}</Field>
          <Field label="Name on the account" hint="As it appears on your bank statement or mobile money account.">
            {(id) => <Input id={id} maxLength={80} autoComplete="name" value={holder} disabled={stage === "code"} onChange={(e) => setHolder(e.target.value)} />}
          </Field>
        </div>
      )}

      <Field label={kind === "bank" ? "Account number" : "Mobile money number"} error={errors.number}>
        {(id) => (
          <Input
            id={id}
            inputMode="numeric"
            autoComplete="off"
            maxLength={24}
            value={number}
            disabled={stage === "code"}
            placeholder={kind === "bank" ? "0123456789" : "0712 345 678"}
            onChange={(e) => {
              setNumber(e.target.value);
              if (!manual) reset();
            }}
          />
        )}
      </Field>

      {manual && stage === "details" && (
        <>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="mt-0.5 size-4 accent-ember" />
            <span>This account is in my own name. I understand Meet will not send money to anyone else&apos;s account.</span>
          </label>
          <Button size="lg" className="w-full" loading={busy} disabled={!manualReady} onClick={sendCode}>
            Send me a code to confirm
          </Button>
        </>
      )}

      {!manual && stage === "details" && (
        <>
          <Button size="lg" className="w-full" loading={busy} disabled={!code || digits.length < 8} onClick={check}>
            Check account
          </Button>
          {lookupFailed && (
            <button
              type="button"
              onClick={() => {
                setManual(true);
                setBankName(inst?.name ?? "");
                reset();
              }}
              className="w-full text-center text-sm font-semibold text-ember-hi hover:underline"
            >
              Cannot check it? Enter the account name yourself
            </button>
          )}
        </>
      )}

      {!manual && name && stage !== "details" && (
        <div className={cx("flex items-start gap-3 rounded-[20px] p-4", name.matchesVerifiedName ? "bg-ok/10" : "bg-bad/10")}>
          <Icon icon={name.matchesVerifiedName ? CheckmarkCircle02Icon : Alert02Icon} size={20} className={cx("mt-0.5 shrink-0", name.matchesVerifiedName ? "text-ok" : "text-bad")} />
          <div className="text-sm">
            <p className="font-semibold">{name.accountName}</p>
            <p className="text-mute">{name.matchesVerifiedName ? "This matches your verified name." : "This account is in someone else's name. Earnings can only go to an account in your own name."}</p>
          </div>
        </div>
      )}

      {!manual && stage === "checked" && name?.matchesVerifiedName && (
        <Button size="lg" className="w-full" loading={busy} onClick={sendCode}>
          Send me a code to confirm
        </Button>
      )}

      {stage === "code" && (
        <>
          <Field label="6-digit code" hint={`Sent to ${sentTo}.`} error={errors.code6}>
            {(id) => <Input id={id} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code6} onChange={(e) => setCode6(e.target.value.replace(/\D/g, ""))} className="text-center text-xl tracking-[0.4em] tabular" />}
          </Field>
          {demoCode && <DevNote>Demo code from the simulated outbox: {demoCode}</DevNote>}
          <Button variant="accent" size="lg" className="w-full" loading={busy} disabled={code6.length !== 6} onClick={save}>
            Save payout details
          </Button>
        </>
      )}

      {onCancel && (
        <Button variant="ghost" size="md" className="w-full" onClick={onCancel}>
          Keep my current details
        </Button>
      )}
      {changing && <p className="text-center text-xs text-faint">After a change, payouts wait {o.holdHours} hours. This protects you if someone else gets into your account.</p>}
    </div>
  );
}
