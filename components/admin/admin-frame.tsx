"use client";

import { usePathname } from "next/navigation";

import type { AdminSession } from "@/lib/auth/admin-access";

import { AdminShell } from "./admin-shell";

export function AdminFrame({
  children,
  onLogout,
  profile,
}: {
  children: React.ReactNode;
  onLogout: () => Promise<void>;
  profile: AdminSession["profile"] | null;
}) {
  const pathname = usePathname();
  if (pathname === "/admin/login" || !profile) return children;

  return <AdminShell onLogout={onLogout} profile={profile}>{children}</AdminShell>;
}
