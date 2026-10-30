import assert from "node:assert/strict";
import { billMember, createSeed, isServed, transferManagerRole, type AppState, type Meal } from "../src/mess/model";

const today = "2026-10-29";
const seed = createSeed(new Date("2026-10-29T06:00:00.000Z"));

function fixture(patch: Partial<AppState> = {}): AppState {
  return {
    ...seed,
    members: [{ ...seed.members[0], id: "rafi", role: "MEMBER", joinedOn: "2026-10-28" }],
    offs: [],
    guests: [
      { id: "g1", hostId: "rafi", date: "2026-10-29", meal: "BREAKFAST", guestName: "Imran", quantity: 2, note: "" },
      { id: "g2", hostId: "rafi", date: "2026-10-29", meal: "LUNCH", guestName: "Imran", quantity: 1, note: "" },
    ],
    unserved: [{ date: "2026-10-29", meal: "BREAKFAST" }],
    weekdayOff: [],
    money: [{ id: "d", userId: "rafi", amount: 1000, date: "2026-10-28", note: "cash", status: "ACCEPTED" }],
    snapshots: [],
    cleanedMonths: [],
    ...patch,
  };
}

const bill = billMember(fixture(), "rafi", "2026-10", today);
assert.equal(bill.meals.BREAKFAST, 1, "unserved breakfast is not counted");
assert.equal(bill.meals.LUNCH, 2);
assert.equal(bill.meals.DINNER, 2);
assert.equal(bill.guestCount, 1, "a guest on an unserved meal is not billed");
assert.equal(bill.guestCost, 90);
assert.equal(bill.ownCost, 40 + 160 + 160);
assert.equal(bill.opening, 0);
assert.equal(bill.balance, 1000 - 450);

const joinedToday = fixture({
  members: [{ ...seed.members[0], id: "rafi", role: "MEMBER", joinedOn: today }],
});
const firstDay = billMember(joinedToday, "rafi", "2026-10", today);
assert.equal(firstDay.meals.LUNCH, 1, "a new member is not billed before the join date");
assert.equal(firstDay.meals.BREAKFAST, 0);
assert.equal(firstDay.ownCost, 160);

const raised = fixture({
  rateHistory: [
    { meal: "BREAKFAST" as Meal, member: 40, guest: 90, from: "2020-01-01" },
    { meal: "LUNCH" as Meal, member: 80, guest: 90, from: "2020-01-01" },
    { meal: "LUNCH" as Meal, member: 100, guest: 120, from: today },
    { meal: "DINNER" as Meal, member: 80, guest: 90, from: "2020-01-01" },
  ],
});
const afterRaise = billMember(raised, "rafi", "2026-10", today);
assert.equal(afterRaise.ownCost, 40 + 80 + 100 + 160, "yesterday keeps the old lunch rate");
assert.equal(afterRaise.guestCost, 120);

const carried = fixture({
  snapshots: [{
    userId: "rafi",
    month: "2026-09",
    ownCount: 0,
    guestCount: 0,
    ownCost: 0,
    guestCost: 0,
    deposited: 200,
    opening: 0,
    cost: 0,
    balance: 200,
    meals: { BREAKFAST: 0, LUNCH: 0, DINNER: 0 },
  }],
});
assert.equal(billMember(carried, "rafi", "2026-10", today).opening, 200);
assert.equal(billMember(carried, "rafi", "2026-10", today).balance, 750);

const closed = fixture({
  cleanedMonths: ["2026-10"],
  snapshots: [{
    userId: "rafi",
    month: "2026-10",
    ownCount: 3,
    guestCount: 0,
    ownCost: 200,
    guestCost: 0,
    deposited: 1000,
    opening: 50,
    cost: 200,
    balance: 850,
    meals: { BREAKFAST: 1, LUNCH: 1, DINNER: 1 },
  }],
  money: [],
  guests: [],
});
const frozen = billMember(closed, "rafi", "2026-10", today);
assert.equal(frozen.balance, 850, "a closed month keeps its snapshot after the rows are gone");
assert.equal(frozen.opening, 50);

const friday = "2026-10-23";
const ruled = fixture({
  members: [{ ...seed.members[0], id: "rafi", role: "MEMBER", joinedOn: "2026-10-01" }],
  unserved: [],
  weekdayOff: [{ weekday: 5, meal: "DINNER", from: "2020-01-01" }],
  guests: [],
  money: [],
});
assert.equal(isServed(ruled, friday, "DINNER"), false, "Friday dinner stays off");
assert.equal(isServed(ruled, "2026-10-22", "DINNER"), true);

const startedToday = fixture({
  unserved: [],
  weekdayOff: [{ weekday: 5, meal: "DINNER", from: today }],
  guests: [],
  money: [],
});
assert.equal(isServed(startedToday, friday, "DINNER"), true, "a new Friday rule does not rewrite an earlier Friday");
assert.equal(isServed(startedToday, "2026-10-30", "DINNER"), false);

const forced = fixture({
  unserved: [],
  weekdayOff: [{ weekday: 5, meal: "DINNER", from: "2020-01-01" }],
  servedForce: [{ date: friday, meal: "DINNER" }],
  guests: [],
  money: [],
});
assert.equal(isServed(forced, friday, "DINNER"), true, "one day can be served against the repeat");

const left = fixture({
  members: [{ ...seed.members[0], id: "rafi", role: "MEMBER", joinedOn: "2026-10-28", away: [{ from: today, to: "9999-12-31" }] }],
  unserved: [],
  weekdayOff: [],
  guests: [{ id: "gx", hostId: "rafi", date: today, meal: "LUNCH", guestName: "Late", quantity: 1, note: "" }],
  money: [{ id: "dearly", userId: "rafi", amount: 500, date: "2026-10-20", note: "before join", status: "ACCEPTED" }],
});
const afterLeave = billMember(left, "rafi", "2026-10", today);
assert.equal(afterLeave.meals.LUNCH, 1, "the leave day is not billed");
assert.equal(afterLeave.guestCount, 0, "a guest after the member leaves is not billed");
assert.equal(afterLeave.deposited, 0, "a deposit before the join date is not counted");

assert.deepEqual(seed.members.map((member) => member.username), ["sifat", "nahid", "nihal"]);
assert.equal(seed.members[0]?.role, "MANAGER");
assert.equal(seed.money.length, 0);
assert.equal(seed.guests.length, 0);
assert.equal(seed.offs.length, 0);

const handed = transferManagerRole(seed.members, "sifat", "nahid");
assert.equal(handed.ok, true);
if (handed.ok) {
  assert.equal(handed.members.find((member) => member.id === "sifat")?.role, "MEMBER");
  assert.equal(handed.members.find((member) => member.id === "nahid")?.role, "MANAGER");
  assert.equal(handed.members.find((member) => member.id === "nihal")?.role, "MEMBER");
}
assert.equal(transferManagerRole(seed.members, "nahid", "nihal").ok, false, "a member cannot hand over a role they do not have");
assert.equal(transferManagerRole(seed.members, "sifat", "sifat").ok, false);
const inactive = seed.members.map((member) => (member.id === "nahid" ? { ...member, active: false } : member));
assert.equal(transferManagerRole(inactive, "sifat", "nahid").ok, false, "an inactive member cannot receive the role");

console.log("proto logic ok");
