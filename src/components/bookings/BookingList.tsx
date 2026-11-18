"use client";

import { Calendar03Icon, Clock01Icon, Location01Icon } from "@hugeicons/core-free-icons";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { Lift } from "@/components/motion";
import { useSession } from "@/components/Providers";
import { Avatar, Badge, EmptyState, ErrorState, Icon, LinkButton, PageHeader, Skeleton, Tabs } from "@/components/ui";
import { useBookings, useCategories } from "@/lib/api/hooks";
import type { Booking } from "@/lib/api/types";
import { dateTime, hoursLabel, money } from "@/lib/format";
import { BOOKING_STATUS } from "@/lib/labels";

type Tab = "upcoming" | "requests" | "past" | "cancelled";

const bucket = (b: Booking): Tab => {
  if (["customer_cancelled", "provider_cancelled", "platform_cancelled", "declined", "expired"].includes(b.status)) return "cancelled";
  if (["requested", "adjustment_proposed"].includes(b.status)) return "requests";
  if (["completed", "disputed"].includes(b.status)) return "past";
  return "upcoming";
};

export default function BookingList() {
  const { account } = useSession();
  const [role, setRole] = useState<"customer" | "provider">("customer");
  const [tab, setTab] = useState<Tab>("upcoming");
  const list = useBookings(role);
  const cats = useCategories();
  const by = (t: Tab) => list.data?.filter((b) => bucket(b) === t) ?? [];
  const shown = by(tab);

  return (
    <div>
      <PageHeader
        title="Bookings"
        sub="Experiences you have requested or booked. Payment is always through espenxa."
        actions={
          account?.isProvider && (
            <Tabs
              value={role}
              onChange={setRole}
              items={[
                { id: "customer", label: "I booked" },
                { id: "provider", label: "Booked with me" },
              ]}
            />
          )
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-7"
        items={[
          { id: "upcoming", label: "Upcoming", count: by("upcoming").length },
          { id: "requests", label: "Requests", count: by("requests").length },
          { id: "past", label: "Past" },
          { id: "cancelled", label: "Cancelled" },
        ]}
      />
      {list.isPending ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : list.isError ? (
        <ErrorState error={list.error} retry={() => list.refetch()} />
      ) : !shown.length ? (
        <EmptyState
          icon={Calendar03Icon}
          title={tab === "upcoming" ? "Nothing booked yet" : `No ${tab} bookings`}
          body={role === "customer" ? "Find a companion who offers the experience you want, then send a request." : "Requests from members will appear here."}
          action={role === "customer" ? <LinkButton href="/discover?providers=1">Find an experience</LinkButton> : undefined}
        />
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.ul key={`${role}-${tab}`} className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {shown.map((b) => {
              const other = b.role === "customer" ? b.provider : b.customer;
              const s = BOOKING_STATUS[b.status];
              return (
                <li key={b.id}>
                  <Lift y={-3} scale={1.01}>
                    <Link href={`/bookings/${b.id}`} className="surface block rounded-[10px] p-4 transition-colors hover:bg-char sm:p-5">
                      <div className="flex items-center gap-4">
                        <Avatar src={other.photo} name={other.displayName} size={48} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[16px] font-semibold">{cats.data?.find((c) => c.id === b.categoryId)?.name ?? "Experience"}</p>
                          <p className="truncate text-[13px] text-mute">
                            {b.role === "customer" ? `You booked ${other.displayName}` : `${other.displayName} booked you`}
                          </p>
                        </div>
                        <Badge tone={s.tone}>{s.label}</Badge>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-cream/80">
                        <span className="flex items-center gap-1.5">
                          <Icon icon={Calendar03Icon} size={15} className="text-mute" /> {dateTime(b.startAt, b.timezone)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Icon icon={Clock01Icon} size={15} className="text-mute" /> {hoursLabel(b.hours)}
                        </span>
                        <span className="flex min-w-0 items-center gap-1.5">
                          <Icon icon={Location01Icon} size={15} className="text-mute" /> <span className="truncate">{b.meetingArea}</span>
                        </span>
                      </div>
                      <p className="mt-4 flex items-center justify-between border-t border-line pt-4">
                        <span className="text-xs text-mute">Total</span>
                        <span className="text-lg font-semibold tabular">{b.breakdown.total.amountMinor ? money(b.breakdown.total) : "Free"}</span>
                      </p>
                    </Link>
                  </Lift>
                </li>
              );
            })}
          </motion.ul>
        </AnimatePresence>
      )}
    </div>
  );
}
