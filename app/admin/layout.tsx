import type { Metadata } from "next";

import { AdminFrame } from "@/components/admin/admin-frame";
import { getAdminSession } from "@/lib/auth/admin-access";

import { logoutAdmin } from "./(protected)/actions";

export const metadata: Metadata = {
  title: "Administração | Ótica Vision",
  description: "Área administrativa protegida da Ótica Vision.",
  robots: {
    follow: false,
    index: false,
  },
};

export default async function AdminRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getAdminSession();
  return (
    <AdminFrame onLogout={logoutAdmin} profile={session?.profile ?? null}>
      {children}
    </AdminFrame>
  );
}
