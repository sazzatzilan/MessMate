"use client";

import Link from "next/link";
import { Button, Toggle } from "@/components/ui/kit";
import { useProto } from "@/mess/store";
import { MEALS, MEAL_LABEL, activeMembers, isOn, isServed, prettyDate } from "@/mess/model";

export default function ManageToday() {
  const store = useProto();
  if (store.me?.role !== "MANAGER") return null;
  const date = store.today;
  return (
    <div className="space-y-4">
      <Link href="/manage" className="text-sm font-semibold text-brand">Management</Link>
      <h1 className="text-2xl font-semibold">Today · {prettyDate(date)}</h1>
      {MEALS.map((meal) => {
        const served = isServed(store.state, date, meal);
        const guests = store.state.guests.filter((guest) => guest.date === date && guest.meal === meal).reduce((sum, guest) => sum + guest.quantity, 0);
        const eating = activeMembers(store.state).filter((member) => served && isOn(store.state, member.id, date, meal)).length;
        return (
          <article key={meal} className="rounded-2xl border border-line bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{MEAL_LABEL[meal]}</h2>
                <p className="text-sm text-muted">{served ? `${eating} members · ${guests} guests` : "Not served"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-muted">Meal served today</p>
                <Toggle on={served} label={`${MEAL_LABEL[meal]} served`} onChange={(next) => store.setServed(date, meal, next)} />
              </div>
            </div>
            {served ? (
              <ul className="mt-3 divide-y divide-line">
                {activeMembers(store.state).map((member) => {
                  const on = isOn(store.state, member.id, date, meal);
                  return (
                    <li key={member.id} className="flex items-center justify-between gap-2 py-2">
                      <span className="font-medium">{member.name}</span>
                      <Button kind={on ? "ghost" : "soft"} onClick={() => store.setMemberMeal(member.id, date, meal, !on)}>{on ? "Mark off" : "Mark on"}</Button>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="mt-3 text-sm">Members see “Not served” and cannot switch this meal on.</p>}
          </article>
        );
      })}
    </div>
  );
}
