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

import { deleteCollectionAction, removeCollectionCoverAction, updateCollectionAction, uploadCollectionCoverAction } from "../actions";

export default async function EditCollectionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; status?: string }> }) {
  await requireAdminRole(["admin", "editor"]);
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const [collectionResult, productsResult, relationsResult] = await Promise.all([
    supabase.from("collections").select("*").eq("id", id).maybeSingle(),
    supabase.from("products").select("id, name, sku").is("archived_at", null).order("name").limit(500),
    supabase.from("collection_products").select("product_id, display_order").eq("collection_id", id).order("display_order"),
  ]);
  if (collectionResult.error || !collectionResult.data) notFound();
  if (productsResult.error || relationsResult.error || !productsResult.data || !relationsResult.data) throw new Error("Não foi possível carregar o editor da coleção.");
  const collection = collectionResult.data;
  const query = await searchParams;
  const coverUrl = await createAdminImageUrl("site-galleries", collection.cover_path);
  return (
    <>
      <AdminPageHeader eyebrow="Coleções" description="Capa, conteúdo, produtos e ordem permanecem reunidos neste editor." title={collection.name} />
      <AdminFeedback error={query.error} status={query.status} />
      <div className={styles.adminToolbar}><Link className={styles.buttonLink} href="/admin/colecoes" prefetch={false}>Voltar para coleções</Link><AdminStatus active={collection.published} trueLabel={collection.featured ? "Publicada · destaque" : "Publicada"} falseLabel="Rascunho" /></div>
      <section className={styles.formPanel} aria-labelledby="collection-data-title">
        <div className={styles.panelHeading}><h2 id="collection-data-title">Dados editoriais</h2><p>Publicação exige capa completa.</p></div>
        <form action={updateCollectionAction} className={styles.adminForm}>
          <input name="id" type="hidden" value={collection.id} />
          <div className={styles.formGrid}>
            <label className={styles.field}><span>Nome</span><input defaultValue={collection.name} maxLength={160} name="name" required /></label>
            <label className={styles.field}><span>Slug</span><input defaultValue={collection.slug} maxLength={120} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label>
            <label className={`${styles.field} ${styles.fieldWide}`}><span>Descrição</span><textarea defaultValue={collection.description ?? ""} maxLength={1000} name="description" /></label>
            <label className={styles.field}><span>Início opcional</span><input defaultValue={dateTimeInputValue(collection.starts_at)} name="starts_at" type="datetime-local" /></label>
            <label className={styles.field}><span>Fim opcional</span><input defaultValue={dateTimeInputValue(collection.ends_at)} name="ends_at" type="datetime-local" /></label>
            <label className={styles.field}><span>Ordem</span><input defaultValue={collection.display_order} min="0" name="display_order" required type="number" /></label>
            <label className={styles.checkboxField}><input defaultChecked={collection.published} name="published" type="checkbox" /><span>Publicada</span></label>
            <label className={styles.checkboxField}><input defaultChecked={collection.featured} name="featured" type="checkbox" /><span>Destaque</span></label>
          </div>
          <AdminSubmitButton>Salvar coleção</AdminSubmitButton>
        </form>
      </section>
      <section className={styles.formPanel} aria-labelledby="collection-cover-title">
        <div className={styles.panelHeading}><div><h2 id="collection-cover-title">Capa</h2><p>Arquivo privado com alt e enquadramento persistidos.</p></div></div>
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived private Storage URL.
          <img alt={collection.cover_alt_text ?? ""} className={styles.imagePreview} src={coverUrl} style={{ objectPosition: collection.cover_object_position }} />
        ) : null}
        <form action={uploadCollectionCoverAction} className={styles.adminForm}>
          <input name="collection_id" type="hidden" value={collection.id} />
          <div className={styles.formGrid}>
            <label className={styles.field}><span>Texto alternativo</span><input defaultValue={collection.cover_alt_text ?? ""} maxLength={220} name="cover_alt_text" required /></label>
            <label className={styles.field}><span>Object-position</span><input defaultValue={collection.cover_object_position} name="cover_object_position" pattern="(?:\d{1,3}%|left|center|right) (?:\d{1,3}%|top|center|bottom)" required /></label>
            <div className={styles.fieldWide}><FilePreviewInput id="collection-cover" name="file" required /></div>
          </div>
          <AdminSubmitButton pendingLabel="Enviando capa...">{collection.cover_path ? "Substituir capa" : "Enviar capa"}</AdminSubmitButton>
        </form>
        {collection.cover_path ? <form action={removeCollectionCoverAction} className={styles.dangerZone}><input name="collection_id" type="hidden" value={collection.id} /><ConfirmSubmitButton confirmation="Remover a capa e despublicar esta coleção?">Remover capa</ConfirmSubmitButton></form> : null}
      </section>
      <section className={styles.formPanel} aria-labelledby="collection-products-title">
        <div className={styles.panelHeading}><div><h2 id="collection-products-title">Produtos relacionados</h2><p>A ordem abaixo será a ordem editorial da coleção.</p></div></div>
        <OrderedProductPicker entityId={collection.id} initialIds={relationsResult.data.map((relation) => relation.product_id)} kind="collection" products={productsResult.data} />
      </section>
      <section className={styles.dangerZone} aria-labelledby="delete-collection-title">
        <div className={styles.panelHeading}><div><h2 id="delete-collection-title">Excluir coleção</h2><p>Remova a capa primeiro. Relações com produtos serão removidas em cascata.</p></div></div>
        <form action={deleteCollectionAction}><input name="id" type="hidden" value={collection.id} /><ConfirmSubmitButton confirmation="Excluir esta coleção sem capa?">Excluir coleção</ConfirmSubmitButton></form>
      </section>
    </>
  );
}
