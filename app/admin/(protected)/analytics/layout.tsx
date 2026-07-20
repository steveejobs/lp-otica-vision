import { AnalyticsShell } from "@/components/admin/analytics/analytics-shell";
import { requireAdminRole } from "@/lib/auth/admin-access";

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminRole(["admin"]);
  return <AnalyticsShell>{children}</AnalyticsShell>;
}
