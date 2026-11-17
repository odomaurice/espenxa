"use client";

import { LockPasswordIcon } from "@hugeicons/core-free-icons";
import { useEffect, useState } from "react";
import { IntentionPicker, LanguagePicker, PhotoGrid, TagPicker } from "@/components/profile/sections";
import { useSession } from "@/components/Providers";
import { Chip, cx, errorMessage, Field, fieldErrors, Icon, Input, Notice, Select, Textarea } from "@/components/ui";
import { api } from "@/lib/api/client";
import type { OnboardingSave } from "@/lib/api/contract";
import { useMyProfile, useOnboardingData } from "@/lib/api/hooks";
import type { Build, Gender, OnboardingData, Preferences, PrivateLocation } from "@/lib/api/types";
import { COUNTRIES_BY_NAME, countryByCode } from "@/lib/countries";
import { BUILDS, GENDERS } from "@/lib/labels";
import { StepTitle, type StepProps } from "./Onboarding";

/** Wires a step's save into the footer and returns the shared error state. */
export function useStepSave(onReady: StepProps["onReady"], build: () => OnboardingSave | null) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    onReady(async () => {
      const input = build();
      if (!input) return true;
      try {
        await api.onboarding.save(input);
        setErrors({});
        setError(null);
        return true;
      } catch (e) {
        setErrors(fieldErrors(e));
        setError(errorMessage(e));
        return false;
      }
    });
  });
  return { errors, error };
}

function useData(): OnboardingData {
  return useOnboardingData().data!;
}

/* ---- photos ---------------------------------------------------------------- */

export function PhotosStep({ onReady }: StepProps) {
  const mine = useMyProfile();
  const [photos, setPhotos] = useState<string[] | null>(null);
  if (photos === null && mine.data) setPhotos(mine.data.photos);
  const { errors, error } = useStepSave(onReady, () => ({ step: "photos", photos: photos ?? [] }));
  return (
    <>
      <StepTitle title="Show people who you are" sub="Add up to six clear photos of you, on your own, with your face visible. Your first photo is your main one." />
      {error && <Notice tone="bad" className="mb-5">{error}</Notice>}
      {photos !== null && <PhotoGrid photos={photos} onChange={setPhotos} error={errors.photos} />}
    </>
  );
}

/* ---- about ------------------------------------------------------------------- */

