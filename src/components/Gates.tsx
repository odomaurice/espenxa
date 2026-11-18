"use client";

/*
 * First visit: a full-screen age check before anything else is usable, then
 * the cookie choice. Under-18s are shown out. The answer is checked again,
 * properly, by date of birth when someone registers.
 * Styled like the public site: white, square corners, serif headings at
 * regular weight, pill buttons.
 */
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx, Icon, Photo, Switch } from "@/components/ui";
import { Logo } from "@/components/Wordmark";
import { answerAge, closeCookieSettings, saveCookieChoice, useAge, useCookieChoice, useCookieSettingsOpen } from "@/lib/consent";
import { PHOTOS } from "@/lib/photos";
import { SITE } from "@/lib/site";

/** Pages that must stay readable before answering, so people can see what they agree to. */
const OPEN = ["/community-rules"];

const solid = "inline-flex h-12 w-full items-center justify-center rounded-full bg-[#181818] px-6 text-[13px] font-medium tracking-[0.02em] text-white uppercase transition-colors hover:bg-[#181818]/85";
const outline = "inline-flex h-12 w-full items-center justify-center rounded-full px-6 text-[13px] font-medium tracking-[0.02em] text-[#181818] uppercase shadow-[inset_0_0_0_1px_#181818] transition-colors hover:bg-[#181818] hover:text-white";

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
      {!exempt && age === "unknown" && <div className="fixed inset-0 z-[100] bg-white" aria-hidden />}
      <AnimatePresence>{blocked && age !== "unknown" && <AgeGate key="age" minor={age === "minor"} />}</AnimatePresence>
      {(age === "adult" || exempt) && age !== "unknown" && <Cookies />}
    </>
  );
}

/* ---- age check ------------------------------------------------------------------ */

