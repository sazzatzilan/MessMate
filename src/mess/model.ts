/**
 * The mess books. Every total on screen comes from these functions.
 * The same meals, guests, and deposits always produce the same bill.
 *
 * A meal is counted only when three things are true: the kitchen served it,
 * the member had it turned on, and the day is on or after they joined and
 * before they left. A guest plate uses the same served-day rule and is billed
 * to the host. Only an accepted deposit counts, and only from the join date.
 * A new rate starts today; earlier days keep the rate they already had.
 * Closing a month freezes a snapshot, and that snapshot is what the books
 * show afterwards. This month's opening is only the previous snapshot.
 * An unclosed month is not replayed, so old rows cannot rewrite the balance.
 */
export type Role = "MEMBER" | "MANAGER";
export type Meal = "BREAKFAST" | "LUNCH" | "DINNER";
export type MoneyStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "RECALC" | "DISPUTED";

export type Member = {
  id: string;
  name: string;
  username: string;
  password: string;
  room: string;
  phone: string;
  role: Role;
  active: boolean;
  color: string;
  photo?: string;
  joinedOn?: string;
  away?: { from: string; to: string }[];
  deleted?: boolean;
};

export type GuestMeal = {
  id: string;
  hostId: string;
  date: string;
  meal: Meal;
  guestName: string;
  quantity: number;
  note: string;
};

export type MoneyEntry = {
  id: string;
  userId: string;
  amount: number;
  date: string;
  note: string;
  status: MoneyStatus;
  recalculatedAmount?: number;
  managerNote?: string;
  edited?: boolean;
  fileName?: string;
  filePreview?: string;
};

export type MealRequest = {
  id: string;
  userId: string;
  date: string;
  meal: Meal;
  fromOn: boolean;
  toOn: boolean;
  reason: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  at: string;
  decisionNote?: string;
};

export type HistoryItem = {
  id: string;
  at: string;
  actorId: string;
  category: "meal" | "money" | "request" | "edit";
  text: string;
  edited?: { before: string; after: string; editorId: string; at: string };
};

export type Notice = {
  id: string;
  for: "managers" | string;
  title: string;
  body: string;
  href: string;
  unread: boolean;
  at: string;
  requestId?: string;
  moneyId?: string;
};

export type Intent = null | "add-money" | "add-guest" | "off-today";

export type RateRow = { meal: Meal; member: number; guest: number; from: string };

export type MonthSnapshot = {
  userId: string;
  month: string;
  ownCount: number;
  guestCount: number;
  ownCost: number;
  guestCost: number;
  deposited: number;
  opening: number;
  cost: number;
  balance: number;
  meals: Record<Meal, number>;
};

export type AppState = {
  theme: "light" | "dark";
  userId: string | null;
  month: string;
  members: Member[];
  offs: { userId: string; date: string; meal: Meal }[];
  guests: GuestMeal[];
  unserved: { date: string; meal: Meal }[];
  servedForce: { date: string; meal: Meal }[];
  weekdayOff: { weekday: number; meal: Meal; from?: string }[];
  cutoff: string;
  cutoffOverride: Partial<Record<Meal, string>>;
  prices: Record<Meal, { member: number; guest: number }>;
  rateHistory: RateRow[];
  money: MoneyEntry[];
  requests: MealRequest[];
  history: HistoryItem[];
  notices: Notice[];
  cleanedMonths: string[];
  snapshots: MonthSnapshot[];
  backupReady: boolean;
  backupFor: string | null;
  intent: Intent;
};

export const MEALS: Meal[] = ["BREAKFAST", "LUNCH", "DINNER"];

export const MEAL_LABEL: Record<Meal, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
};

export const MEAL_TIME: Record<Meal, string> = {
  BREAKFAST: "8:00 am",
  LUNCH: "1:30 pm",
  DINNER: "8:30 pm",
};

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

