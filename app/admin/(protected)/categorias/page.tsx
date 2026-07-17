import styles from "@/components/admin/admin.module.css";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminStatus,
  AdminTable,
} from "@/components/admin/admin-ui";
import { formatAdminDate } from "@/lib/admin/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminCategoriesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, name, slug, active, updated_at")
    .order("display_order")
    .limit(100);

  if (error) {
    throw new Error("Não foi possível carregar as categorias administrativas.");
  }

  return (
    <>
      <AdminPageHeader
        description="Taxonomia controlada para o catálogo futuro, mantida separada de marcas e coleções editoriais."
        title="Categorias"
      />
      <div className={styles.sectionBar}>
        <h2>Categorias cadastradas</h2>
        <span className={styles.phaseBadge}>{categories.length} registros</span>
      </div>
      {categories.length === 0 ? (
        <AdminEmptyState>Nenhuma categoria genérica foi criada sem necessidade real.</AdminEmptyState>
      ) : (
        <AdminTable label="Categorias cadastradas">
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Atualização</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td>{category.name}</td>
                <td>{category.slug}</td>
                <td>
                  <AdminStatus active={category.active} />
                </td>
                <td>{formatAdminDate(category.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </>
  );
}
