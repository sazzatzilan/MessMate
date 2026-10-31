"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { ActionBar, Button, Empty, MemberLink, Sheet, StatusChip, Stepper, TextArea, Toggle, useNow, type ChipKind } from "@/components/ui/kit";
import { useProto, type MealChange } from "@/mess/store";
import {
  MEALS,
  MEAL_LABEL,
  MEAL_TIME,
  type Meal,
  activeMembers,
  addDays,
  cutoffFor,
  dateKey,
  eachDate,
  isOn,
  isServed,
  lockOf,
  rateFor,
  monthBounds,
  parseKey,
  pendingRequest,
  prettyDate,
  taka,
} from "@/mess/model";

type Draft = Record<string, boolean>;

export default function MealsPage() {
  const store = useProto();
  const now = useNow();
  const me = store.me;
  const [tab, setTab] = useState<"meals" | "guests">("meals");
  const [selected, setSelected] = useState(store.today);
  const [draft, setDraft] = useState<Draft>({});
  const [guestFor, setGuestFor] = useState<Meal | null>(null);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (store.state.intent === "add-guest") {
      setTab("meals");
      setSelected(store.today);
      const manager = store.me?.role === "MANAGER";
      const openMeal = MEALS.find((meal) => lockOf(store.state, store.today, meal, store.today) === "open")
        ?? (manager ? MEALS.find((meal) => lockOf(store.state, store.today, meal, store.today) === "locked") : undefined);
      if (openMeal) setGuestFor(openMeal);
      else store.showToast("error", "No meal is still open for a guest.");
      store.setIntent(null);
    }
    if (store.state.intent === "off-today") {
      setSelected(store.today);
      setDraft((current) => {
        const next = { ...current };
        for (const meal of MEALS) {
          if (isServed(store.state, store.today, meal)) next[`${store.today}:${meal}`] = false;
        }
        return next;
      });
      store.setIntent(null);
    }
  }, [store]);

  if (!me) return null;
  const member = me;
  const bounds = monthBounds(store.state.month);
  const days = eachDate(bounds.from, bounds.to);
  const weekStart = addDays(selected, -((parseKey(selected).getDay() + 6) % 7));
  const week = eachDate(weekStart, addDays(weekStart, 6));

  const savedOn = (date: string, meal: Meal) => isOn(store.state, member.id, date, meal);
  function shownOn(date: string, meal: Meal) {
    const key = `${date}:${meal}`;
    return key in draft ? draft[key] : savedOn(date, meal);
  }
  const changes: MealChange[] = Object.entries(draft)
    .filter(([key, on]) => {
      const [date, meal] = key.split(":") as [string, Meal];
      return on !== savedOn(date, meal);
    })
    .map(([key, on]) => {
      const [date, meal] = key.split(":") as [string, Meal];
      return { date, meal, on, prevOn: savedOn(date, meal) };
    });
  const lockedChanges = changes.filter((change) => lockOf(store.state, change.date, change.meal, store.today, now) === "locked");
  const openChanges = changes.filter((change) => lockOf(store.state, change.date, change.meal, store.today, now) === "open");
  const managerOverride = member.role === "MANAGER" && lockedChanges.length > 0;

  function dot(date: string) {
    return MEALS.map((meal) => {
      if (!isServed(store.state, date, meal)) return "bg-zinc-300";
      return shownOn(date, meal) ? "bg-emerald-500" : "bg-red-500";
    });
  }

  return (
    <div className={`min-w-0 space-y-4 ${openChanges.length + lockedChanges.length > 0 ? "pb-28" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Meals</h1>
        <div className="flex rounded-2xl bg-soft p-1">
          {(["meals", "guests"] as const).map((item) => (
            <button key={item} type="button" className={`min-h-10 rounded-xl px-3 text-sm font-semibold ${tab === item ? "bg-card text-brand" : ""}`} onClick={() => setTab(item)}>
              {item === "meals" ? "My meals" : "Guests"}
            </button>
          ))}
        </div>
      </div>

      {tab === "guests" ? <GuestReport query={query} setQuery={setQuery} /> : (
        <div className="grid gap-4 xl:grid-cols-[18rem_1fr]">
          <section className="min-w-0 rounded-2xl border border-line bg-card p-2 shadow-[var(--shadow)] sm:p-3">
            <div className="grid grid-cols-7 gap-1 xl:hidden">
              {week.map((date) => (
                <DayButton key={date} date={date} selected={date === selected} dots={dot(date)} onSelect={setSelected} />
              ))}
            </div>
            <div className="hidden xl:grid xl:grid-cols-7 xl:gap-1">
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((label) => (
                <span key={label} className="text-center text-xs text-muted">{label}</span>
              ))}
              {Array.from({ length: (parseKey(bounds.from).getDay() + 6) % 7 }).map((_, index) => <span key={index} />)}
              {days.map((date) => (
                <DayButton key={date} date={date} selected={date === selected} dots={dot(date)} onSelect={setSelected} />
              ))}
            </div>
            <Button kind="ghost" className="mt-3 w-full" onClick={() => setRangeOpen(true)}>Off for a date range</Button>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">{prettyDate(selected)}</h2>
            {MEALS.map((meal) => {
              const lock = lockOf(store.state, selected, meal, store.today, now);
              const on = shownOn(selected, meal);
              const request = pendingRequest(store.state, member.id, selected, meal);
              const guests = store.state.guests.filter((guest) => guest.hostId === member.id && guest.date === selected && guest.meal === meal);
              const kind: ChipKind = request ? "pending" : lock === "unserved" ? "unserved" : on ? "on" : "off";
              return (
                <article key={meal} className="min-w-0 rounded-2xl border border-line bg-card p-3 shadow-[var(--shadow)] sm:p-4">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{MEAL_LABEL[meal]}</h3>
                        <StatusChip kind={kind} />
                        {lock === "locked" || lock === "past" ? <StatusChip kind="locked" label={lock === "past" ? "Closed" : "Locked"} /> : null}
                      </div>
                      <p className="text-sm text-muted">{MEAL_TIME[meal]} · {taka(rateFor(store.state, meal, selected).member)} · guest {taka(rateFor(store.state, meal, selected).guest)}</p>
                      <p className="text-sm text-muted">Cut-off {cutoffFor(store.state, meal)}</p>
                    </div>
                    <Toggle
                      on={on}
                      disabled={lock === "unserved" || lock === "past"}
                      label={`${MEAL_LABEL[meal]} on ${prettyDate(selected)}`}
                      onChange={(next) => setDraft((current) => ({ ...current, [`${selected}:${meal}`]: next }))}
                    />
                  </div>
                  {lock === "unserved" ? <p className="mt-2 text-sm text-muted">This meal is not served, so the switch stays off.</p> : null}
                  <ul className="mt-3 space-y-2">
                    {guests.map((guest) => (
                      <li key={guest.id} className="flex items-center gap-2 rounded-2xl bg-bg px-3 py-2 text-sm">
                        <span className="min-w-0 flex-1">
                          <span className="font-semibold">{guest.guestName}</span> × {guest.quantity}
                          {guest.note ? <span className="block text-muted">{guest.note}</span> : null}
                        </span>
                        {lock === "open" || lock === "unserved" || (member.role === "MANAGER" && lock === "locked") ? <button type="button" aria-label={`Remove ${guest.guestName}`} className="grid h-11 w-11 place-items-center" onClick={() => store.removeGuest(guest.id)}><X size={16} /></button> : null}
                      </li>
                    ))}
                  </ul>
                  {lock === "open" || (member.role === "MANAGER" && lock === "locked") ? (
                    <button type="button" className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand" onClick={() => setGuestFor(meal)}>
                      <Plus size={16} aria-hidden /> Add guest
                    </button>
                  ) : null}
                </article>
              );
            })}
          </section>
        </div>
      )}

      <ActionBar
        count={openChanges.length + lockedChanges.length}
        label={lockedChanges.length && !managerOverride ? "Request change" : "Save"}
        onDiscard={() => setDraft({})}
        onPrimary={() => {
          if (lockedChanges.length && !managerOverride) setRequestOpen(true);
          else {
            store.saveMeals([...openChanges, ...lockedChanges]);
            setDraft({});
          }
        }}
      />

      {guestFor ? <GuestSheet meal={guestFor} date={selected} onClose={() => setGuestFor(null)} /> : null}
      {rangeOpen ? (
        <RangeSheet
          onClose={() => setRangeOpen(false)}
          onApply={(from, to, meals) => {
            setDraft((current) => {
              const next = { ...current };
              for (const date of eachDate(from, to)) {
                for (const meal of meals) {
                  const lock = lockOf(store.state, date, meal, store.today, now);
                  if (lock === "open" || lock === "locked") next[`${date}:${meal}`] = false;
                }
              }
              return next;
            });
            setRangeOpen(false);
          }}
        />
      ) : null}
      {requestOpen ? (
        <Sheet title="Request change" onClose={() => setRequestOpen(false)}>
          <ul className="space-y-2 text-sm">
            {lockedChanges.map((change) => (
              <li key={`${change.date}${change.meal}`}>{MEAL_LABEL[change.meal]} on {prettyDate(change.date)}: {change.prevOn ? "ON" : "OFF"} → {change.on ? "ON" : "OFF"}</li>
            ))}
          </ul>
          <div className="mt-3">
            <TextArea label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} />
          </div>
          <Button className="mt-3 w-full" onClick={() => {
            if (!reason.trim()) {
              store.showToast("error", "Say why you need this change.");
              return;
            }
            if (openChanges.length) store.saveMeals(openChanges);
            if (!store.sendRequests(lockedChanges, reason.trim())) return;
            setDraft({});
            setReason("");
            setRequestOpen(false);
          }}>Send request</Button>
        </Sheet>
      ) : null}
    </div>
  );
}

function DayButton({ date, selected, dots, onSelect }: { date: string; selected: boolean; dots: string[]; onSelect: (date: string) => void }) {
  const day = parseKey(date);
  const names = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  return (
    <button type="button" onClick={() => onSelect(date)} aria-pressed={selected} aria-label={prettyDate(date)} className={`flex min-h-14 w-full min-w-0 flex-col items-center justify-center rounded-xl px-0.5 text-sm ${selected ? "bg-[#0F766E] text-white" : "bg-bg"}`}>
      <span className={`text-[10px] ${selected ? "text-white/80" : "text-muted"}`}>{names[day.getDay()]}</span>
      <span className="font-semibold">{day.getDate()}</span>
      <span className="mt-1 flex gap-0.5" aria-hidden>
        {dots.map((color, index) => <span key={index} className={`h-1.5 w-1.5 rounded-full ${selected ? "bg-white" : color}`} />)}
      </span>
    </button>
  );
}

function GuestSheet({ meal, date, onClose }: { meal: Meal; date: string; onClose: () => void }) {
  const store = useProto();
  const me = store.me!;
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const past = useMemo(() => {
    const names = new Set<string>();
    for (const guest of store.state.guests) if (guest.hostId === me.id) names.add(guest.guestName);
    return [...names];
  }, [me.id, store.state.guests]);
  const people = activeMembers(store.state).filter((member) => member.id !== me.id && member.username.includes(name.trim().toLowerCase()) && name.trim());
  function save() {
    const guestName = name.trim().replace(/\s+/g, " ");
    if (store.addGuest({ hostId: me.id, date, meal, guestName, quantity, note: note.trim() })) onClose();
  }

  return (
    <Sheet title={`Add guest · ${MEAL_LABEL[meal]}`} onClose={onClose}>
      <form onSubmit={(event) => { event.preventDefault(); save(); }}>
      <label className="block text-sm font-semibold">
        Name or username
        <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-bg px-4" />
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {past.map((item) => (
          <button key={item} type="button" className="min-h-10 rounded-full bg-soft px-3 text-sm font-semibold text-brand" onClick={() => setName(item)}>{item}</button>
        ))}
      </div>
      {people.length > 0 ? (
        <ul className="mt-2">
          {people.map((member) => (
            <li key={member.id}><button type="button" className="min-h-11 text-sm font-semibold" onClick={() => setName(member.name)}>{member.name} · @{member.username}</button></li>
          ))}
        </ul>
      ) : null}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-semibold">Quantity</span>
        <Stepper value={quantity} label="guests" onChange={setQuantity} />
      </div>
      <div className="mt-3">
        <TextArea label="Note (optional)" value={note} onChange={(event) => setNote(event.target.value)} />
      </div>
      <Button type="submit" className="mt-3 w-full">Add guest</Button>
      </form>
    </Sheet>
  );
}

function RangeSheet({ onClose, onApply }: { onClose: () => void; onApply: (from: string, to: string, meals: Meal[]) => void }) {
  const store = useProto();
  const [from, setFrom] = useState(store.today);
  const [to, setTo] = useState(addDays(store.today, 2));
  const [meals, setMeals] = useState<Meal[]>([...MEALS]);
  return (
    <Sheet title="Off for a date range" onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-line px-3" /></label>
        <label className="text-sm font-semibold">To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-line px-3" /></label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {MEALS.map((meal) => {
          const on = meals.includes(meal);
          return <button key={meal} type="button" className={`min-h-11 rounded-2xl px-3 text-sm font-semibold ${on ? "bg-brand text-brand-ink" : "border border-line"}`} onClick={() => setMeals((current) => on ? current.filter((item) => item !== meal) : [...current, meal])}>{MEAL_LABEL[meal]}</button>;
        })}
      </div>
      <Button className="mt-4 w-full" onClick={() => onApply(from <= to ? from : to, from <= to ? to : from, meals)}>Turn these off</Button>
    </Sheet>
  );
}

function GuestReport({ query, setQuery }: { query: string; setQuery: (value: string) => void }) {
  const store = useProto();
  const rows = store.state.guests
    .filter((guest) => guest.date.startsWith(store.state.month))
    .map((guest) => ({ ...guest, host: store.state.members.find((member) => member.id === guest.hostId) }))
    .filter((guest) => `${guest.guestName} ${guest.host?.name ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <section className="space-y-3">
      <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-line bg-card px-3">
        <Search size={18} aria-hidden />
        <span className="sr-only">Search guests</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search guest or member" className="min-h-12 w-full bg-transparent outline-none" />
      </label>
      {rows.length === 0 ? <Empty title="No guests this month" body="When someone adds a guest, they show up here with the cost." /> : (
        <div className="grid gap-2 xl:grid-cols-2">
          {rows.map((guest) => guest.host ? (
            <article key={guest.id} className="rounded-2xl border border-line bg-card p-3">
              <MemberLink member={guest.host} />
              <p className="mt-1 text-sm">{guest.guestName} · {MEAL_LABEL[guest.meal]} · {prettyDate(guest.date)} · × {guest.quantity}</p>
              <p className="text-sm font-semibold">{isServed(store.state, guest.date, guest.meal) && guest.date <= store.today ? taka(guest.quantity * rateFor(store.state, guest.meal, guest.date).guest) : guest.date > store.today ? "Billed on the day" : "Not billed"}</p>
            </article>
          ) : null)}
        </div>
      )}
    </section>
  );
}
