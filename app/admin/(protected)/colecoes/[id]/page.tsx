import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminSubmitButton, ConfirmSubmitButton } from "@/components/admin/admin-form-controls";
import styles from "@/components/admin/admin.module.css";
import { AdminFeedback, AdminPageHeader, AdminStatus, AdminTable } from "@/components/admin/admin-ui";
import { CollectionEditorForm } from "@/components/admin/collection-editor-form";
import { CollectionHomePreview } from "@/components/admin/collection-home-preview";
import { ImageFocusInput } from "@/components/admin/image-focus-input";
import { OrderedProductPicker } from "@/components/admin/ordered-product-picker";
import { HomeCollectionSection } from "@/components/home-collection-section";
import { dateTimeInputValue, formatAdminDate } from "@/lib/admin/format";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { getPublishedCatalogProductsByIds } from "@/lib/catalog/data";
import type { PublishedHomeCollection } from "@/lib/collections/home";
import { COLLECTION_HOME_VARIANT_LABELS, COLLECTION_HOME_VARIANT_VALUES, getCollectionPlacement, type CollectionHomeVariant } from "@/lib/content-placements";
import { createAdminImageUrl } from "@/lib/storage/images";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  deleteCollectionAction,
  publishCollectionRevisionAction,
  removeCollectionCoverAction,
  rollbackCollectionRevisionAction,
  unpublishCollectionHomeAction,
  uploadCollectionCoverAction,
} from "../actions";