export function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function addDays(key: string, days: number) {
  const date = parseKey(key);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

export function monthKey(key: string) {
  return key.slice(0, 7);
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(y, (m || 1) - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string) {
  return parseKey(`${month}-01`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export function shortMonth(month: string) {
  return parseKey(`${month}-01`).toLocaleDateString("en-GB", { month: "short", year: "numeric" }).toUpperCase();
}

export function prettyDate(key: string) {
  return parseKey(key).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function prettyStamp(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function taka(value: number) {
  const sign = value < 0 ? "−" : "";
  return `${sign}৳${Math.abs(Math.round(value)).toLocaleString("en-US")}`;
}

export function minutesOf(clock: string) {
  const [h, m] = clock.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function clockLabel(clock: string) {
  const [h, m] = clock.split(":").map(Number);
  const suffix = (h || 0) >= 12 ? "pm" : "am";
  const hour = (h || 0) % 12 || 12;
  return `${hour}:${String(m || 0).padStart(2, "0")} ${suffix}`;
}

export function eachDate(from: string, to: string) {
  const dates: string[] = [];
  let cursor = from;
  while (cursor <= to && dates.length < 400) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

export function monthBounds(month: string) {
  const start = `${month}-01`;
  const date = parseKey(start);
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  return { from: start, to: dateKey(date) };
}

/** A one-day "serve anyway" beats a repeat. A one-day "not served" beats the default. A repeat applies only from the day it was set, so past days stay as they were. */
export function isServed(state: AppState, date: string, meal: Meal) {
  if ((state.servedForce ?? []).some((item) => item.date === date && item.meal === meal)) return true;
  if (state.unserved.some((item) => item.date === date && item.meal === meal)) return false;
  const weekday = parseKey(date).getDay();
  const rule = state.weekdayOff.find((item) => item.weekday === weekday && item.meal === meal);
  if (!rule) return true;
  return date < (rule.from || "2020-01-01");
}

export function memberAway(member: Member | undefined, date: string) {
  return (member?.away ?? []).some((span) => span.from <= date && date < span.to);
}

export function cutoffFor(state: AppState, meal: Meal) {
  return state.cutoffOverride[meal] || state.cutoff;
}

/** Past days stay closed for everyone, including the manager. Today locks at that meal's cut-off. Tomorrow stays open. */
export function lockOf(state: AppState, date: string, meal: Meal, today: string, now = new Date()) {
  if (!isServed(state, date, meal)) return "unserved" as const;
  if (date < today) return "past" as const;
  if (date > today) return "open" as const;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= minutesOf(cutoffFor(state, meal)) ? ("locked" as const) : ("open" as const);
}

export function isOn(state: AppState, userId: string, date: string, meal: Meal) {
  return !state.offs.some((item) => item.userId === userId && item.date === date && item.meal === meal);
}

export function pendingRequest(state: AppState, userId: string, date: string, meal: Meal) {
  return state.requests.find((item) => item.userId === userId && item.date === date && item.meal === meal && item.status === "PENDING");
}

export function memberById(state: AppState, id: string) {
  return state.members.find((member) => member.id === id);
}

export function activeMembers(state: AppState) {
  return state.members.filter((member) => member.active);
}

export type Bill = {
  ownCount: number;
  guestCount: number;
  ownCost: number;
  guestCost: number;
  deposited: number;
  opening: number;
  cost: number;
  balance: number;
  meals: Record<Meal, number>;
};

export function wholeTaka(value: number) {
  return Number.isInteger(value) && value > 0 && value <= 1_000_000;
}

export function rateFor(state: AppState, meal: Meal, date: string) {
  const rows = (state.rateHistory ?? [])
    .filter((row) => row.meal === meal && row.from <= date)
    .sort((a, b) => (a.from < b.from ? 1 : -1));
  const row = rows[0];
  return row ? { member: row.member, guest: row.guest } : state.prices[meal];
}

export function memberJoinedOn(member: Member | undefined, today: string) {
  return member?.joinedOn || `${monthKey(today)}-01`;
}

export function isClosed(state: AppState, month: string) {
  return (state.cleanedMonths ?? []).includes(month);
}

/** Returns the saved snapshot for a closed month. Otherwise it counts only days that are still allowed to change the bill. */
export function billMember(state: AppState, userId: string, month: string, today: string): Bill {
  const snap = (state.snapshots ?? []).find((item) => item.userId === userId && item.month === month);
  if (snap) {
    return {
      ownCount: snap.ownCount,
      guestCount: snap.guestCount,
      ownCost: snap.ownCost,
      guestCost: snap.guestCost,
      deposited: snap.deposited,
      opening: snap.opening,
      cost: snap.cost,
      balance: snap.balance,
      meals: snap.meals,
    };
  }
  const member = memberById(state, userId);
  const start = memberJoinedOn(member, today);
  const { from, to } = monthBounds(month);
  const end = today < to ? today : to;
  const previous = (state.snapshots ?? []).find((item) => item.userId === userId && item.month === shiftMonth(month, -1));
  const opening = previous?.balance ?? 0;
  const meals: Record<Meal, number> = { BREAKFAST: 0, LUNCH: 0, DINNER: 0 };
  let ownCost = 0;
  if (from <= end) {
    for (const date of eachDate(from, end)) {
      if (date < start || memberAway(member, date)) continue;
      for (const meal of MEALS) {
        if (!isServed(state, date, meal) || !isOn(state, userId, date, meal)) continue;
        meals[meal] += 1;
        ownCost += rateFor(state, meal, date).member;
      }
    }
  }
  const guestMeals = state.guests.filter((guest) => (
    guest.hostId === userId
    && guest.date >= from
    && guest.date <= end
    && guest.date <= today
    && guest.date >= start
    && !memberAway(member, guest.date)
    && isServed(state, guest.date, guest.meal)
  ));
  const guestCount = guestMeals.reduce((sum, guest) => sum + guest.quantity, 0);
  const guestCost = guestMeals.reduce((sum, guest) => sum + guest.quantity * rateFor(state, guest.meal, guest.date).guest, 0);
  const deposited = state.money
    .filter((entry) => entry.userId === userId && entry.status === "ACCEPTED" && monthKey(entry.date) === month && entry.date >= start)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const ownCount = meals.BREAKFAST + meals.LUNCH + meals.DINNER;
  const cost = ownCost + guestCost;
  return { ownCount, guestCount, ownCost, guestCost, deposited, opening, cost, balance: opening + deposited - cost, meals };
}

export function strength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Za-z]/.test(password) && /\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  const label = ["Too short", "Weak", "Okay", "Strong", "Strong"][score] || "Too short";
  return { score, label };
}

export function makePassword() {
  const words = ["Mint", "Rice", "Teal", "Lunch", "River"];
  return `${words[Math.floor(Math.random() * words.length)]}${Math.floor(1000 + Math.random() * 9000)}!`;
}

export function createSeed(now = new Date()): AppState {
  const today = dateKey(now);
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  const afterCutoff = now.getHours() * 60 + now.getMinutes() >= 13 * 60;
  const ago = (days: number, hours: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - days);
    date.setHours(date.getHours() - hours, date.getMinutes(), 0, 0);
    return date.toISOString();
  };
  const members: Member[] = [
    { id: "nabil", name: "Nabil Rahman", username: "nabil", password: "Nabil123!", room: "101", phone: "01711000001", role: "MANAGER", active: true, color: "#0F766E", joinedOn: `${monthKey(today)}-01` },
    { id: "rafi", name: "Rafi Ahmed", username: "rafi", password: "Rafi123!", room: "204", phone: "01711000002", role: "MEMBER", active: true, color: "#0E7490", joinedOn: `${monthKey(today)}-01` },
    { id: "tanvir", name: "Tanvir Islam", username: "tanvir", password: "Tanvir123!", room: "207", phone: "01711000003", role: "MEMBER", active: true, color: "#7C3AED", joinedOn: `${monthKey(today)}-01` },
    { id: "sakib", name: "Sakib Hossain", username: "sakib", password: "Sakib123!", room: "210", phone: "01711000004", role: "MEMBER", active: true, color: "#B45309", joinedOn: `${monthKey(today)}-01` },
    { id: "hasan", name: "Hasan Ali", username: "hasan", password: "Hasan123!", room: "215", phone: "01711000005", role: "MEMBER", active: true, color: "#BE123C", joinedOn: `${monthKey(today)}-01` },
  ];
  return {
    theme: "light",
    userId: null,
    month: monthKey(today),
    members,
    offs: [
      { userId: "rafi", date: today, meal: "LUNCH" },
      { userId: "hasan", date: yesterday, meal: "BREAKFAST" },
    ],
    guests: [
      { id: "g1", hostId: "tanvir", date: tomorrow, meal: "LUNCH", guestName: "Imran", quantity: 1, note: "Friend from class" },
      { id: "g2", hostId: "sakib", date: today, meal: "LUNCH", guestName: "Shuvo", quantity: 2, note: "" },
      { id: "g3", hostId: "hasan", date: yesterday, meal: "DINNER", guestName: "Arif", quantity: 1, note: "Cousin" },
      { id: "g4", hostId: "nabil", date: addDays(today, -3), meal: "BREAKFAST", guestName: "Imran", quantity: 1, note: "" },
      { id: "g5", hostId: "rafi", date: addDays(today, -6), meal: "LUNCH", guestName: "Shuvo", quantity: 1, note: "" },
      { id: "g6", hostId: "tanvir", date: addDays(today, -2), meal: "LUNCH", guestName: "Arif", quantity: 1, note: "" },
    ],
    unserved: [{ date: today, meal: "BREAKFAST" }],
    servedForce: [],
    weekdayOff: [{ weekday: 5, meal: "DINNER", from: "2020-01-01" }],
    cutoff: "13:00",
    cutoffOverride: {},
    prices: {
      BREAKFAST: { member: 40, guest: 90 },
      LUNCH: { member: 80, guest: 90 },
      DINNER: { member: 80, guest: 90 },
    },
    rateHistory: MEALS.map((meal) => ({
      meal,
      member: meal === "BREAKFAST" ? 40 : 80,
      guest: 90,
      from: "2020-01-01",
    })),
    money: [
      { id: "d1", userId: "nabil", amount: 5000, date: addDays(today, -10), note: "October deposit", status: "ACCEPTED" },
      { id: "d2", userId: "rafi", amount: 3000, date: addDays(today, -9), note: "October deposit", status: "ACCEPTED" },
      { id: "d3", userId: "tanvir", amount: 1200, date: addDays(today, -1), note: "bKash transfer", status: "PENDING", edited: true, fileName: "bkash.png" },
      { id: "d4", userId: "sakib", amount: 2000, date: today, note: "Cash to manager", status: "PENDING", fileName: "cash.jpg" },
      { id: "d5", userId: "hasan", amount: 1000, date: addDays(today, -2), note: "Market run", status: "RECALC", recalculatedAmount: 700, managerNote: "The receipt shows ৳700, not ৳1,000.", fileName: "receipt.jpg" },
      { id: "d6", userId: "rafi", amount: 400, date: addDays(today, -4), note: "Extra deposit", status: "REJECTED", managerNote: "This was already counted." },
      { id: "d7", userId: "tanvir", amount: 2500, date: addDays(today, -12), note: "October deposit", status: "ACCEPTED" },
      { id: "d8", userId: "sakib", amount: 2500, date: addDays(today, -11), note: "October deposit", status: "ACCEPTED" },
      { id: "d9", userId: "hasan", amount: 2800, date: addDays(today, -11), note: "October deposit", status: "ACCEPTED" },
    ],
    requests: afterCutoff ? [
      { id: "r1", userId: "rafi", date: today, meal: "DINNER", fromOn: true, toOn: false, reason: "Going home after class.", status: "PENDING", at: ago(0, 2) },
      { id: "r3", userId: "tanvir", date: today, meal: "DINNER", fromOn: true, toOn: false, reason: "Out of town tonight.", status: "PENDING", at: ago(0, 5) },
    ] : [],
    history: [
      { id: "h1", at: ago(0, 1), actorId: "tanvir", category: "edit", text: "Tanvir edited a deposit.", edited: { before: "৳1,500", after: "৳1,200", editorId: "tanvir", at: ago(0, 1) } },
      { id: "h2", at: ago(0, 2), actorId: "rafi", category: "request", text: "Rafi asked to turn dinner off today." },
      { id: "h3", at: ago(0, 5), actorId: "tanvir", category: "request", text: "Tanvir asked to turn dinner off today." },
      { id: "h4", at: ago(1, 3), actorId: "sakib", category: "edit", text: "Sakib edited Shuvo’s lunch count.", edited: { before: "1 guest", after: "2 guests", editorId: "sakib", at: ago(1, 3) } },
      { id: "h5", at: ago(1, 6), actorId: "hasan", category: "money", text: "Hasan sent ৳1,000 for a market run." },
      { id: "h6", at: ago(1, 4), actorId: "nabil", category: "money", text: "Nabil sent Hasan’s market receipt back as ৳700." },
      { id: "h7", at: ago(2, 2), actorId: "rafi", category: "meal", text: "Rafi turned lunch off." },
      { id: "h8", at: ago(2, 5), actorId: "nabil", category: "meal", text: "Nabil turned breakfast off for the whole hostel today." },
      { id: "h9", at: ago(4, 1), actorId: "nabil", category: "money", text: "Nabil accepted Rafi’s ৳3,000 deposit." },
      { id: "h10", at: ago(4, 2), actorId: "nabil", category: "money", text: "Nabil rejected Rafi’s extra ৳400 deposit." },
      { id: "h11", at: ago(6, 1), actorId: "hasan", category: "meal", text: "Hasan added guest Arif for dinner." },
      { id: "h12", at: ago(10, 2), actorId: "nabil", category: "money", text: "Nabil recorded his own ৳5,000 deposit." },
    ],
    notices: [
      ...(afterCutoff ? [
        { id: "n1", for: "managers" as const, title: "Meal change", body: "Rafi wants dinner off today.", href: "/manage/requests", unread: true, at: ago(0, 2), requestId: "r1" },
        { id: "n3", for: "managers" as const, title: "Meal change", body: "Tanvir wants dinner off today.", href: "/manage/requests", unread: true, at: ago(0, 5), requestId: "r3" },
      ] : []),
      { id: "n4", for: "managers", title: "Deposit to review", body: "Sakib sent ৳2,000.", href: "/manage/finance", unread: true, at: ago(0, 1), moneyId: "d4" },
      { id: "n5", for: "managers", title: "Deposit to review", body: "Tanvir sent ৳1,200.", href: "/manage/finance", unread: false, at: ago(1, 1), moneyId: "d3" },
      { id: "n6", for: "hasan", title: "Check this amount", body: "Nabil corrected your market receipt to ৳700.", href: "/finance", unread: true, at: ago(1, 4), moneyId: "d5" },
      { id: "n7", for: "rafi", title: "Deposit rejected", body: "The extra ৳400 was already counted.", href: "/finance", unread: true, at: ago(4, 2), moneyId: "d6" },
    ],
    cleanedMonths: [],
    snapshots: [],
    backupReady: false,
    backupFor: null,
    intent: null,
  };
}
