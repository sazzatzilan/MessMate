"use client";

import { MemberScreen } from "@/features/members/member-screen";
import { useProto } from "@/mess/store";

export default function ProfilePage() {
  const store = useProto();
  if (!store.me) return null;
  return <MemberScreen id={store.me.id} />;
}
