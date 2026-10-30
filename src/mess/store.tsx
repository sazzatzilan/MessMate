"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  type AppState,
  type GuestMeal,
  type Intent,
  type Meal,
  type Member,
  MEALS,
  addDays,
  createSeed,
  dateKey,
  eachDate,
  isClosed,
  isOn,
  isServed,
  lockOf,
  memberJoinedOn,
  monthKey,
  monthLabel,
  parseKey,
  uid,
  wholeTaka,
  billMember,
} from "@/mess/model";

/**
 * This preview keeps the mess on this device. Each action below refuses a
 * change that would rewrite a closed day or a closed month. A manager can
 * still correct today after the cut-off, and that correction is written into
 * the history. Money that was already accepted goes back to pending when it
 * is edited, so it leaves the balance until someone accepts it again.
 */
const KEY = "hmm-preview";

type Toast = { id: string; kind: "ok" | "error"; text: string };

type Store = {
  ready: boolean;
  state: AppState;
  toast: Toast | null;
  online: boolean;
  me: Member | null;
  today: string;
  login: (username: string, password: string) => string | null;
  logout: () => void;
  setTheme: (theme: "light" | "dark") => void;
  setMonth: (month: string) => void;
  setIntent: (intent: Intent) => void;
  showToast: (kind: Toast["kind"], text: string) => void;
  saveMeals: (changes: MealChange[]) => void;
  sendRequests: (changes: MealChange[], reason: string) => boolean;
  setMemberMeal: (userId: string, date: string, meal: Meal, on: boolean) => void;
  addGuest: (guest: Omit<GuestMeal, "id">) => boolean;
  removeGuest: (id: string) => void;
  addMoney: (input: { amount: number; date: string; note: string; fileName?: string; filePreview?: string }) => boolean;
  editMoney: (id: string, amount: number, note: string) => boolean;
  respondRecalc: (id: string, accept: boolean, comment: string) => void;
  decideRequest: (id: string, accept: boolean, note: string) => void;
  decideRequests: (ids: string[], accept: boolean, note: string) => void;
  decideMoney: (id: string, action: "ACCEPT" | "REJECT" | "RECALC", amount?: number, note?: string) => void;
  setServed: (date: string, meal: Meal, served: boolean) => void;
  toggleWeekday: (weekday: number, meal: Meal) => void;
  setCutoff: (clock: string, meal?: Meal | null) => void;
  setPrice: (meal: Meal, member: number, guest: number) => void;
  saveMember: (input: MemberInput, id?: string) => Member | null;
  resetPassword: (id: string) => string;
  setActive: (id: string, active: boolean) => void;
  deleteMember: (id: string) => void;
  markRead: () => void;
  markBackup: (month: string) => void;
  runCleanup: (month: string, password: string, confirm: string) => string | null;
  restore: () => void;
};

export type MealChange = { date: string; meal: Meal; on: boolean; prevOn: boolean };

export type MemberInput = {
  name: string;
  username: string;
  password: string;
  room: string;
  phone: string;
  role: Member["role"];
  photo?: string;
};

const Ctx = createContext<Store | null>(null);

function patch(state: AppState, partial: Partial<AppState>): AppState {
  return { ...state, ...partial };
}

