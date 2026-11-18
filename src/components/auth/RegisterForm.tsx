"use client";

/*
 * Step 1 of joining: account details, role and where to send the one-time
 * code. Profile, preferences and identity checks come next, in onboarding.
 */
import { Mail01Icon, SmartPhone01Icon, Store01Icon, Tick02Icon, UserCircleIcon } from "@hugeicons/core-free-icons";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/components/Providers";
import { Button, cx, errorMessage, Field, fieldErrors, Icon, Input, Notice, Select, Spinner } from "@/components/ui";
import { api } from "@/lib/api/client";
import type { RegisterInput } from "@/lib/api/contract";
import { useMarkets } from "@/lib/api/hooks";
import { COUNTRIES_BY_NAME, countryByCode } from "@/lib/countries";
import { ageFrom } from "@/lib/format";
import { ACCOUNT_ROLES } from "@/lib/labels";
import { SITE } from "@/lib/site";

const maxDob = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - SITE.minAge);
  return d.toISOString().slice(0, 10);
};

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}
const STRENGTH = ["Too short", "Weak", "Fair", "Good", "Strong"];

export default function RegisterForm({ intro }: { intro?: string }) {
  const router = useRouter();
  const { refresh } = useSession();
  const markets = useMarkets();
  const [v, setV] = useState<RegisterInput>({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    otpChannel: "email",
    role: "member",
    password: "",
    dateOfBirth: "",
    country: "NG",
    acceptedTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState<{ name: string; ok: boolean } | null>(null);

  const set = <K extends keyof RegisterInput>(k: K, val: RegisterInput[K]) => {
    setV((s) => ({ ...s, [k]: val }));
    setErrors((e) => {
      const { [k]: _gone, ...rest } = e;
      void _gone;
      return rest;
    });
  };

  const country = countryByCode(v.country)!;
  const open = useMemo(() => new Set(markets.data?.filter((m) => m.features.registration).map((m) => m.country)), [markets.data]);
  const handle = v.username.trim().toLowerCase();
  const pw = strength(v.password);

  // Live username check, debounced. State is only set from the async callback.
  useEffect(() => {
    if (handle.length < 3) return;
    const t = setTimeout(() => {
      api.auth.usernameAvailable(handle).then((ok) => setAvailable({ name: handle, ok }));
    }, 350);
    return () => clearTimeout(t);
  }, [handle]);
  const handleState = handle.length < 3 ? null : available?.name === handle ? (available.ok ? "ok" : "taken") : "checking";

  function check(): Record<string, string> {
    const e: Record<string, string> = {};
    if (v.fullName.trim().split(/\s+/).length < 2) e.fullName = "Enter your first and last name.";
    if (!/^[a-z0-9](?:[a-z0-9._]{1,18})[a-z0-9]$/.test(handle)) e.username = "3 to 20 characters: letters, numbers, dots or underscores.";
    else if (handleState === "taken") e.username = "That username is taken.";
    if (!/^\S+@\S+\.\S+$/.test(v.email)) e.email = "Enter a valid email address.";
    if (!/^\d{6,13}$/.test(v.phone.replace(/[\s-]/g, ""))) e.phone = "Enter your number without the country code.";
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(v.password)) e.password = "Use at least 8 characters with letters and numbers.";
    if (!v.dateOfBirth) e.dateOfBirth = "Enter your date of birth.";
    else if (ageFrom(v.dateOfBirth) < SITE.minAge) e.dateOfBirth = `You must be ${SITE.minAge} or older to join.`;
    if (!v.acceptedTerms) e.acceptedTerms = "Accept the terms to continue.";
    return e;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const local = check();
    setErrors(local);
    if (Object.keys(local).length) {
      document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }
    setBusy(true);
    try {
      await api.auth.register({ ...v, username: handle, phone: country.dial + v.phone.replace(/^0+/, "").replace(/[\s-]/g, "") });
      await refresh();
      router.replace("/verify-otp");
    } catch (err) {
      setErrors(fieldErrors(err));
      setFormError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-sm text-mute">Step 1 of 3 · Your account</p>
      <h1 className="display mt-2 text-[40px]">Join {SITE.name}</h1>
      <p className="mt-2 text-[15px] text-mute">{intro ?? "Create your account, confirm your contact, then set up your profile."}</p>

      <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
        {formError && <Notice tone="bad">{formError}</Notice>}

        <fieldset>
          <legend className="mb-2 px-1 text-[13px] font-medium text-cream/90">How will you use espenxa?</legend>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {ACCOUNT_ROLES.map((r) => {
              const on = v.role === r.id;
              return (
                <motion.button
                  key={r.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set("role", r.id)}
                  whileTap={{ scale: 0.98 }}
                  className={cx("relative overflow-hidden rounded-[10px] p-4 text-left transition-colors", on ? "bg-cream text-ink" : "bg-char hover:bg-smoke")}
                >
                  <span className={cx("grid size-10 place-items-center rounded-full", on ? "bg-ember text-ink" : "bg-smoke text-cream")}>
                    <Icon icon={r.id === "companion" ? Store01Icon : UserCircleIcon} size={20} stroke={2} />
                  </span>
                  <span className="mt-3 block text-[15px] font-semibold">{r.label}</span>
                  <span className={cx("mt-0.5 block text-xs leading-snug", on ? "text-ink/60" : "text-mute")}>{r.sub}</span>
                  <AnimatePresence>
                    {on && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute top-4 right-4 grid size-6 place-items-center rounded-full bg-ink text-cream">
                        <Icon icon={Tick02Icon} size={14} stroke={2.5} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        </fieldset>

        <Field label="Full name" hint="As it appears on your ID. Kept private." error={errors.fullName}>
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.fullName} autoComplete="name" value={v.fullName} onChange={(e) => set("fullName", e.target.value)} />}
        </Field>

        <Field label="Username" hint="What people will call you on espenxa." error={errors.username}>
          {(id, d) => (
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[15px] text-faint">@</span>
              <Input
                id={id}
                aria-describedby={d}
                aria-invalid={!!errors.username}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={20}
                className="pr-28 pl-9"
                value={v.username}
                onChange={(e) => set("username", e.target.value.replace(/\s/g, ""))}
              />
              <span className="absolute top-1/2 right-4 -translate-y-1/2 text-xs font-medium" aria-live="polite">
                {handleState === "checking" && <Spinner className="size-4 text-mute" />}
                {handleState === "ok" && <span className="text-ok">Available</span>}
                {handleState === "taken" && <span className="text-bad">Taken</span>}
              </span>
            </div>
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Email" error={errors.email}>
            {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.email} type="email" autoComplete="email" value={v.email} onChange={(e) => set("email", e.target.value)} />}
          </Field>
          <Field label="Phone number" error={errors.phone}>
            {(id, d) => (
              <div className="flex rounded-2xl bg-char focus-within:ring-2 focus-within:ring-cream/25">
                <span className="flex h-13 items-center pr-1 pl-4 text-[15px] text-mute">{country.dial}</span>
                <Input id={id} aria-describedby={d} aria-invalid={!!errors.phone} type="tel" inputMode="tel" autoComplete="tel-national" className="bg-transparent pl-2 focus:ring-0" value={v.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
            )}
          </Field>
        </div>

        <fieldset>
          <legend className="mb-2 px-1 text-[13px] font-medium text-cream/90">Send my verification code by</legend>
          <div className="relative grid grid-cols-2 rounded-full bg-char p-1">
            {(
              [
                ["email", "Email", Mail01Icon],
                ["sms", "SMS", SmartPhone01Icon],
              ] as const
            ).map(([id, label, icon]) => {
              const on = v.otpChannel === id;
              return (
                <button key={id} type="button" aria-pressed={on} onClick={() => set("otpChannel", id)} className={cx("relative flex h-11 items-center justify-center gap-2 rounded-full text-sm font-medium transition-colors", on ? "text-ink" : "text-mute hover:text-cream")}>
                  {on && <motion.span layoutId="otp-pill" className="absolute inset-0 rounded-full bg-cream" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                  <span className="relative flex items-center gap-2">
                    <Icon icon={icon} size={16} stroke={2} /> {label}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 px-1 text-xs text-mute">We will send a 6-digit code to your {v.otpChannel === "sms" ? "phone" : "email"}.</p>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Country" error={errors.country} hint={markets.data && !open.has(v.country) ? "Registration opens here soon." : undefined}>
            {(id, d) => (
              <Select id={id} aria-describedby={d} value={v.country} onChange={(e) => set("country", e.target.value)}>
                {COUNTRIES_BY_NAME.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                    {markets.data && !open.has(c.code) ? " (coming soon)" : ""}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Date of birth" error={errors.dateOfBirth} hint={`${SITE.minAge}+ only. Checked against your ID.`}>
            {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.dateOfBirth} type="date" max={maxDob()} autoComplete="bday" value={v.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />}
          </Field>
        </div>

        <Field label="Password" error={errors.password}>
          {(id, d) => (
            <div>
              <Input id={id} aria-describedby={d} aria-invalid={!!errors.password} type="password" autoComplete="new-password" value={v.password} onChange={(e) => set("password", e.target.value)} />
              {v.password && (
                <div className="mt-2.5 flex items-center gap-3 px-1">
                  <div className="flex flex-1 gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <motion.span key={i} className="h-1 flex-1 rounded-full" animate={{ backgroundColor: i < pw ? ["#ff5c5c", "#ff5c5c", "#f5b83d", "#3ddc84", "#3ddc84"][pw] : "#2a2a2e" }} />
                    ))}
                  </div>
                  <span className="w-16 text-right text-xs text-mute">{STRENGTH[pw]}</span>
                </div>
              )}
            </div>
          )}
        </Field>

        <div className="space-y-1.5">
          <label className={cx("flex cursor-pointer gap-3 rounded-[10px] bg-char p-4 text-[13px] leading-relaxed text-mute", errors.acceptedTerms && "ring-2 ring-bad/60")}>
            <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-ember" checked={v.acceptedTerms} onChange={(e) => set("acceptedTerms", e.target.checked)} />
            <span>
              I am {SITE.minAge} or older and accept the <span className="text-cream">Terms</span>, <span className="text-cream">Privacy Policy</span> and{" "}
              <Link href="/community-rules" className="text-cream underline underline-offset-2">
                Community Rules
              </Link>
              . Bookings on {SITE.name} are for social experiences, and consent is never part of a payment.
              {/* TODO(team): link the final Terms and Privacy Policy once legal signs them off. */}
            </span>
          </label>
          {errors.acceptedTerms && <p className="px-1 text-xs text-bad">{errors.acceptedTerms}</p>}
        </div>

        <Button type="submit" variant="accent" size="lg" className="w-full" loading={busy}>
          Create account and send code
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-mute">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-cream underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
