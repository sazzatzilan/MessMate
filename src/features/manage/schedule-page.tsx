"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Field, Sheet, Toggle } from "@/components/ui/kit";
import { useProto } from "@/mess/store";
import { MEALS, MEAL_LABEL, type Meal, eachDate, isServed, monthBounds, parseKey, prettyDate } from "@/mess/model";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SchedulePage() {
  const store = useProto();
  const [day, setDay] = useState<string | null>(null);
  const [meal, setMeal] = useState<Meal>("LUNCH");
  const [memberPrice, setMemberPrice] = useState("80");
  const [guestPrice, setGuestPrice] = useState("90");
  if (store.me?.role !== "MANAGER") return null;
  const bounds = monthBounds(store.state.month);
  const days = eachDate(bounds.from, bounds.to);

  return (
    <div className="space-y-4">
      <Link href="/manage" className="text-sm font-semibold text-brand">Management</Link>
      <h1 className="text-2xl font-semibold">Schedule and rates</h1>
      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="font-semibold">Cut-off</h2>
        <p className="text-sm text-muted">One time for every meal, unless you set an override.</p>
        <input type="time" value={store.state.cutoff} onChange={(event) => store.setCutoff(event.target.value)} className="mt-2 min-h-12 rounded-2xl border border-line px-3" />
        <ul className="mt-3 space-y-2">
          {MEALS.map((item) => (
            <li key={item} className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{MEAL_LABEL[item]}</span>
              <span className="flex items-center gap-2">
                <input
                  type="time"
                  aria-label={`${MEAL_LABEL[item]} cut-off`}
                  value={store.state.cutoffOverride[item] || store.state.cutoff}
                  onChange={(event) => store.setCutoff(event.target.value, item)}
                  className="min-h-11 rounded-2xl border border-line px-3"
                />
                {store.state.cutoffOverride[item] ? <Button kind="ghost" onClick={() => store.setCutoff("", item)}>Use default</Button> : null}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="font-semibold">Repeat a day off</h2>
        <p className="text-sm text-muted">A repeat starts with the next meal that is still open. Days already counted stay as they were. Friday dinner is off.</p>
        <div className="mt-3 space-y-2">
          {DAYS.map((label, weekday) => (
            <div key={label} className="flex flex-wrap items-center gap-2">
              <span className="w-12 text-sm font-semibold">{label}</span>
              {MEALS.map((item) => {
                const on = store.state.weekdayOff.some((row) => row.weekday === weekday && row.meal === item);
                return (
                  <button key={item} type="button" aria-pressed={on} aria-label={`${label} ${MEAL_LABEL[item]}`} className={`min-h-10 rounded-full px-3 text-xs font-semibold ${on ? "bg-red-700 text-white" : "border border-line"}`} onClick={() => store.toggleWeekday(weekday, item)}>
                    {MEAL_LABEL[item]}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="font-semibold">Dates off</h2>
        <div className="mt-3 grid grid-cols-7 gap-1">
          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((label) => <span key={label} className="text-center text-xs text-muted">{label}</span>)}
          {Array.from({ length: (parseKey(bounds.from).getDay() + 6) % 7 }).map((_, index) => <span key={index} />)}
          {days.map((date) => (
            <button key={date} type="button" aria-label={prettyDate(date)} onClick={() => setDay(date)} className="min-h-12 rounded-xl bg-bg text-sm font-semibold">
              {parseKey(date).getDate()}
              <span className="mt-1 flex justify-center gap-0.5">{MEALS.map((item) => <span key={item} className={`h-1.5 w-1.5 rounded-full ${isServed(store.state, date, item) ? "bg-emerald-500" : "bg-zinc-400"}`} />)}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="font-semibold">Rates</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {MEALS.map((item) => (
            <button key={item} type="button" aria-pressed={meal === item} aria-label={`${MEAL_LABEL[item]} rate`} className={`min-h-11 rounded-2xl px-3 text-sm font-semibold ${meal === item ? "bg-brand text-brand-ink" : "border border-line"}`} onClick={() => { setMeal(item); setMemberPrice(String(store.state.prices[item].member)); setGuestPrice(String(store.state.prices[item].guest)); }}>{MEAL_LABEL[item]}</button>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Member rate" inputMode="numeric" value={memberPrice} onChange={(event) => setMemberPrice(event.target.value)} />
          <Field label="Guest rate" inputMode="numeric" value={guestPrice} onChange={(event) => setGuestPrice(event.target.value)} />
        </div>
        <Button className="mt-3" onClick={() => store.setPrice(meal, Number(memberPrice), Number(guestPrice))}>Save rates</Button>
        <p className="mt-2 text-sm text-muted">From today, {MEAL_LABEL[meal]} is ৳{store.state.prices[meal].member} for members and ৳{store.state.prices[meal].guest} for guests. Earlier days keep the rate they already had.</p>
      </section>
      {day ? (
        <Sheet title={day} onClose={() => setDay(null)}>
          {day < store.today ? <p className="text-sm text-muted">This day is closed. It stays as it was.</p> : MEALS.map((item) => (
            <div key={item} className="mb-3 flex items-center justify-between">
              <span className="font-semibold">{MEAL_LABEL[item]}</span>
              <Toggle on={isServed(store.state, day, item)} label={`${MEAL_LABEL[item]} served on ${day}`} onChange={(next) => store.setServed(day, item, next)} />
            </div>
          ))}
        </Sheet>
      ) : null}
    </div>
  );
}
