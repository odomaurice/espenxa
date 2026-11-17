"use client";

/*
 * Signed-in shell. Desktop: sidebar with a white active pill. Phones: slim
 * top bar and a floating pill tab bar. Also the client-side guard:
 * signed-out visitors go to /login, unfinished accounts to /onboarding.
 * The backend enforces the same rules on every request.
 */
import {
  BankIcon,
  Calendar03Icon,
  Globe02Icon,
  Compass01Icon,
  Home01Icon,
  Logout03Icon,
  Message01Icon,
  Notification03Icon,
  Search01Icon,
  Settings02Icon,
  Shield01Icon,
  Store01Icon,
  UserCircleIcon,
  UserGroupIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSession } from "@/components/Providers";
import { Avatar, cx, Icon, Spinner } from "@/components/ui";
import Wordmark from "@/components/Wordmark";
import { useSignOut } from "@/components/useSignOut";
import Locked from "./Locked";
import { IS_MOCK } from "@/lib/api/client";
import { useConnections, useMyProfile, useNotifications } from "@/lib/api/hooks";

type Item = { href: string; label: string; icon: IconSvgElement; badge?: number };

function useNav() {
  const { account } = useSession();
  const conns = useConnections();
  const notes = useNotifications();
  const unreadMsgs = conns.data?.reduce((n, c) => n + c.unread, 0) ?? 0;
  const unreadNotes = notes.data?.filter((n) => !n.read).length ?? 0;
  const companion = !!account?.isProvider;
  // Plain words, one job per item. Companions get their work first.
  const main: Item[] = [
    { href: "/home", label: "Home", icon: Home01Icon },
    { href: "/chats", label: "Chats", icon: Message01Icon, badge: unreadMsgs },
    { href: "/bookings", label: "Bookings", icon: Calendar03Icon },
    ...(companion ? [{ href: "/companion", label: "My earnings", icon: Wallet01Icon }] : []),
    { href: "/discover", label: "Discover", icon: Compass01Icon },
    { href: "/connections", label: "Matches", icon: UserGroupIcon },
    { href: "/notifications", label: "Alerts", icon: Notification03Icon, badge: unreadNotes },
  ];
  const provider: Item[] = companion
    ? [
        { href: "/companion/settings", label: "My offer and prices", icon: Store01Icon },
        { href: "/companion/payouts", label: "Payouts", icon: BankIcon },
      ]
    : [{ href: "/become-a-companion", label: "Become a companion", icon: Store01Icon }];
  const more: Item[] = [
    { href: "/profile", label: "My profile", icon: UserCircleIcon },
    { href: "/settings", label: "Settings", icon: Settings02Icon },
    { href: "/safety", label: "Help and safety", icon: Shield01Icon },
    { href: "/", label: "Meet homepage", icon: Globe02Icon },
  ];
  return { main, provider, more, unreadMsgs, unreadNotes, companion };
}

const isActive = (path: string, href: string) => path === href || (href !== "/companion" && path.startsWith(href + "/")) || (href === "/companion" && path === "/companion");

/** Shows which kind of account this is, everywhere the person sees themselves. */
export function RoleBadge({ companion, className }: { companion: boolean; className?: string }) {
  return (
    <span className={cx("mt-0.5 inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-semibold", companion ? "bg-ember/15 text-ember-hi" : "bg-info/15 text-info", className)}>
      <span className={cx("size-1.5 rounded-full", companion ? "bg-ember" : "bg-info")} />
      {companion ? "Companion" : "Member"}
    </span>
  );
}

