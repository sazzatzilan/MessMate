"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Empty, Field, MemberLink, Receipt, Sheet, StatusChip, TextArea } from "@/components/ui/kit";
import { useProto } from "@/mess/store";
import { memberById, prettyDate, taka, type MoneyEntry } from "@/mess/model";

export default function ApprovalsPage() {
  const store = useProto();
  const [target, setTarget] = useState<MoneyEntry | null>(null);
  const [rejecting, setRejecting] = useState<MoneyEntry | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");
  if (store.me?.role !== "MANAGER") return null;
  const pending = store.state.money.filter((entry) => entry.status === "PENDING" || entry.status === "DISPUTED");
  const waiting = store.state.money.filter((entry) => entry.status === "RECALC");

  return (
    <div className="space-y-4">
      <Link href="/manage" className="text-sm font-semibold text-brand">Management</Link>
      <h1 className="text-2xl font-semibold">Finance approvals</h1>
      {pending.length === 0 ? <Empty title="No deposits waiting" body="New payments from members show up here." /> : (
        <div className="grid gap-3 xl:grid-cols-2">
          {pending.map((entry) => {
            const member = memberById(store.state, entry.userId);
            return (
              <article key={entry.id} className="rounded-2xl border border-line bg-card p-4">
                <div className="flex gap-3">
                  {entry.filePreview ? <img src={entry.filePreview} alt={`Receipt from ${member?.name || "member"}`} className="h-24 w-20 rounded-xl object-cover" /> : <Receipt name={entry.fileName} amount={taka(entry.amount)} />}
                  <div className="min-w-0 flex-1">
                    {member ? <MemberLink member={member} /> : null}
                    <p className="text-xl font-semibold">{taka(entry.amount)}</p>
                    <p className="text-sm text-muted">{prettyDate(entry.date)} · {entry.note || "No note"} {entry.fileName ? `· ${entry.fileName}` : ""}</p>
                    {entry.status === "DISPUTED" ? <StatusChip kind="rejected" label="Disputed" /> : null}
                    {entry.edited ? <StatusChip kind="edited" /> : null}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Button onClick={() => store.decideMoney(entry.id, "ACCEPT")}>{entry.status === "DISPUTED" ? "Accept original" : "Accept"}</Button>
                  <Button kind="ghost" onClick={() => { setRejecting(entry); setNote(""); setFormError(""); }}>Reject</Button>
                  <Button kind="soft" onClick={() => { setTarget(entry); setAmount(String(entry.amount)); setNote(""); setFormError(""); setRejecting(null); }}>Recalculate</Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <h2 className="text-lg font-semibold">Waiting for the member</h2>
      {waiting.length === 0 ? <p className="text-sm text-muted">No corrected amounts are waiting.</p> : waiting.map((entry) => {
        const member = memberById(store.state, entry.userId);
        return (
          <article key={entry.id} className="rounded-2xl border border-orange-300 bg-orange-50 p-4 dark:bg-orange-950">
            <StatusChip kind="response" label="Waiting for member" />
            <p className="mt-2 font-semibold">{member?.name} · {taka(entry.amount)} → {taka(entry.recalculatedAmount || 0)}</p>
            <p className="text-sm">{entry.managerNote}</p>
          </article>
        );
      })}
      {target ? (
        <Sheet title="Send recalculation" onClose={() => setTarget(null)}>
          <form onSubmit={(event) => {
            event.preventDefault();
            const value = Number(amount);
            if (!Number.isInteger(value) || value <= 0 || value === target.amount) {
              setFormError("Enter a different whole amount.");
              return;
            }
            if (!note.trim()) {
              setFormError("Tell the member why the amount changed.");
              return;
            }
            store.decideMoney(target.id, "RECALC", value, note.trim());
            setTarget(null);
          }}>
            {formError ? <p className="mb-2 rounded-2xl bg-red-100 px-3 py-2 text-sm text-red-800" role="alert">{formError}</p> : null}
            <Field label="Corrected amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
            <div className="mt-3"><TextArea label="Note" value={note} onChange={(event) => setNote(event.target.value)} /></div>
            <Button type="submit" className="mt-3 w-full">Send to member</Button>
          </form>
        </Sheet>
      ) : null}
      {rejecting ? (
        <Sheet title="Reject deposit" onClose={() => setRejecting(null)}>
          <form onSubmit={(event) => {
            event.preventDefault();
            if (!note.trim()) {
              setFormError("Write why this deposit is rejected.");
              return;
            }
            store.decideMoney(rejecting.id, "REJECT", undefined, note.trim());
            setRejecting(null);
          }}>
            {formError ? <p className="mb-2 rounded-2xl bg-red-100 px-3 py-2 text-sm text-red-800" role="alert">{formError}</p> : null}
            <TextArea label="Reason" value={note} onChange={(event) => setNote(event.target.value)} />
            <Button type="submit" kind="danger" className="mt-3 w-full">Reject deposit</Button>
          </form>
        </Sheet>
      ) : null}
    </div>
  );
}
