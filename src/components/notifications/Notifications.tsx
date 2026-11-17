"use client";

import {
  Calendar03Icon,
  ChampionIcon,
  CheckmarkBadge01Icon,
  Coins01Icon,
  CreditCardIcon,
  Legal01Icon,
  Message01Icon,
  Notification03Icon,
  Shield01Icon,
  StarIcon,
  UserAdd01Icon,
  UserCircleIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button, cx, EmptyState, ErrorState, Icon, PageHeader, Skeleton } from "@/components/ui";
import { api } from "@/lib/api/client";
import { qk, useNotifications } from "@/lib/api/hooks";
import type { AppNotification, NotificationKind } from "@/lib/api/types";
import { timeAgo } from "@/lib/format";

const KIND: Record<NotificationKind, { icon: IconSvgElement; tone: string }> = {
  account: { icon: UserCircleIcon, tone: "bg-char text-cream" },
  verification: { icon: CheckmarkBadge01Icon, tone: "bg-info/15 text-info" },
  connection: { icon: UserAdd01Icon, tone: "bg-ember/15 text-ember" },
  message: { icon: Message01Icon, tone: "bg-ember/15 text-ember" },
  booking: { icon: Calendar03Icon, tone: "bg-ok/15 text-ok" },
  payment: { icon: CreditCardIcon, tone: "bg-ok/15 text-ok" },
  refund: { icon: Coins01Icon, tone: "bg-warn/15 text-warn" },
  payout: { icon: Wallet01Icon, tone: "bg-ok/15 text-ok" },
  review: { icon: StarIcon, tone: "bg-gold/15 text-gold" },
  ranking: { icon: ChampionIcon, tone: "bg-gold/15 text-gold" },
  dispute: { icon: Legal01Icon, tone: "bg-bad/15 text-bad" },
  security: { icon: Shield01Icon, tone: "bg-bad/15 text-bad" },
};

export default function Notifications() {
  const list = useNotifications();
  const qc = useQueryClient();
  const unread = list.data?.filter((n) => !n.read).length ?? 0;
  const today = new Date().toDateString();
  const groups: [string, AppNotification[]][] = [
    ["Today", list.data?.filter((n) => new Date(n.at).toDateString() === today) ?? []],
    ["Earlier", list.data?.filter((n) => new Date(n.at).toDateString() !== today) ?? []],
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Notifications"
        sub={unread ? `${unread} unread` : "You are all caught up."}
        actions={
          unread > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                await api.notifications.markAllRead();
                qc.invalidateQueries({ queryKey: qk.notifications });
              }}
            >
              Mark all as read
            </Button>
          )
        }
      />
      {list.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : list.isError ? (
        <ErrorState error={list.error} retry={() => list.refetch()} />
      ) : !list.data.length ? (
        <EmptyState icon={Notification03Icon} title="Nothing yet" body="Matches, messages, bookings and account updates will show up here." />
      ) : (
        <div className="space-y-8">
          {groups
            .filter(([, items]) => items.length)
            .map(([label, items]) => (
              <section key={label}>
                <h2 className="mb-3 px-1 text-sm font-medium text-mute">{label}</h2>
                <ul className="surface divide-y divide-line overflow-hidden rounded-[24px]">
                  {items.map((n, i) => {
                    const k = KIND[n.kind];
                    const body = (
                      <span className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-char/60">
                        <span className={cx("grid size-11 shrink-0 place-items-center rounded-full", k.tone)}>
                          <Icon icon={k.icon} size={19} stroke={2} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-3">
                            <span className={cx("text-[15px]", n.read ? "font-medium text-cream/85" : "font-semibold")}>{n.title}</span>
                            <span className="shrink-0 text-[11px] text-faint">{timeAgo(n.at)}</span>
                          </span>
                          <span className="mt-0.5 block text-[13.5px] text-mute">{n.body}</span>
                        </span>
                        {!n.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-ember" aria-label="Unread" />}
                      </span>
                    );
                    return (
                      <motion.li key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                        {n.href ? <Link href={n.href}>{body}</Link> : body}
                      </motion.li>
                    );
                  })}
                </ul>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
