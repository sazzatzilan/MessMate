"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/kit";
import { useProto } from "@/mess/store";

export default function LoginPage() {
  const store = useProto();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const message = store.login(username, password);
    if (message) {
      setError(message);
      return;
    }
    router.replace("/");
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-[#0F766E] p-10 text-white lg:flex">
        <p className="text-sm font-semibold">MessMate · Green Hostel</p>
        <div>
          <h1 className="max-w-md text-4xl font-semibold">Meals, guests, and money, easy for everyone.</h1>
          <p className="mt-4 text-white/80">Breakfast ৳40 · Lunch ৳80 · Dinner ৳80 · Guest ৳90</p>
        </div>
        <p className="text-sm text-white/70">Your manager creates the account. There is no public sign-up.</p>
      </section>
      <section className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-10">
      <p className="text-sm font-semibold text-brand lg:hidden">MessMate</p>
      <h1 className="mt-1 text-3xl font-semibold">MessMate</h1>
      <p className="mt-2 text-muted">Sign in with the username your manager gave you.</p>
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-line bg-card p-4 shadow-[var(--shadow)]">
        {error ? <p className="rounded-2xl bg-red-100 px-3 py-3 text-sm font-medium text-red-800 dark:bg-red-950 dark:text-red-100" role="alert">{error}</p> : null}
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Username</span>
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" className="min-h-12 w-full rounded-2xl border border-line bg-bg px-4" />
        </label>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-semibold">Password</label>
          <span className="flex min-h-12 items-center rounded-2xl border border-line bg-bg pr-1">
            <input id="password" value={password} onChange={(event) => setPassword(event.target.value)} type={show ? "text" : "password"} autoComplete="current-password" className="min-h-12 w-full bg-transparent px-4 outline-none" />
            <button type="button" aria-label={show ? "Hide password" : "Show password"} className="grid h-11 w-11 place-items-center" onClick={() => setShow((value) => !value)}>
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </div>
        <Button type="submit" className="w-full">Sign in</Button>
        <p className="text-sm text-muted">Forgot password? Ask your manager.</p>
      </form>
      <div className="mt-4 rounded-2xl border border-line bg-card p-4">
        <p className="text-sm font-semibold">Preview accounts</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            ["nabil", "Nabil123!"],
            ["rafi", "Rafi123!"],
          ].map(([name, pass]) => (
            <button key={name} type="button" className="min-h-11 rounded-2xl bg-soft px-3 text-sm font-semibold text-brand" onClick={() => { setUsername(name); setPassword(pass); setError(""); }}>
              {name} · {name === "nabil" ? "manager" : "member"}
            </button>
          ))}
        </div>
      </div>
      </section>
    </main>
  );
}
