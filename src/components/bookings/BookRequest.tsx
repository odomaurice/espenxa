"use client";

import { ArrowLeft01Icon, Clock01Icon, Location01Icon, Shield01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useConfirm } from "@/components/Confirm";
import { Avatar, Button, cx, ErrorState, errorMessage, Field, fieldErrors, Icon, IconButton, Input, Notice, RankBadge, Skeleton, Stars, Textarea, Verified } from "@/components/ui";
import { api } from "@/lib/api/client";
import { useCategories, usePerson } from "@/lib/api/hooks";
import { DURATIONS, type DurationHours, type Profile } from "@/lib/api/types";
import { hoursLabel, money } from "@/lib/format";

export default function BookRequest({ id }: { id: string }) {
  const person = usePerson(id);
  if (person.isPending) return <Skeleton className="h-[560px]" />;
  if (person.isError) return <ErrorState error={person.error} retry={() => person.refetch()} />;
  if (!person.data.provider) return <ErrorState error={new Error("This person is not offering experiences.")} />;
  return <Form p={person.data} />;
}

function minStart() {
  const d = new Date(Date.now() + 3 * 3_600_000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

function Form({ p }: { p: Profile }) {
  const router = useRouter();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const cats = useCategories();
  const pr = p.provider!;
  const offered = cats.data?.filter((c) => pr.categories.includes(c.id)) ?? [];
  const free = pr.arrangement === "free";
  const available = DURATIONS.filter((h) => free || pr.rates.some((r) => r.hours === h && r.enabled && r.price));
  const [cat, setCat] = useState<string>(pr.categories[0]);
  const [hours, setHours] = useState<DurationHours>(available[0] ?? 1);
  const [when, setWhen] = useState(minStart());
  const [area, setArea] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const rate = pr.rates.find((r) => r.hours === hours);
  const catName = offered.find((c) => c.id === cat)?.name ?? "Experience";

  async function submit() {
    const ok = await confirm({
      title: `Send this request to ${p.displayName}?`,
      body: `${catName}, ${hoursLabel(hours)}, ${new Date(when).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}. You will not be charged until ${p.displayName} accepts and you pay.`,
      confirmLabel: "Send request",
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const b = await api.bookings.request({ providerId: p.id, categoryId: cat, hours, startAt: new Date(when).toISOString(), meetingArea: area, notes });
      await qc.invalidateQueries({ queryKey: ["bookings"] });
      router.replace(`/bookings/${b.id}`);
    } catch (e) {
      setErrors(fieldErrors(e));
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <IconButton icon={ArrowLeft01Icon} label="Back" tone="filled" onClick={() => router.back()} />
        <p className="text-sm text-mute">Request a booking</p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-8">
          <h1 className="display text-[34px] sm:text-[42px]">Plan your time with {p.displayName}</h1>
          {error && <Notice tone="bad">{error}</Notice>}

          <section>
            <h2 className="mb-3 text-[15px] font-semibold">1. Experience</h2>
            <div className="flex flex-wrap gap-2">
              {offered.map((c) => (
                <button key={c.id} type="button" aria-pressed={cat === c.id} onClick={() => setCat(c.id)} className={cx("rounded-full px-4 py-2.5 text-sm font-medium transition-colors", cat === c.id ? "bg-cream text-ink" : "bg-char hover:bg-smoke")}>
                  {c.name}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-[15px] font-semibold">2. How long</h2>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {DURATIONS.map((h) => {
                const r = pr.rates.find((x) => x.hours === h);
                const ok = available.includes(h);
                const on = hours === h;
                return (
                  <motion.button key={h} type="button" disabled={!ok} aria-pressed={on} whileTap={ok ? { scale: 0.97 } : undefined} onClick={() => setHours(h)} className={cx("relative rounded-[10px] p-4 text-left transition-colors disabled:opacity-35", on ? "bg-cream text-ink" : "bg-char hover:bg-smoke")}>
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <Icon icon={Clock01Icon} size={15} /> {hoursLabel(h)}
                    </span>
                    <span className="mt-2 block text-lg font-semibold tabular">{!ok ? "Not offered" : free ? "Free" : money(r!.price)}</span>
                    {on && (
                      <motion.span layoutId="dur-tick" className="absolute top-3 right-3 grid size-6 place-items-center rounded-full bg-ink text-cream">
                        <Icon icon={Tick02Icon} size={13} stroke={2.6} />
                      </motion.span>
                    )}
                  </motion.button>
                );
              })}
            </div>
            {errors.hours && <p className="mt-2 text-xs text-bad">{errors.hours}</p>}
          </section>

          <section className="grid gap-5 sm:grid-cols-2">
            <Field label="3. Date and start time" error={errors.startAt} hint={`Times are in ${p.provider ? "the companion's" : "local"} timezone.`}>
              {(fid, d) => <Input id={fid} aria-describedby={d} type="datetime-local" min={minStart()} value={when} onChange={(e) => setWhen(e.target.value)} />}
            </Field>
            <Field label="4. Where to meet" error={errors.meetingArea} hint="A public place. Never a home address.">
              {(fid, d) => <Input id={fid} aria-describedby={d} placeholder="e.g. Lekki Arts Market, main gate" maxLength={120} value={area} onChange={(e) => setArea(e.target.value)} />}
            </Field>
          </section>

          <Field label="Anything they should know?" optional hint="The plan, the occasion, what to wear. No contact details.">
            {(fid, d) => <Textarea id={fid} aria-describedby={d} rows={3} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />}
          </Field>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <div className="surface rounded-[10px] p-5">
            <div className="flex items-center gap-3.5">
              <Avatar src={p.photos[0]} name={p.displayName} size={56} ring />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 text-lg font-semibold">
                  {p.displayName} {p.verified && <Verified size={17} />}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <RankBadge rank={pr.rank} size="sm" />
                  <Stars value={pr.rating.average} count={pr.rating.count} />
                </div>
              </div>
            </div>
            <dl className="mt-5 space-y-3 border-t border-line pt-5 text-[14.5px]">
              <div className="flex justify-between gap-3">
                <dt className="text-mute">Experience</dt>
                <dd className="text-right font-medium">{catName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mute">Duration</dt>
                <dd className="font-medium">{hoursLabel(hours)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mute">Where</dt>
                <dd className="flex items-center gap-1 text-right font-medium">
                  <Icon icon={Location01Icon} size={14} className="text-mute" /> {area || "Not set"}
                </dd>
              </div>
            </dl>
            <div className="mt-5 flex items-baseline justify-between rounded-[10px] bg-char p-4">
              <span className="text-sm text-mute">Price</span>
              <motion.span key={hours} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-2xl font-semibold tabular">
                {free ? "Free" : money(rate?.price)}
              </motion.span>
            </div>
            {pr.negotiable && <p className="mt-2 text-xs text-mute">{p.displayName} is open to discussing the price.</p>}
            <Button variant="accent" size="lg" className="mt-5 w-full" loading={busy} onClick={submit}>
              Send request
            </Button>
            <p className="mt-3 text-center text-xs text-faint">No charge until {p.displayName} accepts and you pay through espenxa.</p>
          </div>
          <p className="flex items-start gap-2 px-2 text-xs leading-relaxed text-faint">
            <Icon icon={Shield01Icon} size={15} className="mt-px shrink-0" /> A booking is for time and company. It never includes physical contact, and consent is never part of a payment.
          </p>
        </aside>
      </div>
    </div>
  );
}