export function ProtoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [online, setOnline] = useState(true);
  const today = dateKey(new Date());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AppState;
        if (parsed.members?.length) {
          setState({
            ...createSeed(),
            ...parsed,
            intent: null,
            rateHistory: parsed.rateHistory ?? [],
            snapshots: parsed.snapshots ?? [],
            servedForce: parsed.servedForce ?? [],
            backupFor: parsed.backupFor ?? null,
            cleanedMonths: parsed.cleanedMonths ?? [],
          });
          return;
        }
      }
    } catch {
      /* use a fresh sample */
    }
    setState(createSeed());
  }, []);

  useEffect(() => {
    if (!state) return;
    localStorage.setItem(KEY, JSON.stringify({ ...state, intent: null }));
    document.documentElement.classList.toggle("dark", state.theme === "dark");
  }, [state]);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const api = useMemo<Store | null>(() => {
    if (!state) return null;
    const showToast = (kind: Toast["kind"], text: string) => setToast({ id: uid("t"), kind, text });
    const me = state.members.find((member) => member.id === state.userId) ?? null;

    const pushHistory = (current: AppState, item: AppState["history"][number]) => [item, ...current.history].slice(0, 80);

    return {
      ready: true,
      state,
      toast,
      online,
      me,
      today,
      showToast,
      login: (username, password) => {
        const member = state.members.find((item) => item.username === username.trim().toLowerCase());
        if (!member || !member.active) return "No active account with that username. Ask your manager.";
        if (member.password !== password) return "That password is wrong.";
        setState(patch(state, { userId: member.id, month: monthKey(today) }));
        return null;
      },
      logout: () => setState(patch(state, { userId: null })),
      setTheme: (theme) => setState(patch(state, { theme })),
      setMonth: (month) => setState(patch(state, { month })),
      setIntent: (intent) => setState(patch(state, { intent })),
      // Open meals save directly. A locked meal today saves only for a manager, and the history calls it an override. Past days are dropped.
      saveMeals: (changes) => {
        const allowed = changes.filter((change) => {
          if (isClosed(state, monthKey(change.date))) return false;
          const lock = lockOf(state, change.date, change.meal, today);
          if (lock === "open") return true;
          return lock === "locked" && me?.role === "MANAGER";
        });
        if (allowed.length === 0) {
          showToast("error", "Those meals are closed.");
          return;
        }
        const touched = new Set(allowed.map((change) => `${change.date}:${change.meal}`));
        let offs = state.offs.filter((item) => !(item.userId === state.userId && touched.has(`${item.date}:${item.meal}`)));
        for (const change of allowed) {
          if (!change.on && state.userId) offs = [...offs, { userId: state.userId, date: change.date, meal: change.meal }];
        }
        const actor = me?.name ?? "Member";
        const override = allowed.some((change) => lockOf(state, change.date, change.meal, today) === "locked");
        setState({
          ...state,
          offs,
          history: pushHistory(state, {
            id: uid("h"),
            at: new Date().toISOString(),
            actorId: state.userId || "",
            category: "meal",
            text: override
              ? `${actor} changed ${allowed.length} locked meal ${allowed.length === 1 ? "as an override" : "changes as an override"}.`
              : `${actor} saved ${allowed.length} meal ${allowed.length === 1 ? "change" : "changes"}.`,
          }),
        });
        showToast("ok", override ? "Saved as a manager override" : "Meals saved");
      },
      // A request is only for a meal that locked today. The member has to say why. The same pending slot is replaced, not stacked.
      sendRequests: (changes, reason) => {
        if (!reason.trim()) {
          showToast("error", "Say why you need this change.");
          return false;
        }
        const usable = changes.filter((change) => !isClosed(state, monthKey(change.date)) && lockOf(state, change.date, change.meal, today) === "locked");
        if (usable.length === 0) {
          showToast("error", "Only a meal locked today can be requested. Past days stay closed.");
          return false;
        }
        const slots = new Set(usable.map((change) => `${state.userId}:${change.date}:${change.meal}`));
        const kept = state.requests.filter((item) => !(item.status === "PENDING" && slots.has(`${item.userId}:${item.date}:${item.meal}`)));
        const requests = usable.map((change) => ({
          id: uid("r"),
          userId: state.userId || "",
          date: change.date,
          meal: change.meal,
          fromOn: change.prevOn,
          toOn: change.on,
          reason,
          status: "PENDING" as const,
          at: new Date().toISOString(),
        }));
        const notices = requests.map((request) => ({
          id: uid("n"),
          for: "managers" as const,
          title: "Meal change",
          body: `${me?.name ?? "A member"} wants ${request.meal.toLowerCase()} ${request.toOn ? "on" : "off"} on ${request.date}.`,
          href: "/manage/requests",
          unread: true,
          at: request.at,
          requestId: request.id,
        }));
        setState({
          ...state,
          requests: [...requests, ...kept],
          notices: [...notices, ...state.notices],
          history: pushHistory(state, {
            id: uid("h"),
            at: new Date().toISOString(),
            actorId: state.userId || "",
            category: "request",
            text: `${me?.name ?? "Member"} sent ${requests.length} change ${requests.length === 1 ? "request" : "requests"}.`,
          }),
        });
        showToast("ok", "Request sent");
        return true;
      },
      // A guest can be added only while the meal is still open, or by the manager after today's cut-off. An unserved meal cannot take a plate.
      addGuest: (guest) => {
        const name = guest.guestName.trim().replace(/\s+/g, " ");
        if (!name) {
          showToast("error", "Enter the guest's name.");
          return false;
        }
        if (!Number.isInteger(guest.quantity) || guest.quantity < 1 || guest.quantity > 10) {
          showToast("error", "Guest count has to be from 1 to 10.");
          return false;
        }
        if (isClosed(state, monthKey(guest.date))) {
          showToast("error", "That month is closed.");
          return false;
        }
        if (!isServed(state, guest.date, guest.meal)) {
          showToast("error", "That meal is not served, so it cannot take a guest.");
          return false;
        }
        const guestLock = lockOf(state, guest.date, guest.meal, today);
        const managerLocked = me?.role === "MANAGER" && guestLock === "locked";
        if (guestLock !== "open" && !managerLocked) {
          showToast("error", "That meal is closed. Ask the manager if the kitchen can still add a plate.");
          return false;
        }
        const row = { ...guest, guestName: name, id: uid("g") };
        setState({
          ...state,
          guests: [row, ...state.guests],
          history: pushHistory(state, {
            id: uid("h"),
            at: new Date().toISOString(),
            actorId: state.userId || "",
            category: "meal",
            text: `${me?.name ?? "Member"} added guest ${guest.guestName}.`,
          }),
        });
        showToast("ok", `${name} added`);
        return true;
      },
      removeGuest: (id) => {
        const guest = state.guests.find((item) => item.id === id);
        if (!guest) return;
        if (isClosed(state, monthKey(guest.date))) {
          showToast("error", "That month is closed.");
          return;
        }
        const lock = lockOf(state, guest.date, guest.meal, today);
        if (lock === "past" || (lock === "locked" && me?.role !== "MANAGER")) {
          showToast("error", "That day is closed.");
          return;
        }
        setState({
          ...state,
          guests: state.guests.filter((item) => item.id !== id),
          history: pushHistory(state, {
            id: uid("h"),
            at: new Date().toISOString(),
            actorId: state.userId || "",
            category: "meal",
            text: `${me?.name ?? "Member"} removed guest ${guest?.guestName ?? "a guest"}.`,
          }),
        });
        showToast("ok", "Guest removed");
      },
      // Whole taka only, with a note or a receipt, never in the future or before the person joined. A manager's own deposit is accepted. A member's stays pending.
      addMoney: (input) => {
        if (!wholeTaka(input.amount)) {
          showToast("error", "Enter a whole amount greater than 0.");
          return false;
        }
        if (!input.note.trim() && !input.fileName) {
          showToast("error", "Add a note or a receipt photo.");
          return false;
        }
        if (input.date > today) {
          showToast("error", "A deposit cannot be dated in the future.");
          return false;
        }
        if (input.date < memberJoinedOn(me ?? undefined, today)) {
          showToast("error", "That date is before you joined.");
          return false;
        }
        if (isClosed(state, monthKey(input.date))) {
          showToast("error", "That month is closed.");
          return false;
        }
        const entry = {
          id: uid("d"),
          userId: state.userId || "",
          amount: input.amount,
          date: input.date,
          note: input.note,
          status: me?.role === "MANAGER" ? ("ACCEPTED" as const) : ("PENDING" as const),
          fileName: input.fileName,
          filePreview: input.filePreview,
        };
        const notice = me?.role === "MANAGER" ? [] : [{
          id: uid("n"),
          for: "managers" as const,
          title: "Deposit to review",
          body: `${me?.name ?? "A member"} sent ৳${input.amount}.`,
          href: "/manage/finance",
          unread: true,
          at: new Date().toISOString(),
          moneyId: entry.id,
        }];
        setState({
          ...state,
          money: [entry, ...state.money],
          notices: [...notice, ...state.notices],
          history: pushHistory(state, {
            id: uid("h"),
            at: new Date().toISOString(),
            actorId: state.userId || "",
            category: "money",
            text: me?.role === "MANAGER" ? `${me.name} recorded ৳${input.amount} and self-approved it.` : `${me?.name ?? "Member"} sent ৳${input.amount}.`,
          }),
        });
        showToast("ok", me?.role === "MANAGER" ? "Money added" : "Sent to the manager");
        return true;
      },
      // The owner can edit a pending or accepted deposit. Saving an accepted one returns it to pending so the old amount is no longer in the balance.
      editMoney: (id, amount, note) => {
        const current = state.money.find((item) => item.id === id);
        if (!current || current.userId !== state.userId) return false;
        if (current.status !== "PENDING" && current.status !== "ACCEPTED") {
          showToast("error", "This deposit can no longer be edited.");
          return false;
        }
        if (!wholeTaka(amount)) {
          showToast("error", "Enter a whole amount greater than 0.");
          return false;
        }
        if (!note.trim() && !current.fileName) {
          showToast("error", "Keep a note or the receipt.");
          return false;
        }
        if (isClosed(state, monthKey(current.date))) {
          showToast("error", "That month is closed.");
          return false;
        }
        if (current.amount === amount && current.note === note) {
          showToast("ok", "No changes to save");
          return true;
        }
        const backToPending = current.status === "ACCEPTED";
        setState({
          ...state,
          money: state.money.map((item) => (item.id === id ? { ...item, amount, note, edited: true, status: backToPending ? "PENDING" as const : item.status } : item)),
          notices: backToPending ? [{
            id: uid("n"),
            for: "managers" as const,
            title: "Deposit edited",
            body: `${me?.name ?? "A member"} changed an accepted deposit to ৳${amount}. It needs approval again.`,
            href: "/manage/finance",
            unread: true,
            at: new Date().toISOString(),
            moneyId: id,
          }, ...state.notices] : state.notices,
          history: pushHistory(state, {
            id: uid("h"),
            at: new Date().toISOString(),
            actorId: state.userId || "",
            category: "edit",
            text: `${me?.name ?? "Member"} edited a deposit.`,
            edited: { before: `৳${current?.amount ?? 0}`, after: `৳${amount}`, editorId: state.userId || "", at: new Date().toISOString() },
          }),
        });
        showToast("ok", backToPending ? "Sent back for approval" : "Deposit updated");
        return true;
      },
      respondRecalc: (id, accept, comment) => {
        const current = state.money.find((item) => item.id === id && item.userId === state.userId && item.status === "RECALC");
        if (!current) return;
        if (isClosed(state, monthKey(current.date))) {
          showToast("error", "That month is closed.");
          return;
        }
        if (!accept && !comment.trim()) {
          showToast("error", "Say why you are rejecting the corrected amount.");
          return;
        }
        setState({
          ...state,
          money: state.money.map((item) => {
            if (item.id !== id) return item;
            if (accept) return { ...item, status: "ACCEPTED" as const, amount: item.recalculatedAmount ?? item.amount };
            return { ...item, status: "DISPUTED" as const, managerNote: comment || item.managerNote };
          }),
          notices: [
            {
              id: uid("n"),
              for: "managers",
              title: accept ? "Amount accepted" : "Amount disputed",
              body: `${me?.name ?? "A member"} ${accept ? "accepted" : "rejected"} the corrected amount.${comment ? ` ${comment}` : ""}`,
              href: "/manage/finance",
              unread: true,
              at: new Date().toISOString(),
              moneyId: id,
            },
            ...state.notices,
          ],
          history: pushHistory(state, {
            id: uid("h"),
            at: new Date().toISOString(),
            actorId: state.userId || "",
            category: "money",
            text: `${me?.name ?? "Member"} ${accept ? "accepted" : "disputed"} a corrected amount.`,
          }),
        });
        showToast("ok", accept ? "Amount accepted" : "Sent back to the manager");
      },
      decideRequest: (id, accept, note) => apiDecide(state, [id], accept, note, me, setState, showToast),
      decideRequests: (ids, accept, note) => apiDecide(state, ids, accept, note, me, setState, showToast),
      // Accept, reject, or send back a different amount. A rejection needs a reason. A correction has to be a different whole amount, and it waits for the member.
      decideMoney: (id, action, amount, note) => {
        const entry = state.money.find((item) => item.id === id);
        if (!entry || entry.status === "ACCEPTED" || entry.status === "REJECTED") return;
        if (entry.status === "RECALC" && action !== "RECALC") {
          showToast("error", "Wait for the member to answer the corrected amount.");
          return;
        }
        if (isClosed(state, monthKey(entry.date))) {
          showToast("error", "That month is closed.");
          return;
        }
        let next = entry;
        let text = "";
        if (action === "ACCEPT") {
          next = { ...entry, status: "ACCEPTED" };
          text = `${me?.name ?? "Manager"} accepted ৳${entry.amount}.`;
        } else if (action === "REJECT") {
          if (!note?.trim()) {
            showToast("error", "Write why this deposit is rejected.");
            return;
          }
          next = { ...entry, status: "REJECTED", managerNote: note.trim() };
          text = `${me?.name ?? "Manager"} rejected ৳${entry.amount}.`;
        } else {
          if (!wholeTaka(amount || 0) || amount === entry.amount) {
            showToast("error", "Enter a different whole amount.");
            return;
          }
          if (!note?.trim()) {
            showToast("error", "Tell the member why the amount changed.");
            return;
          }
          next = { ...entry, status: "RECALC", recalculatedAmount: amount, managerNote: note.trim() };
          text = `${me?.name ?? "Manager"} corrected ৳${entry.amount} to ৳${amount}.`;
        }
        setState({
          ...state,
          money: state.money.map((item) => (item.id === id ? next : item)),
          notices: [
            {
              id: uid("n"),
              for: entry.userId,
              title: action === "RECALC" ? "Check this amount" : action === "ACCEPT" ? "Deposit accepted" : "Deposit rejected",
              body: text,
              href: "/finance",
              unread: true,
              at: new Date().toISOString(),
              moneyId: id,
            },
            ...state.notices,
          ],
          history: pushHistory(state, { id: uid("h"), at: new Date().toISOString(), actorId: state.userId || "", category: "money", text }),
        });
        showToast("ok", action === "RECALC" ? "Sent back to the member" : action === "ACCEPT" ? "Deposit accepted" : "Deposit rejected");
      },
      setServed: (date, meal, served) => {
        if (date < today) {
          showToast("error", "A past day stays as it was.");
          return;
        }
        if (isClosed(state, monthKey(date))) {
          showToast("error", "That month is closed.");
          return;
        }
        const servedForce = (state.servedForce ?? []).filter((item) => !(item.date === date && item.meal === meal));
        let unserved = state.unserved.filter((item) => !(item.date === date && item.meal === meal));
        if (served) servedForce.push({ date, meal });
        else unserved = [...unserved, { date, meal }];
        setState({
          ...state,
          unserved,
          servedForce,
          history: pushHistory(state, {
            id: uid("h"),
            at: new Date().toISOString(),
            actorId: state.userId || "",
            category: "meal",
            text: `${me?.name ?? "Manager"} marked ${meal.toLowerCase()} ${served ? "served" : "not served"} on ${date}.`,
          }),
        });
        showToast("ok", served ? "Meal will be served" : "Marked as not served");
      },
      toggleWeekday: (weekday, meal) => {
        const exists = state.weekdayOff.find((item) => item.weekday === weekday && item.meal === meal);
        if (exists) {
          const yesterday = addDays(today, -1);
          const from = exists.from && exists.from > "2026-08-01" ? exists.from : "2026-08-01";
          const extra = from <= yesterday
            ? eachDate(from, yesterday)
              .filter((date) => parseKey(date).getDay() === weekday)
              .filter((date) => !isClosed(state, monthKey(date)))
              .filter((date) => !state.unserved.some((item) => item.date === date && item.meal === meal))
              .filter((date) => !(state.servedForce ?? []).some((item) => item.date === date && item.meal === meal))
              .map((date) => ({ date, meal }))
            : [];
          setState({
            ...state,
            weekdayOff: state.weekdayOff.filter((item) => !(item.weekday === weekday && item.meal === meal)),
            unserved: [...state.unserved, ...extra],
            history: pushHistory(state, {
              id: uid("h"),
              at: new Date().toISOString(),
              actorId: state.userId || "",
              category: "meal",
              text: `${me?.name ?? "Manager"} stopped the repeat for ${meal.toLowerCase()}. Days already counted stay as they were.`,
            }),
          });
          showToast("ok", "Repeat stopped. Days already counted stay off.");
          return;
        }
        const lock = lockOf(state, today, meal, today);
        const from = lock === "locked" || lock === "past" ? addDays(today, 1) : today;
        setState({
          ...state,
          weekdayOff: [...state.weekdayOff, { weekday, meal, from }],
          history: pushHistory(state, {
            id: uid("h"),
            at: new Date().toISOString(),
            actorId: state.userId || "",
            category: "meal",
            text: `${me?.name ?? "Manager"} set a repeat off for ${meal.toLowerCase()} from ${from}.`,
          }),
        });
        showToast("ok", from === today ? "Repeat starts today" : "Repeat starts tomorrow. Today stays as it was.");
      },
      setMemberMeal: (userId, date, meal, on) => {
        if (me?.role !== "MANAGER") return;
        if (date < today || isClosed(state, monthKey(date))) {
          showToast("error", "That day is closed.");
          return;
        }
        if (!isServed(state, date, meal)) {
          showToast("error", "That meal is not served.");
          return;
        }
        const person = state.members.find((member) => member.id === userId);
        if (!person || person.deleted) return;
        let offs = state.offs.filter((item) => !(item.userId === userId && item.date === date && item.meal === meal));
        if (!on) offs = [...offs, { userId, date, meal }];
        setState({
          ...state,
          offs,
          history: pushHistory(state, {
            id: uid("h"),
            at: new Date().toISOString(),
            actorId: state.userId || "",
            category: "meal",
            text: `${me.name} marked ${person.name} ${meal.toLowerCase()} ${on ? "on" : "off"} on ${date}.`,
          }),
        });
        showToast("ok", on ? `${person.name} is on` : `${person.name} is off`);
      },
      setCutoff: (clock, meal) => {
        const clockOk = /^([01]\d|2[0-3]):[0-5]\d$/.test(clock);
        if (meal) {
          if (!clock) {
            const next = { ...state.cutoffOverride };
            delete next[meal];
            setState({ ...state, cutoffOverride: next });
            showToast("ok", "Using the default cut-off");
            return;
          }
          if (!clockOk) {
            showToast("error", "Enter a real time.");
            return;
          }
          setState({ ...state, cutoffOverride: { ...state.cutoffOverride, [meal]: clock } });
        } else if (clockOk) setState(patch(state, { cutoff: clock }));
        else {
          showToast("error", "Enter a real time.");
          return;
        }
        showToast("ok", "Cut-off updated");
      },
      // The new rate starts today. Yesterday keeps the row that was already in the rate history.
      setPrice: (meal, memberPrice, guestPrice) => {
        if (!wholeTaka(memberPrice) || !wholeTaka(guestPrice)) {
          showToast("error", "Rates have to be whole amounts greater than 0.");
          return;
        }
        const history = state.rateHistory.length
          ? state.rateHistory.filter((row) => !(row.meal === meal && row.from === today))
          : MEALS.map((item) => ({ meal: item, member: state.prices[item].member, guest: state.prices[item].guest, from: "2020-01-01" }));
        setState({
          ...state,
          prices: { ...state.prices, [meal]: { member: memberPrice, guest: guestPrice } },
          rateHistory: [...history, { meal, member: memberPrice, guest: guestPrice, from: today }],
        });
        showToast("ok", "Rates saved from today");
      },
      saveMember: (input, id) => {
        const username = input.username.trim().toLowerCase();
        if (!input.name.trim()) {
          showToast("error", "Enter a name.");
          return null;
        }
        if (!id && !/^[a-z0-9]{3,20}$/.test(username)) {
          showToast("error", "Username needs 3 to 20 letters or numbers.");
          return null;
        }
        if (state.members.some((member) => member.username === username && member.id !== id)) {
          showToast("error", "That username is already used.");
          return null;
        }
        const passwordOk = (value: string) => value.length >= 8 && value.length <= 72 && /[A-Za-z]/.test(value) && /\d/.test(value);
        if (id) {
          const current = state.members.find((member) => member.id === id);
          if (!current) return null;
          if (current.role === "MANAGER" && current.active && input.role !== "MANAGER") {
            const others = state.members.filter((member) => member.role === "MANAGER" && member.active && member.id !== id);
            if (others.length === 0) {
              showToast("error", "Keep at least one manager.");
              return null;
            }
          }
          const nextPassword = input.password.trim() ? input.password : current.password;
          if (input.password.trim() && !passwordOk(nextPassword)) {
            showToast("error", "Use 8 or more characters with a letter and a number.");
            return null;
          }
          const saved = { ...current, ...input, username: current.username, password: nextPassword, joinedOn: current.joinedOn };
          setState({
            ...state,
            members: state.members.map((member) => (member.id === id ? saved : member)),
          });
          showToast("ok", "Profile saved");
          return saved;
        }
        if (!passwordOk(input.password)) {
          showToast("error", "Use 8 or more characters with a letter and a number.");
          return null;
        }
        const created: Member = {
          id: uid("m"),
          ...input,
          username,
          active: true,
          joinedOn: today,
          color: ["#0F766E", "#0E7490", "#7C3AED", "#B45309", "#BE123C"][state.members.length % 5],
        };
        setState({
          ...state,
          members: [...state.members, created],
          history: pushHistory(state, {
            id: uid("h"),
            at: new Date().toISOString(),
            actorId: state.userId || "",
            category: "edit",
            text: `${me?.name ?? "Manager"} added ${created.name}.`,
          }),
        });
        showToast("ok", `${created.name} added`);
        return created;
      },
      resetPassword: (id) => {
        const password = `Reset${Math.floor(1000 + Math.random() * 9000)}!`;
        setState({ ...state, members: state.members.map((member) => (member.id === id ? { ...member, password } : member)) });
        showToast("ok", "New password ready to copy");
        return password;
      },
      setActive: (id, active) => {
        if (id === state.userId && !active) {
          showToast("error", "You cannot deactivate yourself.");
          return;
        }
        const managers = state.members.filter((member) => member.role === "MANAGER" && member.active && member.id !== id);
        const target = state.members.find((member) => member.id === id);
        if (target?.role === "MANAGER" && target.active && !active && managers.length === 0) {
          showToast("error", "Keep at least one manager.");
          return;
        }
        if (target?.deleted) {
          showToast("error", "A deleted login stays closed. Their meals and money remain in the books.");
          return;
        }
        setState({
          ...state,
          members: state.members.map((member) => {
            if (member.id !== id) return member;
            if (!active) return { ...member, active: false, away: openAway(member, today) };
            return { ...member, active: true, away: closeAway(member, today) };
          }),
        });
        showToast("ok", active ? "Member is active again" : "Member deactivated");
      },
      // The login closes and meals stop from today. Deposits and meals already counted stay, so the books still add up.
      deleteMember: (id) => {
        if (id === state.userId) {
          showToast("error", "You cannot delete yourself.");
          return;
        }
        const target = state.members.find((member) => member.id === id);
        if (!target) return;
        const otherManagers = state.members.filter((member) => member.role === "MANAGER" && member.active && member.id !== id);
        if (target.role === "MANAGER" && target.active && otherManagers.length === 0) {
          showToast("error", "Keep at least one manager.");
          return;
        }
        setState({
          ...state,
          members: state.members.map((member) => (member.id === id ? { ...member, active: false, deleted: true, away: openAway(member, today) } : member)),
          requests: state.requests.map((item) => (item.userId === id && item.status === "PENDING" ? { ...item, status: "REJECTED", decisionNote: "Member deleted." } : item)),
          history: pushHistory(state, {
            id: uid("h"),
            at: new Date().toISOString(),
            actorId: state.userId || "",
            category: "edit",
            text: `${me?.name ?? "Manager"} deleted ${target.name}. Meals and money stay in the books.`,
          }),
        });
        showToast("ok", `${target.name} deleted`);
      },
      markRead: () => {
        setState({
          ...state,
          notices: state.notices.map((notice) => {
            const mine = notice.for === state.userId || (notice.for === "managers" && me?.role === "MANAGER");
            return mine ? { ...notice, unread: false } : notice;
          }),
        });
      },
      markBackup: (month) => setState(patch(state, { backupReady: true, backupFor: month })),
      // Close one past month, oldest first, and only after the backup for that exact month. The snapshot is saved before the daily rows are removed.
      runCleanup: (month, password, confirm) => {
        if (password !== "cleanup123") return "Cleanup password is wrong.";
        if (confirm.trim().toUpperCase() !== expectedPhrase(month)) return `Type ${expectedPhrase(month)} to confirm.`;
        if (!/^\d{4}-\d{2}$/.test(month) || month < "2026-08") return "That month is before the books start.";
        if (month >= monthKey(today)) return "Only a past month can be closed.";
        if (state.cleanedMonths.includes(month)) return "That month is already closed.";
        if (state.backupFor !== month) return "Download the backup for this month first.";
        const earlier = earlierOpenMonth(state, month, today);
        if (earlier) return `Close ${monthLabel(earlier)} first.`;
        const snapshots = state.members.map((member) => ({ userId: member.id, month, ...billMember(state, member.id, month, today) }));
        setState({
          ...state,
          cleanedMonths: [...state.cleanedMonths, month],
          snapshots: [...state.snapshots.filter((item) => item.month !== month), ...snapshots],
          offs: state.offs.filter((item) => monthKey(item.date) !== month),
          guests: state.guests.filter((item) => monthKey(item.date) !== month),
          requests: state.requests.filter((item) => monthKey(item.date) !== month),
          money: state.money.filter((item) => monthKey(item.date) !== month),
          unserved: state.unserved.filter((item) => monthKey(item.date) !== month),
          backupReady: false,
          backupFor: null,
          history: pushHistory(state, {
            id: uid("h"),
            at: new Date().toISOString(),
            actorId: state.userId || "",
            category: "edit",
            text: `${me?.name ?? "Manager"} closed ${month}.`,
          }),
        });
        return null;
      },
      restore: () => {
        const fresh = createSeed();
        fresh.userId = state.userId;
        fresh.theme = state.theme;
        setState(fresh);
        showToast("ok", "Sample data restored");
      },
    };
  }, [online, state, today, toast]);

  if (!api) {
    return (
      <div className="mx-auto min-h-dvh max-w-lg px-4 py-8">
        <p className="text-lg font-semibold">MessMate</p>
        <div className="mt-6 space-y-3">
          <div className="h-28 animate-pulse rounded-2xl bg-white dark:bg-white/10" />
          <div className="h-28 animate-pulse rounded-2xl bg-white dark:bg-white/10" />
          <div className="h-44 animate-pulse rounded-2xl bg-white dark:bg-white/10" />
        </div>
      </div>
    );
  }

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

