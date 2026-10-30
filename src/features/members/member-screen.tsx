"use client";

import { useState } from "react";
import { Avatar, Button, Empty, Field, Metric, PhotoField, Sheet, StatusChip } from "@/components/ui/kit";
import { useProto } from "@/mess/store";
import { MEAL_LABEL, billMember, isServed, memberById, prettyDate, rateFor, taka } from "@/mess/model";

export function MemberScreen({ id }: { id: string }) {
  const store = useProto();
  const member = memberById(store.state, id);
  const [tab, setTab] = useState<"guests" | "meals" | "deposits">("guests");
  const [edit, setEdit] = useState(false);
  if (!member || !store.me) return <Empty title="Member not found" body="This profile is not in the sample hostel." />;
  const bill = billMember(store.state, member.id, store.state.month, store.today);
  const guests = store.state.guests.filter((guest) => guest.hostId === member.id && guest.date.startsWith(store.state.month));
  const grouped = new Map<string, typeof guests>();
  for (const guest of guests) {
    const key = guest.guestName.toLowerCase();
    grouped.set(key, [...(grouped.get(key) || []), guest]);
  }
  const deposits = store.state.money.filter((entry) => entry.userId === member.id && entry.date.startsWith(store.state.month));

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-card p-4 shadow-[var(--shadow)]">
        <Avatar member={member} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">{member.name}</h1>
          <p className="text-sm text-muted">@{member.username} · Room {member.room} · {member.phone}</p>
          {member.role === "MANAGER" ? <span className="mt-1 inline-block rounded-full bg-soft px-2 py-0.5 text-xs font-semibold text-brand">Manager</span> : null}
        </div>
        {store.me.role === "MANAGER" ? <Button kind="ghost" onClick={() => setEdit(true)}>Edit profile</Button> : null}
      </header>
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
        <Metric label="Meals" value={String(bill.ownCount)} />
        <Metric label="Guest meals" value={String(bill.guestCount)} />
        <Metric label="Guest cost" value={taka(bill.guestCost)} />
        <Metric label="Deposits" value={taka(bill.deposited)} />
        <Metric label="Balance" value={taka(bill.balance)} warn={bill.balance < 0} />
      </div>
      <div className="flex gap-2 overflow-auto">
        {(["guests", "meals", "deposits"] as const).map((item) => (
          <button key={item} type="button" className={`min-h-11 rounded-full px-3 text-sm font-semibold capitalize ${tab === item ? "bg-brand text-brand-ink" : "border border-line bg-card"}`} onClick={() => setTab(item)}>{item === "guests" ? "Guest meals" : item}</button>
        ))}
      </div>
      {tab === "guests" ? (
        grouped.size === 0 ? <Empty title="No guest meals" body="Guests added this month will be grouped by name." /> : (
          <div className="space-y-3">
            {[...grouped.entries()].map(([key, rows]) => {
              const subtotal = rows.reduce((sum, row) => sum + (isServed(store.state, row.date, row.meal) ? row.quantity * rateFor(store.state, row.meal, row.date).guest : 0), 0);
              return (
                <article key={key} className="rounded-2xl border border-line bg-card p-3">
                  <h2 className="font-semibold">{rows[0].guestName}</h2>
                  <ul className="mt-2 space-y-1 text-sm">
                    {rows.map((row) => (
                      <li key={row.id} className="flex justify-between gap-2">
                        <span>{prettyDate(row.date)} · {MEAL_LABEL[row.meal]} · × {row.quantity}</span>
                        <span>{isServed(store.state, row.date, row.meal) ? taka(row.quantity * rateFor(store.state, row.meal, row.date).guest) : "Not billed"}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-sm font-semibold">Subtotal {taka(subtotal)}</p>
                </article>
              );
            })}
          </div>
        )
      ) : null}
      {tab === "meals" ? (
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Breakfast" value={String(bill.meals.BREAKFAST)} />
          <Metric label="Lunch" value={String(bill.meals.LUNCH)} />
          <Metric label="Dinner" value={String(bill.meals.DINNER)} />
        </div>
      ) : null}
      {tab === "deposits" ? (
        deposits.length === 0 ? <Empty title="No deposits this month" body="Accepted and pending payments show here." /> : (
          <ul className="space-y-2">
            {deposits.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between rounded-2xl border border-line bg-card px-3 py-3">
                <span>{prettyDate(entry.date)} · {entry.note || "Deposit"} · {taka(entry.amount)}</span>
                <StatusChip kind={entry.status === "ACCEPTED" ? "accepted" : entry.status === "PENDING" ? "pending" : entry.status === "RECALC" ? "response" : "rejected"} />
              </li>
            ))}
          </ul>
        )
      ) : null}
      {edit ? <EditMember id={member.id} onClose={() => setEdit(false)} /> : null}
    </div>
  );
}

function EditMember({ id, onClose }: { id: string; onClose: () => void }) {
  const store = useProto();
  const member = memberById(store.state, id)!;
  const [name, setName] = useState(member.name);
  const [room, setRoom] = useState(member.room);
  const [phone, setPhone] = useState(member.phone);
  const [photo, setPhoto] = useState(member.photo || "");
  return (
    <Sheet title="Edit profile" onClose={onClose}>
      <div className="space-y-3">
        <PhotoField value={photo} onChange={setPhoto} />
        <Field label="Full name" value={name} onChange={(event) => setName(event.target.value)} />
        <Field label="Room" value={room} onChange={(event) => setRoom(event.target.value)} />
        <Field label="Phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
        <Button className="w-full" onClick={() => { store.saveMember({ ...member, name, room, phone, photo }, id); onClose(); }}>Save</Button>
      </div>
    </Sheet>
  );
}
