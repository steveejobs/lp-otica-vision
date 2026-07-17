import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminSession } from "@/lib/auth/admin-access";

import { logoutAdmin } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { profile } = await requireAdminSession();

  return (
    <AdminShell onLogout={logoutAdmin} profile={profile}>
      {children}
    </AdminShell>
  );
}