export function AboutStep({ onReady }: StepProps) {
  const d = useData();
  const [v, setV] = useState(d.about);
  const set = (p: Partial<typeof v>) => setV((s) => ({ ...s, ...p }));
  const { errors, error } = useStepSave(onReady, () => ({ step: "about", data: v }));
  return (
    <>
      <StepTitle title="Describe yourself" sub="A few honest lines go a long way. What do you enjoy? What does a good day out look like?" />
      {error && <Notice tone="bad" className="mb-5">{error}</Notice>}
      <div className="space-y-6">
        <Field label="Display name" error={errors.displayName} hint="Shown on your profile, next to your @username.">
          {(id, h) => <Input id={id} aria-describedby={h} aria-invalid={!!errors.displayName} maxLength={30} value={v.displayName} onChange={(e) => set({ displayName: e.target.value })} />}
        </Field>
        <Field label="About you" error={errors.bio} hint={`${v.bio.length}/500. No phone numbers, links or contact details.`}>
          {(id, h) => <Textarea id={id} aria-describedby={h} aria-invalid={!!errors.bio} rows={5} maxLength={500} placeholder="I am a…" value={v.bio} onChange={(e) => set({ bio: e.target.value })} />}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Gender">
            {(id) => (
              <Select id={id} value={v.gender} onChange={(e) => set({ gender: e.target.value as Gender })}>
                {GENDERS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Height (cm)" error={errors.heightCm} optional>
            {(id, h) => <Input id={id} aria-describedby={h} inputMode="numeric" placeholder="170" value={v.heightCm ?? ""} onChange={(e) => set({ heightCm: e.target.value ? Number(e.target.value.replace(/\D/g, "")) || null : null })} />}
          </Field>
        </div>
        <div>
          <p className="mb-2.5 px-1 text-[13px] font-medium text-cream/90">Build</p>
          <div className="flex flex-wrap gap-2">
            {BUILDS.map((b) => (
              <Chip key={b.id} on={v.build === b.id} onClick={() => set({ build: v.build === b.id ? null : b.id })}>
                {b.label}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2.5 px-1 text-[13px] font-medium text-cream/90">Languages you speak</p>
          <LanguagePicker value={v.languages} onChange={(languages) => set({ languages })} />
        </div>
        <div>
          <p className="mb-2.5 px-1 text-[13px] font-medium text-cream/90">Interests</p>
          <TagPicker value={v.interests} onChange={(interests) => set({ interests })} />
        </div>
      </div>
    </>
  );
}

/* ---- looking for --------------------------------------------------------------- */

export function LookingForStep({ onReady }: StepProps) {
  const d = useData();
  const [v, setV] = useState(d.lookingFor);
  const { errors, error } = useStepSave(onReady, () => ({ step: "looking_for", data: v }));
  return (
    <>
      <StepTitle title="What are you looking for?" sub="Choose everything that applies. You will see people who want the same, and you can change it any time." />
      {error && <Notice tone="bad" className="mb-5">{error}</Notice>}
      <IntentionPicker value={v.intentions} onChange={(intentions) => setV((s) => ({ ...s, intentions }))} error={errors.intentions} />
      <div className="mt-6">
        <Field label="In your own words" optional hint={`${v.note.length}/300`}>
          {(id, h) => <Textarea id={id} aria-describedby={h} rows={3} maxLength={300} placeholder="Someone to explore Lagos food spots with, maybe more…" value={v.note} onChange={(e) => setV((s) => ({ ...s, note: e.target.value }))} />}
        </Field>
      </div>
    </>
  );
}

/* ---- preferences ----------------------------------------------------------------- */

const toggle = <T,>(list: T[], x: T) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);

export function PreferencesStep({ onReady }: StepProps) {
  const d = useData();
  const [v, setV] = useState<Preferences>(d.preferences);
  const set = (p: Partial<Preferences>) => setV((s) => ({ ...s, ...p }));
  const { errors, error } = useStepSave(onReady, () => ({ step: "preferences", data: v }));
  const num = (s: string) => (s ? Number(s.replace(/\D/g, "")) || null : null);
  return (
    <>
      <StepTitle title="Who would you like to meet?" sub="This shapes who you see first. It is private and never shown on your profile." />
      {error && <Notice tone="bad" className="mb-5">{error}</Notice>}
      <div className="space-y-7">
        <div>
          <p className="mb-2.5 px-1 text-[13px] font-medium text-cream/90">Show me</p>
          <div className="flex flex-wrap gap-2">
            {GENDERS.map((g) => (
              <Chip key={g.id} on={v.genders.includes(g.id)} onClick={() => set({ genders: toggle(v.genders, g.id) })}>
                {g.label}
              </Chip>
            ))}
          </div>
          <p className="mt-2 px-1 text-xs text-mute">Leave empty to see everyone.</p>
        </div>

        <RangeField label="Age" min={18} max={80} value={[v.ageMin, v.ageMax]} onChange={([a, b]) => set({ ageMin: a, ageMax: b })} error={errors.age} suffix=" y.o." />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Height from (cm)" optional>
            {(id) => <Input id={id} inputMode="numeric" placeholder="Any" value={v.heightMinCm ?? ""} onChange={(e) => set({ heightMinCm: num(e.target.value) })} />}
          </Field>
          <Field label="Height up to (cm)" optional>
            {(id) => <Input id={id} inputMode="numeric" placeholder="Any" value={v.heightMaxCm ?? ""} onChange={(e) => set({ heightMaxCm: num(e.target.value) })} />}
          </Field>
        </div>

        <div>
          <p className="mb-2.5 px-1 text-[13px] font-medium text-cream/90">Build</p>
          <div className="flex flex-wrap gap-2">
            {BUILDS.map((b) => (
              <Chip key={b.id} on={v.builds.includes(b.id)} onClick={() => set({ builds: toggle<Build>(v.builds, b.id) })}>
                {b.label}
              </Chip>
            ))}
          </div>
        </div>

        <Field label="Anything else that matters to you" optional hint={`${v.notes.length}/300. Keep it respectful.`}>
          {(id, h) => <Textarea id={id} aria-describedby={h} rows={3} maxLength={300} placeholder="Kind, curious, loves live music…" value={v.notes} onChange={(e) => set({ notes: e.target.value })} />}
        </Field>
      </div>
    </>
  );
}

/** Two-thumb range on one track. */
function RangeField({ label, min, max, value, onChange, error, suffix = "" }: { label: string; min: number; max: number; value: [number, number]; onChange: (v: [number, number]) => void; error?: string; suffix?: string }) {
  const [a, b] = value;
  const pct = (x: number) => ((x - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between px-1">
        <span className="text-[13px] font-medium text-cream/90">{label}</span>
        <span className="text-sm font-semibold tabular">
          {a} to {b}
          {suffix}
        </span>
      </div>
      <div className="relative h-8">
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-smoke" />
        <div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-ember" style={{ left: `${pct(a)}%`, right: `${100 - pct(b)}%` }} />
        {(
          [
            [a, (x: number) => onChange([Math.min(x, b - 1), b]), `Minimum ${label.toLowerCase()}`],
            [b, (x: number) => onChange([a, Math.max(x, a + 1)]), `Maximum ${label.toLowerCase()}`],
          ] as const
        ).map(([val, fn, aria]) => (
          <input
            key={aria}
            type="range"
            aria-label={aria}
            min={min}
            max={max}
            value={val}
            onChange={(e) => fn(Number(e.target.value))}
            className="pointer-events-none absolute inset-0 w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-cream [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cream [&::-webkit-slider-thumb]:shadow-[0_2px_10px_rgb(0_0_0/0.5)]"
          />
        ))}
      </div>
      {error && <p className="mt-2 px-1 text-xs text-bad">{error}</p>}
    </div>
  );
}

/* ---- location ------------------------------------------------------------------------ */

export function LocationStep({ onReady }: StepProps) {
  const d = useData();
  const { account } = useSession();
  const [v, setV] = useState<PrivateLocation>(d.location ?? { line1: "", line2: "", city: "", region: "", postalCode: "", country: account?.country ?? "NG" });
  const set = (p: Partial<PrivateLocation>) => setV((s) => ({ ...s, ...p }));
  const { errors, error } = useStepSave(onReady, () => ({ step: "location", data: v }));
  const c = countryByCode(v.country);
  return (
    <>
      <StepTitle title="Where are you based?" sub="Your full address is used for safety and verification only." />
      <div className="mb-7 flex gap-3.5 rounded-[22px] bg-ok/8 p-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ok/15 text-ok">
          <Icon icon={LockPasswordIcon} size={19} />
        </span>
        <p className="text-[13.5px] leading-relaxed text-cream/85">
          <span className="font-semibold text-cream">Private, always.</span> Nobody on Meet ever sees your address. Others only see your city and a rounded distance, like &ldquo;about 3 km away&rdquo;, and you can hide even that.
        </p>
      </div>
      {error && <Notice tone="bad" className="mb-5">{error}</Notice>}
      <div className="space-y-5">
        <Field label="Street address" error={errors.line1}>
          {(id, h) => <Input id={id} aria-describedby={h} aria-invalid={!!errors.line1} autoComplete="address-line1" value={v.line1} onChange={(e) => set({ line1: e.target.value })} />}
        </Field>
        <Field label="Apartment, estate, landmark" optional>
          {(id) => <Input id={id} autoComplete="address-line2" value={v.line2} onChange={(e) => set({ line2: e.target.value })} />}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="City or town" error={errors.city}>
            {(id, h) => (
              <>
                <Input id={id} aria-describedby={h} aria-invalid={!!errors.city} list="onb-cities" autoComplete="address-level2" value={v.city} onChange={(e) => set({ city: e.target.value })} />
                <datalist id="onb-cities">
                  {c?.cities.map((x) => (
                    <option key={x} value={x} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
          <Field label="State or region" optional>
            {(id) => <Input id={id} autoComplete="address-level1" value={v.region} onChange={(e) => set({ region: e.target.value })} />}
          </Field>
          <Field label="Postal code" optional>
            {(id) => <Input id={id} autoComplete="postal-code" value={v.postalCode} onChange={(e) => set({ postalCode: e.target.value })} />}
          </Field>
          <Field label="Country" error={errors.country}>
            {(id) => (
              <Select id={id} value={v.country} onChange={(e) => set({ country: e.target.value })}>
                {COUNTRIES_BY_NAME.map((x) => (
                  <option key={x.code} value={x.code}>
                    {x.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </div>
      <p className={cx("mt-6 text-xs text-faint")}>We never track your live location.</p>
    </>
  );
}
