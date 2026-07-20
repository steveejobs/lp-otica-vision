import Link from "next/link";

import { AdminSubmitButton } from "@/components/admin/admin-form-controls";
import styles from "@/components/admin/admin.module.css";
import { AdminEmptyState, AdminFeedback, AdminPageHeader, AdminStatus, AdminTable } from "@/components/admin/admin-ui";
import { formatAdminDate } from "@/lib/admin/format";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { createCategoryAction, toggleCategoryAction } from "./actions";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  await requireAdminRole(["admin", "editor"]);
  const supabase = await createSupabaseServerClient();
  const [{ data: categories, error }, { data: products, error: productError }] = await Promise.all([
    supabase.from("categories").select("id, name, slug, active, display_order, updated_at").order("display_order").order("name").limit(200),
    supabase.from("products").select("category_id").not("category_id", "is", null),
  ]);
  if (error || productError) throw new Error("Não foi possível carregar as categorias administrativas.");
  const query = await searchParams;
  const linkedCounts = new Map<string, number>();
  products.forEach((product) => {
    if (product.category_id) linkedCounts.set(product.category_id, (linkedCounts.get(product.category_id) ?? 0) + 1);
  });

  return (
    <>
      <AdminPageHeader
        description="Taxonomia controlada do catálogo. Categorias com produtos vinculados usam desativação segura em vez de exclusão silenciosa."
        title="Categorias"
      />
      <AdminFeedback error={query.error} status={query.status} />

      <section className={styles.formPanel} aria-labelledby="new-category-title">
        <div className={styles.panelHeading}>
          <h2 id="new-category-title">Nova categoria</h2>
          <p>Nome, slug e ordem podem ser revisados depois.</p>
        </div>
        <form action={createCategoryAction} className={styles.adminForm}>
          <div className={styles.formGridCompact}>
            <label className={styles.field}>
              <span>Nome</span>
              <input maxLength={120} name="name" required />
            </label>
            <label className={styles.field}>
              <span>Identificador na URL</span>
              <input maxLength={120} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
              <small className={styles.fieldHint}>Use letras minúsculas e hífens, sem espaços.</small>
            </label>
            <label className={styles.field}>
              <span>Ordem</span>
              <input defaultValue="0" min="0" name="display_order" required type="number" />
            </label>
            <label className={styles.checkboxField}>
              <input defaultChecked name="active" type="checkbox" />
              <span>Ativa</span>
            </label>
          </div>
          <div className={styles.formActions}>
            <AdminSubmitButton pendingLabel="Criando categoria...">Criar categoria</AdminSubmitButton>
          </div>
        </form>
      </section>

      <div className={styles.sectionBar}>
        <h2>Categorias cadastradas</h2>
        <span className={styles.phaseBadge}>{categories.length} registros</span>
      </div>
      {categories.length === 0 ? (
        <AdminEmptyState>Nenhuma categoria foi criada sem necessidade real.</AdminEmptyState>
      ) : (
        <><div className={styles.mobileRecordList}>{categories.map((category) => (
          <article className={styles.mobileRecordCard} key={category.id}>
            <div><strong>{category.name}</strong><AdminStatus active={category.active} /></div>
            <p>{linkedCounts.get(category.id) ?? 0} produtos · ordem {category.display_order} · atualizado em {formatAdminDate(category.updated_at)}</p>
            <div className={styles.rowActions}><Link className={styles.textButton} href={`/admin/categorias/${category.id}`} prefetch={false}>Editar</Link><form action={toggleCategoryAction}><input name="id" type="hidden" value={category.id} /><AdminSubmitButton pendingLabel="Salvando..." variant="secondary">{category.active ? "Desativar" : "Ativar"}</AdminSubmitButton></form></div>
          </article>
        ))}</div><div className={styles.desktopRecordTable}><AdminTable label="Categorias cadastradas">
          <thead>
            <tr>
              <th>Categoria</th><th>Identificador</th><th>Produtos</th><th>Ordem</th><th>Status</th><th>Atualização</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td>{category.name}</td>
                <td>{category.slug}</td>
                <td>{linkedCounts.get(category.id) ?? 0}</td>
                <td>{category.display_order}</td>
                <td><AdminStatus active={category.active} /></td>
                <td>{formatAdminDate(category.updated_at)}</td>
                <td>
                  <div className={styles.rowActions}>
                    <Link className={styles.textButton} href={`/admin/categorias/${category.id}`} prefetch={false}>Editar</Link>
                    <form action={toggleCategoryAction} className={styles.inlineForm}>
                      <input name="id" type="hidden" value={category.id} />
                      <AdminSubmitButton pendingLabel="Salvando..." variant="secondary">
                        {category.active ? "Desativar" : "Ativar"}
                      </AdminSubmitButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable></div></>
      )}
    </>
  );
}
