import styles from "@/components/admin/admin.module.css";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminStatus,
  AdminTable,
} from "@/components/admin/admin-ui";
import { formatAdminDate } from "@/lib/admin/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminCollectionsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: collections, error } = await supabase
    .from("collections")
    .select("id, name, slug, published, featured, starts_at, ends_at, updated_at")
    .order("display_order")
    .limit(50);

  if (error) {
    throw new Error("Não foi possível carregar as coleções administrativas.");
  }

  return (
    <>
      <AdminPageHeader
        description="Agrupamentos editoriais com capa, ordem e janela de publicação, preparados para a futura coleção em destaque."
        title="Coleções"
      />
      <div className={styles.sectionBar}>
        <h2>Curadorias cadastradas</h2>
        <span className={styles.phaseBadge}>{collections.length} registros</span>
      </div>
      {collections.length === 0 ? (
        <AdminEmptyState>Nenhuma coleção foi inventada para preencher o painel.</AdminEmptyState>
      ) : (
        <AdminTable label="Coleções cadastradas">
          <thead>
            <tr>
              <th>Coleção</th>
              <th>Slug</th>
              <th>Publicação</th>
              <th>Início</th>
              <th>Fim</th>
            </tr>
          </thead>
          <tbody>
            {collections.map((collection) => (
              <tr key={collection.id}>
                <td>{collection.name}</td>
                <td>{collection.slug}</td>
                <td>
                  <AdminStatus active={collection.published} trueLabel="Publicada" falseLabel="Rascunho" />
                </td>
                <td>{formatAdminDate(collection.starts_at)}</td>
                <td>{formatAdminDate(collection.ends_at)}</td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </>
  );
}
