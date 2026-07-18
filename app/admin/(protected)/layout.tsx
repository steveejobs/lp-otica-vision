import { requireAdminSession } from "@/lib/auth/admin-access";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdminSession();
  return children;
}