export default async function EditCollectionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; status?: string }> }) {
  await requireAdminRole(["admin", "editor"]);
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const [collectionResult, productsResult, relationsResult, galleriesResult, publicationsResult] = await Promise.all([
    supabase.from("collections").select("*").eq("id", id).maybeSingle(),
    supabase.from("products").select("id, name, sku").is("archived_at", null).order("name").limit(500),
    supabase.from("collection_products").select("product_id, display_order").eq("collection_id", id).order("display_order"),
    supabase.from("galleries").select("id, name, route_key, placement_key").eq("route_key", "home").eq("placement_key", "featured_collection").order("name"),
    supabase.from("collection_publications").select("id, revision, active, published_at, home_variant, home_title").eq("collection_id", id).order("revision", { ascending: false }),
  ]);
  if (collectionResult.error || !collectionResult.data) notFound();
  if (productsResult.error || relationsResult.error || galleriesResult.error || publicationsResult.error || !productsResult.data || !relationsResult.data || !galleriesResult.data || !publicationsResult.data) {
    throw new Error("Não foi possível carregar o editor da coleção.");
  }
  const collection = collectionResult.data;
  const homePlacement = getCollectionPlacement("featured_collection");
  const allowedVariants = COLLECTION_HOME_VARIANT_VALUES.filter((variant) => (
    (homePlacement?.variants as readonly string[] | undefined)?.includes(variant)
  )) as CollectionHomeVariant[];
  const selectedVariant = (collection.home_variant ?? "editorial-protagonist") as CollectionHomeVariant;
  const query = await searchParams;
  const coverUrl = await createAdminImageUrl("site-galleries", collection.cover_path);
  const previewProducts = await getPublishedCatalogProductsByIds(relationsResult.data.map((relation) => relation.product_id));
  const canPreview = Boolean(
    collection.home_enabled && collection.home_variant && collection.home_title && collection.home_description && collection.home_cta_label && collection.home_cta_target,
  );
  const preview: PublishedHomeCollection | null = canPreview ? {
    cover: collection.cover_alt_text && collection.cover_asset_version && collection.cover_width && collection.cover_height ? {
      altText: collection.cover_alt_text,
      assetVersion: collection.cover_asset_version,
      blurDataUrl: collection.cover_blur_data_url,
      desktopObjectPosition: collection.cover_desktop_object_position,
      desktopScale: Number(collection.cover_desktop_scale),
      height: collection.cover_height,
      mobileObjectPosition: collection.cover_mobile_object_position,
      mobileScale: Number(collection.cover_mobile_scale),
      publicationId: collection.id,
      width: collection.cover_width,
    } : null,
    cta: { label: collection.home_cta_label!, target: collection.home_cta_target! as PublishedHomeCollection["cta"]["target"] },
    description: collection.home_description!,
    galleryId: collection.home_gallery_id,
    id: collection.id,
    placementKey: collection.home_placement_key ?? "featured_collection",
    products: previewProducts,
    slug: collection.slug,
    title: collection.home_title!,
    variant: collection.home_variant! as PublishedHomeCollection["variant"],
  } : null;
  const activePublication = publicationsResult.data.find((publication) => publication.active) ?? null;

  return (
    <>
      <AdminPageHeader eyebrow="Coleções" description="Monte a seleção, escolha como ela aparece e publique somente depois de conferir a prévia." title={collection.name} />
      <AdminFeedback error={query.error} status={query.status} />
      <div className={styles.adminToolbar}>
        <Link className={styles.buttonLink} href="/admin/colecoes" prefetch={false}>Voltar para coleções</Link>
        <AdminStatus active={Boolean(activePublication)} trueLabel="Ativa na home" falseLabel={collection.published ? "Visível no catálogo" : "Rascunho"} />
      </div>

      <section className={styles.formPanel} aria-labelledby="collection-data-title">
        <StepHeading description="Defina o nome, a descrição e onde esta seleção será usada." number="1" title="Informações e visibilidade" />
        <CollectionEditorForm
          allowedVariants={allowedVariants}
          galleryOptions={galleriesResult.data.map((gallery) => ({ id: gallery.id, name: gallery.name }))}
          initial={{
            description: collection.description ?? "",
            displayOrder: collection.display_order,
            endsAt: dateTimeInputValue(collection.ends_at),
            featured: collection.featured,
            homeCtaLabel: collection.home_cta_label ?? "",
            homeCtaTarget: collection.home_cta_target ?? "collection",
            homeDescription: collection.home_description ?? "",
            homeEnabled: collection.home_enabled,
            homeGalleryId: collection.home_gallery_id ?? "",
            homeTitle: collection.home_title ?? "",
            homeVariant: selectedVariant,
            id: collection.id,
            name: collection.name,
            published: collection.published,
            slug: collection.slug,
            startsAt: dateTimeInputValue(collection.starts_at),
          }}
          variantLabels={COLLECTION_HOME_VARIANT_LABELS}
        />
      </section>

      <section className={styles.formPanel} aria-labelledby="collection-cover-title">
        <StepHeading description="Toque no ponto principal da foto e confira separadamente o celular e o computador." number="2" title="Capa e enquadramento" />
        <form action={uploadCollectionCoverAction} className={styles.adminForm}>
          <input name="collection_id" type="hidden" value={collection.id} />
          <ImageFocusInput
            alt={collection.cover_alt_text ?? "Prévia da capa da coleção"}
            aspectRatios={{ desktop: "16 / 9", mobile: "3 / 4" }}
            fileInput={{ id: "collection-cover", name: "file", required: !collection.cover_path }}
            initialDesktopPosition={collection.cover_desktop_object_position}
            initialDesktopScale={Number(collection.cover_desktop_scale)}
            initialImageUrl={coverUrl}
            initialMobilePosition={collection.cover_mobile_object_position}
            initialMobileScale={Number(collection.cover_mobile_scale)}
            positionNames={{ desktop: "cover_desktop_object_position", mobile: "cover_mobile_object_position" }}
            scaleNames={{ desktop: "cover_desktop_scale", mobile: "cover_mobile_scale" }}
          />
          <AdminSubmitButton pendingLabel="Salvando capa...">{collection.cover_path ? "Salvar capa e enquadramento" : "Enviar capa"}</AdminSubmitButton>
        </form>
        {collection.cover_path ? (
          <details className={styles.adminDetails}>
            <summary>Remover a capa</summary>
            <div className={styles.destructiveActions}><p>Remover a capa também retira a coleção publicada do catálogo.</p><form action={removeCollectionCoverAction}><input name="collection_id" type="hidden" value={collection.id} /><ConfirmSubmitButton confirmation="Remover a capa e despublicar a coleção do catálogo?">Remover capa</ConfirmSubmitButton></form></div>
          </details>
        ) : null}
      </section>

      <section className={styles.formPanel} aria-labelledby="collection-products-title">
        <StepHeading description="Adicione os produtos e use os botões para definir a sequência. A ordem é salva a cada mudança." number="3" title="Produtos da coleção" />
        <OrderedProductPicker entityId={collection.id} initialIds={relationsResult.data.map((relation) => relation.product_id)} kind="collection" products={productsResult.data} />
      </section>

      <section className={styles.formPanel} aria-labelledby="collection-preview-title-section">
        <StepHeading description="Esta é a composição pública usando o rascunho que já foi salvo." number="4" title="Conferir a prévia" />
        {preview ? <CollectionHomePreview><HomeCollectionSection collection={preview} previewCoverUrl={coverUrl} /></CollectionHomePreview> : (
          <div className={styles.emptyPreviewGuide}>
            <strong>A prévia aparece depois que o rascunho estiver completo.</strong>
            <ul><li>Ative a página inicial na etapa 1.</li><li>Escolha a composição e preencha título, texto e botão.</li><li>Salve o rascunho. Para a composição editorial, escolha também uma galeria.</li></ul>
          </div>
        )}
      </section>

      <section className={styles.formPanel} aria-labelledby="collection-publication-title">
        <div className={styles.stepHeadingRow}>
          <StepHeading description="A publicação só substitui a versão atual quando todas as validações forem aprovadas." number="5" title="Publicar" />
          <AdminStatus active={Boolean(activePublication)} trueLabel="Versão ativa" falseLabel="Sem versão ativa" />
        </div>
        <div className={styles.formActions}>
          <form action={publishCollectionRevisionAction}><input name="collection_id" type="hidden" value={collection.id} /><AdminSubmitButton pendingLabel="Conferindo publicação...">Conferir e publicar na home</AdminSubmitButton></form>
          {activePublication ? <form action={unpublishCollectionHomeAction}><input name="collection_id" type="hidden" value={collection.id} /><ConfirmSubmitButton confirmation="Retirar esta coleção da home? O histórico será preservado.">Retirar da home</ConfirmSubmitButton></form> : null}
        </div>
        {publicationsResult.data.length ? (
          <details className={styles.adminDetails}>
            <summary>Ver histórico de versões</summary>
            <AdminTable label="Histórico de versões da coleção"><thead><tr><th>Versão</th><th>Composição</th><th>Título</th><th>Publicada em</th><th>Estado</th><th>Ação</th></tr></thead><tbody>{publicationsResult.data.map((publication) => <tr key={publication.id}><td>#{publication.revision}</td><td>{publication.home_variant ? COLLECTION_HOME_VARIANT_LABELS[publication.home_variant as CollectionHomeVariant] : "—"}</td><td>{publication.home_title ?? "—"}</td><td>{formatAdminDate(publication.published_at)}</td><td><AdminStatus active={publication.active} trueLabel="Ativa" falseLabel="Anterior" /></td><td>{publication.active ? "—" : <form action={rollbackCollectionRevisionAction}><input name="collection_id" type="hidden" value={collection.id} /><input name="publication_id" type="hidden" value={publication.id} /><AdminSubmitButton pendingLabel="Restaurando..." variant="secondary">Restaurar</AdminSubmitButton></form>}</td></tr>)}</tbody></AdminTable>
          </details>
        ) : null}
      </section>

      <details className={`${styles.adminDetails} ${styles.dangerZone}`}>
        <summary>Excluir esta coleção</summary>
        <div className={styles.destructiveActions}><p>Remova a capa antes de excluir. Esta ação não pode ser desfeita.</p><form action={deleteCollectionAction}><input name="id" type="hidden" value={collection.id} /><ConfirmSubmitButton confirmation="Excluir esta coleção sem capa?">Excluir coleção</ConfirmSubmitButton></form></div>
      </details>
    </>
  );
}

function StepHeading({ description, number, title }: { description: string; number: string; title: string }) {
  const ids: Record<string, string> = { "1": "collection-data-title", "2": "collection-cover-title", "3": "collection-products-title", "4": "collection-preview-title-section", "5": "collection-publication-title" };
  return <div className={styles.formSectionHeading}><span aria-hidden="true">{number}</span><div><h2 id={ids[number]}>{title}</h2><p>{description}</p></div></div>;
}
