"use client";

import Link from "next/link";
import { CalendarClock, ClipboardList, Receipt, SunMedium, Trash2, Users } from "lucide-react";
import { useProto } from "@/mess/store";

const CARDS = [
  { href: "/manage/today", title: "Today", body: "Who is off, and which meals are served.", icon: SunMedium },
  { href: "/manage/schedule", title: "Schedule and rates", body: "Cut-off, days off, and prices.", icon: CalendarClock },
  { href: "/manage/requests", title: "Requests", body: "Meal changes waiting for you.", icon: ClipboardList, countKey: "requests" },
  { href: "/manage/finance", title: "Finance approvals", body: "Deposits and corrected amounts.", icon: Receipt, countKey: "money" },
  { href: "/manage/members", title: "Members", body: "Add people, reset passwords, deactivate, or delete.", icon: Users },
  { href: "/manage/cleanup", title: "Month cleanup", body: "Close an old month after a backup.", icon: Trash2 },
] as const;

export default function ManageHome() {
  const store = useProto();
  if (!store.me) return null;
  if (store.me.role !== "MANAGER") return <p className="rounded-2xl bg-card p-4">Management is for the manager.</p>;
  const requests = store.state.requests.filter((item) => item.status === "PENDING").length;
  const money = store.state.money.filter((item) => item.status === "PENDING" || item.status === "DISPUTED").length;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Management</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {CARDS.map((card) => {
          const Icon = card.icon;
          const count = "countKey" in card ? (card.countKey === "requests" ? requests : money) : 0;
          return (
            <Link key={card.href} href={card.href} className="rounded-2xl border border-line bg-card p-4 shadow-[var(--shadow)]">
              <Icon className="text-brand" aria-hidden />
              <span className="mt-3 flex items-center gap-2">
                <span className="text-lg font-semibold">{card.title}</span>
                {count > 0 ? <span className="rounded-full bg-amber-100 px-2 text-xs font-semibold text-amber-900">{count}</span> : null}
              </span>
              <span className="mt-1 block text-sm text-muted">{card.body}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