function expectedPhrase(month: string) {
  const names = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const index = Number(month.slice(5, 7)) - 1;
  return `DELETE ${names[index] || "MON"} ${month.slice(0, 4)}`;
}

function earlierOpenMonth(state: AppState, month: string, today: string) {
  let cursor = "2026-08";
  while (cursor < month && cursor < monthKey(today)) {
    if (!state.cleanedMonths.includes(cursor)) return cursor;
    cursor = monthKey(addDays(`${cursor}-01`, 32));
  }
  return null;
}

/** Accept applies only while the meal is still locked today and the member is still here. Reject can close a request that can no longer be applied. */
function apiDecide(
  state: AppState,
  ids: string[],
  accept: boolean,
  note: string,
  me: Member | null,
  setState: (value: AppState) => void,
  showToast: (kind: "ok" | "error", text: string) => void,
) {
  const today = dateKey(new Date());
  const chosen = state.requests.filter((item) => ids.includes(item.id) && item.status === "PENDING" && !isClosed(state, monthKey(item.date)));
  const applicable = chosen.filter((item) => {
    const member = state.members.find((person) => person.id === item.userId);
    return Boolean(member && !member.deleted) && lockOf(state, item.date, item.meal, today) === "locked";
  });
  const decided = accept ? applicable : chosen;
  if (chosen.length === 0) return;
  if (decided.length === 0) {
    showToast("error", "Those meals are no longer open.");
    return;
  }
  let offs = [...state.offs];
  if (accept) {
    for (const request of decided) {
      offs = offs.filter((item) => !(item.userId === request.userId && item.date === request.date && item.meal === request.meal));
      if (!request.toOn) offs.push({ userId: request.userId, date: request.date, meal: request.meal });
    }
  }
  const decidedIds = new Set(decided.map((item) => item.id));
  const notices = decided.map((request) => ({
    id: uid("n"),
    for: request.userId,
    title: accept ? "Request accepted" : "Request rejected",
    body: `${me?.name ?? "Manager"} ${accept ? "accepted" : "rejected"} your ${request.meal.toLowerCase()} change.${note ? ` ${note}` : ""}`,
    href: "/meals",
    unread: true,
    at: new Date().toISOString(),
    requestId: request.id,
  }));
  setState({
    ...state,
    offs,
    requests: state.requests.map((item) => (decidedIds.has(item.id) ? { ...item, status: accept ? "ACCEPTED" : "REJECTED", decisionNote: note } : item)),
    notices: [...notices, ...state.notices],
    history: [
      {
        id: uid("h"),
        at: new Date().toISOString(),
        actorId: me?.id || "",
        category: "request" as const,
        text: `${me?.name ?? "Manager"} ${accept ? "accepted" : "rejected"} ${decided.length} request${decided.length === 1 ? "" : "s"}.`,
      },
      ...state.history,
    ],
  });
  const held = accept ? chosen.length - decided.length : 0;
  showToast("ok", held > 0 ? `Accepted ${decided.length}. ${held} stayed waiting because those meals are not locked.` : accept ? "Request accepted" : "Request rejected");
}

function openAway(member: Member, today: string) {
  const away = member.away ?? [];
  if (away.some((span) => span.from <= today && today < span.to)) return away;
  return [...away, { from: today, to: "9999-12-31" }];
}

function closeAway(member: Member, today: string) {
  return (member.away ?? [])
    .map((span) => (span.to === "9999-12-31" ? { ...span, to: today } : span))
    .filter((span) => span.from < span.to);
}

export function useProto() {
  const store = useContext(Ctx);
  if (!store) throw new Error("Preview store missing");
  return store;
}

export function servedToday(state: AppState, date: string, meal: Meal) {
  return isServed(state, date, meal);
}

export function memberIsOn(state: AppState, userId: string, date: string, meal: Meal) {
  return isOn(state, userId, date, meal);
}
