"use client";

/*
 * Home for accounts that are not yet open: what is done, what is left, and
 * where verification stands. Steps can be skipped in onboarding but must be
 * finished here before the platform opens.
 */
import { ArrowRight01Icon, CheckmarkBadge01Icon, Clock01Icon, LockPasswordIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { Lift, Stagger, StaggerItem } from "@/components/motion";
import { useSession } from "@/components/Providers";
import { Button, cx, DevNote, errorMessage, Icon, LinkButton, Notice, Photo, Skeleton } from "@/components/ui";
import { devTools } from "@/lib/api/client";
import { useOnboardingStatus } from "@/lib/api/hooks";
import { STEP_LABELS, VERIFICATION } from "@/lib/labels";

const TEASE = ["amara", "dami", "zara", "kai", "mei", "nia", "marcus", "yara"];

function Ring({ value, total }: { value: number; total: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-36 shrink-0">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="10" />
        <motion.circle cx="60" cy="60" r={r} fill="none" stroke="url(#ring)" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - value / total) }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }} />
        <defs>
          <linearGradient id="ring" x1="0" x2="1">
            <stop offset="0" stopColor="#ff5a36" />
            <stop offset="1" stopColor="#ff8fb1" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="display text-[34px] tabular">{Math.round((value / total) * 100)}%</p>
          <p className="text-[11px] text-mute">complete</p>
        </div>
      </div>
    </div>
  );
}

