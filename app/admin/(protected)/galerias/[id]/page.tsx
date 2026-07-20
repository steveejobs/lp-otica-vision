import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminSubmitButton, ConfirmSubmitButton } from "@/components/admin/admin-form-controls";
import { AdminInfoTip } from "@/components/admin/admin-info-tip";
import styles from "@/components/admin/admin.module.css";
import { AdminFeedback, AdminPageHeader, AdminStatus } from "@/components/admin/admin-ui";
import { BackgroundColorField } from "@/components/admin/background-color-field";
import { FilePreviewInput } from "@/components/admin/file-preview-input";
import { GalleryItemManager } from "@/components/admin/gallery-item-manager";
import { GalleryLocationCard } from "@/components/admin/gallery-location-card";
import { GALLERY_LOCATIONS, getGalleryLocation } from "@/lib/admin/gallery-locations";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { createAdminImageUrls } from "@/lib/storage/images";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { deleteGalleryAction, publishGalleryAction, rollbackGalleryRevisionAction, updateGalleryAction, uploadGalleryItemsAction } from "../actions";

export default async function EditGalleryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; status?: string }> }) {
  await requireAdminRole(["admin", "editor"]);
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const [galleryResult, itemResult, publicationResult, publicationHistoryResult] = await Promise.all([
    supabase.from("galleries").select("*").eq("id", id).maybeSingle(),
    supabase.from("gallery_items").select("*").eq("gallery_id", id).order("display_order"),
    supabase.from("gallery_publications").select("id, published_at").eq("gallery_id", id).eq("active", true).maybeSingle(),
    supabase.from("gallery_publications").select("id, revision, active, published_at").eq("gallery_id", id).order("revision", { ascending: false }),
  ]);
  if (galleryResult.error || !galleryResult.data) notFound();
  if (itemResult.error || !itemResult.data || publicationHistoryResult.error) throw new Error("Não foi possível carregar os itens ou revisões da galeria.");
  const gallery = galleryResult.data;
  const location = getGalleryLocation(gallery.route_key, gallery.placement_key);
  const isHomeHero = location?.key === "home.hero";
  const query = await searchParams;
  const activeItemResult = publicationResult.data
    ? await supabase.from("gallery_publication_items").select("source_item_id").eq("publication_id", publicationResult.data.id)
    : { data: [], error: null };
  if (activeItemResult.error) throw new Error("Não foi possível carregar a versão pública da galeria.");
  const activeSourceIds = new Set((activeItemResult.data ?? []).flatMap((item) => item.source_item_id ? [item.source_item_id] : []));
  const signed = await createAdminImageUrls("site-galleries", itemResult.data.map((item) => {
    const manifest = item.media_manifest as { thumbnail?: { path?: string } } | null;
    return manifest?.thumbnail?.path ?? item.storage_path;
  }));
  const items = itemResult.data.map((item) => ({
    altText: item.alt_text,
    activeInPublication: activeSourceIds.has(item.id),
    assetStatus: signed.get(((item.media_manifest as { thumbnail?: { path?: string } } | null)?.thumbnail?.path ?? item.storage_path)) ? "Imagem pronta" : "Verificar arquivo",
    backgroundColor: item.background_color,
    desktopObjectPosition: item.desktop_object_position,
    desktopScale: Number(item.desktop_scale),
    editorialRole: item.editorial_role as "primary" | "secondary" | "detail",
    height: item.height,
    id: item.id,
    mobileObjectPosition: item.mobile_object_position,
    mobileScale: Number(item.mobile_scale),
    published: item.published,
    seriesOrder: item.series_order,
    signedUrl: signed.get(((item.media_manifest as { thumbnail?: { path?: string } } | null)?.thumbnail?.path ?? item.storage_path)) ?? null,
    updatedAt: item.updated_at ?? item.created_at,
    visualSeries: item.visual_series,
    width: item.width,
  }));
  const olderPublications = (publicationHistoryResult.data ?? []).filter((publication) => !publication.active).slice(0, 3);

  return (
    <>
      <AdminPageHeader eyebrow="Galerias" description="Adicione as fotos, ajuste o enquadramento e publique quando a composição estiver pronta." title={isHomeHero ? "Home › Hero principal" : gallery.name} />
      <AdminFeedback error={query.error} status={query.status} />
      <div className={styles.adminToolbar}>
        <Link className={styles.buttonLink} href="/admin/galerias" prefetch={false}>Voltar para galerias</Link>
        <AdminStatus active={gallery.published} trueLabel="Publicada" falseLabel="Rascunho" />
      </div>

      <GalleryLocationCard
        images={items.map((item) => ({ id: item.id, signedUrl: item.signedUrl }))}
        location={location}
        published={gallery.published}
      />

      <section className={styles.formPanel} aria-labelledby="gallery-data-title">
        <StepHeading description="Confirme o nome e o lugar onde as imagens serão exibidas." number="1" title="Onde esta galeria aparece" />
        <form action={updateGalleryAction} className={styles.adminForm}>
          <input name="id" type="hidden" value={gallery.id} />
          <div className={styles.formGrid}>
            <label className={styles.field}><span>Nome para identificar no ADM</span><input defaultValue={gallery.name} maxLength={160} name="name" required /></label>
            <label className={styles.field}><span>Seção do site</span><select defaultValue={`${gallery.route_key}.${gallery.placement_key}`} name="location_key" required>{GALLERY_LOCATIONS.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}</select><small className={styles.fieldHint}>A descrição do local aparece no cartão acima.</small></label>
            <div className={`${styles.checkboxWithInfo} ${styles.fieldWide}`}>
              <label className={styles.checkboxField}><input defaultChecked={gallery.autoplay} name="autoplay" type="checkbox" /><span>Trocar as imagens automaticamente no site</span></label>
              <AdminInfoTip label="O que significa trocar as imagens automaticamente?">Quando ativado, o site avança sozinho entre as fotos. O visitante ainda pode trocar manualmente e o movimento é desativado quando o aparelho pede menos animações.</AdminInfoTip>
            </div>
          </div>
          <details className={styles.adminDetails}>
            <summary>Configurações avançadas</summary>
            <p>Normalmente você não precisa alterar estes valores.</p>
            <div className={styles.formGrid}>
              <label className={styles.field}><span>Identificador na URL</span><input defaultValue={gallery.slug} maxLength={120} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label>
              <label className={styles.field}><span>Ordem entre galerias da mesma seção</span><input defaultValue={gallery.display_order} min="0" name="display_order" required type="number" /></label>
            </div>
          </details>
          <AdminSubmitButton>Salvar localização</AdminSubmitButton>
        </form>
      </section>

      <section className={styles.formPanel} id="gallery-upload" aria-labelledby="gallery-upload-title">
        <StepHeading description="Escolha uma ou mais fotos. O enquadramento será ajustado visualmente na próxima etapa." number="2" title="Adicionar imagens" />
        <form action={uploadGalleryItemsAction} className={styles.adminForm}>
          <input name="gallery_id" type="hidden" value={gallery.id} />
          <input name="mobile_object_position" type="hidden" value="50% 50%" />
          <input name="desktop_object_position" type="hidden" value="50% 50%" />
          <input name="mobile_scale" type="hidden" value="1.00" />
          <input name="desktop_scale" type="hidden" value="1.00" />
          <div className={styles.formGrid}>
            <div className={styles.fieldWide}><FilePreviewInput id="gallery-files" multiple name="files" required /></div>
            <label className={`${styles.checkboxField} ${styles.fieldWide}`}><input name="published" type="checkbox" /><span>Deixar estas imagens prontas para a próxima publicação</span></label>
          </div>
          <details className={styles.adminDetails}>
            <summary>Organização avançada das imagens</summary>
            <p>Use grupos apenas quando várias fotos fazem parte da mesma sequência visual.</p>
            <div className={styles.formGrid}>
              <label className={styles.field}><span>Nome do grupo opcional</span><input maxLength={80} name="visual_series" /></label>
              <label className={styles.field}><span>Primeira posição no grupo</span><input defaultValue="0" min="0" name="series_order" type="number" /></label>
              <label className={`${styles.field} ${styles.fieldWide}`}><span>Função visual inicial</span><select defaultValue={items.length ? "secondary" : "primary"} name="editorial_role"><option value="primary">Principal — recebe mais destaque</option><option value="secondary">Complementar — acompanha a principal</option><option value="detail">Detalhe — mostra acabamento</option></select></label>
              <BackgroundColorField initialValue="#d7c3ad" />
            </div>
          </details>
          <AdminSubmitButton pendingLabel="Enviando imagens...">Adicionar imagens</AdminSubmitButton>
        </form>
      </section>

      <section className={styles.formPanel} aria-labelledby="gallery-items-title">
        <div className={styles.stepHeadingRow}>
          <StepHeading description="Toque na foto, ajuste o foco no celular e no computador e defina a ordem." number="3" title="Revisar imagens" />
          <span className={styles.phaseBadge}>{items.length} {items.length === 1 ? "imagem" : "imagens"}</span>
        </div>
        <GalleryItemManager galleryId={gallery.id} items={items} location={location} />
      </section>

      <section className={styles.formPanel} aria-labelledby="gallery-publication-title">
        <div className={styles.stepHeadingRow}>
          <StepHeading description="Publicar cria uma versão revisada. O site mantém a última versão válida se algo estiver incompleto." number="4" title="Publicar no site" />
          <AdminStatus active={gallery.published} trueLabel="Versão pública ativa" falseLabel="Ainda não publicada" />
        </div>
        <form action={publishGalleryAction} className={styles.formActions}>
          <input name="gallery_id" type="hidden" value={gallery.id} />
          <AdminSubmitButton pendingLabel="Conferindo imagens...">Conferir e publicar</AdminSubmitButton>
        </form>
        {olderPublications.length ? (
          <details className={styles.adminDetails}>
            <summary>Restaurar uma versão anterior</summary>
            <div className={styles.destructiveActions}>{olderPublications.map((publication) => <form action={rollbackGalleryRevisionAction} key={publication.id}><input name="gallery_id" type="hidden" value={gallery.id} /><input name="publication_id" type="hidden" value={publication.id} /><AdminSubmitButton pendingLabel="Restaurando..." variant="secondary">Restaurar versão #{publication.revision}</AdminSubmitButton></form>)}</div>
          </details>
        ) : null}
      </section>

      <details className={`${styles.adminDetails} ${styles.dangerZone}`}>
        <summary>Excluir esta galeria</summary>
        <div className={styles.destructiveActions}>
          <p>Primeiro remova todas as imagens. A exclusão não pode ser desfeita.</p>
          <form action={deleteGalleryAction}><input name="id" type="hidden" value={gallery.id} /><ConfirmSubmitButton confirmation="Excluir esta galeria vazia?">Excluir galeria</ConfirmSubmitButton></form>
        </div>
      </details>
    </>
  );
}

function StepHeading({ description, number, title }: { description: string; number: string; title: string }) {
  return (
    <div className={styles.formSectionHeading}>
      <span aria-hidden="true">{number}</span>
      <div><h2 id={number === "1" ? "gallery-data-title" : number === "2" ? "gallery-upload-title" : number === "4" ? "gallery-publication-title" : "gallery-items-title"}>{title}</h2><p>{description}</p></div>
    </div>
  );
}
