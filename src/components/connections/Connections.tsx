"use client";

import { Bookmark02Icon, Message01Icon, UserAdd01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useConfirm } from "@/components/Confirm";
import PhotoCard, { PhotoCardSkeleton } from "@/components/people/PhotoCard";
import { Avatar, Button, buttonClass, EmptyState, ErrorState, Icon, LinkButton, PageHeader, Skeleton, Tabs, Verified } from "@/components/ui";
import { api } from "@/lib/api/client";
import { qk, useConnections, useRequests, useSaved } from "@/lib/api/hooks";
import { timeAgo } from "@/lib/format";

type Tab = "connections" | "requests" | "saved";

export default function Connections() {
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((["connections", "requests", "saved"] as const).find((t) => t === params.get("tab")) ?? "connections");
  const conns = useConnections();
  const reqs = useRequests();
  const saved = useSaved();
  const incoming = reqs.data?.filter((r) => r.direction === "incoming") ?? [];

  return (
    <div>
      <PageHeader title="Connections" sub="People you have matched or connected with. Connecting is free and never tied to a booking." />
      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-7"
        items={[
          { id: "connections", label: "Connections", count: conns.data?.length },
          { id: "requests", label: "Requests", count: incoming.length },
          { id: "saved", label: "Saved", count: saved.data?.length },
        ]}
      />
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
          {tab === "connections" && <ConnectionList />}
          {tab === "requests" && <RequestList />}
          {tab === "saved" &&
            (saved.isPending ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <PhotoCardSkeleton key={i} />
                ))}
              </div>
            ) : !saved.data?.length ? (
              <EmptyState icon={Bookmark02Icon} title="Nothing saved yet" body="Tap the bookmark on any profile to come back to it later." action={<LinkButton href="/discover">Discover people</LinkButton>} />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {saved.data.map((p) => (
                  <PhotoCard key={p.id} p={p} />
                ))}
              </div>
            ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ConnectionList() {
  const conns = useConnections();
  const qc = useQueryClient();
  const confirm = useConfirm();
  if (conns.isPending)
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  if (conns.isError) return <ErrorState error={conns.error} retry={() => conns.refetch()} />;
  if (!conns.data.length) return <EmptyState icon={UserGroupIcon} title="No connections yet" body="Like someone who likes you back, or send a connection request with a note." action={<LinkButton href="/discover">Discover people</LinkButton>} />;
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
      <AnimatePresence initial={false}>
        {conns.data.map((c, i) => (
          <motion.li key={c.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }} exit={{ opacity: 0, scale: 0.95 }} className="surface flex items-center gap-3 rounded-[24px] p-3.5 sm:gap-4 sm:p-4">
            <Link href={`/people/${c.person.id}`}>
              <Avatar src={c.person.photo} name={c.person.displayName} size={52} ring />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/people/${c.person.id}`} className="flex min-w-0 items-center gap-1 text-[16px] font-semibold">
                <span className="truncate">{c.person.displayName}</span> {c.person.verified && <Verified size={15} />}
              </Link>
              <p className="text-xs text-mute">
                {c.source === "match" ? "Matched" : "Connected"} {timeAgo(c.since)}
              </p>
            </div>
            <Link href={`/chats/${c.id}`} aria-label={`Message ${c.person.displayName}`} className={buttonClass("primary", "sm", "max-sm:size-10 max-sm:px-0")}>
              <Icon icon={Message01Icon} size={16} /> <span className="max-sm:hidden">Message</span>
            </Link>
            <Button
              variant="quiet"
              size="sm"
              onClick={async () => {
                const ok = await confirm({ title: `Unmatch ${c.person.displayName}?`, body: "You will no longer be connected and your conversation ends for both of you. This cannot be undone.", confirmLabel: "Unmatch", tone: "danger" });
                if (!ok) return;
                await api.social.unmatch(c.id);
                qc.invalidateQueries({ queryKey: qk.connections });
              }}
            >
              Unmatch
            </Button>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function RequestList() {
  const reqs = useRequests();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);
  if (reqs.isPending) return <Skeleton className="h-32" />;
  if (reqs.isError) return <ErrorState error={reqs.error} retry={() => reqs.refetch()} />;
  if (!reqs.data.length) return <EmptyState icon={UserAdd01Icon} title="No requests" body="Connection requests you send or receive appear here." />;

  async function respond(id: string, name: string, accept: boolean) {
    if (!accept && !(await confirm({ title: `Decline ${name}'s request?`, body: `${name} will not be told you declined. They will not be able to send you another request for a while.`, confirmLabel: "Decline", tone: "danger" }))) return;
    setBusy(id);
    await api.social.respond(id, accept);
    await Promise.all([qc.invalidateQueries({ queryKey: qk.requests }), qc.invalidateQueries({ queryKey: qk.connections })]);
    setBusy(null);
  }

  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
      <AnimatePresence initial={false}>
        {reqs.data.map((r) => (
          <motion.li key={r.id} layout exit={{ opacity: 0, x: 40 }} className="surface rounded-[24px] p-5">
            <div className="flex items-center gap-4">
              <Link href={`/people/${r.person.id}`}>
                <Avatar src={r.person.photo} name={r.person.displayName} size={56} />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 font-semibold">
                  {r.person.displayName} {r.person.verified && <Verified size={15} />}
                </p>
                <p className="text-xs text-mute">
                  {r.direction === "incoming" ? "Wants to connect" : "You sent a request"} · {timeAgo(r.at)}
                </p>
              </div>
            </div>
            {r.message && <p className="mt-4 rounded-2xl bg-char px-4 py-3 text-[14px] leading-relaxed text-cream/85">&ldquo;{r.message}&rdquo;</p>}
            {r.direction === "incoming" ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="secondary" disabled={busy === r.id} onClick={() => respond(r.id, r.person.displayName, false)}>
                  Decline
                </Button>
                <Button variant="accent" loading={busy === r.id} onClick={() => respond(r.id, r.person.displayName, true)}>
                  Accept
                </Button>
              </div>
            ) : (
              <p className="mt-4 text-xs text-faint">Waiting for {r.person.displayName} to respond.</p>
            )}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
