import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminSubmitButton, ConfirmSubmitButton } from "@/components/admin/admin-form-controls";
import styles from "@/components/admin/admin.module.css";
import { AdminFeedback, AdminPageHeader, AdminStatus } from "@/components/admin/admin-ui";
import { ProductForm } from "@/components/admin/product-form";
import { ProductImageManager } from "@/components/admin/product-image-manager";
import { ProductImageUploader } from "@/components/admin/product-image-uploader";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { PRODUCT_IMAGE_VARIANT_KINDS } from "@/lib/catalog/image-variants";
import { createAdminImageUrls } from "@/lib/storage/images";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { archiveProductAction, duplicateProductAction, restoreProductAction, updateProductAction } from "../actions";

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
  const [productResult, brandResult, categoryResult, imageResult, styleResult, productStyleResult] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase.from("brands").select("id, name, active").order("name"),
    supabase.from("categories").select("id, name, active").order("name"),
    supabase
      .from("product_images")
      .select("id, alt_text, object_position, is_cover, storage_path, width, height, mime_type, size_bytes, asset_version, display_order, variants:product_image_variants(kind, storage_path, width, height, mime_type, size_bytes, asset_version)")
      .eq("product_id", id)
      .order("display_order"),
    supabase.from("styles").select("id, label, description, active").order("display_order"),
    supabase.from("product_styles").select("style_id, is_primary, is_featured, display_order").eq("product_id", id).order("display_order"),
  ]);
  if (productResult.error || !productResult.data) notFound();
  if (brandResult.error || categoryResult.error || imageResult.error || !brandResult.data || !categoryResult.data || !imageResult.data) {
    throw new Error("Não foi possível carregar o editor do produto.");
  }
  const product = productResult.data;
  const query = await searchParams;
  const previewPaths = imageResult.data.map((image) => {
    const thumbnail = image.variants.find(
      (variant) => variant.kind === "admin_thumbnail" && variant.asset_version === image.asset_version,
    );
    return thumbnail?.storage_path ?? image.storage_path;
  });
  const signed = await createAdminImageUrls("catalog-products", previewPaths);
  const images = imageResult.data.map((image) => ({
    altText: image.alt_text,
    height: image.height,
    id: image.id,
    isCover: image.is_cover,
    mimeType: image.mime_type,
    objectPosition: image.object_position,
    signedUrl: signed.get(
      image.variants.find(
        (variant) => variant.kind === "admin_thumbnail" && variant.asset_version === image.asset_version,
      )?.storage_path ?? image.storage_path,
    ) ?? null,
    sizeBytes: image.size_bytes,
    variants: image.variants.filter((variant) => variant.asset_version === image.asset_version),
    width: image.width,
  }));
  const hasCover = imageResult.data.some((image) => {
    const kinds = new Set(
      image.variants
        .filter((variant) => variant.asset_version === image.asset_version)
        .map((variant) => variant.kind),
    );
    return image.is_cover
      && image.width
      && image.height
      && image.mime_type
      && image.size_bytes
      && image.alt_text.trim()
      && PRODUCT_IMAGE_VARIANT_KINDS.every((kind) => kinds.has(kind));
  });
  const linkedBrand = brandResult.data.find((brand) => brand.id === product.brand_id);
  const linkedCategory = categoryResult.data.find((category) => category.id === product.category_id);
  const blockingIssues = [
    ...(!product.name.trim() ? ["nome ausente"] : []),
    ...(!hasCover ? ["capa completa ausente"] : []),
    ...(linkedBrand && !linkedBrand.active ? ["marca vinculada inativa"] : []),
    ...(linkedCategory && !linkedCategory.active ? ["categoria vinculada inativa"] : []),
  ];
  const editorialIndicators = [
    ...(!product.brand_id ? ["sem marca vinculada"] : []),
    ...(!product.category_id ? ["sem categoria vinculada"] : []),
  ];
  const styleSchemaAvailable = !styleResult.error && !productStyleResult.error;
  const styleOptions = styleSchemaAvailable ? styleResult.data ?? [] : [];
  const styleAssignments = styleSchemaAvailable
    ? (productStyleResult.data ?? []).map((assignment) => ({
        displayOrder: assignment.display_order,
        isFeatured: assignment.is_featured,
        isPrimary: assignment.is_primary,
        styleId: assignment.style_id,
      }))
    : [];
  const hasActiveStyle = styleAssignments.some((assignment) => styleOptions.some((style) => style.id === assignment.styleId && style.active));
  const styleEligibilityReasons = [
    ...(!hasActiveStyle ? ["sem estilo ativo"] : []),
    ...(!hasCover ? ["sem capa publicada"] : []),
    ...(product.archived_at ? ["produto arquivado"] : []),
    ...(!product.published ? ["produto não publicado"] : []),
  ];

  return (
    <>
      <AdminPageHeader eyebrow="Produtos" description="Edite dados, publicação e mídia. Toda mudança é autorizada no servidor e registrada na auditoria." title={product.name} />
      <AdminFeedback error={query.error} status={query.status} />
      <div className={styles.adminToolbar}>
        <div className={styles.toolbarActions}><Link className={styles.buttonLink} href="/admin/produtos" prefetch={false}>Voltar para produtos</Link><Link className={styles.buttonLink} href="/admin/disponibilidade" prefetch={false}>Disponibilidade rápida</Link>{product.published && !product.archived_at && hasCover ? <Link className={styles.buttonLink} href={`/catalogo/${product.slug}`} target="_blank">Ver página pública</Link> : null}</div>
        <AdminStatus active={product.published && !product.archived_at} trueLabel={product.featured ? "Publicado · destaque" : "Publicado"} falseLabel={product.archived_at ? "Arquivado" : "Rascunho"} />
      </div>

      {product.archived_at ? <p className={styles.notice}>Produto arquivado. Restaure-o antes de editar ou publicar.</p> : null}
      {!product.archived_at && (blockingIssues.length || editorialIndicators.length) ? (
        <p className={styles.notice}>
          <strong>Prontidão do catálogo:</strong>{" "}
          {blockingIssues.length ? `corrija antes de publicar: ${blockingIssues.join(", ")}.` : "validações obrigatórias atendidas."}
          {editorialIndicators.length ? ` Indicadores editoriais: ${editorialIndicators.join(", ")}.` : ""}
        </p>
      ) : null}
      <section className={styles.formPanel} aria-labelledby="product-data-title">
        <div className={styles.panelHeading}><h2 id="product-data-title">Cadastro do produto</h2><p>Identificação, apresentação, contato e publicação em uma sequência simples.</p></div>
        <ProductForm action={updateProductAction} archived={Boolean(product.archived_at)} brands={brandResult.data} categories={categoryResult.data} defaults={product} editing styleAssignments={styleAssignments} styleEligibilityReasons={styleEligibilityReasons} styleOptions={styleOptions} />
      </section>

      {!product.archived_at ? (
        <section className={styles.formPanel} aria-labelledby="product-upload-title">
          <div className={styles.panelHeading}><div><h2 id="product-upload-title">Adicionar imagens</h2><p>A primeira imagem será usada como capa quando ainda não houver uma capa definida.</p></div></div>
          <ProductImageUploader productId={product.id} />
        </section>
      ) : null}

      <section className={styles.formPanel} aria-labelledby="product-images-title">
        <div className={styles.panelHeading}><div><h2 id="product-images-title">Imagens do produto</h2><p>Arraste ou use os botões para ordenar. Escolha uma única imagem de capa.</p></div><span className={styles.phaseBadge}>{images.length} imagens</span></div>
        <ProductImageManager images={images} productId={product.id} readOnly={Boolean(product.archived_at)} />
      </section>

      <section className={styles.dangerZone} aria-labelledby="product-actions-title">
        <div className={styles.panelHeading}><div><h2 id="product-actions-title">Outras ações</h2><p>Duplicações não copiam imagens e sempre nascem como rascunho no final da vitrine.</p></div></div>
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
