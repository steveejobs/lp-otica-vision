import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminSubmitButton, ConfirmSubmitButton } from "@/components/admin/admin-form-controls";
import styles from "@/components/admin/admin.module.css";
import { AdminFeedback, AdminPageHeader, AdminStatus } from "@/components/admin/admin-ui";
import { FilePreviewInput } from "@/components/admin/file-preview-input";
import { ProductForm } from "@/components/admin/product-form";
import { ProductImageManager } from "@/components/admin/product-image-manager";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { createAdminImageUrls } from "@/lib/storage/images";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { archiveProductAction, duplicateProductAction, restoreProductAction, updateProductAction, uploadProductImagesAction } from "../actions";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  await requireAdminRole(["admin", "editor"]);
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const [productResult, brandResult, categoryResult, imageResult] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase.from("brands").select("id, name, active").order("name"),
    supabase.from("categories").select("id, name, active").order("name"),
    supabase.from("product_images").select("id, alt_text, object_position, is_cover, storage_path, width, height, display_order").eq("product_id", id).order("display_order"),
  ]);
  if (productResult.error || !productResult.data) notFound();
  if (brandResult.error || categoryResult.error || imageResult.error || !brandResult.data || !categoryResult.data || !imageResult.data) {
    throw new Error("Não foi possível carregar o editor do produto.");
  }
  const product = productResult.data;
  const query = await searchParams;
  const signed = await createAdminImageUrls("catalog-products", imageResult.data.map((image) => image.storage_path));
  const images = imageResult.data.map((image) => ({
    altText: image.alt_text,
    height: image.height,
    id: image.id,
    isCover: image.is_cover,
    objectPosition: image.object_position,
    signedUrl: signed.get(image.storage_path) ?? null,
    width: image.width,
  }));

  return (
    <>
      <AdminPageHeader eyebrow="Produtos" description="Edite dados, publicação e mídia. Toda mudança é autorizada no servidor e registrada na auditoria." title={product.name} />
      <AdminFeedback error={query.error} status={query.status} />
      <div className={styles.adminToolbar}>
        <div className={styles.toolbarActions}><Link className={styles.buttonLink} href="/admin/produtos">Voltar para produtos</Link><Link className={styles.buttonLink} href="/admin/disponibilidade">Disponibilidade rápida</Link></div>
        <AdminStatus active={product.published && !product.archived_at} trueLabel={product.featured ? "Publicado · destaque" : "Publicado"} falseLabel={product.archived_at ? "Arquivado" : "Rascunho"} />
      </div>

      {product.archived_at ? <p className={styles.notice}>Produto arquivado. Restaure-o antes de editar ou publicar.</p> : null}
      <section className={styles.formPanel} aria-labelledby="product-data-title">
        <div className={styles.panelHeading}><h2 id="product-data-title">Dados do produto</h2><p>SKU e slug são únicos.</p></div>
        <ProductForm action={updateProductAction} archived={Boolean(product.archived_at)} brands={brandResult.data} categories={categoryResult.data} defaults={product} editing />
      </section>

      {!product.archived_at ? (
        <section className={styles.formPanel} aria-labelledby="product-upload-title">
          <div className={styles.panelHeading}><div><h2 id="product-upload-title">Adicionar imagens</h2><p>A primeira imagem vira capa quando ainda não existe capa.</p></div></div>
          <form action={uploadProductImagesAction} className={styles.adminForm}>
            <input name="product_id" type="hidden" value={product.id} />
            <div className={styles.formGrid}>
              <label className={styles.field}><span>Texto alternativo base</span><input maxLength={170} name="alt_base" required /></label>
              <label className={styles.field}><span>Object-position</span><input defaultValue="50% 50%" maxLength={40} name="object_position" pattern="(?:\d{1,3}%|left|center|right) (?:\d{1,3}%|top|center|bottom)" required /></label>
              <div className={styles.fieldWide}><FilePreviewInput id="product-images" multiple name="files" required /></div>
            </div>
            <AdminSubmitButton pendingLabel="Enviando imagens...">Enviar imagens</AdminSubmitButton>
          </form>
        </section>
      ) : null}

      <section className={styles.formPanel} aria-labelledby="product-images-title">
        <div className={styles.panelHeading}><div><h2 id="product-images-title">Imagens do produto</h2><p>Arraste ou use os botões para ordenar. Apenas uma imagem permanece como capa.</p></div><span className={styles.phaseBadge}>{images.length} imagens</span></div>
        <ProductImageManager images={images} productId={product.id} readOnly={Boolean(product.archived_at)} />
      </section>

      <section className={styles.dangerZone} aria-labelledby="product-actions-title">
        <div className={styles.panelHeading}><div><h2 id="product-actions-title">Ações do registro</h2><p>Duplicações não copiam imagens nem relações e sempre nascem como rascunho sob consulta.</p></div></div>
        <div className={styles.formActions}>
          <form action={duplicateProductAction}><input name="id" type="hidden" value={product.id} /><AdminSubmitButton pendingLabel="Duplicando..." variant="secondary">Duplicar produto</AdminSubmitButton></form>
          {product.archived_at ? (
            <form action={restoreProductAction}><input name="id" type="hidden" value={product.id} /><AdminSubmitButton pendingLabel="Restaurando..." variant="secondary">Restaurar produto</AdminSubmitButton></form>
          ) : (
            <form action={archiveProductAction}><input name="id" type="hidden" value={product.id} /><input name="return_to" type="hidden" value="/admin/produtos" /><ConfirmSubmitButton confirmation="Arquivar este produto e despublicá-lo?">Arquivar produto</ConfirmSubmitButton></form>
          )}
        </div>
      </section>
    </>
  );
}
