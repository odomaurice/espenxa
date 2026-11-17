import type { Metadata } from "next";
import Link from "next/link";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";

export const metadata: Metadata = { title: "Safety centre" };

/* TODO(team): final safety wording and per-country emergency numbers to be approved. */
const TIPS = [
  ["Meet in public", "First meetings should be in busy public places: restaurants, malls, events. Never at a home address."],
  ["Tell someone", "Add a trusted contact in Settings and share your booking plans before you go."],
  ["Check in", "Use \"I have arrived\" on your booking. If plans change, update them in the app."],
  ["Pay through Meet", "Never send money outside Meet or pay in cash. Anyone who asks is breaking the rules."],
  ["Consent is never for sale", "A booking pays for time and company. It never includes physical contact, and you can leave at any time."],
  ["Trust your instincts", "If something feels wrong, leave. Then report it. Reports are confidential."],
] as const;

export default function SafetyPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <Reveal>
        <div className="relative overflow-hidden rounded-[32px] bg-ember p-8 text-ink sm:p-10">
          <span className="pointer-events-none absolute -top-16 -right-16 size-64 rounded-full bg-white/20 blur-3xl" aria-hidden />
          <p className="relative text-sm font-semibold opacity-80">Safety centre</p>
          <h1 className="display relative mt-3 max-w-xl text-[36px] sm:text-[48px]">Your safety comes before everything else.</h1>
          <p className="relative mt-3 max-w-lg text-[15px] opacity-80">If you are in immediate danger, contact local emergency services first. Then tell us.</p>
        </div>
      </Reveal>
      <Stagger className="mt-6 grid gap-4 sm:grid-cols-2" gap={0.06}>
        {TIPS.map(([t, s], i) => (
          <StaggerItem key={t} className="surface rounded-[26px] p-6">
            <span className="grid size-10 place-items-center rounded-full bg-char text-sm font-semibold">{i + 1}</span>
            <p className="mt-4 text-lg font-semibold">{t}</p>
            <p className="mt-1.5 text-[14.5px] leading-relaxed text-mute">{s}</p>
          </StaggerItem>
        ))}
      </Stagger>
      <Reveal className="surface mt-6 flex flex-col justify-between gap-4 rounded-[26px] p-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-lg font-semibold">Report or block someone</p>
          <p className="mt-1 text-sm text-mute">Open their profile or your conversation, tap the menu, then Report or Block. Underage users, threats and coercion are reviewed first.</p>
        </div>
        <Link href="/community-rules" className="shrink-0 rounded-full bg-cream px-5 py-3 text-sm font-semibold text-ink hover:bg-white">
          Community rules
        </Link>
      </Reveal>
    </div>
  );
}
