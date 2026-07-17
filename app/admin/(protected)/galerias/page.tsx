import styles from "@/components/admin/admin.module.css";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminStatus,
  AdminTable,
} from "@/components/admin/admin-ui";
import { formatAdminDate } from "@/lib/admin/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminGalleriesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: galleries, error } = await supabase
    .from("galleries")
    .select("id, name, route_key, published, autoplay, updated_at")
    .order("display_order")
    .limit(50);

  if (error) {
    throw new Error("Não foi possível carregar as galerias administrativas.");
  }

  return (
    <>
      <AdminPageHeader
        description="Galerias genéricas por rota, com ordem editorial, posições distintas por viewport e preservação de séries visuais."
        title="Galerias"
      />
      <div className={styles.sectionBar}>
        <h2>Galerias cadastradas</h2>
        <span className={styles.phaseBadge}>{galleries.length} registros</span>
      </div>
      {galleries.length === 0 ? (
        <AdminEmptyState>As galerias reais serão cadastradas após a curadoria da Fase 2.</AdminEmptyState>
      ) : (
        <AdminTable label="Galerias cadastradas">
          <thead>
            <tr>
              <th>Galeria</th>
              <th>Chave de rota</th>
              <th>Publicação</th>
              <th>Reprodução</th>
              <th>Atualização</th>
            </tr>
          </thead>
          <tbody>
            {galleries.map((gallery) => (
              <tr key={gallery.id}>
                <td>{gallery.name}</td>
                <td>{gallery.route_key}</td>
                <td>
                  <AdminStatus active={gallery.published} trueLabel="Publicada" falseLabel="Rascunho" />
                </td>
                <td>{gallery.autoplay ? "Automática" : "Manual"}</td>
                <td>{formatAdminDate(gallery.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </>
  );
}
