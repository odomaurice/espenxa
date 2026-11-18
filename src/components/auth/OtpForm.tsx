"use client";

/* Step 2 of joining: confirm the one-time code. */
import { Mail01Icon, SmartPhone01Icon } from "@hugeicons/core-free-icons";
import { motion, useAnimationControls } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FullScreenSpinner } from "@/components/shell/AppShell";
import { useSession } from "@/components/Providers";
import { Button, cx, DevNote, errorMessage, Icon, Notice } from "@/components/ui";
import { api, devTools } from "@/lib/api/client";

const LEN = 6;

function mask(account: { otpChannel: "email" | "sms"; email: string; phone: string }) {
  if (account.otpChannel === "sms") return account.phone.replace(/^(\+\d{3})\d+(\d{2})$/, "$1 ••• ••$2");
  const [u, d] = account.email.split("@");
  return `${u.slice(0, 2)}${"•".repeat(Math.max(1, u.length - 2))}@${d}`;
}

export default function OtpForm() {
  const { account, loading, refresh } = useSession();
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(30);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const shake = useAnimationControls();

  useEffect(() => {
    if (loading) return;
    if (!account) router.replace("/register");
    else if (account.contactVerified) router.replace("/onboarding");
  }, [account, loading, router]);

  // Resend countdown.
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  // Development only: read the simulated message so the flow can be tested.
  useEffect(() => {
    if (!devTools || !account) return;
    devTools.outbox().then((box) => {
      const m = box.find((x) => /Your espenxa code is (\d{6})/.test(x.body));
      setDevCode(m ? m.body.match(/(\d{6})/)![1] : null);
    });
  }, [account, wait]);

  if (!account || account.contactVerified) return <FullScreenSpinner />;

  async function submit(code: string) {
    if (code.length !== LEN) return;
    setBusy(true);
    setError(null);
    try {
      await api.auth.verifyOtp(code);
      setSuccess(true);
      await refresh();
      setTimeout(() => router.replace("/onboarding"), 700);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
      shake.start({ x: [0, -10, 10, -8, 8, -4, 0], transition: { duration: 0.45 } });
      setDigits(Array(LEN).fill(""));
      refs.current[0]?.focus();
    }
  }

  function put(i: number, val: string) {
    const clean = val.replace(/\D/g, "");
    if (!clean) {
      const next = [...digits];
      next[i] = "";
      setDigits(next);
      return;
    }
    const next = [...digits];
    for (let k = 0; k < clean.length && i + k < LEN; k++) next[i + k] = clean[k];
    setDigits(next);
    const focus = Math.min(LEN - 1, i + clean.length);
    refs.current[focus]?.focus();
    if (next.every(Boolean)) submit(next.join(""));
  }

  async function resend(channel?: "email" | "sms") {
    setError(null);
    try {
      const r = await api.auth.resendOtp(channel);
      await refresh();
      setWait(r.retryInSeconds);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const other = account.otpChannel === "sms" ? "email" : "sms";

  return (
    <div>
      <p className="text-sm text-mute">Step 2 of 3 · Confirm it is you</p>
      <h1 className="display mt-2 text-[40px]">Enter your code</h1>
      <p className="mt-2 flex items-center gap-2 text-[15px] text-mute">
        <Icon icon={account.otpChannel === "sms" ? SmartPhone01Icon : Mail01Icon} size={17} />
        Sent to <span className="font-medium text-cream">{mask(account)}</span>
      </p>

      <motion.div animate={shake} className="mt-9 flex justify-between gap-2 sm:gap-3">
        {digits.map((d, i) => (
          <motion.input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            aria-label={`Digit ${i + 1}`}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={LEN}
            value={d}
            disabled={busy}
            autoFocus={i === 0}
            onChange={(e) => put(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
              if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
              if (e.key === "ArrowRight" && i < LEN - 1) refs.current[i + 1]?.focus();
            }}
            onFocus={(e) => e.target.select()}
            animate={success ? { scale: [1, 1.08, 1], backgroundColor: "#3ddc84", color: "#0a0a0b" } : d ? { scale: [0.9, 1] } : {}}
            transition={{ delay: success ? i * 0.05 : 0, duration: 0.3 }}
            className={cx(
              "h-16 w-full min-w-0 rounded-2xl bg-char text-center text-2xl font-semibold tabular caret-ember transition-shadow focus:ring-2 focus:ring-cream/30 focus:outline-none sm:h-[72px]",
              error && "ring-2 ring-bad/60",
            )}
          />
        ))}
      </motion.div>

      <div className="mt-5 min-h-6">{error && <Notice tone="bad">{error}</Notice>}</div>

      <Button variant="accent" size="lg" className="mt-2 w-full" loading={busy} disabled={digits.some((d) => !d)} onClick={() => submit(digits.join(""))}>
        {success ? "Confirmed" : "Confirm"}
      </Button>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        <button type="button" disabled={wait > 0} onClick={() => resend()} className="font-medium text-cream disabled:text-mute">
          {wait > 0 ? `Resend code in 0:${String(wait).padStart(2, "0")}` : "Resend code"}
        </button>
        <button type="button" disabled={wait > 0} onClick={() => resend(other)} className="text-mute hover:text-cream disabled:opacity-50">
          Send by {other === "sms" ? "SMS" : "email"} instead
        </button>
      </div>

      {devCode && (
        <div className="mt-8">
          <DevNote>
            No {account.otpChannel === "sms" ? "SMS" : "email"} is sent in development. Your code is <b className="tracking-widest text-cream">{devCode}</b>.
          </DevNote>
        </div>
      )}
    </div>
  );
}
