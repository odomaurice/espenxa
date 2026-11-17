"use client";

/*
 * First visit: a full-screen age check before anything else is usable, then
 * the cookie choice. Under-18s are shown out. The answer is checked again,
 * properly, by date of birth when someone registers.
 */
import { Cancel01Icon, CheckmarkCircle02Icon, CookieIcon, Shield01Icon } from "@hugeicons/core-free-icons";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, cx, Icon, Switch } from "@/components/ui";
import { Logo } from "@/components/Wordmark";
import { answerAge, closeCookieSettings, saveCookieChoice, useAge, useCookieChoice, useCookieSettingsOpen } from "@/lib/consent";

/** Pages that must stay readable before answering, so people can see what they agree to. */
const OPEN = ["/community-rules"];

export default function Gates({ children }: { children: ReactNode }) {
  const age = useAge();
  const path = usePathname();
  const exempt = path.startsWith("/admin") || OPEN.includes(path);
  const blocked = !exempt && age !== "adult";
  return (
    <>
      <div inert={blocked} aria-hidden={blocked || undefined}>
        {children}
      </div>
      {!exempt && age === "unknown" && <div className="fixed inset-0 z-[100] bg-ink" aria-hidden />}
      <AnimatePresence>{blocked && age !== "unknown" && <AgeGate key="age" minor={age === "minor"} />}</AnimatePresence>
      {(age === "adult" || exempt) && age !== "unknown" && <CookieBanner />}
    </>
  );
}

