"use client";

/*
 * Identity review for verification staff: every file the person submitted,
 * a zoom/rotate viewer, a face-comparison strip and the decision. Opening
 * this screen is written to the audit log; every image carries a
 * confidential watermark with the viewer's name and the time.
 */
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  LockPasswordIcon,
  MinusSignIcon,
  PlusSignIcon,
  Refresh01Icon,
  Rotate01Icon,
} from "@hugeicons/core-free-icons";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/Providers";
import { Badge, Button, cx, Dialog, ErrorState, errorMessage, Icon, IconButton, Notice, PageHeader, Photo, Skeleton, Textarea } from "@/components/ui";
import { api } from "@/lib/api/client";
import type { KycFile, KycReview as Review, VerificationDecision } from "@/lib/api/types";
import { countryByCode } from "@/lib/countries";
import { ageFrom, dateOnly, timeAgo } from "@/lib/format";
import { ID_TYPES, staffRoleLabel, VERIFICATION } from "@/lib/labels";

const KIND_LABEL: Record<KycFile["kind"], string> = { id_front: "ID front", id_back: "ID back", selfie: "Selfie" };

export default function KycReview({ userId }: { userId: string }) {
  // Not cached between visits: every open is a fresh, logged access.
  const r = useQuery({ queryKey: ["admin", "kyc", userId], queryFn: () => api.admin.kycReview(userId), staleTime: 0, gcTime: 0 });
  if (r.isPending) return <Skeleton className="h-150" />;
  if (r.isError) return <ErrorState error={r.error} />;
  return <Loaded r={r.data} />;
}

function Watermark() {
  const { account } = useSession();
  const [stamp] = useState(() => new Date().toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }));
  const text = `CONFIDENTIAL · ${account?.fullName ?? "Staff"} · ${stamp}`;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none" aria-hidden>
      <div className="absolute -inset-1/2 flex rotate-[-24deg] flex-col justify-around">
        {Array.from({ length: 8 }).map((_, i) => (
          <p key={i} className="text-center text-[13px] font-semibold tracking-wider whitespace-nowrap text-white/14">
            {Array.from({ length: 4 }).map(() => text).join("        ")}
          </p>
        ))}
      </div>
    </div>
  );
}

function FileThumb({ f, onOpen }: { f: KycFile; onOpen: () => void }) {
  const pdf = f.mimeType === "application/pdf";
  return (
    <button type="button" onClick={onOpen} className="group relative block w-full overflow-hidden rounded-[20px] bg-ink text-left ring-1 ring-line transition hover:ring-cream/40">
      <div className={cx("relative grid place-items-center overflow-hidden", f.kind === "selfie" ? "aspect-3/4" : "aspect-[1.586]")}>
        {pdf ? (
          <span className="text-sm font-semibold text-mute">PDF document · tap to open</span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- data URLs or signed provider links
          <img src={f.url} alt={KIND_LABEL[f.kind]} className="size-full object-contain transition-transform duration-500 group-hover:scale-[1.03]" draggable={false} />
        )}
        <Watermark />
      </div>
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <span className="text-sm font-semibold">{KIND_LABEL[f.kind]}</span>
        <span className="flex items-center gap-2 text-xs text-mute">
          {f.sample && <Badge tone="warn" className="h-5 px-2 text-[10px]">Sample</Badge>}
          {timeAgo(f.uploadedAt)}
        </span>
      </div>
    </button>
  );
}

