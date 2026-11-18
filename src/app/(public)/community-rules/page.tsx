import type { Metadata } from "next";
import Wordmark from "@/components/Wordmark";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Community rules" };

/* TODO(team): final wording to be approved by legal and trust and safety. */
const RULES = [
  ["Adults only", `Everyone on ${SITE.name} is ${SITE.minAge} or older and verified. Report anyone you think may be younger.`],
  ["Consent is never for sale", "A booking pays for someone's time and company for a social experience. It never entitles anyone to physical contact, intimacy or sexual activity. Either person can end an experience at any time."],
  ["Meet in public", "Plan first meetings in public places. Never share or ask for a home address in your profile. Locations are always shown as approximate."],
  ["Pay through espenxa", "Paid bookings are paid through the platform so both people are protected. Asking to be paid outside espenxa is not allowed."],
  ["Be who you say you are", "Use your own photos. No fake profiles, impersonation or misleading details."],
  ["Respect", "No harassment, threats, hate, coercion or pressure. Take no for an answer."],
  ["Nothing explicit", "No explicit photos, messages or offers anywhere on the platform."],
] as const;

export default function CommunityRulesPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Wordmark />
      <h1 className="display mt-12 text-5xl sm:text-6xl">Community rules</h1>
      <p className="mt-3 text-mute">The short version of how we keep {SITE.name} safe and respectful for everyone.</p>
      <ol className="mt-10 divide-y divide-line border-y border-line">
        {RULES.map(([title, body], i) => (
          <li key={title} className="flex gap-5 py-6">
            <span className="display w-8 shrink-0 text-2xl text-ember tabular">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-1 text-[15px] leading-relaxed text-mute">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
