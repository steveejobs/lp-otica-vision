import styles from "@/components/admin/admin.module.css";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminStatus,
  AdminTable,
} from "@/components/admin/admin-ui";
import { availabilityLabels, formatAdminDate } from "@/lib/admin/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminProductsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, sku, published, featured, availability_status, updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error("Não foi possível carregar os produtos administrativos.");
  }

  return (
    <>
      <AdminPageHeader
        description="Produtos, códigos e disponibilidade ficam centralizados aqui. O padrão de disponibilidade é sempre sob consulta."
        title="Produtos"
      />
      <div className={styles.sectionBar}>
        <h2>Catálogo cadastrado</h2>
        <span className={styles.phaseBadge}>{products.length} registros</span>
      </div>
      {products.length === 0 ? (
        <AdminEmptyState>Os formulários de cadastro entram na Fase 2.</AdminEmptyState>
      ) : (
        <AdminTable label="Produtos cadastrados">
          <thead>
            <tr>
              <th>Produto</th>
              <th>SKU</th>
              <th>Disponibilidade</th>
              <th>Publicação</th>
              <th>Atualização</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.sku}</td>
                <td>{availabilityLabels[product.availability_status]}</td>
                <td>
                  <AdminStatus active={product.published} trueLabel="Publicado" falseLabel="Rascunho" />
                </td>
                <td>{formatAdminDate(product.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </>
  );
}
