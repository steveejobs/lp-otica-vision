import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminSubmitButton, ConfirmSubmitButton } from "@/components/admin/admin-form-controls";
import styles from "@/components/admin/admin.module.css";
import { AdminFeedback, AdminPageHeader, AdminStatus } from "@/components/admin/admin-ui";
import { FilePreviewInput } from "@/components/admin/file-preview-input";
import { GalleryItemManager } from "@/components/admin/gallery-item-manager";
import { GalleryLocationCard } from "@/components/admin/gallery-location-card";
import { GALLERY_LOCATIONS, getGalleryLocation } from "@/lib/admin/gallery-locations";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { createAdminImageUrls } from "@/lib/storage/images";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { deleteGalleryAction, publishGalleryAction, updateGalleryAction, uploadGalleryItemsAction } from "../actions";

export default async function EditGalleryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; status?: string }> }) {
  await requireAdminRole(["admin", "editor"]);
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const [galleryResult, itemResult] = await Promise.all([
    supabase.from("galleries").select("*").eq("id", id).maybeSingle(),
    supabase.from("gallery_items").select("*").eq("gallery_id", id).order("display_order"),
  ]);
  if (galleryResult.error || !galleryResult.data) notFound();
  if (itemResult.error || !itemResult.data) throw new Error("Não foi possível carregar os itens da galeria.");
  const gallery = galleryResult.data;
  const query = await searchParams;
  const signed = await createAdminImageUrls("site-galleries", itemResult.data.map((item) => {
    const manifest = item.media_manifest as { thumbnail?: { path?: string } } | null;
    return manifest?.thumbnail?.path ?? item.storage_path;
  }));
  const items = itemResult.data.map((item) => ({
    altText: item.alt_text,
    desktopObjectPosition: item.desktop_object_position,
    height: item.height,
    id: item.id,
    mobileObjectPosition: item.mobile_object_position,
    published: item.published,
    editorialRole: item.editorial_role as "primary" | "secondary" | "detail",
    backgroundColor: item.background_color,
    desktopScale: Number(item.desktop_scale),
    mobileScale: Number(item.mobile_scale),
    seriesOrder: item.series_order,
    signedUrl: signed.get(((item.media_manifest as { thumbnail?: { path?: string } } | null)?.thumbnail?.path ?? item.storage_path)) ?? null,
    visualSeries: item.visual_series,
    width: item.width,
  }));
  return (
    <>
      <AdminPageHeader eyebrow="Galerias" description={gallery.route_key === "home" && gallery.placement_key === "hero" ? "Primeira seção da página inicial" : "Ordem, enquadramento e publicação editorial."} title={gallery.route_key === "home" && gallery.placement_key === "hero" ? "Home › Hero principal" : gallery.name} />
      <AdminFeedback error={query.error} status={query.status} />
      <div className={styles.adminToolbar}><Link className={styles.buttonLink} href="/admin/galerias" prefetch={false}>Voltar para galerias</Link><AdminStatus active={gallery.published} trueLabel="Publicada" falseLabel="Rascunho" /></div>
      <GalleryLocationCard location={getGalleryLocation(gallery.route_key, gallery.placement_key)} published={gallery.published} />
      <section className={styles.formPanel} aria-labelledby="gallery-publication-title"><div className={styles.panelHeading}><div><h2 id="gallery-publication-title">Publicação segura</h2><p>Cria uma revisão validada. Alterações incompletas permanecem em rascunho e a última revisão válida continua na página.</p></div><AdminStatus active={gallery.published} trueLabel="Revisão pública ativa" falseLabel="Sem revisão pública" /></div><form action={publishGalleryAction}><input name="gallery_id" type="hidden" value={gallery.id} /><AdminSubmitButton pendingLabel="Validando mídia e Storage...">Publicar hero</AdminSubmitButton></form></section>
      <section className={styles.formPanel} aria-labelledby="gallery-data-title">
        <div className={styles.panelHeading}><h2 id="gallery-data-title">Configuração da galeria</h2><p>Rota e slug são únicos.</p></div>
        <form action={updateGalleryAction} className={styles.adminForm}>
          <input name="id" type="hidden" value={gallery.id} />
          <div className={styles.formGrid}>
            <label className={styles.field}><span>Nome</span><input defaultValue={gallery.name} maxLength={160} name="name" required /></label>
            <label className={styles.field}><span>Slug</span><input defaultValue={gallery.slug} maxLength={120} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label>
            <label className={`${styles.field} ${styles.fieldWide}`}><span>Aparece em</span><select defaultValue={`${gallery.route_key}.${gallery.placement_key}`} name="location_key" required>{GALLERY_LOCATIONS.map((location) => <option key={location.key} value={location.key}>{location.pageLabel} › {location.sectionLabel} — {location.position}</option>)}</select></label>
            <label className={styles.field}><span>Ordem</span><input defaultValue={gallery.display_order} min="0" name="display_order" required type="number" /></label>
            <label className={styles.checkboxField}><input defaultChecked={gallery.autoplay} name="autoplay" type="checkbox" /><span>Autoplay</span></label>
          </div>
          <AdminSubmitButton>Salvar galeria</AdminSubmitButton>
        </form>
      </section>
      <section className={styles.formPanel} aria-labelledby="gallery-upload-title">
        <div className={styles.panelHeading}><div><h2 id="gallery-upload-title">Adicionar itens</h2><p>Arquivos enviados juntos podem iniciar uma mesma série visual.</p></div></div>
        <form action={uploadGalleryItemsAction} className={styles.adminForm}>
          <input name="gallery_id" type="hidden" value={gallery.id} />
          <div className={styles.formGrid}>
            <label className={styles.field}><span>Texto alternativo base</span><input maxLength={170} name="alt_base" required /></label>
            <label className={styles.field}><span>Série visual opcional</span><input maxLength={80} name="visual_series" /></label>
            <label className={styles.field}><span>Ordem inicial na série</span><input defaultValue="0" min="0" name="series_order" type="number" /></label>
            <label className={styles.field}><span>Enquadramento mobile</span><input defaultValue="50% 50%" name="mobile_object_position" pattern="(?:\d{1,3}%|left|center|right) (?:\d{1,3}%|top|center|bottom)" required /></label>
            <label className={styles.field}><span>Enquadramento desktop</span><input defaultValue="50% 50%" name="desktop_object_position" pattern="(?:\d{1,3}%|left|center|right) (?:\d{1,3}%|top|center|bottom)" required /></label>
            <label className={styles.field}><span>Escala mobile</span><input defaultValue="1.00" max="1.40" min="0.80" name="mobile_scale" required step="0.01" type="number" /></label>
            <label className={styles.field}><span>Escala desktop</span><input defaultValue="1.00" max="1.40" min="0.80" name="desktop_scale" required step="0.01" type="number" /></label>
            <label className={styles.field}><span>Papel editorial</span><select defaultValue={items.length ? "secondary" : "primary"} name="editorial_role"><option value="primary">Principal</option><option value="secondary">Secundária</option><option value="detail">Detalhe</option></select></label>
            <label className={styles.field}><span>Cor de fundo opcional</span><input defaultValue="#d7c3ad" name="background_color" pattern="#[0-9A-Fa-f]{6}" type="text" /></label>
            <label className={styles.checkboxField}><input name="published" type="checkbox" /><span>Publicar itens</span></label>
            <div className={styles.fieldWide}><FilePreviewInput id="gallery-files" multiple name="files" required /></div>
          </div>
          <AdminSubmitButton pendingLabel="Enviando itens...">Enviar itens</AdminSubmitButton>
        </form>
      </section>
      <section className={styles.formPanel} aria-labelledby="gallery-items-title">
        <div className={styles.panelHeading}><div><h2 id="gallery-items-title">Itens e séries</h2><p>Os limites visuais marcam o início de cada série.</p></div><span className={styles.phaseBadge}>{items.length} itens</span></div>
        <GalleryItemManager galleryId={gallery.id} items={items} location={getGalleryLocation(gallery.route_key, gallery.placement_key)} />
      </section>
      <section className={styles.dangerZone} aria-labelledby="delete-gallery-title">
        <div className={styles.panelHeading}><div><h2 id="delete-gallery-title">Excluir galeria</h2><p>Remova todos os itens e arquivos antes de excluir o contêiner.</p></div></div>
        <form action={deleteGalleryAction}><input name="id" type="hidden" value={gallery.id} /><ConfirmSubmitButton confirmation="Excluir esta galeria vazia?">Excluir galeria</ConfirmSubmitButton></form>
      </section>
    </>
  );
}
