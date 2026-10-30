"use client";

/** Sends an old address to the screen that replaced it, so a saved link still opens. */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function Jump({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(href);
  }, [href, router]);
  return null;
}
