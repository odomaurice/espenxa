"use client";

/*
 * Companion-only onboarding: what they offer, their own prices for the six
 * durations, and when they are usually free. Prices are the companion's choice;
 * Meet never suggests or fixes them.
 */
import { Clock01Icon } from "@hugeicons/core-free-icons";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Chip, cx, Field, Icon, Input, Notice, Switch, Textarea } from "@/components/ui";
import { useCategories, useProviderSettings } from "@/lib/api/hooks";
import { DURATIONS, type AvailabilityWindow, type ProviderSettings, type Rate } from "@/lib/api/types";
import { currencySymbol, hoursLabel, toMajorInput, toMinor } from "@/lib/format";
import { ARRANGEMENTS } from "@/lib/labels";
import { useStepSave } from "./MemberSteps";
import { StepTitle, type StepProps } from "./Onboarding";

function useSettings(): ProviderSettings | undefined {
  return useProviderSettings().data;
}

/* ---- experiences -------------------------------------------------------------- */

export function ExperiencesStep({ onReady }: StepProps) {
  const s = useSettings();
  const cats = useCategories();
  const [v, setV] = useState<Pick<ProviderSettings, "headline" | "arrangement" | "categories" | "expensesNote"> | null>(null);
  if (!v && s) setV({ headline: s.headline, arrangement: s.arrangement, categories: s.categories, expensesNote: s.expensesNote });
  const { errors, error } = useStepSave(onReady, () => (v ? { step: "experiences", data: v } : null));
  if (!v) return null;
  const set = (p: Partial<typeof v>) => setV({ ...v, ...p });

  return (
    <>
      <StepTitle title="What will you offer?" sub="Pick the experiences you are happy to offer. You can change these any time from your companion dashboard." />
      {error && <Notice tone="bad" className="mb-5">{error}</Notice>}
      <div className="space-y-7">
        <div>
          <p className="mb-2.5 px-1 text-[13px] font-medium text-cream/90">How would you like to offer your time?</p>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {ARRANGEMENTS.map((a) => {
              const on = v.arrangement === a.id;
              return (
                <motion.button key={a.id} type="button" aria-pressed={on} whileTap={{ scale: 0.97 }} onClick={() => set({ arrangement: a.id })} className={cx("rounded-[20px] p-4 text-left transition-colors", on ? "bg-cream text-ink" : "bg-char hover:bg-smoke")}>
                  <span className="block text-[15px] font-semibold">{a.label}</span>
                  <span className={cx("mt-0.5 block text-xs", on ? "text-ink/60" : "text-mute")}>{a.sub}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2.5 px-1 text-[13px] font-medium text-cream/90">Experiences</p>
          <div className="flex flex-wrap gap-2">
            {cats.data?.map((c) => (
              <Chip key={c.id} on={v.categories.includes(c.id)} onClick={() => set({ categories: v.categories.includes(c.id) ? v.categories.filter((x) => x !== c.id) : [...v.categories, c.id] })}>
                {c.name}
              </Chip>
            ))}
          </div>
          {errors.categories && <p className="mt-2 px-1 text-xs text-bad">{errors.categories}</p>}
        </div>

        <Field label="Headline" optional hint={`${v.headline.length}/80. One line that sums up your experiences.`}>
          {(id, h) => <Input id={id} aria-describedby={h} maxLength={80} placeholder="City days and evenings out around Lagos" value={v.headline} onChange={(e) => set({ headline: e.target.value })} />}
        </Field>

        <Field label="Extra costs members may cover" optional hint="Tickets, entry fees, transport. Always agreed before a booking. Nothing of a sexual nature.">
          {(id, h) => <Textarea id={id} aria-describedby={h} rows={2} maxLength={200} value={v.expensesNote} onChange={(e) => set({ expensesNote: e.target.value })} />}
        </Field>
      </div>
    </>
  );
}

/* ---- rates -------------------------------------------------------------------------- */

export function RatesStep({ onReady }: StepProps) {
  const s = useSettings();
  const [rows, setRows] = useState<{ hours: Rate["hours"]; on: boolean; text: string }[] | null>(null);
  const [negotiable, setNegotiable] = useState(false);
  if (!rows && s) {
    setRows(DURATIONS.map((h) => {
      const r = s.rates.find((x) => x.hours === h);
      return { hours: h, on: !!r?.enabled, text: toMajorInput(r?.price ?? null) };
    }));
    setNegotiable(s.negotiable);
  }
  const currency = s?.currency ?? "NGN";
  const { errors, error } = useStepSave(onReady, () =>
    rows
      ? {
          step: "rates",
          data: {
            negotiable,
            rates: rows.map((r) => {
              const minor = r.on ? toMinor(r.text, currency) : null;
              return { hours: r.hours, enabled: r.on, price: minor ? { amountMinor: minor, currency } : null };
            }),
          },
        }
      : null,
  );
  if (!rows || !s) return null;

  if (s.arrangement === "free")
    return (
      <>
        <StepTitle title="Your prices" sub="You chose to offer your time for free, so there is nothing to price. Continue to save this step." />
        <Notice tone="info">Switch to Paid or Flexible in the previous step if you would like to charge for your time.</Notice>
      </>
    );

  const sym = currencySymbol(currency);
  return (
    <>
      <StepTitle title="Set your prices" sub={`Turn on the durations you offer and set your own price for each, in ${currency}. Members always see the price before they request.`} />
      {error && <Notice tone="bad" className="mb-5">{error}</Notice>}
      <ul className="space-y-2.5">
        {rows.map((r, i) => (
          <motion.li key={r.hours} layout className={cx("rounded-[22px] p-4 transition-colors", r.on ? "bg-char" : "bg-coal")}>
            <div className="flex items-center gap-4">
              <span className={cx("grid size-11 shrink-0 place-items-center rounded-full", r.on ? "bg-cream text-ink" : "bg-smoke text-mute")}>
                <Icon icon={Clock01Icon} size={19} stroke={2} />
              </span>
              <span className="flex-1">
                <span className="block text-[15px] font-semibold">{hoursLabel(r.hours)}</span>
                <span className="block text-xs text-mute">{r.on ? "Offered" : "Not offered"}</span>
              </span>
              <Switch label={`Offer ${hoursLabel(r.hours)}`} on={r.on} onChange={(on) => setRows(rows.map((x, j) => (j === i ? { ...x, on } : x)))} />
            </div>
            <AnimatePresence initial={false}>
              {r.on && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="pt-4">
                    <div className={cx("flex items-center rounded-2xl bg-ink/60 focus-within:ring-2 focus-within:ring-cream/25", errors[`rate_${r.hours}`] && "ring-2 ring-bad/60")}>
                      <span className="pl-4 text-lg font-semibold text-mute">{sym}</span>
                      <input
                        aria-label={`Price for ${hoursLabel(r.hours)}`}
                        inputMode="decimal"
                        placeholder="0"
                        value={r.text}
                        onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, text: e.target.value.replace(/[^\d.,]/g, "") } : x)))}
                        className="h-13 w-full bg-transparent px-2 text-lg font-semibold tabular placeholder:text-faint focus:outline-none"
                      />
                    </div>
                    {errors[`rate_${r.hours}`] && <p className="mt-1.5 px-1 text-xs text-bad">{errors[`rate_${r.hours}`]}</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.li>
        ))}
      </ul>
      {errors.rates && <p className="mt-3 px-1 text-xs text-bad">{errors.rates}</p>}
      <div className="mt-6 flex items-center justify-between gap-4 rounded-[22px] bg-char p-4">
        <div>
          <p className="text-[15px] font-medium">Open to discussion</p>
          <p className="text-xs text-mute">Members can propose a different price before you accept.</p>
        </div>
        <Switch label="Prices are negotiable" on={negotiable} onChange={setNegotiable} />
      </div>
      <p className="mt-4 text-xs leading-relaxed text-faint">A booking pays for your time and company for a social experience. It never buys physical contact, and you can end any experience at any time.</p>
    </>
  );
}

/* ---- availability ---------------------------------------------------------------------- */

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export function AvailabilityStep({ onReady }: StepProps) {
  const s = useSettings();
  const [win, setWin] = useState<AvailabilityWindow[] | null>(null);
  if (!win && s) setWin(s.availability);
  const { errors, error } = useStepSave(onReady, () => (win ? { step: "availability", data: { availability: win } } : null));
  if (!win) return null;

  const get = (d: number) => win.find((w) => w.weekday === d);
  const put = (d: AvailabilityWindow["weekday"], w: Partial<AvailabilityWindow> | null) =>
    setWin(w === null ? win.filter((x) => x.weekday !== d) : get(d) ? win.map((x) => (x.weekday === d ? { ...x, ...w } : x)) : [...win, { weekday: d, start: "10:00", end: "20:00", ...w }]);

  return (
    <>
      <StepTitle title="When are you usually free?" sub="A rough guide for members. You still accept or decline every request, and you can block out dates later." />
      {error && <Notice tone="bad" className="mb-5">{error}</Notice>}
      <ul className="space-y-2">
        {ORDER.map((d) => {
          const w = get(d);
          return (
            <li key={d} className={cx("flex flex-wrap items-center gap-3 rounded-[20px] px-4 py-3 transition-colors", w ? "bg-char" : "bg-coal")}>
              <Switch label={`Available on ${DAYS[d]}`} on={!!w} onChange={(on) => put(d, on ? {} : null)} />
              <span className={cx("w-28 text-[15px] font-medium", !w && "text-mute")}>{DAYS[d]}</span>
              {w ? (
                <span className="ml-auto flex items-center gap-2">
                  <input type="time" aria-label={`${DAYS[d]} from`} value={w.start} onChange={(e) => put(d, { start: e.target.value })} className="h-10 rounded-xl bg-ink/60 px-3 text-sm tabular focus:ring-2 focus:ring-cream/25 focus:outline-none" />
                  <span className="text-mute">to</span>
                  <input type="time" aria-label={`${DAYS[d]} until`} value={w.end} onChange={(e) => put(d, { end: e.target.value })} className="h-10 rounded-xl bg-ink/60 px-3 text-sm tabular focus:ring-2 focus:ring-cream/25 focus:outline-none" />
                </span>
              ) : (
                <span className="ml-auto text-sm text-faint">Unavailable</span>
              )}
            </li>
          );
        })}
      </ul>
      {errors.availability && <p className="mt-3 px-1 text-xs text-bad">{errors.availability}</p>}
    </>
  );
}
