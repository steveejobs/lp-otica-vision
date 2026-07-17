import styles from "@/components/admin/admin.module.css";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminStatus,
  AdminTable,
} from "@/components/admin/admin-ui";
import { formatAdminDate } from "@/lib/admin/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminBrandsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: brands, error } = await supabase
    .from("brands")
    .select("id, name, slug, active, updated_at")
    .order("display_order")
    .limit(100);

  if (error) {
    throw new Error("Não foi possível carregar as marcas administrativas.");
  }

  return (
    <>
      <AdminPageHeader
        description="A marca em destaque terá ordem e imagem próprias. Nenhuma marca foi importada automaticamente sem validação comercial."
        title="Marcas"
      />
      <div className={styles.sectionBar}>
        <h2>Marcas validadas</h2>
        <span className={styles.phaseBadge}>{brands.length} registros</span>
      </div>
      {brands.length === 0 ? (
        <AdminEmptyState>Cadastre somente marcas confirmadas pela Ótica Vision.</AdminEmptyState>
      ) : (
        <AdminTable label="Marcas cadastradas">
          <thead>
            <tr>
              <th>Marca</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Atualização</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((brand) => (
              <tr key={brand.id}>
                <td>{brand.name}</td>
                <td>{brand.slug}</td>
                <td>
                  <AdminStatus active={brand.active} />
                </td>
                <td>{formatAdminDate(brand.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </>
  );
}
