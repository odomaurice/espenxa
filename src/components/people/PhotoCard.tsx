"use client";

/*
 * Photo-led person card: full-bleed portrait, frosted name plate, and quick
 * like / connect actions. Used on Home rows and the Explore grid.
 */
import { FavouriteIcon, Message01Icon, UserAdd01Icon } from "@hugeicons/core-free-icons";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Burst, motion, Tilt } from "@/components/motion";
import { Icon, Photo, RankBadge, cx, Verified } from "@/components/ui";
import { api } from "@/lib/api/client";
import { qk } from "@/lib/api/hooks";
import type { Profile } from "@/lib/api/types";
import { money } from "@/lib/format";
import { ConnectDialog, fromPrice, MatchDialog } from "./bits";

export default function PhotoCard({ p, className, size = "md" }: { p: Profile; className?: string; size?: "md" | "lg" }) {
  const qc = useQueryClient();
  const [liked, setLiked] = useState(p.viewer.liked);
  const [connecting, setConnecting] = useState(false);
  const [match, setMatch] = useState<string | null>(null);
  const price = fromPrice(p.provider);

  const [burst, setBurst] = useState(0);

  async function like() {
    if (liked) return;
    setLiked(true);
    setBurst((b) => b + 1);
    try {
      const r = await api.discovery.like(p.id);
      if (r.matched) {
        setMatch(r.connectionId);
        qc.invalidateQueries({ queryKey: qk.connections });
      }
    } catch {
      setLiked(false);
    }
  }

  return (
    <Tilt className={cx("group relative overflow-hidden rounded-[28px] bg-char shadow-[0_20px_50px_-25px_rgb(0_0_0/0.9)]", className)}>
      <Link href={`/people/${p.id}`} className="block" aria-label={`View ${p.displayName}'s profile`}>
        <Photo src={p.photos[0]} alt="" className={cx("w-full transition-transform duration-700 group-hover:scale-[1.04]", size === "lg" ? "aspect-[3/4]" : "aspect-[3/4.2]")} />
        <div className="photo-shade absolute inset-0" />
      </Link>

      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between">
        {p.provider ? <RankBadge rank={p.provider.rank} size="sm" className="glass-dark" /> : <span />}
        {p.activeRecently && <span className="glass-dark grid size-7 place-items-center rounded-full" title="Active recently"><span className="size-2 rounded-full bg-ok shadow-[0_0_8px_var(--color-ok)]" /></span>}
      </div>

      <div className="glass absolute inset-x-2.5 bottom-2.5 rounded-[22px] p-3 pl-4">
        <Link href={`/people/${p.id}`} className="flex items-center gap-1.5">
          <span className="truncate text-[17px] font-semibold tracking-tight">{p.displayName}</span>
          {p.age !== null && <span className="text-[17px] font-light text-cream/75">{p.age}</span>}
          {p.verified && <Verified size={17} />}
        </Link>
        <p className="mt-0.5 truncate text-xs text-cream/70">
          {price ? `From ${money(price)}` : p.provider?.arrangement === "free" ? "Free companionship" : p.city || "Somewhere in Africa"}
        </p>
        <div className="mt-2.5 flex gap-2">
          <motion.button
            type="button"
            onClick={like}
            aria-label={liked ? `You like ${p.displayName}` : `Like ${p.displayName}`}
            aria-pressed={liked}
            whileTap={{ scale: 0.88 }}
            className={cx("relative grid h-9 flex-1 place-items-center rounded-full transition-colors", liked ? "bg-cream text-ember" : "bg-ember text-ink hover:bg-ember-hi")}
          >
            <motion.span key={String(liked)} initial={liked ? { scale: 0.3 } : false} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 12 }}>
              <Icon icon={FavouriteIcon} size={17} stroke={2.4} />
            </motion.span>
            <Burst k={burst} />
          </motion.button>
          {p.viewer.connectionId ? (
            <Link href={`/chats/${p.viewer.connectionId}`} aria-label={`Message ${p.displayName}`} className="grid h-9 flex-1 place-items-center rounded-full bg-ink/85 text-cream hover:bg-ink">
              <Icon icon={Message01Icon} size={17} stroke={2} />
            </Link>
          ) : (
            <button
              type="button"
              disabled={!!p.viewer.requestPending}
              onClick={() => setConnecting(true)}
              aria-label={p.viewer.requestPending ? "Request pending" : `Connect with ${p.displayName}`}
              className="grid h-9 flex-1 place-items-center rounded-full bg-ink/85 text-cream hover:bg-ink disabled:opacity-50"
            >
              <Icon icon={UserAdd01Icon} size={17} stroke={2} />
            </button>
          )}
        </div>
      </div>

      {connecting && (
        <ConnectDialog
          person={p}
          open
          onClose={() => setConnecting(false)}
          onSent={() => {
            qc.invalidateQueries({ queryKey: qk.requests });
            qc.invalidateQueries({ queryKey: ["discovery"] });
          }}
        />
      )}
      <MatchDialog person={match ? p : null} connectionId={match} onClose={() => setMatch(null)} />
    </Tilt>
  );
}

export function PhotoCardSkeleton({ className }: { className?: string }) {
  return <div className={cx("aspect-[3/4.2] animate-pulse rounded-[28px] bg-char", className)} />;
}
