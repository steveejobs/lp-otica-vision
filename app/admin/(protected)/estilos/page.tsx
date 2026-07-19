import Link from "next/link";

import { AdminSubmitButton } from "@/components/admin/admin-form-controls";
import styles from "@/components/admin/admin.module.css";
import { AdminEmptyState, AdminFeedback, AdminPageHeader, AdminStatus, AdminTable } from "@/components/admin/admin-ui";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { createStyleAction, toggleStyleAction } from "./actions";

export default async function AdminStylesPage({ searchParams }: { searchParams: Promise<{ error?: string; status?: string }> }) {
  const session = await requireAdminRole(["admin", "editor"]);
  const supabase = await createSupabaseServerClient();
  const [styleResult, relationResult, productResult] = await Promise.all([
    supabase.from("styles").select("id, slug, label, description, active, display_order").order("display_order").order("label"),
    supabase.from("product_styles").select("product_id, style_id"),
    supabase.from("products").select("id, published, archived_at, product_images(is_cover)"),
  ]);
  const query = await searchParams;
  const schemaAvailable = !styleResult.error && !relationResult.error;
  const stylesData = schemaAvailable ? styleResult.data ?? [] : [];
  const relations = schemaAvailable ? relationResult.data ?? [] : [];
  const eligibleProducts = new Set((productResult.data ?? []).filter((product) => product.published && !product.archived_at && product.product_images.some((image) => image.is_cover)).map((product) => product.id));
  const count = (styleId: string, eligibleOnly = false) => new Set(relations.filter((item) => item.style_id === styleId && (!eligibleOnly || eligibleProducts.has(item.product_id))).map((item) => item.product_id)).size;
  const canManage = session.profile.role === "admin";

  return (
    <>
      <AdminPageHeader description="Taxonomia editorial controlada e classificação explícita dos produtos." title="Estilos" />
      <AdminFeedback error={query.error} status={query.status} />
      {!schemaAvailable ? <p className={styles.notice}>A migration da curadoria ainda não foi aplicada neste ambiente. Nenhum dado foi alterado.</p> : null}
      <section className={styles.formPanel} aria-labelledby="curation-placement-title">
        <div className={styles.panelHeading}>
          <div><p className={styles.eyebrow}>Home › Curadoria guiada</p><h2 id="curation-placement-title">Seleção de estilo e preview do catálogo</h2><p>Rota / · âncora /#curadoria · fonte produtos · filtros estilo e categoria · limite público 8 · status implementado.</p></div>
          <AdminStatus active trueLabel="Componente conectado" />
        </div>
        <div className={styles.toolbarActions}>
          <Link className={styles.buttonLink} href="/#curadoria" target="_blank">Ver na página</Link>
          <Link className={styles.buttonLink} href="/preview/curadoria?viewport=desktop" target="_blank">Preview desktop</Link>
          <Link className={styles.buttonLink} href="/preview/curadoria?viewport=mobile" target="_blank">Preview mobile</Link>
        </div>
      </section>
      {canManage && schemaAvailable ? (
        <section className={styles.formPanel} aria-labelledby="new-style-title">
          <div className={styles.panelHeading}><h2 id="new-style-title">Novo estilo</h2><p>Use uma direção editorial curta e objetiva.</p></div>
          <form action={createStyleAction} className={styles.adminForm}>
            <div className={styles.formGrid}>
              <label className={styles.field}><span>Nome</span><input maxLength={80} name="label" required /></label>
              <label className={styles.field}><span>Slug</span><input maxLength={120} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label>
              <label className={`${styles.field} ${styles.fieldWide}`}><span>Descrição curta</span><input maxLength={240} name="description" required /></label>
              <label className={styles.field}><span>Ordem</span><input defaultValue="0" min="0" name="display_order" required type="number" /></label>
              <label className={styles.checkboxField}><input defaultChecked name="active" type="checkbox" /><span>Ativo</span></label>
            </div>
            <AdminSubmitButton pendingLabel="Criando estilo...">Criar estilo</AdminSubmitButton>
          </form>
        </section>
      ) : null}
      <div className={styles.sectionBar}><h2>Direções cadastradas</h2><span className={styles.phaseBadge}>{stylesData.length} registros</span></div>
      {!stylesData.length ? <AdminEmptyState>{schemaAvailable ? "Nenhum estilo cadastrado." : "Estrutura indisponível neste preview."}</AdminEmptyState> : (
        <AdminTable label="Estilos cadastrados">
          <thead><tr><th>Estilo</th><th>Produtos</th><th>Elegíveis</th><th>Ordem</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>{stylesData.map((style) => (
            <tr key={style.id}>
              <td><strong>{style.label}</strong><br /><small>{style.description}</small></td>
              <td>{count(style.id)}</td><td>{count(style.id, true)}</td><td>{style.display_order}</td><td><AdminStatus active={style.active} /></td>
              <td><div className={styles.rowActions}><Link className={styles.textButton} href={`/admin/estilos/${style.id}`} prefetch={false}>Abrir</Link>{canManage ? <form action={toggleStyleAction}><input name="id" type="hidden" value={style.id} /><AdminSubmitButton pendingLabel="Salvando..." variant="secondary">{style.active ? "Desativar" : "Ativar"}</AdminSubmitButton></form> : null}</div></td>
            </tr>
          ))}</tbody>
        </AdminTable>
      )}
    </>
  );
}
