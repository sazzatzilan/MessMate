"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Empty, MemberLink, TextArea } from "@/components/ui/kit";
import { useProto } from "@/mess/store";
import { MEAL_LABEL, lockOf, memberById, prettyDate, prettyStamp } from "@/mess/model";

export default function RequestsPage() {
  const store = useProto();
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  if (store.me?.role !== "MANAGER") return null;
  const rows = store.state.requests.filter((item) => item.status === "PENDING");
  const waiting = (at: string) => {
    const minutes = Math.max(1, Math.round((Date.now() - new Date(at).getTime()) / 60000));
    if (minutes < 60) return `${minutes}m waiting`;
    return `${Math.floor(minutes / 60)}h waiting`;
  };

  return (
    <div className="space-y-4">
      <Link href="/manage" className="text-sm font-semibold text-brand">Management</Link>
      <h1 className="text-2xl font-semibold">Requests</h1>
      {picked.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { store.decideRequests(picked, true, note); setPicked([]); }}>Accept {picked.length}</Button>
          <Button kind="ghost" onClick={() => { store.decideRequests(picked, false, note); setPicked([]); }}>Reject {picked.length}</Button>
        </div>
      ) : null}
      <TextArea label="Note for the member (optional)" value={note} onChange={(event) => setNote(event.target.value)} />
      {rows.length === 0 ? <Empty title="No requests waiting" body="When a meal is locked, members can ask for a change here." /> : (
        <div className="grid gap-3 xl:grid-cols-2">
          {rows.map((request) => {
            const member = memberById(store.state, request.userId);
            const lock = lockOf(store.state, request.date, request.meal, store.today);
            return (
              <article key={request.id} className="rounded-2xl border border-line bg-card p-4">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={picked.includes(request.id)} onChange={(event) => setPicked((current) => event.target.checked ? [...current, request.id] : current.filter((id) => id !== request.id))} />
                  Select
                </label>
                {member ? <MemberLink member={member} /> : null}
                <p className="mt-2 font-medium">{MEAL_LABEL[request.meal]} · {prettyDate(request.date)}</p>
                <p className="text-sm">{request.fromOn ? "ON" : "OFF"} → {request.toOn ? "ON" : "OFF"}</p>
                <p className="text-sm text-muted">{request.reason || "No reason"} · {waiting(request.at)} · {prettyStamp(request.at)}</p>
                <p className="mt-2 text-sm">{lock === "locked" ? "This meal is locked, so you can still change it." : "This meal is not locked. Reject it, or leave it until the member can change it themselves."}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button disabled={lock !== "locked"} onClick={() => store.decideRequest(request.id, true, note)}>Accept</Button>
                  <Button kind="ghost" onClick={() => store.decideRequest(request.id, false, note)}>Reject</Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
