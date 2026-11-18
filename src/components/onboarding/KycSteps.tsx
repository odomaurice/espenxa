"use client";

/*
 * Identity verification: government ID, then a live selfie. In production
 * both go straight to the KYC provider (face match, liveness, document
 * checks) and espenxa keeps only the decision. Nothing here verifies anything
 * on its own; staff or the provider approve the account afterwards.
 */
import { Camera01Icon, CheckmarkBadge01Icon, Image01Icon, Refresh01Icon, Tick02Icon, Upload04Icon } from "@hugeicons/core-free-icons";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/components/Providers";
import { Button, cx, DevNote, errorMessage, Field, Icon, Notice, Select, Spinner } from "@/components/ui";
import { api, IS_MOCK } from "@/lib/api/client";
import { useOnboardingData } from "@/lib/api/hooks";
import type { IdDocumentType } from "@/lib/api/types";
import { COUNTRIES_BY_NAME } from "@/lib/countries";
import { dateOnly } from "@/lib/format";
import { ID_TYPES } from "@/lib/labels";
import { StepTitle } from "./Onboarding";

/* ---- government ID ------------------------------------------------------------ */

function DropZone({ label, file, onFile }: { label: string; file: File | null; onFile: (f: File | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    // Object URLs are external resources; syncing one into state is the documented pattern.
    queueMicrotask(() => setPreview(url));
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const shown = file && file.type.startsWith("image/") ? preview : null;
  return (
    <button
      type="button"
      onClick={() => input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        onFile(e.dataTransfer.files[0] ?? null);
      }}
      className={cx("group relative flex aspect-[1.586] w-full flex-col items-center justify-center overflow-hidden rounded-[10px] border-2 border-dashed transition-colors", drag ? "border-ember bg-ember/8" : file ? "border-transparent bg-char" : "border-line-hi bg-coal hover:border-cream/30")}
    >
      {shown ? (
        // eslint-disable-next-line @next/next/no-img-element -- local preview of a file the user picked
        <img src={shown} alt={`${label} preview`} className="absolute inset-0 size-full object-cover" />
      ) : file ? (
        <span className="text-sm font-medium">{file.name}</span>
      ) : (
        <>
          <span className="grid size-12 place-items-center rounded-full bg-char text-cream transition-transform group-hover:scale-110">
            <Icon icon={Upload04Icon} size={20} />
          </span>
          <span className="mt-3 text-sm font-medium">{label}</span>
          <span className="mt-0.5 text-xs text-mute">Tap to upload or drag a photo here</span>
        </>
      )}
      {file && (
        <span className="glass-dark absolute right-3 bottom-3 rounded-full px-3 py-1 text-xs font-medium">Replace</span>
      )}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
    </button>
  );
}

export function IdStep() {
  const { account } = useSession();
  const data = useOnboardingData();
  const qc = useQueryClient();
  const existing = data.data?.kyc.document;
  const [type, setType] = useState<IdDocumentType>("national_id");
  const [country, setCountry] = useState(account?.country ?? "NG");
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);
  const needsBack = ID_TYPES.find((t) => t.id === type)!.back;

  if (existing && !replacing)
    return (
      <>
        <StepTitle title="Government ID" sub="Your document is with our verification team." />
        <Submitted title={`${ID_TYPES.find((t) => t.id === existing.type)?.label} submitted`} sub={`Sent ${dateOnly(existing.submittedAt)}. You will be notified when it is checked.`} onRedo={() => setReplacing(true)} redoLabel="Submit a different document" />
      </>
    );

  return (
    <>
      <StepTitle title="Verify your identity" sub="Upload a government-issued photo ID. It confirms you are who you say you are, and that you are 18 or older." />
      {error && <Notice tone="bad" className="mb-5">{error}</Notice>}
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {ID_TYPES.map((t) => (
            <button key={t.id} type="button" aria-pressed={type === t.id} onClick={() => setType(t.id)} className={cx("rounded-[10px] px-4 py-3.5 text-left text-sm font-medium transition-colors", type === t.id ? "bg-cream text-ink" : "bg-char hover:bg-smoke")}>
              {t.label}
            </button>
          ))}
        </div>
        <Field label="Issuing country">
          {(id) => (
            <Select id={id} value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRIES_BY_NAME.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className={cx("grid gap-3", needsBack && "sm:grid-cols-2")}>
          <DropZone label={type === "passport" ? "Photo page" : "Front of document"} file={front} onFile={setFront} />
          {needsBack && <DropZone label="Back of document" file={back} onFile={setBack} />}
        </div>
        <ul className="grid gap-2 text-[13px] text-mute sm:grid-cols-3">
          {["All four corners visible", "No glare or blur", "Not expired"].map((t) => (
            <li key={t} className="flex items-center gap-2 rounded-2xl bg-coal px-3.5 py-3">
              <Icon icon={Tick02Icon} size={15} className="text-ok" stroke={2.4} /> {t}
            </li>
          ))}
        </ul>
        <Button
          variant="accent"
          size="lg"
          className="w-full"
          loading={busy}
          disabled={!front || (needsBack && !back)}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await api.onboarding.uploadId({ type, country, front: front!, back: needsBack ? back! : undefined });
              await qc.invalidateQueries({ queryKey: ["onboarding"] });
              setReplacing(false);
            } catch (e) {
              setError(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          Submit document
        </Button>
        <p className="text-xs leading-relaxed text-faint">
          Your document is encrypted and sent to our identity verification partner. Only authorised espenxa verification staff can view it, every view is logged, and it is never shown to other members.
          {/* TODO(team): name the KYC provider per country once contracts are signed. */}
        </p>
        {IS_MOCK && <DevNote>Development build: the document is kept only in this browser so staff can review it in the demo console. Nothing is verified automatically.</DevNote>}
      </div>
    </>
  );
}

/* ---- selfie ------------------------------------------------------------------------- */

type CamState = "idle" | "starting" | "live" | "captured" | "blocked";

export function SelfieStep() {
  const data = useOnboardingData();
  const qc = useQueryClient();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CamState>("idle");
  const [shot, setShot] = useState<{ url: string; blob: Blob } | null>(null);
  const [flash, setFlash] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redo, setRedo] = useState(false);
  const fallback = useRef<HTMLInputElement>(null);
  const submitted = data.data?.kyc.selfieSubmittedAt;

  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  useEffect(() => stop, []);

  async function start() {
    setError(null);
    setState("starting");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      stream.current = s;
      setState("live");
      requestAnimationFrame(() => {
        if (video.current) {
          video.current.srcObject = s;
          video.current.play().catch(() => {});
        }
      });
    } catch {
      setState("blocked");
    }
  }

  function capture() {
    const v = video.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d")!;
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1); // match the mirrored preview
    ctx.drawImage(v, 0, 0);
    c.toBlob((blob) => {
      if (!blob) return;
      setShot({ url: c.toDataURL("image/jpeg", 0.9), blob });
      setFlash((f) => f + 1);
      setState("captured");
      stop();
    }, "image/jpeg", 0.9);
  }

  async function submit() {
    if (!shot) return;
    setBusy(true);
    setError(null);
    try {
      await api.onboarding.submitSelfie(shot.blob);
      await qc.invalidateQueries({ queryKey: ["onboarding"] });
      setRedo(false);
      setShot(null);
      setState("idle");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (submitted && !redo)
    return (
      <>
        <StepTitle title="Selfie" sub="Your selfie is with our verification team." />
        <Submitted title="Selfie submitted" sub={`Sent ${dateOnly(submitted)}. We compare it with your ID to confirm it is really you.`} onRedo={() => setRedo(true)} redoLabel="Take a new selfie" />
      </>
    );

  return (
    <>
      <StepTitle title="Take a quick selfie" sub="We match it to your ID photo so everyone on espenxa knows profiles are real. It is never shown on your profile." />
      {error && <Notice tone="bad" className="mb-5">{error}</Notice>}

      <div className="relative mx-auto aspect-[3/4] w-full max-w-[380px] overflow-hidden rounded-[10px] bg-char ring-1 ring-white/10">
        <video ref={video} playsInline muted className={cx("absolute inset-0 size-full -scale-x-100 object-cover", state !== "live" && "hidden")} />
        {/* eslint-disable-next-line @next/next/no-img-element -- local capture preview */}
        {shot && state === "captured" && <img src={shot.url} alt="Your selfie" className="absolute inset-0 size-full object-cover" />}

        {(state === "live" || state === "captured") && (
          <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 300 400" preserveAspectRatio="none" aria-hidden>
            <defs>
              <mask id="face">
                <rect width="300" height="400" fill="white" />
                <ellipse cx="150" cy="180" rx="98" ry="128" fill="black" />
              </mask>
            </defs>
            <rect width="300" height="400" fill="rgb(10 10 11 / 0.55)" mask="url(#face)" />
            <motion.ellipse cx="150" cy="180" rx="98" ry="128" fill="none" stroke={state === "captured" ? "#3ddc84" : "#f6f6f7"} strokeWidth="3" strokeDasharray="8 8" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }} />
          </svg>
        )}

        {(state === "idle" || state === "starting" || state === "blocked") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <motion.span className="grid size-20 place-items-center rounded-full bg-smoke" animate={state === "starting" ? { scale: [1, 1.08, 1] } : {}} transition={{ duration: 0.8 }}>
              {state === "starting" ? <Spinner className="size-7" /> : <Icon icon={Camera01Icon} size={32} />}
            </motion.span>
            <p className="mt-5 text-[15px] font-semibold">{state === "blocked" ? "Camera not available" : "Good light, face the camera"}</p>
            <p className="mt-1 text-[13px] text-mute">{state === "blocked" ? "Allow camera access in your browser settings, or take a photo with your phone instead." : "Remove sunglasses and hats. Keep a neutral expression."}</p>
          </div>
        )}

        <AnimatePresence>
          {flash > 0 && <motion.div key={flash} className="pointer-events-none absolute inset-0 bg-white" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }} />}
        </AnimatePresence>
        {state === "live" && <p className="glass-dark absolute inset-x-6 bottom-5 rounded-full py-2 text-center text-xs font-medium">Fit your face inside the oval</p>}
      </div>

      <div className="mx-auto mt-6 flex max-w-[380px] flex-col gap-2.5">
        {state === "idle" && (
          <Button size="lg" onClick={start}>
            <Icon icon={Camera01Icon} size={18} /> Start camera
          </Button>
        )}
        {state === "live" && (
          <motion.button type="button" onClick={capture} whileTap={{ scale: 0.9 }} aria-label="Take selfie" className="mx-auto grid size-20 place-items-center rounded-full bg-cream ring-[6px] ring-cream/25">
            <span className="size-16 rounded-full border-2 border-ink" />
          </motion.button>
        )}
        {state === "captured" && (
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                setShot(null);
                start();
              }}
            >
              <Icon icon={Refresh01Icon} size={17} /> Retake
            </Button>
            <Button variant="accent" size="lg" loading={busy} onClick={submit}>
              Use this photo
            </Button>
          </div>
        )}
        {(state === "blocked" || state === "idle") && (
          <>
            <Button variant={state === "blocked" ? "primary" : "quiet"} size={state === "blocked" ? "lg" : "md"} onClick={() => fallback.current?.click()}>
              <Icon icon={Image01Icon} size={17} /> {state === "blocked" ? "Take a photo instead" : "Having trouble? Upload a photo instead"}
            </Button>
            <input
              ref={fallback}
              type="file"
              accept="image/*"
              capture="user"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = () => {
                  setShot({ url: String(reader.result), blob: f });
                  setState("captured");
                };
                reader.readAsDataURL(f);
              }}
            />
          </>
        )}
        <p className="mt-2 text-center text-xs leading-relaxed text-faint">Liveness and face matching are done by our verification partner. Your selfie is never shown to other members.</p>
        {IS_MOCK && <DevNote>Development build: the selfie is kept only in this browser for the demo staff review. No automatic face matching happens.</DevNote>}
      </div>
    </>
  );
}

function Submitted({ title, sub, onRedo, redoLabel }: { title: string; sub: string; onRedo: () => void; redoLabel: string }) {
  return (
    <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 24 }} className="surface flex flex-col items-center rounded-[10px] px-6 py-12 text-center">
      <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 400, damping: 14, delay: 0.1 }} className="grid size-20 place-items-center rounded-full bg-ok/15 text-ok">
        <Icon icon={CheckmarkBadge01Icon} size={38} stroke={2} />
      </motion.span>
      <p className="mt-5 text-xl font-semibold">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-mute">{sub}</p>
      <button type="button" onClick={onRedo} className="mt-6 text-sm font-medium text-mute underline-offset-4 hover:text-cream hover:underline">
        {redoLabel}
      </button>
    </motion.div>
  );
}
