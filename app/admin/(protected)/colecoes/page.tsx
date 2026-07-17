import Link from "next/link";

import { AdminSubmitButton } from "@/components/admin/admin-form-controls";
import styles from "@/components/admin/admin.module.css";
import { AdminEmptyState, AdminFeedback, AdminPageHeader, AdminStatus, AdminTable } from "@/components/admin/admin-ui";
import { formatAdminDate } from "@/lib/admin/format";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { createCollectionAction } from "./actions";

export default async function AdminCollectionsPage({ searchParams }: { searchParams: Promise<{ error?: string; status?: string }> }) {
  await requireAdminRole(["admin", "editor"]);
  const supabase = await createSupabaseServerClient();
  const { data: collections, error } = await supabase
    .from("collections")
    .select("id, name, slug, published, featured, starts_at, ends_at, display_order, updated_at")
    .order("display_order")
    .order("name")
    .limit(100);
  if (error || !collections) throw new Error("Não foi possível carregar as coleções administrativas.");
  const query = await searchParams;
  return (
    <>
      <AdminPageHeader description="Curadorias com capa privada, produtos ordenados e janela opcional. Datas não geram urgência automática." title="Coleções" />
      <AdminFeedback error={query.error} status={query.status} />
      <section className={styles.formPanel} aria-labelledby="new-collection-title">
        <div className={styles.panelHeading}><div><h2 id="new-collection-title">Nova coleção</h2><p>A coleção nasce em rascunho até receber capa e produtos.</p></div></div>
        <form action={createCollectionAction} className={styles.adminForm}>
          <div className={styles.formGrid}>
            <label className={styles.field}><span>Nome</span><input maxLength={160} name="name" required /></label>
            <label className={styles.field}><span>Slug</span><input maxLength={120} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label>
            <label className={`${styles.field} ${styles.fieldWide}`}><span>Descrição</span><textarea maxLength={1000} name="description" /></label>
            <label className={styles.field}><span>Início opcional</span><input name="starts_at" type="datetime-local" /></label>
            <label className={styles.field}><span>Fim opcional</span><input name="ends_at" type="datetime-local" /></label>
            <label className={styles.field}><span>Ordem</span><input defaultValue="0" min="0" name="display_order" required type="number" /></label>
          </div>
          <AdminSubmitButton pendingLabel="Criando coleção...">Criar rascunho</AdminSubmitButton>
        </form>
      </section>
      <div className={styles.sectionBar}><h2>Curadorias cadastradas</h2><span className={styles.phaseBadge}>{collections.length} registros</span></div>
      {collections.length === 0 ? <AdminEmptyState>Nenhuma coleção cadastrada.</AdminEmptyState> : (
        <AdminTable label="Coleções cadastradas">
          <thead><tr><th>Coleção</th><th>Slug</th><th>Ordem</th><th>Publicação</th><th>Início</th><th>Fim</th><th>Ações</th></tr></thead>
          <tbody>{collections.map((collection) => (
            <tr key={collection.id}>
              <td>{collection.name}</td><td>{collection.slug}</td><td>{collection.display_order}</td>
              <td><AdminStatus active={collection.published} trueLabel={collection.featured ? "Publicada · destaque" : "Publicada"} falseLabel="Rascunho" /></td>
              <td>{formatAdminDate(collection.starts_at)}</td><td>{formatAdminDate(collection.ends_at)}</td>
              <td><Link className={styles.textButton} href={`/admin/colecoes/${collection.id}`}>Editar</Link></td>
            </tr>
          ))}</tbody>
        </AdminTable>
      )}
    </>
  );
}
