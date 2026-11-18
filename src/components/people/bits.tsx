"use client";

import { FavouriteIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useState } from "react";
import { Button, buttonClass, cx, Dialog, errorMessage, Icon, Notice, Photo, Textarea } from "@/components/ui";
import { api } from "@/lib/api/client";
import { useMyProfile } from "@/lib/api/hooks";
import type { Money, Profile, ProviderPublic } from "@/lib/api/types";
import { money } from "@/lib/format";
import { arrangementLabel } from "@/lib/labels";

export function fromPrice(p: ProviderPublic | null): Money | null {
  if (!p || p.arrangement === "free") return null;
  const prices = p.rates.filter((r) => r.enabled && r.price).map((r) => r.price!);
  if (!prices.length) return null;
  return prices.reduce((a, b) => (b.amountMinor < a.amountMinor ? b : a));
}

export function PriceLine({ provider, className }: { provider: ProviderPublic; className?: string }) {
  const from = fromPrice(provider);
  return (
    <span className={cx("text-[13px]", className)}>
      {provider.arrangement === "free" ? (
        <span className="font-medium text-ok">Free companionship</span>
      ) : from ? (
        <>
          <span className="text-mute">From </span>
          <span className="font-semibold tabular">{money(from)}</span>
          {provider.arrangement === "flexible" && <span className="text-mute"> or free</span>}
        </>
      ) : (
        <span className="text-mute">{arrangementLabel(provider.arrangement)}</span>
      )}
    </span>
  );
}

/** Note-optional connection request. Social only: never tied to a booking. */
export function ConnectDialog({ person, open, onClose, onSent }: { person: Pick<Profile, "id" | "displayName">; open: boolean; onClose: () => void; onSent: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <Dialog open={open} onClose={onClose} title={`Connect with ${person.displayName}`}>
      <div className="space-y-4">
        <p className="text-sm text-mute">Add a short note so {person.displayName} knows why you would like to connect. If they accept, you can message each other.</p>
        {err && <Notice tone="bad">{err}</Notice>}
        <Textarea aria-label="Note" rows={3} maxLength={300} placeholder="Hi! I noticed we both..." value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              setErr(null);
              try {
                await api.social.sendRequest(person.id, note);
                setNote("");
                onSent();
                onClose();
              } catch (e) {
                setErr(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Send request
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function MatchDialog({ person, connectionId, onClose }: { person: Profile | null; connectionId: string | null; onClose: () => void }) {
  const me = useMyProfile();
  return (
    <Dialog open={!!person} onClose={onClose} title="It's a match">
      {person && (
        <div className="text-center">
          <div className="relative mx-auto flex h-40 w-64 items-center justify-center">
            <Photo src={me.data?.photos[0] ?? ""} alt="" className="absolute left-4 h-36 w-28 -rotate-8 rounded-[10px] ring-4 ring-coal" />
            <Photo src={person.photos[0]} alt="" className="absolute right-4 h-36 w-28 rotate-8 rounded-[10px] ring-4 ring-coal" />
            <span className="relative grid size-14 place-items-center rounded-full bg-ember text-ink ring-4 ring-coal">
              <Icon icon={FavouriteIcon} size={24} stroke={2.4} />
            </span>
          </div>
          <p className="display mt-6 text-3xl">You and {person.displayName}</p>
          <p className="mt-2 text-sm text-mute">You like each other. Say hello while it is fresh.</p>
          <div className="mt-7 flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Keep looking
            </Button>
            {connectionId && (
              <Link href={`/chats/${connectionId}`} className={buttonClass("accent", "md", "flex-1")}>
                Say hello
              </Link>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