function NavLink({ item, path }: { item: Item; path: string }) {
  const on = isActive(path, item.href);
  return (
    <Link
      href={item.href}
      aria-current={on ? "page" : undefined}
      className={cx("group relative flex h-12 items-center gap-3.5 rounded-full px-4 text-[15px] transition-colors duration-300", on ? "font-semibold text-ink" : "text-mute hover:bg-char/70 hover:text-cream")}
    >
      {on && <motion.span layoutId="sidebar-pill" className="absolute inset-0 rounded-full bg-cream shadow-[0_10px_30px_-10px_rgb(255_255_255/0.35)]" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
      <motion.span className="relative" whileHover={{ rotate: -8, scale: 1.1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
        <Icon icon={item.icon} size={21} stroke={on ? 2.2 : 1.8} />
      </motion.span>
      <span className="relative flex-1">{item.label}</span>
      {!!item.badge && <span className="relative grid h-5 min-w-5 place-items-center rounded-full bg-ember px-1.5 text-[11px] font-semibold text-ink tabular">{item.badge > 99 ? "99+" : item.badge}</span>}
    </Link>
  );
}

function Sidebar() {
  const path = usePathname();
  const nav = useNav();
  const { account } = useSession();
  const profile = useMyProfile();
  const signOut = useSignOut();
  return (
    <aside className="sticky top-0 hidden h-dvh w-[280px] shrink-0 flex-col bg-coal/60 px-5 py-7 lg:flex">
      <div className="px-4">
        <Wordmark href="/" height={28} />
      </div>
      <nav className="no-scrollbar mt-9 flex flex-1 flex-col gap-1 overflow-y-auto" aria-label="Main">
        {nav.main.map((i) => (
          <NavLink key={i.href} item={i} path={path} />
        ))}
        <div className="my-4 h-px bg-line" />
        {nav.provider.map((item) => (
          <NavLink key={item.href} item={item} path={path} />
        ))}
        {nav.more.map((i) => (
          <NavLink key={i.href} item={i} path={path} />
        ))}
      </nav>
      {account && (
        <div className="mt-4 flex items-center gap-3 rounded-[22px] bg-char p-3">
          <Link href="/profile" aria-label="My profile">
            <Avatar src={profile.data?.photos[0]} name={account.fullName} size={42} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold">{profile.data?.displayName ?? account.fullName}</p>
            <RoleBadge companion={nav.companion} />
          </div>
          <button
            type="button"
            aria-label="Sign out"
            title="Sign out"
            onClick={signOut}
            className="grid size-9 place-items-center rounded-full text-mute hover:bg-smoke hover:text-cream"
          >
            <Icon icon={Logout03Icon} size={18} />
          </button>
        </div>
      )}
    </aside>
  );
}

/** An open conversation fills the phone screen, like other chat apps. */
const inChat = (path: string) => /^\/chats\/[^/]+/.test(path);

function MobileBars() {
  const path = usePathname();
  const nav = useNav();
  const profile = useMyProfile();
  const { account } = useSession();
  const byHref = (h: string) => nav.main.find((i) => i.href === h)!;
  const tabs: Item[] = [byHref("/home"), byHref("/discover"), byHref("/chats"), byHref("/bookings"), { href: "/profile", label: "Me", icon: UserCircleIcon }];
  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-ink/85 px-4 backdrop-blur-xl lg:hidden">
        <Wordmark href="/" height={22} />
        <div className="flex items-center gap-2">
          <Link href="/discover?mode=browse" aria-label="Search" className="grid size-10 place-items-center rounded-full bg-char text-cream">
            <Icon icon={Search01Icon} size={18} />
          </Link>
          <Link href="/notifications" aria-label="Notifications" className="relative grid size-10 place-items-center rounded-full bg-char text-cream">
            <Icon icon={Notification03Icon} size={18} />
            {!!nav.unreadNotes && <span className="absolute top-2 right-2.5 size-2 rounded-full bg-ember ring-2 ring-char" />}
          </Link>
        </div>
      </header>
      <nav aria-label="Main" className={cx("fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(14px,env(safe-area-inset-bottom))] lg:hidden", inChat(path) && "hidden")}>
        <div className="mx-auto flex h-[68px] max-w-md items-center justify-between rounded-full bg-[#161618]/92 px-2 shadow-[0_24px_60px_-12px_rgb(0_0_0/0.9)] ring-1 ring-white/8 backdrop-blur-2xl">
          {tabs.map((t) => {
            const on = isActive(path, t.href) || (t.href === "/profile" && ["/companion", "/settings", "/safety", "/verify", "/connections", "/notifications"].some((p) => path.startsWith(p)));
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-label={t.label}
                aria-current={on ? "page" : undefined}
                className={cx("relative grid h-[52px] place-items-center rounded-full transition-[width,color] duration-300", on ? "w-[72px] text-ink" : "w-[52px] text-cream/65")}
              >
                {on && <motion.span layoutId="tabbar-pill" className="absolute inset-0 rounded-full bg-cream" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
                <motion.span className="relative" whileTap={{ scale: 0.85 }}>
                  {t.href === "/profile" && profile.data?.photos[0] ? (
                    <Avatar src={profile.data.photos[0]} name={account?.fullName ?? "?"} size={28} className={on ? "ring-2 ring-ink" : ""} />
                  ) : (
                    <Icon icon={t.icon} size={22} stroke={on ? 2.2 : 1.8} />
                  )}
                </motion.span>
                {!!t.badge && <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-ember" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

/** Pages a new account can use before setup is complete and approved. */
const OPEN_WHILE_SETTING_UP = ["/home", "/profile", "/settings", "/safety", "/notifications"];

export function FullScreenSpinner() {
  return (
    <div className="grid min-h-dvh place-items-center text-mute">
      <Spinner className="size-6" />
    </div>
  );
}

export default function AppShell({ children, companionOnly }: { children: ReactNode; companionOnly?: boolean }) {
  const { account, loading } = useSession();
  const router = useRouter();
  const path = usePathname();
  const staff = !!account?.roles.length;
  const wrongRole = !!companionOnly && !!account && !account.isProvider;

  useEffect(() => {
    if (loading) return;
    if (!account) router.replace(`/login?next=${encodeURIComponent(path)}`);
    // Staff only ever use the admin console.
    else if (staff) router.replace("/admin");
    else if (!account.contactVerified) router.replace("/verify-otp");
    else if (wrongRole) router.replace("/become-a-companion");
  }, [account, loading, path, router, staff, wrongRole]);

  if (loading || !account || staff || wrongRole || !account.contactVerified) return <FullScreenSpinner />;
  const open = account.onboarded && account.verification === "verified";
  const allowed = open || OPEN_WHILE_SETTING_UP.some((p) => path === p || path.startsWith(p + "/"));

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileBars />
        {IS_MOCK && (
          <div className="px-4 pt-3 sm:px-6 lg:px-10">
            <p className="mx-auto w-fit max-w-full truncate rounded-full bg-warn/8 px-3.5 py-1 text-center text-[11px] text-warn/90">
              <span className="font-semibold">Dev preview</span> · simulated people, payments and verification
            </p>
          </div>
        )}
        <main className={cx("mx-auto w-full max-w-[1180px] flex-1 px-4 pt-5 sm:px-6 lg:px-10 lg:pt-8 lg:pb-16", inChat(path) ? "pb-3" : "pb-32")}>{allowed ? children : <Locked />}</main>
      </div>
    </div>
  );
}