function Viewer({ files, index, onClose, onIndex }: { files: KycFile[]; index: number; onClose: () => void; onIndex: (i: number) => void }) {
  const [zoom, setZoom] = useState(1);
  const [rot, setRot] = useState(0);
  const f = files[index];
  const go = (d: number) => {
    setZoom(1);
    setRot(0);
    onIndex((index + d + files.length) % files.length);
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(5, z + 0.5));
      if (e.key === "-") setZoom((z) => Math.max(1, z - 0.5));
      if (e.key.toLowerCase() === "r") setRot((r) => r + 90);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  const pdf = f.mimeType === "application/pdf";
  return (
    <motion.div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label={`${KIND_LABEL[f.kind]} viewer`}>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Icon icon={LockPasswordIcon} size={16} className="text-warn" /> {KIND_LABEL[f.kind]} · {index + 1} of {files.length}
          {f.sample && <Badge tone="warn">Sample</Badge>}
        </p>
        <div className="flex items-center gap-1.5">
          {!pdf && (
            <>
              <IconButton icon={MinusSignIcon} label="Zoom out" tone="glass" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} />
              <span className="w-12 text-center text-xs tabular">{Math.round(zoom * 100)}%</span>
              <IconButton icon={PlusSignIcon} label="Zoom in" tone="glass" onClick={() => setZoom((z) => Math.min(5, z + 0.5))} />
              <IconButton icon={Rotate01Icon} label="Rotate" tone="glass" onClick={() => setRot((r) => r + 90)} />
              <IconButton icon={Refresh01Icon} label="Reset view" tone="glass" onClick={() => { setZoom(1); setRot(0); }} />
            </>
          )}
          <IconButton icon={Cancel01Icon} label="Close viewer" tone="white" onClick={onClose} />
        </div>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden" onWheel={(e) => !pdf && setZoom((z) => Math.min(5, Math.max(1, z - e.deltaY * 0.0015)))}>
        {pdf ? (
          <iframe src={f.url} title="Submitted PDF" className="size-full bg-white" />
        ) : (
          <motion.div className="relative grid size-full place-items-center" drag={zoom > 1} dragMomentum={false} style={{ cursor: zoom > 1 ? "grab" : "default" }}>
            <motion.div className="relative max-h-full max-w-full" animate={{ scale: zoom, rotate: rot }} transition={{ type: "spring", stiffness: 260, damping: 28 }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- data URLs or signed provider links */}
              <img src={f.url} alt={KIND_LABEL[f.kind]} className="max-h-[78dvh] max-w-[92vw] object-contain" draggable={false} />
              <Watermark />
            </motion.div>
          </motion.div>
        )}
        {files.length > 1 && (
          <>
            <IconButton icon={ArrowLeft01Icon} label="Previous file" tone="glass" className="absolute top-1/2 left-4 -translate-y-1/2" onClick={() => go(-1)} />
            <IconButton icon={ArrowRight01Icon} label="Next file" tone="glass" className="absolute top-1/2 right-4 -translate-y-1/2" onClick={() => go(1)} />
          </>
        )}
      </div>
      <div className="flex justify-center gap-2 p-3">
        {files.map((x, i) => (
          <button key={x.id} type="button" onClick={() => { setZoom(1); setRot(0); onIndex(i); }} className={cx("rounded-full px-3.5 py-1.5 text-xs font-medium", i === index ? "bg-cream text-ink" : "bg-white/10 hover:bg-white/20")}>
            {KIND_LABEL[x.kind]}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function Loaded({ r }: { r: Review }) {
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(null);
  const [decision, setDecision] = useState<VerificationDecision | null>(null);
  const c = r.case;
  const v = VERIFICATION[c.status];
  const selfie = r.files.find((f) => f.kind === "selfie");
  const docs = r.files.filter((f) => f.kind !== "selfie");
  const ordered = [...docs, ...(selfie ? [selfie] : [])];
  const decided = !["pending", "needs_info"].includes(c.status);

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <IconButton icon={ArrowLeft01Icon} label="Back" tone="filled" onClick={() => router.back()} />
        <p className="text-sm text-mute">Verification review</p>
      </div>
      <PageHeader title={c.name} sub={`@${c.username} · ${c.role === "companion" ? "Companion" : "Member"} · ${countryByCode(c.country)?.name}`} actions={<Badge tone={v.tone} className="h-8 px-3.5 text-[13px]">{v.label}</Badge>} />

      <Notice tone="warn" className="mb-6">
        These are identity documents. Your access was recorded in the audit log. Do not download, screenshot or share them.
        {r.files.some((f) => f.sample) && " Some files here are generated samples for seeded demo accounts."}
      </Notice>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="surface rounded-card p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Identity document</h2>
              <span className="text-xs text-mute">
                {ID_TYPES.find((t) => t.id === c.documentType)?.label ?? "Not submitted"}
                {c.documentCountry ? ` · ${countryByCode(c.documentCountry)?.name}` : ""}
              </span>
            </div>
            {docs.length ? (
              <div className={cx("grid gap-4", docs.length > 1 && "md:grid-cols-2")}>
                {docs.map((f) => (
                  <FileThumb key={f.id} f={f} onOpen={() => setOpen(ordered.indexOf(f))} />
                ))}
              </div>
            ) : (
              <p className="rounded-[20px] bg-char px-4 py-8 text-center text-sm text-mute">No document submitted.</p>
            )}
          </section>

          <section className="surface rounded-card p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Face comparison</h2>
            <p className="mt-1 text-sm text-mute">The selfie should match the ID photo and the profile photos.</p>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                {selfie ? <FileThumb f={selfie} onOpen={() => setOpen(ordered.indexOf(selfie))} /> : <p className="grid aspect-3/4 place-items-center rounded-[20px] bg-char text-sm text-mute">No selfie</p>}
              </div>
              {r.profilePhotos.slice(0, 3).map((p, i) => (
                <div key={i} className="overflow-hidden rounded-[20px] bg-ink ring-1 ring-line">
                  <Photo src={p} alt={`Profile photo ${i + 1}`} className="aspect-3/4 w-full" />
                  <p className="px-4 py-3 text-sm font-semibold">Profile {i + 1}</p>
                </div>
              ))}
              {!r.profilePhotos.length && <p className="col-span-1 grid aspect-3/4 place-items-center rounded-[20px] bg-char text-center text-sm text-mute md:col-span-3">No profile photos yet</p>}
            </div>
          </section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-8 xl:self-start">
          <section className="surface rounded-card p-6">
            <h2 className="text-lg font-semibold">Declared details</h2>
            <p className="mt-1 text-xs text-mute">Check these against the document.</p>
            <dl className="mt-4 divide-y divide-line rounded-[18px] bg-char text-sm">
              {[
                ["Full name", r.fullName],
                ["Date of birth", `${dateOnly(r.dateOfBirth)} (${ageFrom(r.dateOfBirth)})`],
                ["Country", countryByCode(c.country)?.name ?? c.country],
                ["Email", r.email],
                ["Phone", r.phone],
                ["Submitted", c.submittedAt ? dateOnly(c.submittedAt) : "Not yet"],
              ].map(([k, val]) => (
                <div key={k} className="flex justify-between gap-3 px-4 py-3">
                  <dt className="text-mute">{k}</dt>
                  <dd className="truncate text-right font-medium">{val}</dd>
                </div>
              ))}
            </dl>
            {ageFrom(r.dateOfBirth) < 18 && <Notice tone="bad" className="mt-4">Declared age is under 18. Reject and escalate.</Notice>}
            {r.reviewerNote && <Notice tone="info" className="mt-4" title="Last note sent">{r.reviewerNote}</Notice>}
          </section>

          <section className="surface rounded-card p-6">
            <h2 className="text-lg font-semibold">Decision</h2>
            {decided ? (
              <p className="mt-2 text-sm text-mute">Already {v.label.toLowerCase()}. New submissions return to the queue.</p>
            ) : (
              <div className="mt-4 grid gap-2.5">
                <Button variant="accent" size="lg" onClick={() => setDecision("approve")}>
                  Approve
                </Button>
                <Button variant="secondary" size="lg" onClick={() => setDecision("needs_info")}>
                  Ask for a clearer document or selfie
                </Button>
                <Button variant="danger" size="lg" onClick={() => setDecision("reject")}>
                  Reject
                </Button>
              </div>
            )}
          </section>

          <section className="surface rounded-card p-6">
            <h2 className="text-lg font-semibold">History</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {r.history.map((h) => (
                <li key={h.id}>
                  <p className="font-medium">{h.action}</p>
                  <p className="text-xs text-mute">
                    {h.actor} ({staffRoleLabel(h.role)}) · {timeAgo(h.at)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <AnimatePresence>{open !== null && ordered.length > 0 && <Viewer files={ordered} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}</AnimatePresence>
      {decision && <Decide userId={c.userId} name={c.name} d={decision} onClose={() => setDecision(null)} />}
    </div>
  );
}

function Decide({ userId, name, d, onClose }: { userId: string; name: string; d: VerificationDecision; onClose: () => void }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <Dialog open onClose={onClose} title={d === "approve" ? `Approve ${name}?` : d === "reject" ? `Reject ${name}?` : `Ask ${name} for more?`}>
      <div className="space-y-4">
        <p className="text-sm text-mute">{d === "approve" ? "Their account opens immediately and they get a verified badge." : "They will see your note and must resubmit their ID and selfie before they can use Meet."}</p>
        {err && <Notice tone="bad">{err}</Notice>}
        <Textarea aria-label="Note" rows={3} placeholder={d === "approve" ? "Optional note for the audit log" : "Tell them what to fix, for example: the ID photo is blurred."} value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={d === "approve" ? "accent" : "danger"}
            className={d === "reject" ? "bg-bad! text-white!" : undefined}
            size="lg"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              setErr(null);
              try {
                await api.admin.decide(userId, d, note);
                // Refresh lists, but never re-open the documents: that would log a view nobody made.
                qc.removeQueries({ queryKey: ["admin", "kyc"] });
                await qc.invalidateQueries({ queryKey: ["admin"], predicate: (q) => q.queryKey[1] !== "kyc" });
                router.push("/admin/verification");
              } catch (e) {
                setErr(errorMessage(e));
                setBusy(false);
              }
            }}
          >
            {d === "approve" ? "Approve" : d === "reject" ? "Reject" : "Send request"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
