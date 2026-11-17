"use client";

import { ArrowRight01Icon, LockPasswordIcon } from "@hugeicons/core-free-icons";
import { motion } from "framer-motion";
import { useSession } from "@/components/Providers";
import { Icon, LinkButton } from "@/components/ui";

/** Shown in place of any page that needs a complete, approved account. */
export default function Locked() {
  const { account } = useSession();
  const waiting = account?.onboarded && account.verification === "pending";
  return (
    <div className="flex min-h-[70dvh] items-center justify-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="surface w-full max-w-md rounded-[32px] p-10 text-center">
        <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.1 }} className="mx-auto grid size-18 place-items-center rounded-full bg-char">
          <Icon icon={LockPasswordIcon} size={30} />
        </motion.span>
        <h1 className="display mt-6 text-[28px]">{waiting ? "Almost open" : "Finish setting up"}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-mute">
          {waiting ? "Your profile is complete and your identity is being reviewed. This page opens as soon as you are approved." : "This part of Meet opens once every setup step is done and your identity is approved."}
        </p>
        <LinkButton href={waiting ? "/home" : "/onboarding"} variant="primary" size="lg" className="mt-8">
          {waiting ? "See my status" : "Continue setup"} <Icon icon={ArrowRight01Icon} size={17} />
        </LinkButton>
      </motion.div>
    </div>
  );
}
