import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminSubmitButton, ConfirmSubmitButton } from "@/components/admin/admin-form-controls";
import styles from "@/components/admin/admin.module.css";
import { AdminFeedback, AdminPageHeader, AdminStatus } from "@/components/admin/admin-ui";
import { FilePreviewInput } from "@/components/admin/file-preview-input";
import { ImageFocusInput } from "@/components/admin/image-focus-input";
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
      <AdminPageHeader eyebrow="Destaques" description="Revise o conteúdo, o enquadramento e o período antes de ativar." title={promotion.title} />
      <AdminFeedback error={query.error} status={query.status} />
      <div className={styles.adminToolbar}><Link className={styles.buttonLink} href="/admin/promocoes" prefetch={false}>Voltar para destaques</Link><AdminStatus active={promotion.active} trueLabel={promotion.featured ? "Ativo · principal" : "Ativo"} /></div>

      <section className={styles.formPanel} aria-labelledby="promotion-data-title">
        <form action={updatePromotionAction} className={styles.adminForm}>
          <input name="id" type="hidden" value={promotion.id} />
          <div className={styles.productFormSections}>
            <section className={styles.productFormSection}>
              <Step number="1" text="O texto deve usar somente informações confirmadas." title="Conteúdo" />
              <div className={styles.formGrid}>
                <label className={styles.field}><span>Tipo</span><select defaultValue={promotion.type} name="type"><option value="highlight">Destaque editorial</option><option value="launch">Lançamento</option><option value="collection">Seleção ou coleção</option><option value="promotion">Promoção com condição real confirmada</option></select></label>
                <label className={styles.field}><span>Título</span><input defaultValue={promotion.title} maxLength={160} name="title" required /></label>
                <label className={`${styles.field} ${styles.fieldWide}`}><span>Descrição curta</span><textarea defaultValue={promotion.short_description ?? ""} maxLength={600} name="short_description" /></label>
                <label className={styles.field}><span>Texto do botão</span><input defaultValue={promotion.cta_label} maxLength={80} name="cta_label" required /></label>
                <label className={styles.field}><span>O que acontece ao tocar</span><select defaultValue={promotion.cta_target} name="cta_target"><option value="whatsapp">Abre o WhatsApp oficial</option><option value="instagram">Abre o Instagram oficial</option><option value="maps">Abre a rota oficial</option></select></label>
              </div>
            </section>

            <section className={styles.productFormSection}>
              <Step number="2" text="Toque no ponto que precisa permanecer visível dentro do quadro." title="Imagem e enquadramento" />
              <label className={styles.field}><span>Descrição da imagem para acessibilidade</span><input defaultValue={promotion.image_alt_text ?? ""} maxLength={220} name="image_alt_text" required /></label>
              <ImageFocusInput alt={promotion.image_alt_text ?? promotion.title} initialDesktopPosition={promotion.image_object_position} initialImageUrl={imageUrl} positionNames={{ desktop: "image_object_position" }} responsive={false} />
            </section>

            <section className={styles.productFormSection}>
              <Step number="3" text="O destaque só fica disponível dentro deste período." title="Período e estado" />
              <div className={styles.formGrid}>
                <label className={styles.field}><span>Começar a exibir em</span><input defaultValue={dateTimeInputValue(promotion.starts_at)} name="starts_at" required type="datetime-local" /></label>
                <label className={styles.field}><span>Parar de exibir em</span><input defaultValue={dateTimeInputValue(promotion.ends_at)} name="ends_at" required type="datetime-local" /></label>
                <label className={styles.checkboxField}><input defaultChecked={promotion.active} name="active" type="checkbox" /><span>Ativo dentro deste período</span></label>
                <label className={styles.checkboxField}><input defaultChecked={promotion.featured} name="featured" type="checkbox" /><span>Destaque principal</span></label>
              </div>
            </section>
          </div>

          <details className={styles.adminDetails}>
            <summary>Configurações avançadas</summary>
            <p>Normalmente não é necessário alterar estes valores.</p>
            <div className={styles.formGrid}>
              <label className={styles.field}><span>Identificador na URL</span><input defaultValue={promotion.slug} maxLength={120} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label>
              <label className={styles.field}><span>Prioridade</span><input defaultValue={promotion.priority} min="0" name="priority" required type="number" /><small className={styles.fieldHint}>O maior número vem primeiro quando há vários ativos.</small></label>
            </div>
          </details>
          <AdminSubmitButton>Salvar rascunho do destaque</AdminSubmitButton>
        </form>
        <details className={styles.adminDetails}>
          <summary>Substituir o arquivo da imagem</summary>
          <form action={replacePromotionImageAction} className={styles.adminForm}>
            <input name="promotion_id" type="hidden" value={promotion.id} /><FilePreviewInput id="replace-promotion" name="file" required />
            <AdminSubmitButton pendingLabel="Substituindo imagem..." variant="secondary">Substituir imagem</AdminSubmitButton>
          </form>
        </details>
      </section>

      <section className={styles.formPanel} aria-labelledby="promotion-products-title">
        <Step number="4" text="Adicione produtos somente quando eles realmente fizerem parte deste destaque." title="Produtos relacionados" />
        <OrderedProductPicker entityId={promotion.id} initialIds={relationsResult.data.map((relation) => relation.product_id)} kind="promotion" products={productsResult.data} />
      </section>

      <details className={`${styles.adminDetails} ${styles.dangerZone}`}>
        <summary>Excluir este destaque</summary>
        <div className={styles.destructiveActions}><p>A imagem privada e as relações também serão removidas. Esta ação não pode ser desfeita.</p><form action={deletePromotionAction}><input name="id" type="hidden" value={promotion.id} /><ConfirmSubmitButton confirmation="Excluir este destaque e sua imagem privada?">Excluir destaque</ConfirmSubmitButton></form></div>
      </details>
    </>
  );
}

function Step({ number, text, title }: { number: string; text: string; title: string }) {
  return <div className={styles.formSectionHeading}><span aria-hidden="true">{number}</span><div><h2 id={number === "1" ? "promotion-data-title" : number === "4" ? "promotion-products-title" : undefined}>{title}</h2><p>{text}</p></div></div>;
}
