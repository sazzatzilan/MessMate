"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MemberScreen } from "@/features/members/member-screen";

function MemberFromQuery() {
  const id = useSearchParams().get("id") ?? "";
  if (!id) return null;
  return <MemberScreen id={id} />;
}

export default function MemberPage() {
  return (
    <Suspense fallback={null}>
      <MemberFromQuery />
    </Suspense>
  );
}
