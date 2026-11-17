"use client";

import { ArrowRight01Icon, CheckmarkBadge01Icon, Clock01Icon } from "@hugeicons/core-free-icons";
import { motion } from "framer-motion";
import { Burst } from "@/components/motion";
import { cx, Icon, LinkButton } from "@/components/ui";
import type { OnboardingStatus, OnboardingStepId } from "@/lib/api/types";
import { STEP_LABELS } from "@/lib/labels";

export default function Finish({ status, onOpen }: { status: OnboardingStatus; onOpen: (id: OnboardingStepId) => void }) {
  const left = status.steps.filter((s) => !s.done);
  const done = !left.length;

  return (
    <div className="text-center">
      <div className="relative mx-auto grid size-28 place-items-center">
        <motion.span className={cx("absolute inset-0 rounded-full", done ? "bg-ok/15" : "bg-warn/12")} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 14 }} />
        <motion.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.15 }} className={cx("relative", done ? "text-ok" : "text-warn")}>
          <Icon icon={done ? CheckmarkBadge01Icon : Clock01Icon} size={48} stroke={1.8} />
        </motion.span>
        {done && <Burst k={1} color="var(--color-ok)" />}
      </div>

      <h1 className="display mt-8 text-[36px] sm:text-[44px]">{done ? "You are all set" : "Almost there"}</h1>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-mute">
        {done
          ? status.verification === "verified"
            ? "Your account is approved. Welcome to Meet."
            : "We are reviewing your ID and selfie. This usually takes less than a day, and we will let you know the moment you are approved."
          : `You skipped ${left.length} ${left.length === 1 ? "step" : "steps"}. You can look around your dashboard, but Meet opens once every step is done and your identity is approved.`}
      </p>

      {!done && (
        <ul className="mx-auto mt-8 max-w-md space-y-2 text-left">
          {left.map((s, i) => (
            <motion.li key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.06 }}>
              <button type="button" onClick={() => onOpen(s.id)} className="flex w-full items-center gap-4 rounded-[20px] bg-char px-4 py-3.5 text-left transition-colors hover:bg-smoke">
                <span className="size-2.5 rounded-full bg-warn" />
                <span className="flex-1">
                  <span className="block text-[15px] font-medium">{STEP_LABELS[s.id].label}</span>
                  <span className="block text-xs text-mute">{STEP_LABELS[s.id].sub}</span>
                </span>
                <Icon icon={ArrowRight01Icon} size={17} className="text-mute" />
              </button>
            </motion.li>
          ))}
        </ul>
      )}

      <LinkButton href="/home" variant={done ? "accent" : "primary"} size="lg" className="mt-10">
        Go to my dashboard <Icon icon={ArrowRight01Icon} size={17} />
      </LinkButton>
    </div>
  );
}
