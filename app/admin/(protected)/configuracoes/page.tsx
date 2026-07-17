import styles from "@/components/admin/admin.module.css";
import { AdminSubmitButton } from "@/components/admin/admin-form-controls";
import { AdminFeedback, AdminPageHeader, AdminTable } from "@/components/admin/admin-ui";
import { formatAdminDate } from "@/lib/admin/format";
import { requireAdminRole } from "@/lib/auth/admin-access";
import {
  HOME_CATALOG_PREVIEW_SETTING_KEY,
  parseHomeCatalogPreviewEnabled,
} from "@/lib/catalog/home-preview-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { updateHomeCatalogPreviewAction } from "./actions";

type AdminSettingsPageProps = {
  searchParams: Promise<{ error?: string; status?: string }>;
};

export default async function AdminSettingsPage({ searchParams }: AdminSettingsPageProps) {
  await requireAdminRole(["admin"]);
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [{ data: settings, error }, auditResult] = await Promise.all([
    supabase.from("site_settings").select("key, value, updated_at").order("key"),
    supabase.from("audit_logs").select("id", { count: "exact", head: true }),
  ]);

  if (error || auditResult.error) {
    throw new Error("Não foi possível carregar as configurações administrativas.");
  }

  const homeCatalogPreviewSetting = settings.find(
    (setting) => setting.key === HOME_CATALOG_PREVIEW_SETTING_KEY,
  );
  const homeCatalogPreviewEnabled = parseHomeCatalogPreviewEnabled(
    homeCatalogPreviewSetting?.value,
  );

  return (
    <>
      <AdminPageHeader
        description="Configurações centrais e trilha de auditoria. Valores sensíveis nunca são exibidos nesta tela."
        title="Configurações"
      />
      <AdminFeedback error={params.error} status={params.status} />

      <p className={styles.notice}>
        Auditoria ativa: {auditResult.count ?? 0} eventos administrativos registrados e imutáveis.
      </p>

      <section className={styles.formPanel} aria-labelledby="home-settings-title">
        <div className={styles.panelHeading}>
          <div>
            <h2 id="home-settings-title">Home</h2>
            <p>Controle editorial da pré-visualização do catálogo na landing.</p>
          </div>
        </div>
        <form action={updateHomeCatalogPreviewAction} className={styles.adminForm}>
          <label className={styles.checkboxField}>
            <input
              defaultChecked={homeCatalogPreviewEnabled}
              name="enabled"
              type="checkbox"
            />
            <span>Exibir prévia do catálogo na home</span>
          </label>
          <div className={styles.formActions}>
            <AdminSubmitButton>Salvar configuração</AdminSubmitButton>
          </div>
        </form>
      </section>

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
