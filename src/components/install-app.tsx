"use client";

import { useEffect, useState } from "react";

type InstallPrompt = Event & { prompt: () => Promise<void> };

export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    const onOffer = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", onOffer);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onOffer);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!prompt) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 md:bottom-6">
      <button
        type="button"
        className="min-h-11 rounded-2xl bg-[#0F766E] px-4 text-sm font-semibold text-white shadow-[var(--shadow)]"
        onClick={() => {
          void prompt.prompt().finally(() => setPrompt(null));
        }}
      >
        Install MessMate
      </button>
    </div>
  );
}
