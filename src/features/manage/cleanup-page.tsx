"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Field } from "@/components/ui/kit";
import { useProto } from "@/mess/store";
import { monthKey, monthLabel, shiftMonth } from "@/mess/model";

export default function CleanupPage() {
  const store = useProto();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const current = monthKey(store.today);
  const months: string[] = [];
  for (let cursor = "2026-08"; cursor < current; cursor = shiftMonth(cursor, 1)) months.push(cursor);
  const [month, setMonth] = useState(months[0] || shiftMonth(current, -1));
  if (store.me?.role !== "MANAGER") return null;
  const names = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const phrase = `DELETE ${names[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
  const rows = {
    meals: store.state.offs.filter((item) => item.date.startsWith(month)).length + store.state.guests.filter((item) => item.date.startsWith(month)).length,
    money: store.state.money.filter((item) => item.date.startsWith(month)).length,
    requests: store.state.requests.filter((item) => item.date.startsWith(month)).length,
  };
  const freed = `${((rows.meals + rows.money + rows.requests) * 2 + 8).toFixed(0)} KB`;

  function download() {
    const blob = new Blob([JSON.stringify({ month, members: store.state.members.map(({ password, ...member }) => member), offs: store.state.offs, guests: store.state.guests, money: store.state.money }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hostel-backup-${month}.json`;
    link.click();
    URL.revokeObjectURL(url);
    store.markBackup(month);
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-line bg-card p-6 text-center">
        <h1 className="text-2xl font-semibold">Month closed</h1>
        <p className="mt-2 text-muted">{monthLabel(done)} is saved as totals. The day-by-day rows for that month are gone.</p>
        <Link href="/manage" className="mt-4 inline-flex min-h-11 items-center font-semibold text-brand">Back to management</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href="/manage" className="text-sm font-semibold text-brand">Management</Link>
      <h1 className="text-2xl font-semibold text-red-700">Month cleanup</h1>
      <p className="text-sm text-muted">This removes the daily rows for one past month. Balances stay. Close older months first.</p>
      <div>
        <label htmlFor="cleanup-month" className="block text-sm font-semibold">Which month</label>
        <select id="cleanup-month" value={month} onChange={(event) => setMonth(event.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-card px-3">
          {months.map((item) => <option key={item} value={item}>{monthLabel(item)}{store.state.cleanedMonths.includes(item) ? " (closed)" : ""}</option>)}
        </select>
      </div>
      <ul className="rounded-2xl border border-line bg-card p-4 text-sm">
        <li>{rows.meals} meal and guest rows will be deleted</li>
        <li>{rows.money} money rows will be deleted</li>
        <li>{rows.requests} requests will be deleted</li>
        <li>About {freed} freed in this preview</li>
      </ul>
      <Button kind="ghost" onClick={download}>Download backup first</Button>
      {store.state.backupFor === month ? <p className="text-sm font-medium text-emerald-700">Backup downloaded for this month.</p> : <p className="text-sm text-muted">Download the backup for this month before you close it.</p>}
      <Field label="Cleanup password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} hint="For this preview the password is cleanup123." />
      <Field label={`Type ${phrase}`} value={confirm} onChange={(event) => setConfirm(event.target.value)} />
      {error ? <p className="rounded-2xl bg-red-100 px-3 py-2 text-sm text-red-800" role="alert">{error}</p> : null}
      <Button
        kind="danger"
        className="w-full"
        disabled={store.state.backupFor !== month}
        onClick={() => {
          const message = store.runCleanup(month, password, confirm);
          if (message) setError(message);
          else setDone(month);
        }}
      >Close {monthLabel(month)}</Button>
    </div>
  );
}
