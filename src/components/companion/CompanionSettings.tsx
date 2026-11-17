"use client";

/*
 * Manage what a companion offers: reuses the onboarding companion steps with a
 * confirmed save. Changing prices never affects bookings already agreed.
 */
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useConfirm } from "@/components/Confirm";
import { AvailabilityStep, ExperiencesStep, RatesStep } from "@/components/onboarding/CompanionSteps";
import { Button, IconButton, Tabs } from "@/components/ui";

type Tab = "experiences" | "rates" | "availability";

export default function CompanionSettings() {
  const router = useRouter();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>("experiences");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const submit = useRef<(() => Promise<boolean>) | null>(null);
  const Step = { experiences: ExperiencesStep, rates: RatesStep, availability: AvailabilityStep }[tab];

  async function save() {
    if (tab === "rates" && !(await confirm({ title: "Update your prices?", body: "New requests will use these prices. Bookings already agreed keep the price you accepted.", confirmLabel: "Update prices" }))) return;
    setBusy(true);
    const ok = (await submit.current?.()) ?? true;
    setBusy(false);
    if (ok) {
      await qc.invalidateQueries({ queryKey: ["provider"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <IconButton icon={ArrowLeft01Icon} label="Back" tone="filled" onClick={() => router.push("/companion")} />
        <p className="text-sm text-mute">My earnings</p>
      </div>
      <Tabs
        value={tab}
        onChange={(t) => {
          submit.current = null;
          setTab(t);
        }}
        items={[
          { id: "experiences", label: "Experiences" },
          { id: "rates", label: "Prices" },
          { id: "availability", label: "Availability" },
        ]}
      />
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="mt-2">
          <Step onReady={(fn) => (submit.current = fn)} />
        </motion.div>
      </AnimatePresence>
      <div className="sticky bottom-24 mt-8 flex items-center justify-end gap-3 lg:bottom-6">
        <AnimatePresence>{saved && <motion.span initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="text-sm text-ok">Saved</motion.span>}</AnimatePresence>
        <Button size="lg" variant="accent" loading={busy} onClick={save}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
