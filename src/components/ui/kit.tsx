"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock,
  Lock,
  Minus,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import type { Member } from "@/mess/model";

export function Button({
  children,
  kind = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: "primary" | "ghost" | "danger" | "soft" }) {
  const styles = {
    primary: "bg-brand text-brand-ink hover:opacity-90",
    ghost: "bg-card text-ink border border-line hover:bg-soft",
    danger: "bg-red-700 text-white hover:bg-red-800",
    soft: "bg-soft text-brand hover:opacity-90",
  }[kind];
  return (
    <button
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold motion-safe:transition disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const auto = useId();
  const id = props.id || props.name || auto;
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      <input
        {...props}
        id={id}
        className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-base outline-none"
      />
      {hint ? <span className="mt-1 block text-sm text-muted">{hint}</span> : null}
    </label>
  );
}

export function TextArea({
  label,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const auto = useId();
  const id = props.id || props.name || auto;
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      <textarea {...props} id={id} className="min-h-24 w-full rounded-2xl border border-line bg-card px-4 py-3 text-base outline-none" />
    </label>
  );
}

const CHIP = {
  pending: { icon: Clock, className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200", label: "Pending" },
  on: { icon: Check, className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200", label: "ON" },
  accepted: { icon: Check, className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200", label: "Accepted" },
  off: { icon: X, className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200", label: "OFF" },
  rejected: { icon: X, className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200", label: "Rejected" },
  locked: { icon: Lock, className: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200", label: "Locked" },
  response: { icon: AlertTriangle, className: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200", label: "Needs your response" },
  edited: { icon: Pencil, className: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200", label: "Edited" },
  unserved: { icon: X, className: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200", label: "Not served" },
  past: { icon: Lock, className: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200", label: "Closed" },
} as const;

export type ChipKind = keyof typeof CHIP;

export function StatusChip({ kind, label }: { kind: ChipKind; label?: string }) {
  const item = CHIP[kind];
  const Icon = item.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${item.className}`}>
      <Icon size={14} aria-hidden />
      {label || item.label}
    </span>
  );
}

function tap() {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  navigator.vibrate(12);
}

export function Toggle({ on, disabled, label, onChange }: { on: boolean; disabled?: boolean; label: string; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        tap();
        onChange(!on);
      }}
      className={`relative h-11 w-16 shrink-0 rounded-full motion-safe:transition motion-safe:active:scale-95 disabled:opacity-50 ${on ? "bg-brand" : "bg-zinc-300 dark:bg-zinc-600"}`}
    >
      <span className={`absolute top-1 h-9 w-9 rounded-full bg-white shadow motion-safe:transition ${on ? "left-6" : "left-1"}`} />
    </button>
  );
}

export function Avatar({ member, size = 40 }: { member: Pick<Member, "name" | "color"> & { photo?: string }; size?: number }) {
  if (member.photo) {
    return <img src={member.photo} alt="" width={size} height={size} className="inline-block shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  const initials = member.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (
    <span
      aria-hidden
      className="inline-grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: member.color, fontSize: Math.max(12, size * 0.36) }}
    >
      {initials}
    </span>
  );
}

export function MemberLink({ member, sub }: { member: Member; sub?: string }) {
  return (
    <Link href={`/members/view?id=${member.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-2xl pr-2">
      <Avatar member={member} />
      <span className="min-w-0 text-left">
        <span className="block truncate font-semibold">{member.name}</span>
        <span className="block truncate text-xs text-muted">{sub || `@${member.username} · Room ${member.room}`}</span>
      </span>
    </Link>
  );
}

export function Sheet({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    panel.current?.querySelector<HTMLElement>("input, textarea, select")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center xl:items-center" role="presentation">
      <button aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[88dvh] w-full overflow-auto rounded-t-3xl bg-card p-4 shadow-[var(--shadow)] xl:max-w-lg xl:rounded-3xl"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-2xl border border-line">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-card px-4 py-8 text-center">
      <svg viewBox="0 0 80 48" className="mx-auto mb-3 h-12 w-20 text-brand" aria-hidden>
        <rect x="8" y="16" width="64" height="24" rx="12" fill="currentColor" opacity="0.15" />
        <circle cx="28" cy="28" r="6" fill="currentColor" />
        <circle cx="52" cy="28" r="6" fill="currentColor" opacity="0.55" />
      </svg>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}

export function Metric({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-[var(--shadow)]">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${warn ? "text-red-700 dark:text-red-300" : ""}`}>{value}</p>
    </div>
  );
}

export function Stepper({ value, onChange, label }: { value: number; onChange: (next: number) => void; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" aria-label={`Fewer ${label}`} className="grid h-11 w-11 place-items-center rounded-2xl border border-line" onClick={() => onChange(Math.max(1, value - 1))}>
        <Minus size={18} />
      </button>
      <span className="min-w-8 text-center text-lg font-semibold" aria-live="polite">{value}</span>
      <button type="button" aria-label={`More ${label}`} className="grid h-11 w-11 place-items-center rounded-2xl border border-line" onClick={() => onChange(Math.min(10, value + 1))}>
        <Plus size={18} />
      </button>
    </div>
  );
}

export function ActionBar({
  count,
  label,
  onPrimary,
  onDiscard,
}: {
  count: number;
  label: string;
  onPrimary: () => void;
  onDiscard: () => void;
}) {
  if (count <= 0) return null;
  return (
    <div className="fixed inset-x-0 z-40 border-t border-line bg-card px-3 py-3 shadow-[var(--shadow)] bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] md:bottom-0 md:left-[var(--side,4.5rem)] xl:left-64">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-2">
        <p className="col-span-2 text-sm font-semibold">{count} unsaved</p>
        <Button kind="ghost" className="w-full" onClick={onDiscard}>Discard</Button>
        <Button className="w-full" onClick={onPrimary}>{label}</Button>
      </div>
    </div>
  );
}

export function Confirm({
  title,
  body,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet title={title} onClose={onCancel}>
      <p className="text-sm">{body}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button kind="ghost" onClick={onCancel}>Cancel</Button>
        <Button kind={danger ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Sheet>
  );
}

export function Receipt({ name, amount }: { name?: string; amount?: string }) {
  return (
    <div className="flex h-24 w-20 flex-col justify-between rounded-xl border border-line bg-white p-2 text-[10px] text-zinc-700 shadow-[var(--shadow)] dark:bg-zinc-100" aria-hidden>
      <span className="font-semibold text-brand">Receipt</span>
      <span className="space-y-1">
        <span className="block h-1 rounded bg-zinc-200" />
        <span className="block h-1 w-3/4 rounded bg-zinc-200" />
      </span>
      <span className="truncate font-semibold">{amount || name || "File"}</span>
    </div>
  );
}

export function readImage(file: File, max = 360) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that photo."));
    reader.onload = () => {
      const source = String(reader.result || "");
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(source);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = () => resolve(source);
      img.src = source;
    };
    reader.readAsDataURL(file);
  });
}

export function PhotoField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      {value ? <img src={value} alt="" className="h-16 w-16 rounded-full object-cover" /> : <span className="grid h-16 w-16 place-items-center rounded-full bg-soft text-xs font-semibold text-brand">Photo</span>}
      <label className="inline-flex min-h-11 cursor-pointer items-center rounded-2xl border border-line px-3 text-sm font-semibold">
        {value ? "Change photo" : "Add photo"}
        <input
          type="file"
          accept="image/*"
          capture="user"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void readImage(file, 160).then(onChange);
          }}
        />
      </label>
    </div>
  );
}

export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}
