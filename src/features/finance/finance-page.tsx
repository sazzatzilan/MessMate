"use client";

import { useEffect, useState } from "react";
import { Camera, Pencil } from "lucide-react";
import { Button, Empty, Field, MemberLink, Metric, Sheet, StatusChip, TextArea, readImage, type ChipKind } from "@/components/ui/kit";
import { useProto } from "@/mess/store";
import { billMember, prettyDate, taka, type MoneyEntry } from "@/mess/model";

const STATUS: Record<MoneyEntry["status"], ChipKind> = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  RECALC: "response",
  DISPUTED: "rejected",
};

export default function FinancePage() {
  const store = useProto();
  const me = store.me;
  const [tab, setTab] = useState<"mine" | "all">("mine");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<MoneyEntry | null>(null);
  const [comment, setComment] = useState("");
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    if (store.state.intent === "add-money") {
      setOpen(true);
      store.setIntent(null);
    }
  }, [store]);

  if (!me) return null;
  const bill = billMember(store.state, me.id, store.state.month, store.today);
  const mine = store.state.money.filter((entry) => entry.userId === me.id && entry.date.startsWith(store.state.month));
  const recalc = mine.find((entry) => entry.status === "RECALC");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Finance</h1>
        <Button onClick={() => setOpen(true)}>Add money</Button>
      </div>
      <section className="rounded-2xl bg-brand p-4 text-brand-ink shadow-[var(--shadow)]">
        <p className="text-sm opacity-80">Balance this month</p>
        <p className="text-3xl font-semibold">{taka(bill.balance)}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <p>Opening<br /><span className="text-lg font-semibold">{taka(bill.opening)}</span></p>
          <p>Deposited<br /><span className="text-lg font-semibold">{taka(bill.deposited)}</span></p>
          <p>Meal cost<br /><span className="text-lg font-semibold">{taka(bill.cost)}</span></p>
        </div>
      </section>

      {recalc ? (
        <article className="rounded-2xl border border-orange-300 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950">
          <StatusChip kind="response" />
          <h2 className="mt-2 font-semibold">The manager corrected a receipt</h2>
          <p className="mt-1 text-sm">You entered {taka(recalc.amount)}. The manager says {taka(recalc.recalculatedAmount || 0)}.</p>
          <p className="mt-1 text-sm">{recalc.managerNote}</p>
          {rejecting ? <TextArea label="Why are you rejecting it?" value={comment} onChange={(event) => setComment(event.target.value)} /> : null}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button onClick={() => store.respondRecalc(recalc.id, true, "")}>Accept</Button>
            <Button kind="danger" onClick={() => {
              if (!rejecting) {
                setRejecting(true);
                return;
              }
              store.respondRecalc(recalc.id, false, comment);
            }}>{rejecting ? "Send rejection" : "Reject"}</Button>
          </div>
        </article>
      ) : null}

      <div className="flex rounded-2xl bg-soft p-1 w-fit">
        <button type="button" className={`min-h-10 rounded-xl px-3 text-sm font-semibold ${tab === "mine" ? "bg-card" : ""}`} onClick={() => setTab("mine")}>My money</button>
        <button type="button" className={`min-h-10 rounded-xl px-3 text-sm font-semibold ${tab === "all" ? "bg-card" : ""}`} onClick={() => setTab("all")}>All members</button>
      </div>

      {tab === "all" ? <AllMembers /> : mine.length === 0 ? <Empty title="No money this month" body="Add a deposit when you pay the mess." /> : (
        <>
          <ul className="space-y-2 xl:hidden">
            {mine.map((entry) => <MoneyCard key={entry.id} entry={entry} onEdit={() => setEdit(entry)} />)}
          </ul>
          <table className="hidden w-full overflow-hidden rounded-2xl border border-line bg-card text-sm xl:table">
            <thead className="bg-soft text-left"><tr><th className="p-3">Date</th><th>Note</th><th>Amount</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {mine.map((entry) => (
                <tr key={entry.id} className="border-t border-line">
                  <td className="p-3">{prettyDate(entry.date)}</td>
                  <td>{entry.note}</td>
                  <td className="font-semibold">{taka(entry.amount)}</td>
                  <td><MoneyStatus entry={entry} /></td>
                  <td>{entry.status === "PENDING" || entry.status === "ACCEPTED" ? <button type="button" className="min-h-11 font-semibold text-brand" onClick={() => setEdit(entry)}>Edit</button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {open ? <MoneyForm onClose={() => setOpen(false)} /> : null}
      {edit ? <MoneyForm entry={edit} onClose={() => setEdit(null)} /> : null}
    </div>
  );
}

function MoneyStatus({ entry }: { entry: MoneyEntry }) {
  return (
    <span className="inline-flex items-center gap-2">
      <StatusChip kind={STATUS[entry.status]} label={entry.status === "RECALC" ? "Recalculated" : entry.status === "DISPUTED" ? "Disputed" : undefined} />
      {entry.edited ? <StatusChip kind="edited" /> : null}
    </span>
  );
}

function MoneyCard({ entry, onEdit }: { entry: MoneyEntry; onEdit: () => void }) {
  return (
    <li className="rounded-2xl border border-line bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{taka(entry.amount)}</p>
          <p className="text-sm text-muted">{prettyDate(entry.date)} · {entry.note || "No note"}</p>
        </div>
        <MoneyStatus entry={entry} />
      </div>
      {entry.status === "PENDING" || entry.status === "ACCEPTED" ? <button type="button" className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand" onClick={onEdit}><Pencil size={14} /> Edit</button> : null}
    </li>
  );
}

function AllMembers() {
  const store = useProto();
  const rows = store.state.members.map((member) => ({ member, bill: billMember(store.state, member.id, store.state.month, store.today) }));
  return (
    <>
      <div className="grid gap-2 xl:hidden">
        {rows.map(({ member, bill }) => (
          <article key={member.id} className="rounded-2xl border border-line bg-card p-3">
            <MemberLink member={member} />
            {member.deleted ? <p className="text-xs font-semibold text-muted">Deleted · still in the books</p> : !member.active ? <p className="text-xs font-semibold text-muted">Inactive</p> : null}
            <p className="mt-2 text-sm">Opening {taka(bill.opening)} · Deposited {taka(bill.deposited)} · Cost {taka(bill.cost)}</p>
            <Metric label="Balance" value={taka(bill.balance)} warn={bill.balance < 0} />
          </article>
        ))}
      </div>
      <table className="hidden w-full rounded-2xl border border-line bg-card text-sm xl:table">
        <thead className="bg-soft text-left"><tr><th className="p-3">Member</th><th>Meals</th><th>Guests</th><th>Deposited</th><th>Cost</th><th>Balance</th></tr></thead>
        <tbody>
          {rows.map(({ member, bill }) => (
            <tr key={member.id} className="border-t border-line">
              <td className="p-3"><MemberLink member={member} />{member.deleted ? <span className="block text-xs text-muted">Deleted</span> : !member.active ? <span className="block text-xs text-muted">Inactive</span> : null}</td>
              <td>{bill.ownCount}</td>
              <td>{bill.guestCount}</td>
              <td>{taka(bill.deposited)}</td>
              <td>{taka(bill.cost)}</td>
              <td className={bill.balance < 0 ? "font-semibold text-red-700" : "font-semibold"}>{taka(bill.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function MoneyForm({ onClose, entry }: { onClose: () => void; entry?: MoneyEntry }) {
  const store = useProto();
  const [amount, setAmount] = useState(entry ? String(entry.amount) : "");
  const [date, setDate] = useState(entry?.date || store.today);
  const [note, setNote] = useState(entry?.note || "");
  const [fileName, setFileName] = useState(entry?.fileName || "");
  const [preview, setPreview] = useState(entry?.filePreview || "");
  const [error, setError] = useState("");
  function save() {
    const value = Number(amount);
    if (!Number.isInteger(value) || value <= 0) {
      setError("Enter a whole amount greater than 0.");
      return;
    }
    if (!note.trim() && !fileName) {
      setError("Add a note or a receipt photo.");
      return;
    }
    const ok = entry
      ? store.editMoney(entry.id, value, note.trim())
      : store.addMoney({ amount: value, date, note: note.trim(), fileName, filePreview: preview || undefined });
    if (ok) onClose();
  }

  return (
    <Sheet title={entry ? "Edit deposit" : "Add money"} onClose={onClose}>
      <form onSubmit={(event) => { event.preventDefault(); save(); }}>
      {error ? <p className="mb-2 rounded-2xl bg-red-100 px-3 py-2 text-sm text-red-800" role="alert">{error}</p> : null}
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Amount</span>
        <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="min-h-16 w-full rounded-2xl border border-line bg-bg px-4 text-3xl font-semibold" placeholder="0" />
      </label>
      {entry ? null : (
        <div className="mt-3">
          <Field label="Date" type="date" min={store.me?.joinedOn} max={store.today} value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
      )}
      <div className="mt-3">
        <Field label="Note" value={note} onChange={(event) => setNote(event.target.value)} hint="A short note, or a photo of the receipt. Enter submits." />
      </div>
      <label className="mt-3 flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-line px-3 text-sm font-semibold">
        <Camera size={18} aria-hidden /> {fileName || "Add a photo or PDF"}
        <input type="file" accept="image/*,application/pdf" capture="environment" className="sr-only" onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setFileName(file.name);
          if (file.type.startsWith("image/")) void readImage(file, 480).then(setPreview);
          else setPreview("");
        }} />
      </label>
      {preview ? <img src={preview} alt="Receipt preview" className="mt-3 h-28 rounded-2xl object-cover" /> : null}
      {entry?.status === "ACCEPTED" ? <p className="mt-3 text-sm text-muted">Saving an accepted deposit sends it back for approval, and it leaves the balance until a manager accepts it again.</p> : null}
      <Button type="submit" className="mt-4 w-full">{entry ? "Save" : "Submit"}</Button>
      </form>
    </Sheet>
  );
}