function AgeGate({ minor }: { minor: boolean }) {
  const first = useRef<HTMLButtonElement>(null);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    first.current?.focus();
  }, [minor]);
  const photo = PHOTOS.hero[0];

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      className="fixed inset-0 z-[100] overflow-y-auto bg-[#181818]/55 backdrop-blur-md"
    >
      <div className="grid min-h-full place-items-center p-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 28 }}
          className="grid w-full max-w-[880px] overflow-hidden bg-white text-[#181818] shadow-[0_30px_80px_-20px_rgb(0_0_0/0.45)] md:grid-cols-[1fr_1.1fr]"
        >
          <div className="relative h-56 md:h-auto md:min-h-[560px]">
            <Photo src={photo.src} alt="" focus={photo.focus} className="wash absolute inset-0 size-full" />
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {!minor ? (
              <motion.div key="ask" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-12">
                <Logo height={20} />
                <p className="mt-8 text-[12px] tracking-[0.06em] text-[#5e5e5e] uppercase">Adults only · {SITE.minAge}+</p>
                <h1 id="age-title" className="display mt-2 text-[36px] sm:text-[44px]">
                  Welcome to {SITE.name}
                </h1>
                <p className="mt-3 text-[15px] leading-relaxed text-[#5e5e5e]">Please confirm your age to continue. By entering, you agree that:</p>
                <ul className="mt-4 border-t border-[#181818]/10 text-[14px]">
                  {[`You are ${SITE.minAge} years old or older`, "You will treat everyone with respect and follow the community rules", "Bookings are for time and company in public places, never anything sexual"].map((t) => (
                    <li key={t} className="border-b border-[#181818]/10 py-3">
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="mt-7 grid gap-2.5">
                  <button ref={first} type="button" onClick={() => answerAge("adult")} className={solid}>
                    I am {SITE.minAge} or older
                  </button>
                  <button type="button" onClick={() => answerAge("minor")} className={outline}>
                    I am under {SITE.minAge}
                  </button>
                </div>
                <p className="mt-5 text-[12px] leading-relaxed text-[#8a8a8a]">
                  Read the{" "}
                  <Link href="/community-rules" className="underline underline-offset-2 hover:text-[#181818]">
                    community rules
                  </Link>
                  . We check your date of birth again when you create an account.
                  {/* TODO(team): link Terms and Privacy once legal signs them off, and confirm the age wording per country. */}
                </p>
              </motion.div>
            ) : (
              <motion.div key="minor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-12">
                <Logo height={20} />
                <h1 id="age-title" className="display mt-8 text-[36px] sm:text-[44px]">
                  Sorry, {SITE.name} is for adults
                </h1>
                <p className="mt-3 text-[15px] leading-relaxed text-[#5e5e5e]">You must be {SITE.minAge} or older to use {SITE.name}. You cannot use it until then.</p>
                <p className="mt-5 border-y border-[#181818]/10 py-4 text-[14px] leading-relaxed">If someone online is pressuring you to meet them or to send photos, tell an adult you trust. You have not done anything wrong.</p>
                <button
                  ref={first}
                  type="button"
                  className={cx(solid, "mt-7")}
                  disabled={leaving}
                  onClick={() => {
                    setLeaving(true);
                    window.location.replace("https://www.google.com");
                  }}
                >
                  Leave {SITE.name}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ---- cookies -------------------------------------------------------------------- */

function Cookies() {
  const { choice, ready } = useCookieChoice();
  const reopened = useCookieSettingsOpen();
  const [settings, setSettings] = useState(false);
  const showBar = ready && !choice && !settings;
  const showSettings = ready && (settings || reopened);
  return (
    <>
      <AnimatePresence>{showBar && <CookieBar key="bar" onSettings={() => setSettings(true)} />}</AnimatePresence>
      <AnimatePresence>
        {showSettings && (
          <CookieSettings
            key="settings"
            initial={choice}
            onClose={() => {
              setSettings(false);
              closeCookieSettings();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/** Full-width bar along the bottom, like most retail sites. */
function CookieBar({ onSettings }: { onSettings: () => void }) {
  return (
    <motion.section
      role="region"
      aria-label="Cookie consent"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 34 }}
      className="fixed inset-x-0 bottom-0 z-[90] border-t border-[#181818]/10 bg-white text-[#181818] shadow-[0_-10px_30px_-12px_rgb(0_0_0/0.18)]"
    >
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:gap-10">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] tracking-[0.04em] uppercase">We value your privacy</p>
          <p className="mt-1.5 max-w-3xl text-[13.5px] leading-relaxed text-[#5e5e5e]">
            We use essential cookies to keep you signed in and safe. With your permission, we also use cookies to understand how {SITE.name} is used and to remember your preferences. You can change your choice at any time in Cookie settings.
            {/* TODO(team): link the cookie policy once legal signs it off. */}
          </p>
        </div>
        <div className="grid shrink-0 gap-2 sm:flex sm:items-center sm:gap-3">
          <button type="button" onClick={onSettings} className="h-10 px-2 text-[13px] underline underline-offset-4 hover:no-underline sm:order-first">
            Cookie settings
          </button>
          <button type="button" onClick={() => saveCookieChoice({ analytics: false, personalisation: false })} className={cx(outline, "h-11 sm:w-auto")}>
            Reject all
          </button>
          <button type="button" onClick={() => saveCookieChoice({ analytics: true, personalisation: true })} className={cx(solid, "h-11 sm:w-auto")}>
            Accept all cookies
          </button>
        </div>
      </div>
    </motion.section>
  );
}

function CookieSettings({ initial, onClose }: { initial: { analytics: boolean; personalisation: boolean } | null; onClose: () => void }) {
  const [analytics, setAnalytics] = useState(initial?.analytics ?? false);
  const [personal, setPersonal] = useState(initial?.personalisation ?? false);
  const save = (c: { analytics: boolean; personalisation: boolean }) => {
    saveCookieChoice(c);
    onClose();
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[95] grid place-items-end bg-[#181818]/45 sm:place-items-center sm:p-4" onClick={onClose}>
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-title"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-[560px] overflow-y-auto bg-white text-[#181818]"
      >
        <div className="flex items-center justify-between border-b border-[#181818]/10 px-6 py-4">
          <Logo height={18} />
          <button type="button" aria-label="Close" onClick={onClose} className="grid size-9 place-items-center">
            <Icon icon={Cancel01Icon} size={18} />
          </button>
        </div>
        <div className="px-6 pt-6">
          <h2 id="cookie-title" className="display text-[32px]">
            Cookie settings
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#5e5e5e]">Choose which cookies {SITE.name} may use. Essential cookies are always on because the site cannot work without them.</p>
        </div>
        <ul className="mt-5 border-t border-[#181818]/10 px-6">
          {[
            { id: "essential", title: "Essential", body: "Signing in, security, your age answer and this choice.", on: true, set: undefined },
            { id: "analytics", title: "Analytics", body: "Counts visits and which pages are used, so we can improve the site.", on: analytics, set: setAnalytics },
            { id: "personal", title: "Preferences", body: "Remembers things like your last filters and layout between visits.", on: personal, set: setPersonal },
          ].map((c) => (
            <li key={c.id} className="flex items-center gap-4 border-b border-[#181818]/10 py-4">
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] tracking-[0.04em] uppercase">{c.title}</span>
                <span className="mt-0.5 block text-[13.5px] leading-relaxed text-[#5e5e5e]">{c.body}</span>
              </span>
              {c.set ? <Switch on={c.on} onChange={c.set} label={c.title} /> : <span className="text-[12px] text-[#5e5e5e] uppercase">Always on</span>}
            </li>
          ))}
        </ul>
        <div className="grid gap-2 p-6 sm:grid-cols-2">
          <button type="button" onClick={() => save({ analytics: false, personalisation: false })} className={outline}>
            Reject all
          </button>
          <button type="button" onClick={() => save({ analytics, personalisation: personal })} className={solid}>
            Save my choices
          </button>
        </div>
      </motion.section>
    </motion.div>
  );
}
