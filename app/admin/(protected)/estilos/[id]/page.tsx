import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminSubmitButton } from "@/components/admin/admin-form-controls";
import styles from "@/components/admin/admin.module.css";
import { AdminFeedback, AdminPageHeader, AdminStatus } from "@/components/admin/admin-ui";
import { StyleProductOrder } from "@/components/admin/style-product-order";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { updateStyleAction } from "../actions";

export default async function EditStylePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; status?: string }> }) {
  const session = await requireAdminRole(["admin", "editor"]);
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const [styleResult, relationResult] = await Promise.all([
    supabase.from("styles").select("id, slug, label, description, active, display_order").eq("id", id).maybeSingle(),
    supabase.from("product_styles").select("product_id, display_order, is_featured, products(id, name, sku)").eq("style_id", id).order("is_featured", { ascending: false }).order("display_order"),
  ]);
  if (styleResult.error || !styleResult.data || relationResult.error) notFound();
  const style = styleResult.data;
  const query = await searchParams;
  const products = (relationResult.data ?? []).flatMap((relation) => relation.products ? [{ id: relation.products.id, name: relation.products.name, sku: relation.products.sku }] : []);
  const canManage = session.profile.role === "admin";

  return (
    <>
      <AdminPageHeader eyebrow="Estilos" description="Classificação e ordem editorial sem inferência automática." title={style.label} />
      <AdminFeedback error={query.error} status={query.status} />
      <div className={styles.adminToolbar}><Link className={styles.buttonLink} href="/admin/estilos" prefetch={false}>Voltar para estilos</Link><AdminStatus active={style.active} /></div>
      <section className={styles.formPanel} aria-labelledby="style-data-title">
        <div className={styles.panelHeading}><h2 id="style-data-title">Dados do estilo</h2><p>{canManage ? "Administrador pode alterar a taxonomia." : "Somente administrador pode alterar estes dados."}</p></div>
        <form action={updateStyleAction} className={styles.adminForm}>
          <input name="id" type="hidden" value={style.id} />
          <fieldset className={styles.formFieldset} disabled={!canManage}>
            <div className={styles.formGrid}>
              <label className={styles.field}><span>Nome</span><input defaultValue={style.label} maxLength={80} name="label" required /></label>
              <label className={styles.field}><span>Slug</span><input defaultValue={style.slug} maxLength={120} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label>
              <label className={`${styles.field} ${styles.fieldWide}`}><span>Descrição curta</span><input defaultValue={style.description} maxLength={240} name="description" required /></label>
              <label className={styles.field}><span>Ordem</span><input defaultValue={style.display_order} min="0" name="display_order" required type="number" /></label>
              <label className={styles.checkboxField}><input defaultChecked={style.active} name="active" type="checkbox" /><span>Ativo</span></label>
            </div>
            {canManage ? <AdminSubmitButton>Salvar estilo</AdminSubmitButton> : null}
          </fieldset>
        </form>
      </section>
      <section className={styles.formPanel} aria-labelledby="style-products-title">
        <div className={styles.panelHeading}><h2 id="style-products-title">Ordem dos produtos</h2><p>Produtos em destaque aparecem primeiro; a sequência abaixo define a ordem editorial.</p></div>
        <StyleProductOrder initialProducts={products} styleId={style.id} />
      </section>
      <p className={styles.notice}>Estilos associados não são excluídos. Use desativação para preservar o histórico e os vínculos.</p>
    </>
  );
}
