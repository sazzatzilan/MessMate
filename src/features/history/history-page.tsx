"use client";

import { useState } from "react";
import { Utensils, Wallet, Bell, Pencil } from "lucide-react";
import { Empty } from "@/components/ui/kit";
import { useProto } from "@/mess/store";
import { memberById, prettyDate, prettyStamp, type HistoryItem } from "@/mess/model";

const FILTERS = [
  ["all", "All"],
  ["meal", "Meals"],
  ["money", "Money"],
  ["request", "Requests"],
  ["edit", "Edits"],
] as const;

const COLOR = {
  meal: "border-slate-400 bg-slate-50 dark:bg-slate-900",
  money: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950",
  rejected: "border-red-500 bg-red-50 dark:bg-red-950",
  recalc: "border-orange-500 bg-orange-50 dark:bg-orange-950",
  request: "border-amber-400 bg-amber-50 dark:bg-amber-950",
  edit: "border-purple-500 bg-purple-50 dark:bg-purple-950",
};

function tone(item: HistoryItem) {
  if (item.edited || item.category === "edit") return "edit";
  if (/reject/i.test(item.text)) return "rejected";
  if (/correct|back as/i.test(item.text)) return "recalc";
  if (item.category === "request") return "request";
  if (item.category === "money") return "money";
  return "meal";
}

export default function HistoryPage() {
  const store = useProto();
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const [member, setMember] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const items = store.state.history.filter((item) => {
    if (filter !== "all" && item.category !== filter) return false;
    if (member !== "all" && item.actorId !== member && item.edited?.editorId !== member) return false;
    const day = item.at.slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    if (!item.at.startsWith(store.state.month) && store.state.month !== item.at.slice(0, 7)) return false;
    return item.at.slice(0, 7) === store.state.month;
  });
  const groups = new Map<string, HistoryItem[]>();
  for (const item of items) {
    const day = item.at.slice(0, 10);
    groups.set(day, [...(groups.get(day) || []), item]);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[16rem_1fr]">
      <aside className="space-y-3">
        <h1 className="text-2xl font-semibold">History</h1>
        <details className="rounded-2xl border border-line bg-card p-3" open>
          <summary className="cursor-pointer font-semibold">Color legend</summary>
          <ul className="mt-2 space-y-1 text-sm">
            <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm border-l-4 border-slate-400 bg-slate-100" /> Meals on or off</li>
            <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm border-l-4 border-emerald-500 bg-emerald-100" /> Money accepted</li>
            <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm border-l-4 border-red-500 bg-red-100" /> Money rejected</li>
            <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm border-l-4 border-orange-500 bg-orange-100" /> Recalculation sent</li>
            <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm border-l-4 border-amber-400 bg-amber-100" /> Request pending</li>
            <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm border-l-4 border-purple-500 bg-purple-100" /> Edited, old value crossed out</li>
          </ul>
        </details>
        <label className="block text-sm font-semibold">Member
          <select value={member} onChange={(event) => setMember(event.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-card px-3">
            <option value="all">Everyone</option>
            {store.state.members.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm font-semibold">From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-line px-2" /></label>
          <label className="text-sm font-semibold">To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-line px-2" /></label>
        </div>
      </aside>
      <section>
        <div className="mb-3 flex gap-2 overflow-auto">
          {FILTERS.map(([id, label]) => (
            <button key={id} type="button" className={`min-h-11 shrink-0 rounded-full px-3 text-sm font-semibold ${filter === id ? "bg-brand text-brand-ink" : "bg-card border border-line"}`} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>
        {items.length === 0 ? <Empty title="Nothing in this view" body="Try another filter, member, or month." /> : (
          <div className="space-y-4">
            {[...groups.entries()].map(([day, rows]) => (
              <section key={day}>
                <h2 className="sticky top-16 z-10 bg-bg py-2 text-sm font-semibold text-muted">{prettyDate(day)}</h2>
                <ul className="space-y-2">
                  {rows.map((item) => <HistoryRow key={item.id} item={item} />)}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function HistoryRow({ item }: { item: HistoryItem }) {
  const store = useProto();
  const actor = memberById(store.state, item.actorId);
  const editor = item.edited ? memberById(store.state, item.edited.editorId) : null;
  const Icon = item.category === "money" ? Wallet : item.category === "request" ? Bell : item.category === "edit" ? Pencil : Utensils;
  return (
    <li className={`rounded-2xl border-l-4 px-3 py-3 ${COLOR[tone(item)]}`}>
      <div className="flex gap-2">
        <Icon size={18} aria-hidden className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="font-medium">{item.text}</p>
          <p className="text-xs text-muted">{actor?.name || "Someone"} · {prettyStamp(item.at)}</p>
          {item.edited ? (
            <p className="mt-2 text-sm">
              <StatusEdited />
              <span className="ml-2 line-through">{item.edited.before}</span>
              <span> → {item.edited.after}</span>
              <span className="mt-1 block text-xs text-muted">Edited by {editor?.name || "a member"} · {prettyStamp(item.edited.at)}</span>
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function StatusEdited() {
  return <span className="inline-flex items-center gap-1 rounded-full bg-purple-200 px-2 py-0.5 text-xs font-semibold text-purple-900"><Pencil size={12} aria-hidden /> Edited</span>;
}
