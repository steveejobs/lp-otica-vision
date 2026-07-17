import styles from "@/components/admin/admin.module.css";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminStatus,
  AdminTable,
} from "@/components/admin/admin-ui";
import { formatAdminDate, promotionTypeLabels } from "@/lib/admin/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminPromotionsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: promotions, error } = await supabase
    .from("promotions")
    .select("id, title, type, active, featured, starts_at, ends_at")
    .order("priority", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error("Não foi possível carregar os destaques administrativos.");
  }

  return (
    <>
      <AdminPageHeader
        description="Destaques podem representar lançamento, coleção ou conteúdo editorial — sem presumir desconto ou condição comercial."
        title="Destaques"
      />
      <div className={styles.sectionBar}>
        <h2>Programação cadastrada</h2>
        <span className={styles.phaseBadge}>{promotions.length} registros</span>
      </div>
      {promotions.length === 0 ? (
        <AdminEmptyState>Nenhuma promoção ou destaque fictício foi criado.</AdminEmptyState>
      ) : (
        <AdminTable label="Destaques cadastrados">
          <thead>
            <tr>
              <th>Título</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Início</th>
              <th>Fim</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((promotion) => (
              <tr key={promotion.id}>
                <td>{promotion.title}</td>
                <td>{promotionTypeLabels[promotion.type]}</td>
                <td>
                  <AdminStatus active={promotion.active} />
                </td>
                <td>{formatAdminDate(promotion.starts_at)}</td>
                <td>{formatAdminDate(promotion.ends_at)}</td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </>
  );
}
