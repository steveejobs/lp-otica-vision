import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminSubmitButton, ConfirmSubmitButton } from "@/components/admin/admin-form-controls";
import { CollectionHomePreview } from "@/components/admin/collection-home-preview";
import styles from "@/components/admin/admin.module.css";
import { AdminFeedback, AdminPageHeader, AdminStatus, AdminTable } from "@/components/admin/admin-ui";
import { FilePreviewInput } from "@/components/admin/file-preview-input";
import { HomeCollectionSection } from "@/components/home-collection-section";
import { OrderedProductPicker } from "@/components/admin/ordered-product-picker";
import { dateTimeInputValue, formatAdminDate } from "@/lib/admin/format";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { getPublishedCatalogProductsByIds } from "@/lib/catalog/data";
import type { PublishedHomeCollection } from "@/lib/collections/home";
import { COLLECTION_HOME_VARIANT_LABELS, COLLECTION_HOME_VARIANT_VALUES, getCollectionPlacement } from "@/lib/content-placements";
import { createAdminImageUrl } from "@/lib/storage/images";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  deleteCollectionAction,
  publishCollectionRevisionAction,
  removeCollectionCoverAction,
  rollbackCollectionRevisionAction,
  unpublishCollectionHomeAction,
  updateCollectionAction,
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
  ));
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
      <AdminPageHeader eyebrow="Coleções" description="Rascunho, revisão ativa e retorno seguro permanecem separados." title={collection.name} />
      <AdminFeedback error={query.error} status={query.status} />
      <div className={styles.adminToolbar}>
        <Link className={styles.buttonLink} href="/admin/colecoes" prefetch={false}>Voltar para coleções</Link>
        <AdminStatus active={Boolean(activePublication)} trueLabel="Revisão da home ativa" falseLabel={collection.published ? "Publicada no catálogo" : "Rascunho"} />
      </div>

      <section className={styles.formPanel} aria-labelledby="collection-data-title">
        <div className={styles.panelHeading}><div><h2 id="collection-data-title">Dados editoriais</h2><p>Salvar altera apenas o rascunho da seção. A home só muda em “Publicar revisão”.</p></div></div>
        <form action={updateCollectionAction} className={styles.adminForm}>
          <input name="id" type="hidden" value={collection.id} />
          <div className={styles.formGrid}>
            <label className={styles.field}><span>Nome</span><input defaultValue={collection.name} maxLength={160} name="name" required /></label>
            <label className={styles.field}><span>Slug</span><input defaultValue={collection.slug} maxLength={120} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label>
            <label className={`${styles.field} ${styles.fieldWide}`}><span>Descrição interna e do catálogo</span><textarea defaultValue={collection.description ?? ""} maxLength={1000} name="description" /></label>
            <label className={styles.field}><span>Início opcional</span><input defaultValue={dateTimeInputValue(collection.starts_at)} name="starts_at" type="datetime-local" /></label>
            <label className={styles.field}><span>Fim opcional</span><input defaultValue={dateTimeInputValue(collection.ends_at)} name="ends_at" type="datetime-local" /></label>
            <label className={styles.field}><span>Ordem no catálogo</span><input defaultValue={collection.display_order} min="0" name="display_order" required type="number" /></label>
            <label className={styles.checkboxField}><input defaultChecked={collection.published} name="published" type="checkbox" /><span>Publicada no catálogo</span></label>
            <label className={styles.checkboxField}><input defaultChecked={collection.featured} name="featured" type="checkbox" /><span>Destaque no catálogo</span></label>
            <label className={`${styles.checkboxField} ${styles.fieldWide}`}><input defaultChecked={collection.home_enabled} name="home_enabled" type="checkbox" /><span>Exibir na home após publicar revisão</span></label>
            <label className={styles.field}><span>Posição na home</span><select defaultValue={collection.home_placement_key ?? "featured_collection"} name="home_placement_key">{homePlacement ? <option value={homePlacement.placementKey}>{homePlacement.label}</option> : <option disabled value="">Posição indisponível</option>}</select></label>
            <label className={styles.field}><span>Variante visual</span><select defaultValue={collection.home_variant ?? "editorial-protagonist"} name="home_variant">{allowedVariants.map((value) => <option key={value} value={value}>{COLLECTION_HOME_VARIANT_LABELS[value]}</option>)}</select></label>
            <label className={styles.field}><span>Galeria editorial</span><select defaultValue={collection.home_gallery_id ?? ""} name="home_gallery_id"><option value="">Selecione para a variante editorial</option>{galleriesResult.data.map((gallery) => <option key={gallery.id} value={gallery.id}>{gallery.name}</option>)}</select></label>
            <label className={`${styles.field} ${styles.fieldWide}`}><span>Título público</span><input defaultValue={collection.home_title ?? ""} maxLength={160} name="home_title" /></label>
            <label className={`${styles.field} ${styles.fieldWide}`}><span>Texto curto público</span><textarea defaultValue={collection.home_description ?? ""} maxLength={340} name="home_description" /></label>
            <label className={styles.field}><span>CTA</span><input defaultValue={collection.home_cta_label ?? ""} maxLength={80} name="home_cta_label" /></label>
            <label className={styles.field}><span>Destino do CTA</span><select defaultValue={collection.home_cta_target ?? "collection"} name="home_cta_target"><option value="collection">Ver coleção no catálogo</option><option value="catalog">Ver catálogo geral</option><option value="instagram">Ver Instagram</option><option value="whatsapp">WhatsApp</option></select></label>
          </div>
          <AdminSubmitButton>Salvar rascunho</AdminSubmitButton>
        </form>
      </section>

      <section className={styles.formPanel} aria-labelledby="collection-cover-title">
        <div className={styles.panelHeading}><div><h2 id="collection-cover-title">Capa e enquadramento</h2><p>Obrigatória para díptico e capa cinematográfica. Derivados ficam privados e são servidos pelo proxy público.</p></div></div>
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived private Storage URL in the ADM preview.
          <img alt={collection.cover_alt_text ?? ""} className={styles.imagePreview} src={coverUrl} style={{ objectPosition: collection.cover_desktop_object_position }} />
        ) : null}
        <form action={uploadCollectionCoverAction} className={styles.adminForm}>
          <input name="collection_id" type="hidden" value={collection.id} />
          <div className={styles.formGrid}>
            <label className={styles.field}><span>Texto alternativo</span><input defaultValue={collection.cover_alt_text ?? ""} maxLength={220} name="cover_alt_text" required /></label>
            <label className={styles.field}><span>Foco mobile</span><input defaultValue={collection.cover_mobile_object_position} name="cover_mobile_object_position" pattern="(?:\d{1,3}%|left|center|right) (?:\d{1,3}%|top|center|bottom)" required /></label>
            <label className={styles.field}><span>Foco desktop</span><input defaultValue={collection.cover_desktop_object_position} name="cover_desktop_object_position" pattern="(?:\d{1,3}%|left|center|right) (?:\d{1,3}%|top|center|bottom)" required /></label>
            <label className={styles.field}><span>Escala mobile</span><input defaultValue={collection.cover_mobile_scale} max="1.40" min="0.80" name="cover_mobile_scale" required step="0.01" type="number" /></label>
            <label className={styles.field}><span>Escala desktop</span><input defaultValue={collection.cover_desktop_scale} max="1.40" min="0.80" name="cover_desktop_scale" required step="0.01" type="number" /></label>
            <div className={styles.fieldWide}><FilePreviewInput id="collection-cover" name="file" required /></div>
          </div>
          <AdminSubmitButton pendingLabel="Enviando capa...">{collection.cover_path ? "Substituir capa" : "Enviar capa"}</AdminSubmitButton>
        </form>
        {collection.cover_path ? <form action={removeCollectionCoverAction} className={styles.dangerZone}><input name="collection_id" type="hidden" value={collection.id} /><ConfirmSubmitButton confirmation="Remover a capa e despublicar a coleção do catálogo?">Remover capa</ConfirmSubmitButton></form> : null}
      </section>

      {preview ? <CollectionHomePreview><HomeCollectionSection collection={preview} previewCoverUrl={coverUrl} /></CollectionHomePreview> : <p className={styles.notice}>Ative “Exibir na home” e preencha título, texto, CTA e variante para visualizar a seção pública.</p>}

      <section className={styles.formPanel} aria-labelledby="collection-publication-title">
        <div className={styles.panelHeading}><div><h2 id="collection-publication-title">Publicação e histórico</h2><p>Uma edição incompleta não substitui a última revisão válida.</p></div><AdminStatus active={Boolean(activePublication)} trueLabel="Ativa" falseLabel="Sem revisão ativa" /></div>
        <div className={styles.formActions}>
          <form action={publishCollectionRevisionAction}><input name="collection_id" type="hidden" value={collection.id} /><AdminSubmitButton pendingLabel="Validando publicação...">Publicar revisão da home</AdminSubmitButton></form>
          {activePublication ? <form action={unpublishCollectionHomeAction}><input name="collection_id" type="hidden" value={collection.id} /><ConfirmSubmitButton confirmation="Retirar esta coleção da home? O histórico será preservado para rollback.">Retirar da home</ConfirmSubmitButton></form> : null}
        </div>
        {publicationsResult.data.length ? <AdminTable label="Histórico de revisões da coleção"><thead><tr><th>Revisão</th><th>Variante</th><th>Título</th><th>Publicada em</th><th>Estado</th><th>Ação</th></tr></thead><tbody>{publicationsResult.data.map((publication) => <tr key={publication.id}><td>#{publication.revision}</td><td>{publication.home_variant ?? "—"}</td><td>{publication.home_title ?? "—"}</td><td>{formatAdminDate(publication.published_at)}</td><td><AdminStatus active={publication.active} trueLabel="Ativa" falseLabel="Histórico" /></td><td>{publication.active ? "—" : <form action={rollbackCollectionRevisionAction}><input name="collection_id" type="hidden" value={collection.id} /><input name="publication_id" type="hidden" value={publication.id} /><AdminSubmitButton pendingLabel="Restaurando..." variant="secondary">Restaurar</AdminSubmitButton></form>}</td></tr>)}</tbody></AdminTable> : null}
      </section>

      <section className={styles.formPanel} aria-labelledby="collection-products-title">
        <div className={styles.panelHeading}><div><h2 id="collection-products-title">Produtos relacionados</h2><p>A ordem salva aqui é registrada na revisão publicada.</p></div></div>
        <OrderedProductPicker entityId={collection.id} initialIds={relationsResult.data.map((relation) => relation.product_id)} kind="collection" products={productsResult.data} />
      </section>

      <section className={styles.dangerZone} aria-labelledby="delete-collection-title">
        <div className={styles.panelHeading}><div><h2 id="delete-collection-title">Excluir coleção</h2><p>Remova a capa antes de excluir. Revisões e relações serão preservadas até a exclusão ser permitida pelo banco.</p></div></div>
        <form action={deleteCollectionAction}><input name="id" type="hidden" value={collection.id} /><ConfirmSubmitButton confirmation="Excluir esta coleção sem capa?">Excluir coleção</ConfirmSubmitButton></form>
      </section>
    </>
  );
}
