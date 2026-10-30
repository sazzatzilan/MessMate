"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button, Confirm, Empty, Field, MemberLink, PhotoField, Sheet, StatusChip } from "@/components/ui/kit";
import { useProto, type MemberInput } from "@/mess/store";
import { makePassword, strength, type Member, type Role } from "@/mess/model";

export default function MembersPage() {
  const store = useProto();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [edit, setEdit] = useState<Member | null>(null);
  const [credentials, setCredentials] = useState<{ name: string; username: string; password: string } | null>(null);
  const [confirmOff, setConfirmOff] = useState<Member | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Member | null>(null);
  const [confirmReset, setConfirmReset] = useState<Member | null>(null);
  if (store.me?.role !== "MANAGER") return null;
  const rows = store.state.members.filter((member) => `${member.name} ${member.username} ${member.room}`.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="space-y-4">
      <Link href="/manage" className="text-sm font-semibold text-brand">Management</Link>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Members</h1>
        <Button onClick={() => setAdding(true)}>Add member</Button>
      </div>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, username, room" className="min-h-12 w-full rounded-2xl border border-line bg-card px-4" />
      {rows.length === 0 ? <Empty title="No one matches" body="Try another name or room." /> : (
        <ul className="space-y-2">
          {rows.map((member) => (
            <li key={member.id} className="rounded-2xl border border-line bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <MemberLink member={member} />
                <span className="flex gap-2">
                  {member.role === "MANAGER" ? <StatusChip kind="on" label="Manager" /> : null}
                  {member.deleted ? <StatusChip kind="locked" label="Deleted" /> : !member.active ? <StatusChip kind="locked" label="Inactive" /> : null}
                </span>
              </div>
              {member.deleted ? <p className="mt-2 text-sm text-muted">This login is closed. Meals and money stay in the books.</p> : <div className="mt-2 flex flex-wrap gap-2">
                <Button kind="ghost" onClick={() => setEdit(member)}>Edit</Button>
                <Button kind="ghost" onClick={() => setConfirmReset(member)}>Reset password</Button>
                <Button kind={member.active ? "danger" : "soft"} onClick={() => member.active ? setConfirmOff(member) : store.setActive(member.id, true)}>{member.active ? "Deactivate" : "Activate"}</Button>
                {member.id === store.me?.id ? null : <Button kind="danger" onClick={() => setConfirmDelete(member)}>Delete</Button>}
              </div>}
            </li>
          ))}
        </ul>
      )}
      {adding ? <MemberForm onClose={() => setAdding(false)} onDone={(value) => { setAdding(false); if (value) setCredentials(value); }} /> : null}
      {edit ? <MemberForm member={edit} onClose={() => setEdit(null)} onDone={() => setEdit(null)} /> : null}
      {confirmOff ? (
        <Confirm
          title={`Deactivate ${confirmOff.name}?`}
          body="They cannot sign in. Meals from today are not billed. Days already counted stay, and you can activate them again."
          confirmLabel="Deactivate"
          danger
          onCancel={() => setConfirmOff(null)}
          onConfirm={() => { store.setActive(confirmOff.id, false); setConfirmOff(null); }}
        />
      ) : null}
      {confirmReset ? (
        <Confirm
          title={`Reset password for ${confirmReset.name}?`}
          body="The current password stops working as soon as you reset it. Copy the new one before you close this."
          confirmLabel="Reset password"
          onCancel={() => setConfirmReset(null)}
          onConfirm={() => {
            setCredentials({ name: confirmReset.name, username: confirmReset.username, password: store.resetPassword(confirmReset.id) });
            setConfirmReset(null);
          }}
        />
      ) : null}
      {confirmDelete ? (
        <Confirm
          title={`Delete ${confirmDelete.name}?`}
          body="They cannot sign in, and meals from today are not billed. Deposits and meals already counted stay in the books."
          confirmLabel="Delete"
          danger
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => { store.deleteMember(confirmDelete.id); setConfirmDelete(null); }}
        />
      ) : null}
      {credentials ? (
        <Sheet title="Copy these details" onClose={() => setCredentials(null)}>
          <p className="text-sm">Give these to {credentials.name}. They will not be shown again.</p>
          <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-bg p-3 text-sm">{credentials.name}{"\n"}Username: {credentials.username}{"\n"}Password: {credentials.password}</pre>
          <Button className="mt-3 w-full" onClick={() => navigator.clipboard?.writeText(`Username: ${credentials.username}\nPassword: ${credentials.password}`)}>Copy</Button>
        </Sheet>
      ) : null}
    </div>
  );
}

function MemberForm({ member, onClose, onDone }: { member?: Member; onClose: () => void; onDone: (value: { name: string; username: string; password: string } | null) => void }) {
  const store = useProto();
  const generated = useMemo(() => makePassword(), []);
  const [name, setName] = useState(member?.name || "");
  const [username, setUsername] = useState(member?.username || "");
  const [password, setPassword] = useState(member ? "" : generated);
  const [room, setRoom] = useState(member?.room || "");
  const [phone, setPhone] = useState(member?.phone || "");
  const [role, setRole] = useState<Role>(member?.role || "MEMBER");
  const [photo, setPhoto] = useState(member?.photo || "");
  const meter = strength(password);
  return (
    <Sheet title={member ? "Edit member" : "Add member"} onClose={onClose}>
      <form className="space-y-3" onSubmit={(event) => {
        event.preventDefault();
        const input: MemberInput = { name: name.trim(), username, password, room, phone, role, photo: photo || undefined };
        if (!input.name || !input.username) return;
        const saved = store.saveMember(input, member?.id);
        if (!saved) return;
        onDone(member ? null : { name: saved.name, username: saved.username, password: saved.password });
      }}>
        <PhotoField value={photo} onChange={setPhoto} />
        <Field label="Full name" value={name} onChange={(event) => setName(event.target.value)} />
        <Field label="Username" value={username} readOnly={Boolean(member)} onChange={(event) => setUsername(event.target.value)} />
        <Field label="Password" value={password} onChange={(event) => setPassword(event.target.value)} hint={member ? "Leave blank to keep the current password" : meter.label} placeholder={member ? "Leave blank to keep it" : ""} />
        {password ? <div className="h-2 overflow-hidden rounded-full bg-bg" aria-hidden>
          <div className="h-full bg-brand" style={{ width: `${meter.score * 25}%` }} />
        </div> : null}
        <Button kind="ghost" type="button" onClick={() => setPassword(makePassword())}>Generate password</Button>
        <Field label="Room" value={room} onChange={(event) => setRoom(event.target.value)} />
        <Field label="Phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={role === "MANAGER"} onChange={(event) => setRole(event.target.checked ? "MANAGER" : "MEMBER")} />
          Also a manager
        </label>
        <Button className="w-full" type="submit">Save</Button>
      </form>
    </Sheet>
  );
}
