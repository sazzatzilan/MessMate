"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  History,
  Home,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCcw,
  Settings2,
  Sun,
  UserRound,
  Utensils,
  Wallet,
  WifiOff,
  X,
} from "lucide-react";
import { useProto } from "@/mess/store";
import { monthLabel, shiftMonth } from "@/mess/model";
import { Avatar } from "@/components/ui/kit";

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/meals", label: "Meals", icon: Utensils },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/history", label: "History", icon: History },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const store = useProto();
  const path = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [bell, setBell] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const me = store.me;

  useEffect(() => {
    if (!me) router.replace("/login");
  }, [me, router]);

  if (!me) return null;

  const fifth = me.role === "MANAGER"
    ? { href: "/manage", label: "Management", icon: Settings2 }
    : { href: "/profile", label: "Profile", icon: UserRound };
  const nav = [...ITEMS, fifth];
  const notices = store.state.notices.filter((notice) => notice.for === me.id || (notice.for === "managers" && me.role === "MANAGER"));
  const unread = notices.filter((notice) => notice.unread).length;
  const currentMonth = store.today.slice(0, 7);

  const showLabels = navOpen;
  const sideLink = (item: (typeof nav)[number]) => {
    const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold ${active ? "bg-soft text-brand" : "text-ink"}`}
      >
        <Icon size={20} aria-hidden />
        <span className={showLabels ? "md:inline" : "hidden xl:inline"}>{item.label}</span>
      </Link>
    );
  };

  return (
    <div
      className={`min-h-dvh md:grid ${navOpen ? "md:grid-cols-[16rem_1fr]" : "md:grid-cols-[4.5rem_1fr]"} xl:grid-cols-[16rem_1fr]`}
      style={{ ["--side" as string]: navOpen ? "16rem" : "4.5rem" }}
    >
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-card md:flex">
        <div className="flex h-16 items-center gap-2 px-3">
          <Link href="/" className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#0F766E] text-sm font-bold text-white">MM</Link>
          <span className={showLabels ? "min-w-0 md:block" : "hidden min-w-0 xl:block"}>
            <span className="block truncate text-sm font-semibold">MessMate</span>
            <span className="block truncate text-xs text-muted">Green Hostel</span>
          </span>
        </div>
        <button
          type="button"
          className="mx-2 mb-2 hidden min-h-11 items-center justify-center gap-2 rounded-2xl border border-line px-3 text-sm font-semibold md:flex xl:hidden"
          aria-label={navOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={navOpen}
          onClick={() => setNavOpen((open) => !open)}
        >
          {navOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          <span className={showLabels ? "inline" : "sr-only"}>{navOpen ? "Collapse" : "Expand"}</span>
        </button>
        <nav className="flex flex-1 flex-col gap-1 px-2" aria-label="Main">
          {ITEMS.map((item) => sideLink(item))}
          {me.role === "MANAGER" ? (
            <div className="mt-3 border-t border-line pt-3">
              <p className={`mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted ${showLabels ? "md:block" : "hidden xl:block"}`}>
                <span className="rounded-full bg-soft px-2 py-0.5 text-brand">Manager</span>
              </p>
              {sideLink(fifth)}
            </div>
          ) : (
            sideLink(fifth)
          )}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-line bg-bg/90 px-4 backdrop-blur">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">MessMate</p>
            <p className="truncate text-xs text-muted">Green Hostel</p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button type="button" aria-label="Previous month" className="grid h-11 w-11 place-items-center rounded-2xl" onClick={() => store.setMonth(shiftMonth(store.state.month, -1))}>
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-28 text-center text-sm font-semibold">{monthLabel(store.state.month)}</span>
            <button
              type="button"
              aria-label="Next month"
              disabled={store.state.month >= currentMonth}
              className="grid h-11 w-11 place-items-center rounded-2xl disabled:opacity-40"
              onClick={() => store.setMonth(shiftMonth(store.state.month, 1))}
            >
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              aria-label={unread ? `${unread} unread notifications` : "Notifications"}
              className="relative grid h-11 w-11 place-items-center rounded-2xl xl:hidden"
              onClick={() => router.push("/notifications")}
            >
              <Bell size={20} />
              {unread > 0 ? <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unread}</span> : null}
            </button>
            <div className="relative hidden xl:block">
              <button type="button" aria-label={unread ? `${unread} unread notifications` : "Notifications"} className="relative grid h-11 w-11 place-items-center rounded-2xl" onClick={() => { setBell((open) => !open); store.markRead(); }}>
                <Bell size={20} />
                {unread > 0 ? <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unread}</span> : null}
              </button>
              {bell ? (
                <div className="absolute right-0 top-12 z-40 w-80 rounded-2xl border border-line bg-card p-2 shadow-[var(--shadow)]">
                  <div className="mb-1 flex items-center justify-between px-2">
                    <p className="font-semibold">Notifications</p>
                    <button type="button" aria-label="Close notifications" onClick={() => setBell(false)}><X size={16} /></button>
                  </div>
                  {notices.slice(0, 5).map((notice) => (
                    <Link key={notice.id} href={notice.href} onClick={() => setBell(false)} className="block rounded-xl px-2 py-2 hover:bg-soft">
                      <span className="block text-sm font-semibold">{notice.title}</span>
                      <span className="block text-xs text-muted">{notice.body}</span>
                    </Link>
                  ))}
                  <Link href="/notifications" onClick={() => setBell(false)} className="block px-2 py-2 text-sm font-semibold text-brand">See all</Link>
                </div>
              ) : null}
            </div>
            <button type="button" aria-label="Account menu" className="grid h-11 w-11 place-items-center" onClick={() => setMenu((open) => !open)}>
              <Avatar member={me} size={36} />
            </button>
          </div>
        </header>
        {menu ? (
          <div className="fixed right-4 top-16 z-40 w-64 rounded-2xl border border-line bg-card p-2 shadow-[var(--shadow)]">
            <Link href={`/members/view?id=${me.id}`} onClick={() => setMenu(false)} className="flex min-h-11 items-center gap-2 rounded-xl px-2 font-semibold">
              <UserRound size={18} /> Profile
            </Link>
            <button type="button" aria-pressed={store.state.theme === "dark"} className="flex min-h-11 w-full items-center gap-2 rounded-xl px-2 font-semibold" onClick={() => store.setTheme(store.state.theme === "dark" ? "light" : "dark")}>
              {store.state.theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              {store.state.theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <button type="button" className="flex min-h-11 w-full items-center gap-2 rounded-xl px-2 font-semibold" onClick={() => { store.restore(); setMenu(false); }}>
              <RefreshCcw size={18} /> Restore sample data
            </button>
            <button type="button" className="flex min-h-11 w-full items-center gap-2 rounded-xl px-2 font-semibold" onClick={() => store.logout()}>
              <LogOut size={18} /> Log out
            </button>
          </div>
        ) : null}

        {!store.online ? (
          <p className="flex items-center gap-2 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            <WifiOff size={16} aria-hidden /> You are offline. This preview still works on this device.
          </p>
        ) : null}
        {store.state.cleanedMonths.includes(store.state.month) ? (
          <p className="flex items-center gap-2 bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
            <Clock3 size={16} aria-hidden /> {monthLabel(store.state.month)} is closed. The day-by-day rows were cleared.
          </p>
        ) : null}

        <main className="mx-auto w-full max-w-6xl px-4 py-4 pb-28 md:pb-8">{children}</main>

        {store.toast ? (
          <div role="status" className={`fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-[var(--shadow)] md:bottom-6 ${store.toast.kind === "ok" ? "bg-emerald-700 text-white" : "bg-red-700 text-white"}`}>
            {store.toast.kind === "ok" ? <Check size={16} aria-hidden /> : <X size={16} aria-hidden />}
            {store.toast.text}
          </div>
        ) : null}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-card md:hidden" aria-label="Main">
        {nav.map((item) => {
          const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${active ? "text-brand" : "text-muted"}`}>
              <Icon size={20} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