export default function SetupDashboard() {
  const { account, refresh } = useSession();
  const status = useOnboardingStatus();
  const qc = useQueryClient();
  const [approving, setApproving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!account || !status.data) return <Skeleton className="h-[420px] rounded-[32px]" />;
  const s = status.data;
  const done = s.steps.filter((x) => x.done).length;
  const kycIn = s.steps.filter((x) => x.id === "id_document" || x.id === "selfie").every((x) => x.done);
  const profileSteps = s.steps.filter((x) => x.id !== "id_document" && x.id !== "selfie");
  const v = VERIFICATION[s.verification];
  const nextStep = s.steps.find((x) => !x.done);

  const journey = [
    { label: "Account created", done: true },
    { label: account.otpChannel === "sms" ? "Phone confirmed" : "Email confirmed", done: account.contactVerified },
    { label: "Profile complete", done: profileSteps.every((x) => x.done) },
    { label: "Identity submitted", done: kycIn },
    { label: "Approved", done: s.verification === "verified" },
  ];
  const at = journey.findIndex((j) => !j.done);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-mute">Welcome to Meet,</p>
        <h1 className="display mt-1 text-[36px] md:text-[44px]">
          {account.fullName.split(" ")[0]}
          <span className="text-ember">.</span>
        </h1>
      </header>

      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="relative overflow-hidden rounded-[32px] bg-coal p-6 sm:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-ember/18 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-8 md:flex-row md:items-center">
          <Ring value={done} total={s.steps.length} />
          <div className="flex-1">
            <span className={cx("inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold", { ok: "bg-ok/15 text-ok", warn: "bg-warn/15 text-warn", bad: "bg-bad/15 text-bad", mute: "bg-smoke text-mute" }[v.tone])}>
              <Icon icon={s.complete ? Clock01Icon : LockPasswordIcon} size={13} stroke={2.2} /> {s.complete ? v.label : "Setup in progress"}
            </span>
            <h2 className="display mt-4 text-[28px] sm:text-[32px]">{s.complete ? (s.verification === "pending" ? "We are reviewing your identity" : "Verification needs attention") : `${s.steps.length - done} ${s.steps.length - done === 1 ? "step" : "steps"} left before Meet opens`}</h2>
            <p className="mt-2 max-w-lg text-[15px] text-mute">
              {s.complete
                ? s.verification === "pending"
                  ? "Your profile is complete. A verification officer is checking your ID and selfie, usually within a day. We will notify you the moment you are approved."
                  : "Our team needs something else from you. Check your notifications, then resubmit your ID or selfie."
                : "You can skip steps during setup, but each one must be done before you can discover people, connect or book."}
            </p>
            {nextStep && (
              <LinkButton href={`/onboarding?step=${nextStep.id}`} variant="accent" size="lg" className="mt-6">
                Continue with {STEP_LABELS[nextStep.id].label.toLowerCase()} <Icon icon={ArrowRight01Icon} size={17} />
              </LinkButton>
            )}
          </div>
        </div>

        <ol className="relative mt-9 grid grid-cols-5 gap-2">
          {journey.map((j, i) => (
            <li key={j.label} className="flex flex-col items-center text-center">
              <div className="relative flex w-full items-center justify-center">
                {i > 0 && <span className={cx("absolute right-1/2 h-0.5 w-full", journey[i - 1].done && j.done ? "bg-ok" : "bg-smoke")} />}
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.08, type: "spring", stiffness: 400, damping: 18 }} className={cx("relative grid size-9 place-items-center rounded-full", j.done ? "bg-ok text-ink" : i === at ? "bg-cream text-ink ring-4 ring-cream/15" : "bg-smoke text-mute")}>
                  {j.done ? <Icon icon={Tick02Icon} size={16} stroke={2.6} /> : <span className="text-xs font-semibold">{i + 1}</span>}
                </motion.span>
              </div>
              <span className={cx("mt-2.5 text-[11px] leading-tight sm:text-xs", j.done || i === at ? "text-cream" : "text-faint")}>{j.label}</span>
            </li>
          ))}
        </ol>
      </motion.section>

      {s.complete && s.verification === "pending" && devTools && (
        <div className="space-y-3">
          <DevNote>No verification officer exists in development. Use this to simulate approval and open the platform.</DevNote>
          {err && <Notice tone="bad">{err}</Notice>}
          <Button
            variant="secondary"
            loading={approving}
            onClick={async () => {
              setApproving(true);
              setErr(null);
              try {
                await devTools?.approve();
                await qc.invalidateQueries();
                await refresh();
              } catch (e) {
                setErr(errorMessage(e));
              } finally {
                setApproving(false);
              }
            }}
          >
            <Icon icon={CheckmarkBadge01Icon} size={17} /> Simulate approval
          </Button>
        </div>
      )}

      <section>
        <h2 className="mb-4 text-xl font-semibold tracking-tight">Your {account.role === "companion" ? "companion" : "member"} setup</h2>
        <Stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" inView={false} gap={0.05} delay={0.15}>
          {s.steps.map((st, i) => (
            <StaggerItem key={st.id}>
              <Lift y={-3} scale={1.01}>
                <Link href={`/onboarding?step=${st.id}`} className="surface flex items-center gap-4 rounded-[22px] p-4 transition-colors hover:bg-char">
                  <span className={cx("grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold", st.done ? "bg-ok/15 text-ok" : st.skipped ? "bg-warn/15 text-warn" : "bg-char text-mute")}>{st.done ? <Icon icon={Tick02Icon} size={18} stroke={2.4} /> : i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">{STEP_LABELS[st.id].label}</span>
                    <span className={cx("block text-xs", st.done ? "text-ok" : st.skipped ? "text-warn" : "text-mute")}>{st.done ? "Done" : st.skipped ? "Skipped, still needed" : "To do"}</span>
                  </span>
                  <Icon icon={ArrowRight01Icon} size={16} className="text-faint" />
                </Link>
              </Lift>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="relative overflow-hidden rounded-[32px]">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8" aria-hidden>
          {TEASE.map((p) => (
            <Photo key={p} src={`/people/${p}.webp`} alt="" className="aspect-[3/4] w-full scale-105 rounded-[18px] blur-[6px] brightness-60" />
          ))}
        </div>
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-t from-ink/90 via-ink/40 to-ink/30 p-6 text-center">
          <div>
            <span className="glass mx-auto grid size-14 place-items-center rounded-full">
              <Icon icon={LockPasswordIcon} size={22} />
            </span>
            <p className="display mt-4 text-[26px]">People are waiting to meet you</p>
            <p className="mt-1 text-sm text-cream/75">Discovery, messages and bookings open once you are approved.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
