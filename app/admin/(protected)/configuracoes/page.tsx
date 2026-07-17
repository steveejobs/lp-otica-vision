import styles from "@/components/admin/admin.module.css";
import { AdminPageHeader, AdminTable } from "@/components/admin/admin-ui";
import { formatAdminDate } from "@/lib/admin/format";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminSettingsPage() {
  await requireAdminRole(["admin"]);
  const supabase = await createSupabaseServerClient();
  const [{ data: settings, error }, auditResult] = await Promise.all([
    supabase.from("site_settings").select("key, updated_at").order("key"),
    supabase.from("audit_logs").select("id", { count: "exact", head: true }),
  ]);

  if (error || auditResult.error) {
    throw new Error("Não foi possível carregar as configurações administrativas.");
  }

  return (
    <>
      <AdminPageHeader
        description="Configurações centrais e trilha de auditoria. Valores sensíveis nunca são exibidos nesta tela."
        title="Configurações"
      />
      <p className={styles.notice}>
        Auditoria ativa: {auditResult.count ?? 0} eventos administrativos registrados e imutáveis.
      </p>
      <div className={styles.sectionBar}>
        <h2>Chaves configuradas</h2>
        <span className={styles.phaseBadge}>{settings.length} registros</span>
      </div>
      <AdminTable label="Configurações cadastradas">
        <thead>
          <tr>
            <th>Chave</th>
            <th>Estado</th>
            <th>Atualização</th>
          </tr>
        </thead>
        <tbody>
          {settings.map((setting) => (
            <tr key={setting.key}>
              <td>{setting.key}</td>
              <td>Configurada</td>
              <td>{formatAdminDate(setting.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </AdminTable>
    </>
  );
}
