import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminSubmitButton, ConfirmSubmitButton } from "@/components/admin/admin-form-controls";
import styles from "@/components/admin/admin.module.css";
import { AdminFeedback, AdminPageHeader, AdminStatus } from "@/components/admin/admin-ui";
import { FilePreviewInput } from "@/components/admin/file-preview-input";
import { OrderedProductPicker } from "@/components/admin/ordered-product-picker";
import { dateTimeInputValue } from "@/lib/admin/format";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { createAdminImageUrl } from "@/lib/storage/images";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { deletePromotionAction, replacePromotionImageAction, updatePromotionAction } from "../actions";

export default async function EditPromotionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; status?: string }> }) {
  await requireAdminRole(["admin", "editor"]);
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const [promotionResult, productsResult, relationsResult] = await Promise.all([
    supabase.from("promotions").select("*").eq("id", id).maybeSingle(),
    supabase.from("products").select("id, name, sku").is("archived_at", null).order("name").limit(500),
    supabase.from("promotion_products").select("product_id, display_order").eq("promotion_id", id).order("display_order"),
  ]);
  if (promotionResult.error || !promotionResult.data) notFound();
  if (productsResult.error || relationsResult.error || !productsResult.data || !relationsResult.data) throw new Error("Não foi possível carregar o editor do destaque.");
  const promotion = promotionResult.data;
  const query = await searchParams;
  const imageUrl = await createAdminImageUrl("promotions", promotion.image_path);
  return (
    <>
      <AdminPageHeader eyebrow="Destaques" description="Janela, imagem, CTA e produtos relacionados são validados antes de salvar." title={promotion.title} />
      <AdminFeedback error={query.error} status={query.status} />
      <div className={styles.adminToolbar}><Link className={styles.buttonLink} href="/admin/promocoes">Voltar para destaques</Link><AdminStatus active={promotion.active} trueLabel={promotion.featured ? "Ativo · destaque" : "Ativo"} /></div>
      <section className={styles.formPanel} aria-labelledby="promotion-data-title">
        <div className={styles.panelHeading}><h2 id="promotion-data-title">Conteúdo e período</h2><p>O fim nunca pode anteceder o início.</p></div>
        <form action={updatePromotionAction} className={styles.adminForm}>
          <input name="id" type="hidden" value={promotion.id} />
          <div className={styles.formGrid}>
            <label className={styles.field}><span>Tipo</span><select defaultValue={promotion.type} name="type"><option value="promotion">Promoção</option><option value="highlight">Destaque</option><option value="launch">Lançamento</option><option value="collection">Coleção</option></select></label>
            <label className={styles.field}><span>Título</span><input defaultValue={promotion.title} maxLength={160} name="title" required /></label>
            <label className={styles.field}><span>Slug</span><input defaultValue={promotion.slug} maxLength={120} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label>
            <label className={styles.field}><span>Prioridade</span><input defaultValue={promotion.priority} min="0" name="priority" required type="number" /></label>
            <label className={`${styles.field} ${styles.fieldWide}`}><span>Descrição curta</span><textarea defaultValue={promotion.short_description ?? ""} maxLength={600} name="short_description" /></label>
            <label className={styles.field}><span>Rótulo do CTA</span><input defaultValue={promotion.cta_label} maxLength={80} name="cta_label" required /></label>
            <label className={styles.field}><span>Destino oficial</span><select defaultValue={promotion.cta_target} name="cta_target"><option value="whatsapp">WhatsApp oficial</option><option value="instagram">Instagram oficial</option><option value="maps">Rota oficial</option></select></label>
            <label className={styles.field}><span>Início</span><input defaultValue={dateTimeInputValue(promotion.starts_at)} name="starts_at" required type="datetime-local" /></label>
            <label className={styles.field}><span>Fim</span><input defaultValue={dateTimeInputValue(promotion.ends_at)} name="ends_at" required type="datetime-local" /></label>
            <label className={styles.field}><span>Texto alternativo</span><input defaultValue={promotion.image_alt_text ?? ""} maxLength={220} name="image_alt_text" required /></label>
            <label className={styles.field}><span>Object-position</span><input defaultValue={promotion.image_object_position} name="image_object_position" pattern="(?:\d{1,3}%|left|center|right) (?:\d{1,3}%|top|center|bottom)" required /></label>
            <label className={styles.checkboxField}><input defaultChecked={promotion.active} name="active" type="checkbox" /><span>Ativo</span></label>
            <label className={styles.checkboxField}><input defaultChecked={promotion.featured} name="featured" type="checkbox" /><span>Destaque principal</span></label>
          </div>
          <AdminSubmitButton>Salvar destaque</AdminSubmitButton>
        </form>
      </section>
      <section className={styles.formPanel} aria-labelledby="promotion-image-title">
        <div className={styles.panelHeading}><div><h2 id="promotion-image-title">Imagem</h2><p>{promotion.image_width ?? "?"} × {promotion.image_height ?? "?"}</p></div></div>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived private Storage URL.
          <img alt={promotion.image_alt_text ?? ""} className={styles.imagePreview} src={imageUrl} style={{ objectPosition: promotion.image_object_position }} />
        ) : null}
        <form action={replacePromotionImageAction} className={styles.adminForm}>
          <input name="promotion_id" type="hidden" value={promotion.id} /><FilePreviewInput id="replace-promotion" name="file" required />
          <AdminSubmitButton pendingLabel="Substituindo imagem..." variant="secondary">Substituir imagem</AdminSubmitButton>
        </form>
      </section>
      <section className={styles.formPanel} aria-labelledby="promotion-products-title">
        <div className={styles.panelHeading}><div><h2 id="promotion-products-title">Produtos relacionados</h2><p>Ordem editorial do destaque.</p></div></div>
        <OrderedProductPicker entityId={promotion.id} initialIds={relationsResult.data.map((relation) => relation.product_id)} kind="promotion" products={productsResult.data} />
      </section>
      <section className={styles.dangerZone} aria-labelledby="delete-promotion-title">
        <div className={styles.panelHeading}><div><h2 id="delete-promotion-title">Excluir destaque</h2><p>Banco e Storage usam compensação se uma das etapas falhar.</p></div></div>
        <form action={deletePromotionAction}><input name="id" type="hidden" value={promotion.id} /><ConfirmSubmitButton confirmation="Excluir este destaque e sua imagem privada?">Excluir destaque</ConfirmSubmitButton></form>
      </section>
    </>
  );
}

