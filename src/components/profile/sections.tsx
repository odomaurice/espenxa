"use client";

/*
 * Profile building blocks shared by onboarding and the profile editor.
 */
import { Add01Icon, Camera01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { useRef, useState } from "react";
import { useConfirm } from "@/components/Confirm";
import { Chip, cx, errorMessage, Field, Icon, Input, Photo, Select, Spinner, Switch, Textarea } from "@/components/ui";
import { api } from "@/lib/api/client";
import type { Intention, LocationVisibility, PrivacySettings, ProfileDraft, Visibility } from "@/lib/api/types";
import { INTENTIONS, INTEREST_SUGGESTIONS, LANGUAGE_NAMES } from "@/lib/labels";

export const MAX_PHOTOS = 6;

export function PhotoGrid({ photos, onChange, error }: { photos: string[]; onChange: (p: string[]) => void; error?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setUploadError(null);
    const next = [...photos];
    for (const f of Array.from(files).slice(0, MAX_PHOTOS - photos.length)) {
      try {
        next.push(await api.profile.uploadPhoto(f));
      } catch (e) {
        setUploadError(errorMessage(e));
      }
    }
    onChange(next);
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  const move = (i: number) => {
    if (i === 0) return;
    const next = [...photos];
    const [p] = next.splice(i, 1);
    next.unshift(p);
    onChange(next);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: MAX_PHOTOS }).map((_, i) => {
          const src = photos[i];
          if (src)
            return (
              <div key={i} className="group relative aspect-[3/4] overflow-hidden rounded-[22px] bg-char">
                <Photo src={src} alt={i === 0 ? "Main photo" : `Photo ${i + 1}`} className="size-full" />
                {i === 0 ? (
                  <span className="absolute bottom-2 left-2 rounded-md bg-ink/80 px-1.5 py-0.5 text-[10.5px] font-medium">Main</span>
                ) : (
                  <button type="button" onClick={() => move(i)} className="absolute bottom-2 left-2 rounded-md bg-ink/80 px-1.5 py-0.5 text-[10.5px] font-medium opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100">
                    Make main
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Remove photo ${i + 1}`}
                  onClick={async () => {
                    if (await confirm({ title: "Remove this photo?", body: "It will be taken off your profile. You can add it again later.", confirmLabel: "Remove", tone: "danger" })) onChange(photos.filter((_, j) => j !== i));
                  }}
                  className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-ink/80 text-cream hover:bg-ink"
                >
                  <Icon icon={Cancel01Icon} size={14} />
                </button>
              </div>
            );
          const isNext = i === photos.length;
          return (
            <button
              key={i}
              type="button"
              disabled={!isNext || busy}
              onClick={() => input.current?.click()}
              className={cx(
                "grid aspect-[3/4] place-items-center rounded-[22px] border-2 border-dashed text-mute transition-colors",
                isNext ? "border-line-hi hover:border-ember hover:text-cream" : "border-line opacity-40",
                error && isNext && "border-bad/70",
              )}
              aria-label="Add a photo"
            >
              {busy && isNext ? <Spinner /> : <Icon icon={i === 0 ? Camera01Icon : Add01Icon} size={22} />}
            </button>
          );
        })}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => add(e.target.files)} />
      <p className={cx("mt-2.5 text-xs", error || uploadError ? "text-bad" : "text-mute")}>
        {error ?? uploadError ?? "Clear photos of you, on your own, face visible. Up to 6. Location data is removed from every upload."}
      </p>
    </div>
  );
}

export function IntentionPicker({ value, onChange, error }: { value: Intention[]; onChange: (v: Intention[]) => void; error?: string }) {
  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2">
        {INTENTIONS.map((i) => {
          const on = value.includes(i.id);
          return (
            <button
              key={i.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((x) => x !== i.id) : [...value, i.id])}
              className={cx("rounded-[20px] p-4 text-left transition-colors", on ? "bg-cream text-ink" : "bg-char hover:bg-smoke")}
            >
              <span className="flex items-center justify-between text-sm font-semibold">
                {i.label}
                <span className={cx("size-5 rounded-full", on ? "bg-ember ring-4 ring-ember/25" : "bg-smoke")} aria-hidden />
              </span>
              <span className={cx("mt-0.5 block text-xs", on ? "text-ink/60" : "text-mute")}>{i.sub}</span>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
    </div>
  );
}

export function TagPicker({ value, onChange, suggestions = INTEREST_SUGGESTIONS, max = 12, placeholder = "Add your own" }: { value: string[]; onChange: (v: string[]) => void; suggestions?: string[]; max?: number; placeholder?: string }) {
  const [custom, setCustom] = useState("");
  const all = Array.from(new Set([...value, ...suggestions]));
  const add = () => {
    const t = custom.trim().replace(/\s+/g, " ");
    if (t && t.length <= 30 && !value.includes(t) && value.length < max) onChange([...value, t]);
    setCustom("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {all.map((t) => (
          <Chip key={t} on={value.includes(t)} disabled={!value.includes(t) && value.length >= max} onClick={() => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t])}>
            {t}
          </Chip>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Input
          value={custom}
          maxLength={30}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="h-9 max-w-60"
        />
        <button type="button" onClick={add} className="rounded-lg px-3 text-sm text-mute hover:text-cream">
          Add
        </button>
      </div>
      <p className="mt-2 text-xs text-mute">
        {value.length} of {max} chosen
      </p>
    </div>
  );
}

const LANGS = Object.entries(LANGUAGE_NAMES);
export function LanguagePicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {LANGS.map(([code, name]) => (
        <Chip key={code} on={value.includes(code)} onClick={() => onChange(value.includes(code) ? value.filter((x) => x !== code) : [...value, code])}>
          {name}
        </Chip>
      ))}
    </div>
  );
}

const VIS: { id: Visibility; label: string }[] = [
  { id: "public", label: "Everyone" },
  { id: "connections", label: "Connections only" },
  { id: "hidden", label: "Only me" },
];

const LOC: { id: LocationVisibility; label: string; sub: string }[] = [
  { id: "approximate", label: "Approximate distance", sub: "City plus a rounded distance, like \"about 3 km away\"." },
  { id: "city_only", label: "City only", sub: "No distance is shown. You will not appear in Nearby." },
  { id: "hidden", label: "Hidden", sub: "Neither city nor distance is shown." },
];

export function PrivacyControls({ value, onChange }: { value: PrivacySettings; onChange: (v: PrivacySettings) => void }) {
  const setField = (k: keyof PrivacySettings["fields"], v: Visibility) => onChange({ ...value, fields: { ...value.fields, [k]: v } });
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="text-[13px] font-medium">Location</legend>
        <p className="mt-0.5 text-xs text-mute">Your precise location is never shown to anyone.</p>
        <div className="mt-3 grid gap-2">
          {LOC.map((l) => (
            <label key={l.id} className={cx("flex cursor-pointer gap-3 rounded-[20px] p-4", value.location === l.id ? "bg-smoke" : "bg-char")}>
              <input type="radio" name="loc" className="mt-1 accent-ember" checked={value.location === l.id} onChange={() => onChange({ ...value, location: l.id })} />
              <span>
                <span className="block text-sm font-medium">{l.label}</span>
                <span className="block text-xs text-mute">{l.sub}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Private discovery</p>
            <p className="text-xs text-mute">Only people you like or connect with can see your profile.</p>
          </div>
          <Switch label="Private discovery" on={value.privateDiscovery} onChange={(v) => onChange({ ...value, privateDiscovery: v })} />
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Show my age</p>
            <p className="text-xs text-mute">Your age is still used for matching filters.</p>
          </div>
          <Switch label="Show my age" on={value.showAge} onChange={(v) => onChange({ ...value, showAge: v })} />
        </div>
      </div>

      <fieldset>
        <legend className="text-[13px] font-medium">Who can see each part of your profile</legend>
        <div className="mt-3 divide-y divide-line rounded-[20px] bg-char">
          {(
            [
              ["bio", "About you"],
              ["intentions", "Why you are here"],
              ["interests", "Interests and hobbies"],
              ["languages", "Languages"],
            ] as const
          ).map(([k, label]) => (
            <div key={k} className="flex flex-col gap-2 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-2.5">
              <span className="text-sm">{label}</span>
              <Select aria-label={`${label} visibility`} className="h-10 w-full text-[13px] sm:h-9 sm:w-auto sm:min-w-44" value={value.fields[k]} onChange={(e) => setField(k, e.target.value as Visibility)}>
                {VIS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

export function AboutFields({ draft, set, errors }: { draft: ProfileDraft; set: (p: Partial<ProfileDraft>) => void; errors: Record<string, string> }) {
  return (
    <div className="space-y-4">
      <Field label="Display name" error={errors.displayName} hint="What people see. Your full name stays private.">
        {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.displayName} maxLength={30} value={draft.displayName} onChange={(e) => set({ displayName: e.target.value })} />}
      </Field>
      <Field label="About you" error={errors.bio} hint={`${draft.bio.length}/500. What you enjoy, what a good day out looks like. No contact details.`} optional>
        {(id, d) => <Textarea id={id} aria-describedby={d} rows={5} maxLength={500} value={draft.bio} onChange={(e) => set({ bio: e.target.value })} />}
      </Field>
    </div>
  );
}
