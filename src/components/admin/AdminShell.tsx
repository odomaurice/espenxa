"use client";

/*
 * Staff console shell. Sections a role cannot use are hidden; the backend
 * refuses them regardless.
 */
import {
  ArrowDown01Icon,
  Menu01Icon,
  PercentCircleIcon,
  Activity01Icon,
  Logout03Icon,
  Calendar03Icon,
  CheckmarkBadge01Icon,
  Coins01Icon,
  Flag02Icon,
  DashboardSquare01Icon,
  Globe02Icon,
  Legal01Icon,
  Task01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useSession } from "@/components/Providers";
import { FullScreenSpinner } from "@/components/shell/AppShell";
import { cx, DevNote, EmptyState, Icon, LinkButton } from "@/components/ui";
import Wordmark from "@/components/Wordmark";
import { useSignOut } from "@/components/useSignOut";
import { staffCan, staffRoleLabel, type StaffPermission } from "@/lib/labels";

const NAV: {
  href: string;
  label: string;
  icon: IconSvgElement;
  perm?: StaffPermission;
}[] = [
  { href: "/admin", label: "Overview", icon: DashboardSquare01Icon },
  {
    href: "/admin/activity",
    label: "Activity",
    icon: Activity01Icon,
    perm: "activity",
  },
  {
    href: "/admin/bookings",
    label: "Bookings",
    icon: Calendar03Icon,
    perm: "bookings",
  },
  {
    href: "/admin/finance",
    label: "Finance",
    icon: Coins01Icon,
    perm: "finance",
  },
  {
    href: "/admin/money",
    label: "Money rules",
    icon: PercentCircleIcon,
    perm: "finance",
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: Flag02Icon,
    perm: "reports",
  },
  {
    href: "/admin/disputes",
    label: "Disputes",
    icon: Legal01Icon,
    perm: "disputes",
  },
  {
    href: "/admin/verification",
    label: "Verification",
    icon: CheckmarkBadge01Icon,
    perm: "verification",
  },
  { href: "/admin/users", label: "Users", icon: UserGroupIcon, perm: "users" },
  {
    href: "/admin/markets",
    label: "Markets",
    icon: Globe02Icon,
    perm: "markets",
  },
  { href: "/admin/audit", label: "Audit log", icon: Task01Icon, perm: "audit" },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const { account, loading } = useSession();
  const signOut = useSignOut();
  const router = useRouter();
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    if (!loading && !account) router.replace("/login?next=/admin");
  }, [account, loading, router]);
  if (loading || !account) return <FullScreenSpinner />;
  if (!account.roles.length)
    return (
      <div className="grid min-h-dvh place-items-center p-6">
        <EmptyState icon={CheckmarkBadge01Icon} title="Staff only" body="This area is for the espenxa team." action={<LinkButton href="/">Go to the homepage</LinkButton>} />
      </div>
    );
  const items = NAV.filter((n) => !n.perm || staffCan(account.roles, n.perm));
  const active = [...items].sort((a, b) => b.href.length - a.href.length).find((n) => (n.href === "/admin" ? path === "/admin" : path.startsWith(n.href)));
  const current = NAV.find((n) => n.perm && !staffCan(account.roles, n.perm) && path.startsWith(n.href));

  return (
    <div className="on-dark flex min-h-dvh bg-ink text-cream">
      <aside className="sticky top-0 hidden h-dvh w-65 shrink-0 flex-col bg-coal/60 px-5 py-7 lg:flex">
        <div className="px-3">
          <Wordmark href="/admin" kind="light" height={22} />
          <p className="mt-2 text-xs text-mute">Staff console</p>
        </div>
        <nav className="mt-9 flex flex-1 flex-col gap-1">
          {items.map((n) => {
            const on = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={cx("relative flex h-11 items-center gap-3 rounded-full px-4 text-[14.5px] transition-colors", on ? "font-semibold text-ink" : "text-mute hover:bg-char/70 hover:text-cream")}>
                {on && <motion.span layoutId="admin-pill" className="absolute inset-0 rounded-full bg-cream" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                <span className="relative">
                  <Icon icon={n.icon} size={19} />
                </span>
                <span className="relative">{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="rounded-[20px] bg-char p-3.5">
          <p className="text-sm font-semibold">{account.fullName}</p>
          <p className="text-xs text-mute">{account.roles.map(staffRoleLabel).join(", ")}</p>
        </div>
        <button type="button" onClick={signOut} className="mt-3 flex items-center gap-2 px-3 text-sm text-mute hover:text-cream">
          <Icon icon={Logout03Icon} size={15} /> Sign out
        </button>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 bg-ink/90 px-4 backdrop-blur-xl lg:hidden">
          <Wordmark href="/admin" kind="light" height={18} />
          <button type="button" onClick={() => setMenu(true)} aria-expanded={menu} className="flex h-10 items-center gap-2 rounded-full bg-char pr-4 pl-3 text-sm font-semibold">
            <Icon icon={active?.icon ?? Menu01Icon} size={17} /> {active?.label ?? "Menu"}
            <Icon icon={ArrowDown01Icon} size={14} className="text-mute" />
          </button>
        </header>
        <AnimatePresence>
          {menu && (
            <>
              <motion.div key="scrim" className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenu(false)} />
              <motion.nav
                key="sheet"
                aria-label="Staff console"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 380, damping: 36 }}
                className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-[32px] bg-coal p-4 pb-[max(16px,env(safe-area-inset-bottom))] lg:hidden"
              >
                <span className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-smoke" aria-hidden />
                <div className="mb-2 flex items-center justify-between px-2">
                  <span>
                    <span className="block text-sm font-semibold">{account.fullName}</span>
                    <span className="block text-xs text-mute">{account.roles.map(staffRoleLabel).join(", ")}</span>
                  </span>
                  <button type="button" onClick={signOut} className="flex items-center gap-1.5 rounded-full bg-char px-3.5 py-2 text-xs font-semibold text-mute">
                    <Icon icon={Logout03Icon} size={14} /> Sign out
                  </button>
                </div>
                <ul className="grid grid-cols-2 gap-2">
                  {items.map((n) => {
                    const on = n === active;
                    return (
                      <li key={n.href}>
                        <Link href={n.href} onClick={() => setMenu(false)} className={cx("flex h-14 items-center gap-3 rounded-[18px] px-4 text-[14.5px] font-medium", on ? "bg-cream text-ink" : "bg-char text-cream")}>
                          <Icon icon={n.icon} size={18} /> {n.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </motion.nav>
            </>
          )}
        </AnimatePresence>
        <main className="mx-auto w-full max-w-295 px-4 pt-4 pb-16 sm:px-6 lg:px-10 lg:pt-10">
          <div className="mb-6">
            <DevNote>Staff console on simulated data. Decisions change the demo accounts only.</DevNote>
          </div>
          {current ? <EmptyState icon={CheckmarkBadge01Icon} title="Not available for your role" body="Ask a Super Administrator if you need access." /> : children}
        </main>
      </div>
    </div>
  );
}
