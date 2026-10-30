"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Plus, UserPlus, UtensilsCrossed } from "lucide-react";
import { Metric, StatusChip, useNow, type ChipKind } from "@/components/ui/kit";
import { useProto } from "@/mess/store";
import {
  MEALS,
  MEAL_LABEL,
  MEAL_TIME,
  billMember,
  clockLabel,
  cutoffFor,
  lockOf,
  minutesOf,
  pendingRequest,
  prettyDate,
  prettyStamp,
  taka,
} from "@/mess/model";

export default function HomePage() {
  const store = useProto();
  const router = useRouter();
  const now = useNow();
  const me = store.me;
  if (!me) return null;
  const bill = billMember(store.state, me.id, store.state.month, store.today);
  const pending = store.state.requests.filter((item) => item.status === "PENDING").length;
  const hour = now.getHours();
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nextOpen = MEALS
    .map((meal) => ({ meal, at: minutesOf(cutoffFor(store.state, meal)), lock: lockOf(store.state, store.today, meal, store.today, now) }))
    .filter((item) => item.lock === "open")
    .sort((a, b) => a.at - b.at)[0];
  const left = nextOpen ? nextOpen.at - nowMinutes : 0;
  const soon = Boolean(nextOpen) && left > 0 && left <= 30;

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="space-y-4">
        <div className="rounded-3xl bg-[#0F766E] px-4 py-5 text-white shadow-[var(--shadow)]">
          <p className="text-sm text-white/80">{prettyDate(store.today)}</p>
          <h1 className="mt-1 text-2xl font-semibold">{hello}, {me.name.split(" ")[0]}</h1>
          <p className="text-sm text-white/80">Room {me.room} · MessMate</p>
        </div>
        <article className="rounded-2xl border border-line bg-card p-4 shadow-[var(--shadow)]">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Today</h2>
            <p className={`flex items-center gap-1 text-sm font-medium ${soon ? "text-amber-700 dark:text-amber-300" : "text-muted"}`}>
              <Clock size={16} aria-hidden />
              {nextOpen ? `${MEAL_LABEL[nextOpen.meal]} closes at ${clockLabel(cutoffFor(store.state, nextOpen.meal))}, ${Math.floor(left / 60)}h ${left % 60}m left` : "Changes for today are closed"}
            </p>
          </div>
          <div className="mt-3 grid gap-2">
            {MEALS.map((meal) => {
              const lock = lockOf(store.state, store.today, meal, store.today, now);
              const on = !store.state.offs.some((item) => item.userId === me.id && item.date === store.today && item.meal === meal);
              const request = pendingRequest(store.state, me.id, store.today, meal);
              const kind: ChipKind = request ? "pending" : lock === "unserved" ? "unserved" : on ? "on" : "off";
              return (
                <div key={meal} className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-bg px-3">
                  <span>
                    <span className="block font-semibold">{MEAL_LABEL[meal]}</span>
                    <span className="block text-xs text-muted">{MEAL_TIME[meal]}</span>
                  </span>
                  <span className="flex flex-wrap justify-end gap-1">
                    <StatusChip kind={kind} />
                    {lock === "locked" || lock === "past" ? <StatusChip kind="locked" /> : null}
                  </span>
                </div>
              );
            })}
          </div>
        </article>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Quick label="Turn off today" icon={UtensilsCrossed} onClick={() => { store.setIntent("off-today"); router.push("/meals"); }} />
          <Quick label="Add guest meal" icon={UserPlus} onClick={() => { store.setIntent("add-guest"); router.push("/meals"); }} />
          <Quick label="Add money" icon={Plus} onClick={() => { store.setIntent("add-money"); router.push("/finance"); }} />
        </div>
        {me.role === "MANAGER" && pending > 0 ? (
          <Link href="/manage" className="flex min-h-14 items-center justify-between rounded-2xl bg-amber-100 px-4 font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            <span className="inline-flex items-center gap-2"><Clock size={18} aria-hidden /> {pending} pending request{pending === 1 ? "" : "s"}</span>
            <span>Review</span>
          </Link>
        ) : null}
      </section>
      <section className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Metric label="My meals" value={String(bill.ownCount)} />
          <Metric label="Guest meals" value={String(bill.guestCount)} />
          <Metric label="Total cost" value={taka(bill.cost)} />
          <Metric label="Balance" value={taka(bill.balance)} warn={bill.balance < 0} />
        </div>
        <article className="rounded-2xl border border-line bg-card p-4 shadow-[var(--shadow)]">
          <h2 className="font-semibold">Recent activity</h2>
          <ul className="mt-2 space-y-2">
            {store.state.history.slice(0, 5).map((item) => (
              <li key={item.id} className="text-sm">
                <span className="font-medium">{item.text}</span>
                <span className="mt-0.5 block text-xs text-muted">{prettyStamp(item.at)}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}

function Quick({ label, icon: Icon, onClick }: { label: string; icon: typeof Plus; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-card px-3 text-left text-sm font-semibold shadow-[var(--shadow)]">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-soft text-brand"><Icon size={18} aria-hidden /></span>
      {label}
    </button>
  );
}
