"use client";

/*
 * Step 3 of joining: onboarding. Members and companions get different steps.
 * Any step can be skipped, but every step must be finished (and the account
 * approved) before the platform opens. Progress is saved per step.
 */
import { ArrowLeft01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/components/Providers";
import { FullScreenSpinner } from "@/components/shell/AppShell";
import { Button, cx, Icon } from "@/components/ui";
import Wordmark from "@/components/Wordmark";
import { api } from "@/lib/api/client";
import { useOnboardingData, useOnboardingStatus } from "@/lib/api/hooks";
import type { OnboardingStatus, OnboardingStepId } from "@/lib/api/types";
import { STEP_LABELS } from "@/lib/labels";
import { AvailabilityStep, ExperiencesStep, RatesStep } from "./CompanionSteps";
import { IdStep, SelfieStep } from "./KycSteps";
import { AboutStep, LocationStep, LookingForStep, PhotosStep, PreferencesStep } from "./MemberSteps";
import Finish from "./Finish";

export type StepProps = {
  /** Registers the submit handler the footer's "Save and continue" calls. Return true when saved. */
  onReady: (submit: () => Promise<boolean>) => void;
};

const COMPONENTS: Record<OnboardingStepId, (p: StepProps) => React.ReactNode> = {
  photos: PhotosStep,
  about: AboutStep,
  looking_for: LookingForStep,
  preferences: PreferencesStep,
  experiences: ExperiencesStep,
  rates: RatesStep,
  availability: AvailabilityStep,
  location: LocationStep,
  id_document: IdStep,
  selfie: SelfieStep,
};

/** KYC steps save themselves (upload, capture); their footer only skips or moves on. */
const SELF_SAVING: OnboardingStepId[] = ["id_document", "selfie"];

export default function Onboarding() {
  const { account, loading, refresh } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const status = useOnboardingStatus(!!account?.contactVerified);
  const data = useOnboardingData();
  const [current, setCurrent] = useState<OnboardingStepId | "finish" | null>(null);
  const [dir, setDir] = useState(1);
  const submit = useRef<(() => Promise<boolean>) | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!account) router.replace("/login?next=/onboarding");
    else if (!account.contactVerified) router.replace("/verify-otp");
  }, [account, loading, router]);

  const s = status.data;
  if (!current && s) {
    const asked = params.get("step") as OnboardingStepId | null;
    const valid = asked && s.steps.some((x) => x.id === asked) ? asked : null;
    setCurrent(valid ?? s.steps.find((x) => !x.done)?.id ?? "finish");
  }

  if (!account || !account.contactVerified || !s || !data.data || !current) return <FullScreenSpinner />;

  const ids = s.steps.map((x) => x.id);
  const index = current === "finish" ? ids.length : ids.indexOf(current);
  const doneCount = s.steps.filter((x) => x.done).length;

  const go = (to: OnboardingStepId | "finish", direction = 1) => {
    setDir(direction);
    submit.current = null;
    setCurrent(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const nextOf = (st: OnboardingStatus) => {
    const after = ids.slice(index + 1).find((id) => !st.steps.find((x) => x.id === id)!.done);
    return after ?? "finish";
  };
  const afterChange = async () => {
    await Promise.all([qc.invalidateQueries({ queryKey: ["onboarding"] }), qc.invalidateQueries({ queryKey: ["provider"] }), qc.invalidateQueries({ queryKey: ["profile"] })]);
    await refresh();
  };

  async function saveAndContinue() {
    if (!current || current === "finish") return;
    setBusy(true);
    try {
      const ok = SELF_SAVING.includes(current) ? true : submit.current ? await submit.current() : true;
      if (!ok) return;
      await afterChange();
      const fresh = await api.onboarding.status();
      go(nextOf(fresh));
    } finally {
      setBusy(false);
    }
  }

  async function skip() {
    if (!current || current === "finish") return;
    setBusy(true);
    const st = await api.onboarding.skip(current);
    await afterChange();
    setBusy(false);
    go(nextOf(st));
  }

  const Step = current !== "finish" ? COMPONENTS[current] : null;
  const stepDone = current !== "finish" && s.steps.find((x) => x.id === current)?.done;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[340px_1fr]">
      <aside className="hidden border-r border-line bg-coal/50 px-8 py-8 lg:flex lg:flex-col">
        <Wordmark height={26} />
        <div className="mt-12">
          <p className="text-sm text-mute">{account.role === "companion" ? "Companion setup" : "Member setup"}</p>
          <p className="display mt-1 text-[34px] tabular">
            {doneCount}/{ids.length} <span className="text-lg font-medium text-mute">done</span>
          </p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-smoke">
            <motion.div className="h-full rounded-full bg-ember" animate={{ width: `${(doneCount / ids.length) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
          </div>
        </div>
        <ol className="mt-8 space-y-1">
          {s.steps.map((st, i) => {
            const on = st.id === current;
            return (
              <li key={st.id}>
                <button type="button" onClick={() => go(st.id, i >= index ? 1 : -1)} className={cx("relative flex w-full items-center gap-3.5 rounded-2xl px-3 py-2.5 text-left transition-colors", on ? "text-cream" : "text-mute hover:bg-char/60 hover:text-cream")}>
                  {on && <motion.span layoutId="onb-step" className="absolute inset-0 rounded-2xl bg-char" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
                  <span className={cx("relative grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold", st.done ? "bg-ok text-ink" : on ? "bg-cream text-ink" : "bg-smoke")}>{st.done ? <Icon icon={Tick02Icon} size={15} stroke={2.6} /> : i + 1}</span>
                  <span className="relative min-w-0 flex-1">
                    <span className="block text-[14.5px] font-medium">{STEP_LABELS[st.id].label}</span>
                    <span className={cx("block text-xs", st.skipped ? "text-warn" : "text-faint")}>{st.skipped ? "Skipped, still needed" : STEP_LABELS[st.id].sub}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="mt-auto pt-8 text-xs leading-relaxed text-faint">You can skip any step and come back. espenxa opens once every step is done and your identity is approved.</p>
      </aside>

      <main className="flex min-h-dvh flex-col">
        <div className="sticky top-0 z-20 bg-ink/90 px-5 pt-5 pb-4 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between">
            <Wordmark height={22} />
            <span className="text-xs text-mute tabular">
              {doneCount}/{ids.length} done
            </span>
          </div>
          <div className="mt-4 flex gap-1">
            {s.steps.map((st) => (
              <span key={st.id} className={cx("h-1 flex-1 rounded-full transition-colors", st.id === current ? "bg-cream" : st.done ? "bg-ember" : st.skipped ? "bg-warn/50" : "bg-smoke")} />
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:px-8 lg:py-16">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={current}
              custom={dir}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -40 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {current === "finish" ? (
                <Finish status={s} onOpen={(id) => go(id, -1)} />
              ) : (
                <>
                  <p className="text-sm text-mute">
                    Step {index + 1} of {ids.length}
                    {stepDone && <span className="ml-2 text-ok">· Done</span>}
                  </p>
                  {Step && <Step key={current} onReady={(fn) => (submit.current = fn)} />}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {current !== "finish" && (
          <div className="sticky bottom-0 z-20 border-t border-line bg-ink/92 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
              <Button variant="ghost" disabled={index === 0 || busy} onClick={() => go(ids[index - 1], -1)}>
                <Icon icon={ArrowLeft01Icon} size={16} /> Back
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="quiet" disabled={busy} onClick={skip}>
                  Skip for now
                </Button>
                <Button variant={index === ids.length - 1 ? "accent" : "primary"} size="lg" loading={busy} onClick={saveAndContinue}>
                  {SELF_SAVING.includes(current) ? "Continue" : "Save and continue"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export function StepTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-8">
      <h1 className="display mt-2 text-[34px] sm:text-[40px]">{title}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-mute">{sub}</p>
    </div>
  );
}
