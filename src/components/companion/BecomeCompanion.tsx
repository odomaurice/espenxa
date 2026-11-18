"use client";

import { Calendar03Icon, ChampionIcon, Coins01Icon, Shield01Icon } from "@hugeicons/core-free-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useConfirm } from "@/components/Confirm";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { useSession } from "@/components/Providers";
import { Button, errorMessage, Icon, Notice, Photo, RankBadge } from "@/components/ui";
import { api } from "@/lib/api/client";
import { RANKS } from "@/lib/labels";

const PERKS = [
  [Coins01Icon, "Your prices", "Set your own rate for 1 hour up to 2 days. You can also offer your time for free."],
  [Calendar03Icon, "Your schedule", "Accept, decline or suggest a change on every request."],
  [Shield01Icon, "Paid safely", "Members pay through espenxa. You are paid after the experience is confirmed."],
  [ChampionIcon, "Grow your level", "Reliability and great reviews take you from Bronze to Diamond."],
] as const;

export default function BecomeCompanion() {
  const { account, refresh } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (account?.isProvider) router.replace("/companion");
  }, [account, router]);
  if (account?.isProvider) return null;

  return (
    <div className="mx-auto max-w-4xl">
      <Reveal className="relative overflow-hidden rounded-[10px] bg-coal">
        <div className="grid md:grid-cols-[1.1fr_1fr]">
          <div className="p-8 sm:p-10">
            <p className="text-sm font-medium text-ember">Become a companion</p>
            <h1 className="display mt-3 text-[38px] sm:text-[48px]">Turn your free time into great experiences.</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-mute">Show visitors your city, be a plus-one for an event, share a hobby. You choose what you offer and what you charge.</p>
            <div className="mt-6 flex flex-wrap gap-1.5">
              {RANKS.map((r) => (
                <RankBadge key={r.id} rank={r.id} size="sm" />
              ))}
            </div>
          </div>
          <div className="relative hidden md:block" aria-hidden>
            <Photo src="/people/mei.webp" alt="" className="absolute inset-0 size-full" />
            <div className="absolute inset-0 bg-gradient-to-r from-coal to-transparent" />
          </div>
        </div>
      </Reveal>

      <Stagger className="mt-6 grid gap-4 sm:grid-cols-2" gap={0.06}>
        {PERKS.map(([icon, t, s]) => (
          <StaggerItem key={t} className="surface rounded-[10px] p-6">
            <span className="grid size-11 place-items-center rounded-full bg-char">
              <Icon icon={icon} size={20} />
            </span>
            <p className="mt-4 text-lg font-semibold">{t}</p>
            <p className="mt-1 text-sm text-mute">{s}</p>
          </StaggerItem>
        ))}
      </Stagger>

      <Reveal className="mt-6 space-y-4">
        {err && <Notice tone="bad">{err}</Notice>}
        <Notice tone="info">Being a companion is for social experiences only: company, conversation, events, outings and travel. A booking never includes physical contact, and you can end any experience at any time.</Notice>
        <Button
          variant="accent"
          size="lg"
          className="w-full"
          loading={busy}
          onClick={async () => {
            if (!(await confirm({ title: "Become a companion?", body: "You will set up your experiences, prices and availability next. You can pause it at any time.", confirmLabel: "Become a companion" }))) return;
            setBusy(true);
            setErr(null);
            try {
              await api.provider.activate();
              await qc.invalidateQueries({ queryKey: ["provider"] });
              await refresh();
              router.replace("/companion/settings");
            } catch (e) {
              setErr(errorMessage(e));
              setBusy(false);
            }
          }}
        >
          Become a companion
        </Button>
      </Reveal>
    </div>
  );
}
