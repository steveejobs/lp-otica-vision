import styles from "@/components/admin/admin.module.css";
import { AdminSubmitButton } from "@/components/admin/admin-form-controls";
import { AdminFeedback, AdminPageHeader, AdminTable } from "@/components/admin/admin-ui";
import { formatAdminDate } from "@/lib/admin/format";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { HOME_CURATION_SETTING_KEY, parseHomeCurationSettings } from "@/lib/curation/settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { updateHomeCurationAction } from "./actions";

type AdminSettingsPageProps = {
  searchParams: Promise<{ error?: string; status?: string }>;
};

export default async function AdminSettingsPage({ searchParams }: AdminSettingsPageProps) {
  await requireAdminRole(["admin"]);
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [{ data: settings, error }, auditResult, styleResult, categoryResult] = await Promise.all([
    supabase.from("site_settings").select("key, value, updated_at").order("key"),
    supabase.from("audit_logs").select("id", { count: "exact", head: true }),
    supabase.from("styles").select("slug, label, active").eq("active", true).order("display_order"),
    supabase.from("categories").select("slug, name, active").eq("active", true).order("display_order"),
  ]);

  if (error || auditResult.error) {
    throw new Error("Não foi possível carregar as configurações administrativas.");
  }

  const homeCurationSetting = settings.find((setting) => setting.key === HOME_CURATION_SETTING_KEY);
  const homeCuration = parseHomeCurationSettings(homeCurationSetting?.value);
  const curationSchemaAvailable = !styleResult.error;

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
        {!curationSchemaAvailable ? <p className={styles.notice}>A migration da curadoria ainda não foi aplicada neste ambiente.</p> : null}
        <form action={updateHomeCurationAction} className={styles.adminForm}>
          <div className={styles.formGrid}>
            <label className={styles.checkboxField}><input defaultChecked={homeCuration.enabled} name="enabled" type="checkbox" /><span>Curadoria ativa</span></label>
            <label className={styles.checkboxField}><input defaultChecked={homeCuration.published} name="published" type="checkbox" /><span>Publicada na home</span></label>
            <label className={styles.field}><span>Estilo inicial</span><select defaultValue={homeCuration.initialStyle} disabled={!curationSchemaAvailable} name="initial_style" required>{(styleResult.data ?? []).map((style) => <option key={style.slug} value={style.slug}>{style.label}</option>)}</select></label>
            <label className={styles.field}><span>Categoria inicial opcional</span><select defaultValue={homeCuration.categorySlug ?? ""} name="category_slug"><option value="">Todas</option>{(categoryResult.data ?? []).map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></label>
            <label className={styles.field}><span>Ordem na home</span><input defaultValue={homeCuration.displayOrder} min="0" name="display_order" required type="number" /></label>
            <label className={styles.field}><span>Revisão ativa</span><input defaultValue={homeCuration.revision} min="1" name="revision" required type="number" /></label>
          </div>
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