function AgeGate({ minor }: { minor: boolean }) {
  const first = useRef<HTMLButtonElement>(null);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    first.current?.focus();
  }, [minor]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
      className="fixed inset-0 z-[100] overflow-y-auto bg-ink/80 backdrop-blur-2xl"
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 left-1/2 size-[640px] -translate-x-1/2 rounded-full bg-ember/18 blur-[120px]" />
        <div className="absolute -bottom-40 -left-20 size-[420px] rounded-full bg-blush/10 blur-[110px]" />
      </div>
      <div className="relative grid min-h-full place-items-center p-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 24, delay: 0.05 }}
          className="w-full max-w-[560px] overflow-hidden rounded-[36px] bg-coal shadow-[0_40px_120px_-20px_rgb(0_0_0/0.9)] ring-1 ring-white/8"
        >
          <div className="relative h-44 overflow-hidden sm:h-52">
            <div className="absolute inset-0 flex">
              {["amara", "kai", "zara", "tobi", "mei"].map((p, i) => (
                <motion.div key={p} className="relative h-full flex-1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.06, type: "spring", stiffness: 200, damping: 22 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- decorative, AI-generated people */}
                  <img src={`/people/${p}.webp`} alt="" className="size-full object-cover" />
                </motion.div>
              ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-coal/10 via-coal/40 to-coal" />
            <div className="absolute bottom-5 left-7">
              <Logo height={30} />
            </div>
            <span className="absolute top-5 right-6 grid size-14 place-items-center rounded-full bg-ember text-xl font-bold text-ink shadow-lg">18+</span>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {!minor ? (
              <motion.div key="ask" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-7 pt-3 pb-8 sm:px-9">
                <h1 id="age-title" className="display text-[32px] leading-[1.05] sm:text-[38px]">
                  Meet is for adults only
                </h1>
                <p className="mt-3 text-[15.5px] leading-relaxed text-mute">You must be 18 or older to use Meet. Please confirm your age to continue.</p>
                <ul className="mt-5 space-y-2.5 text-[14.5px]">
                  {[
                    "I am 18 years old or older",
                    "I will treat everyone with respect and follow the community rules",
                    "I understand bookings are for time and company in public places, never anything sexual",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2.5">
                      <Icon icon={CheckmarkCircle02Icon} size={18} className="mt-0.5 shrink-0 text-ok" />
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="mt-7 grid gap-2.5 sm:grid-cols-[1.4fr_1fr]">
                  <Button ref={first} variant="accent" size="lg" onClick={() => answerAge("adult")}>
                    I am 18 or older, enter
                  </Button>
                  <Button variant="secondary" size="lg" onClick={() => answerAge("minor")}>
                    I am under 18
                  </Button>
                </div>
                <p className="mt-5 text-center text-xs leading-relaxed text-faint">
                  By entering you agree to the{" "}
                  <Link href="/community-rules" className="underline underline-offset-2 hover:text-cream">
                    community rules
                  </Link>
                  . We check your date of birth again when you create an account.
                  {/* TODO(team): link Terms and Privacy Policy once legal signs them off, and confirm the age wording per country. */}
                </p>
              </motion.div>
            ) : (
              <motion.div key="minor" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-7 pt-3 pb-8 sm:px-9">
                <h1 id="age-title" className="display text-[32px] leading-[1.05] sm:text-[38px]">
                  Sorry, Meet is not for you yet
                </h1>
                <p className="mt-3 text-[15.5px] leading-relaxed text-mute">Meet is only for people aged 18 and over. You cannot use it until then.</p>
                <div className="mt-5 flex items-start gap-3 rounded-[20px] bg-char p-4 text-sm leading-relaxed text-cream/85">
                  <Icon icon={Shield01Icon} size={18} className="mt-0.5 shrink-0 text-info" />
                  If someone online is pressuring you to meet them or to send photos, tell an adult you trust. You have not done anything wrong.
                </div>
                <Button
                  ref={first}
                  size="lg"
                  className="mt-7 w-full"
                  loading={leaving}
                  onClick={() => {
                    setLeaving(true);
                    window.location.replace("https://www.google.com");
                  }}
                >
                  Leave Meet
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}

function CookieBanner() {
  const { choice, ready } = useCookieChoice();
  const reopened = useCookieSettingsOpen();
  const show = ready && (!choice || reopened);
  return <AnimatePresence>{show && <CookiePanel key="cookies" initial={choice} startOpen={reopened} />}</AnimatePresence>;
}

function CookiePanel({ initial, startOpen }: { initial: { analytics: boolean; personalisation: boolean } | null; startOpen: boolean }) {
  const [details, setDetails] = useState(startOpen);
  const [analytics, setAnalytics] = useState(initial?.analytics ?? false);
  const [personal, setPersonal] = useState(initial?.personalisation ?? false);
  return (
    <motion.section
      role="dialog"
      aria-labelledby="cookie-title"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-[460px] rounded-[28px] bg-[#161618]/96 p-5 shadow-[0_30px_80px_-10px_rgb(0_0_0/0.9)] ring-1 ring-white/10 backdrop-blur-2xl sm:right-auto sm:bottom-6 sm:left-6 sm:mx-0 sm:p-6"
    >
      <div className="flex items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ember/15 text-ember">
          <Icon icon={CookieIcon} size={21} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="cookie-title" className="text-[17px] font-semibold">
            Cookies on Meet
          </h2>
          <p className="mt-1 text-[13.5px] leading-relaxed text-mute">We use a few essential cookies to keep you signed in and safe. With your permission we also use some to understand how Meet is used and to remember your preferences.</p>
        </div>
        {startOpen && (
          <button type="button" aria-label="Close" onClick={closeCookieSettings} className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full text-mute hover:bg-char hover:text-cream">
            <Icon icon={Cancel01Icon} size={17} />
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {details && (
          <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-4 space-y-2 overflow-hidden">
            {[
              { id: "essential", title: "Essential", body: "Signing in, security, your age answer and this choice. Always on.", on: true, set: undefined },
              { id: "analytics", title: "Analytics", body: "Counts visits and which screens are used, so we can make Meet better.", on: analytics, set: setAnalytics },
              { id: "personal", title: "Preferences", body: "Remembers things like your last filters and layout between visits.", on: personal, set: setPersonal },
            ].map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-[18px] bg-char p-3.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{c.title}</span>
                  <span className="block text-xs leading-relaxed text-mute">{c.body}</span>
                </span>
                <Switch on={c.on} onChange={(v) => c.set?.(v)} label={c.title} disabled={!c.set} />
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      <div className={cx("mt-4 grid gap-2", details ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-[1fr_1fr_auto]")}>
        {details ? (
          <>
            <Button variant="secondary" onClick={() => saveCookieChoice({ analytics: false, personalisation: false })}>
              Only essential
            </Button>
            <Button onClick={() => saveCookieChoice({ analytics, personalisation: personal })}>Save my choice</Button>
          </>
        ) : (
          <>
            <Button onClick={() => saveCookieChoice({ analytics: true, personalisation: true })}>Accept all</Button>
            <Button variant="secondary" onClick={() => saveCookieChoice({ analytics: false, personalisation: false })}>
              Only essential
            </Button>
            <Button variant="ghost" className="col-span-2 sm:col-span-1" onClick={() => setDetails(true)}>
              Choose
            </Button>
          </>
        )}
      </div>
      {/* TODO(team): link the cookie policy once legal signs it off. */}
    </motion.section>
  );
}
