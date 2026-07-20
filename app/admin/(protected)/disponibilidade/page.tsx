import { AdminSubmitButton } from "@/components/admin/admin-form-controls";
import styles from "@/components/admin/admin.module.css";
import { AdminEmptyState, AdminFeedback, AdminPageHeader } from "@/components/admin/admin-ui";
import { availabilityLabels } from "@/lib/admin/format";
import { sanitizedSearch } from "@/lib/admin/validation";
import { requireAdminSession } from "@/lib/auth/admin-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { updateAvailabilityAction } from "../produtos/actions";

const availabilityValues = ["available", "last_unit", "unavailable"] as const;

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string; status?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const q = sanitizedSearch(params.q);
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("products").select("id, sku, name, model, color, availability_status").is("archived_at", null);
  if (q) query = query.or(`sku.ilike.%${q}%,name.ilike.%${q}%,model.ilike.%${q}%`);
  const { data: products, error } = await query.order("updated_at", { ascending: false }).limit(40);
  if (error || !products) throw new Error("Não foi possível carregar a disponibilidade rápida.");
  const returnTo = `/admin/disponibilidade${q ? `?q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <AdminPageHeader eyebrow="Atendimento" description="Atualize somente o estado comercial informado pela equipe. Esta tela não representa quantidade de estoque." title="Disponibilidade rápida" />
      <AdminFeedback error={params.error} status={params.status} />
      <form className={styles.searchForm} method="get">
        <label className={styles.field}><span>SKU, nome ou modelo</span><input autoFocus defaultValue={q} name="q" placeholder="Buscar produto" /></label>
        <button className={styles.primaryButton} type="submit">Buscar</button>
      </form>
      <div className={styles.sectionBar}><h2>Produtos</h2><span className={styles.phaseBadge}>{products.length} resultados</span></div>
      {products.length === 0 ? (
        <AdminEmptyState>Nenhum produto encontrado.</AdminEmptyState>
      ) : (
        <div className={styles.availabilityList}>
          {products.map((product) => (
            <article className={styles.availabilityItem} key={product.id}>
              <div><h2>{product.name}</h2><p>{product.sku}{product.model ? ` · ${product.model}` : ""}{product.color ? ` · ${product.color}` : ""}</p></div>
              <form action={updateAvailabilityAction} className={styles.availabilityForm}>
                <input name="id" type="hidden" value={product.id} /><input name="return_to" type="hidden" value={returnTo} />
                <label className={styles.field}><span>Disponibilidade atual</span><select defaultValue={product.availability_status === "consultation" ? "available" : product.availability_status} name="availability_status">{availabilityValues.map((value) => <option key={value} value={value}>{availabilityLabels[value]}</option>)}</select></label>
                <AdminSubmitButton pendingLabel="Atualizando...">Atualizar</AdminSubmitButton>
              </form>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
