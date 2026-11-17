"use client";

import { useState } from "react";
import { Button, cx, Dialog, errorMessage, Notice, Textarea } from "@/components/ui";
import { api } from "@/lib/api/client";
import type { ReportCategory } from "@/lib/api/types";
import { REPORT_CATEGORIES } from "@/lib/labels";

export default function ReportDialog({ person, open, onClose, bookingId }: { person: { id: string; displayName: string }; open: boolean; onClose: () => void; bookingId?: string }) {
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const urgent = REPORT_CATEGORIES.find((c) => c.id === category)?.urgent;

  return (
    <Dialog open={open} onClose={onClose} title={done ? "Report sent" : `Report ${person.displayName}`}>
      {done ? (
        <div className="space-y-4">
          <p className="text-sm text-mute">Thank you. Our safety team reviews every report{urgent ? ", and urgent ones go to the front of the queue" : ""}. {person.displayName} will not know who reported them.</p>
          <Button className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {err && <Notice tone="bad">{err}</Notice>}
          <div className="grid gap-2">
            {REPORT_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={category === c.id}
                onClick={() => setCategory(c.id)}
                className={cx("flex h-12 items-center justify-between rounded-2xl px-4 text-left text-sm transition-colors", category === c.id ? "bg-cream font-semibold text-ink" : "bg-char hover:bg-smoke")}
              >
                {c.label}
                {c.urgent && <span className={cx("text-[11px] font-semibold", category === c.id ? "text-ember-deep" : "text-ember")}>Urgent</span>}
              </button>
            ))}
          </div>
          {urgent && <Notice tone="warn">If anyone is in immediate danger, contact local emergency services first.</Notice>}
          <Textarea aria-label="What happened" placeholder="What happened? (optional)" rows={3} maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} />
          <Button
            className="w-full"
            variant="accent"
            disabled={!category}
            loading={busy}
            onClick={async () => {
              if (!category) return;
              setBusy(true);
              setErr(null);
              try {
                await api.safety.report({ targetId: person.id, category, details, bookingId });
                setDone(true);
              } catch (e) {
                setErr(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Send report
          </Button>
        </div>
      )}
    </Dialog>
  );
}
