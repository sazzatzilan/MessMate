"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Empty, TextArea } from "@/components/ui/kit";
import { useProto } from "@/mess/store";
import { prettyStamp } from "@/mess/model";

export default function NotificationsPage() {
  const store = useProto();
  const me = store.me;
  const [note, setNote] = useState("");
  if (!me) return null;
  const notices = store.state.notices.filter((notice) => notice.for === me.id || (notice.for === "managers" && me.role === "MANAGER"));

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <h1 className="text-2xl font-semibold">Notifications</h1>
      {notices.length === 0 ? <Empty title="You are caught up" body="Requests and money updates will land here." /> : notices.map((notice) => {
        const request = notice.requestId ? store.state.requests.find((item) => item.id === notice.requestId) : null;
        const money = notice.moneyId ? store.state.money.find((item) => item.id === notice.moneyId) : null;
        return (
          <article key={notice.id} className="rounded-2xl border border-line bg-card p-4">
            <p className="font-semibold">{notice.title}</p>
            <p className="text-sm">{notice.body}</p>
            <p className="text-xs text-muted">{prettyStamp(notice.at)}</p>
            {me.role === "MANAGER" && request?.status === "PENDING" ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button onClick={() => store.decideRequest(request.id, true, note)}>Accept</Button>
                <Button kind="ghost" onClick={() => store.decideRequest(request.id, false, note)}>Reject</Button>
              </div>
            ) : null}
            {me.role === "MANAGER" && money?.status === "PENDING" ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button onClick={() => store.decideMoney(money.id, "ACCEPT")}>Accept</Button>
                <Button kind="ghost" onClick={() => store.decideMoney(money.id, "REJECT", undefined, note || "Not accepted.")}>Reject</Button>
              </div>
            ) : null}
            <Link href={notice.href} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-brand">Open</Link>
          </article>
        );
      })}
      {me.role === "MANAGER" ? <TextArea label="Note for accept or reject" value={note} onChange={(event) => setNote(event.target.value)} /> : null}
    </div>
  );
}
