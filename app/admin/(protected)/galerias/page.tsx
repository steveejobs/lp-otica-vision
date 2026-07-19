import Link from "next/link";

import { AdminSubmitButton } from "@/components/admin/admin-form-controls";
import { GalleryLocationCard } from "@/components/admin/gallery-location-card";
import styles from "@/components/admin/admin.module.css";
import { AdminEmptyState, AdminFeedback, AdminPageHeader, AdminStatus, AdminTable } from "@/components/admin/admin-ui";
import { formatAdminDate } from "@/lib/admin/format";
import { GALLERY_LOCATIONS, getGalleryLocation } from "@/lib/admin/gallery-locations";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { createGalleryAction } from "./actions";

export default async function AdminGalleriesPage({ searchParams }: { searchParams: Promise<{ error?: string; status?: string }> }) {
  await requireAdminRole(["admin", "editor"]);
  const supabase = await createSupabaseServerClient();
  const [{ data: galleries, error }, { data: items, error: itemError }] = await Promise.all([
    supabase.from("galleries").select("id, name, slug, route_key, placement_key, published, autoplay, display_order, updated_at").order("display_order").order("name").limit(100),
    supabase.from("gallery_items").select("gallery_id, published, editorial_role"),
  ]);
  if (error || itemError || !galleries || !items) throw new Error("Não foi possível carregar as galerias administrativas.");
  const query = await searchParams;
  const counts = new Map<string, number>();
  items.filter((item) => item.published).forEach((item) => counts.set(item.gallery_id, (counts.get(item.gallery_id) ?? 0) + 1));
  return (
    <>
      <AdminPageHeader description="Galerias por rota com itens privados, séries visuais e enquadramentos específicos para mobile e desktop." title="Galerias" />
      <AdminFeedback error={query.error} status={query.status} />
      <section className={styles.formPanel} aria-labelledby="new-gallery-title">
        <div className={styles.panelHeading}><div><h2 id="new-gallery-title">Nova galeria</h2><p>A publicação só será liberada depois de existir ao menos um item publicado.</p></div></div>
        <form action={createGalleryAction} className={styles.adminForm}>
          <div className={styles.formGrid}>
            <label className={styles.field}><span>Nome</span><input maxLength={160} name="name" required /></label>
            <label className={styles.field}><span>Slug</span><input maxLength={120} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label>
            <label className={`${styles.field} ${styles.fieldWide}`}><span>Aparece em</span><select defaultValue="" name="location_key" required><option disabled value="">Selecione a rota e a seção pública</option>{GALLERY_LOCATIONS.map((location) => <option key={location.key} value={location.key}>{location.label} — {location.description}</option>)}</select></label>
            <label className={styles.field}><span>Ordem</span><input defaultValue="0" min="0" name="display_order" required type="number" /></label>
            <label className={styles.checkboxField}><input name="autoplay" type="checkbox" /><span>Autoplay</span></label>
          </div>
          <AdminSubmitButton pendingLabel="Criando galeria...">Criar rascunho</AdminSubmitButton>
        </form>
      </section>
      <div className={styles.sectionBar}><h2>Galerias cadastradas</h2><span className={styles.phaseBadge}>{galleries.length} registros</span></div>
      {galleries.length === 0 ? <AdminEmptyState>Nenhuma galeria cadastrada.</AdminEmptyState> : (
        <AdminTable label="Galerias cadastradas">
          <thead><tr><th>Galeria</th><th>Rota</th><th>Itens</th><th>Ordem</th><th>Publicação</th><th>Reprodução</th><th>Atualização</th><th>Ações</th></tr></thead>
          <tbody>{galleries.map((gallery) => (
            <tr key={gallery.id}><td>{gallery.name}</td><td><GalleryLocationCard location={getGalleryLocation(gallery.route_key, gallery.placement_key)} published={gallery.published} /></td><td>{counts.get(gallery.id) ?? 0}</td><td>{gallery.display_order}</td><td><AdminStatus active={gallery.published} trueLabel="Publicada" falseLabel="Rascunho" /></td><td>{gallery.autoplay ? "Automática" : "Manual"}</td><td>{formatAdminDate(gallery.updated_at)}</td><td><Link className={styles.textButton} href={`/admin/galerias/${gallery.id}`} prefetch={false}>Editar</Link></td></tr>
          ))}</tbody>
        </AdminTable>
      )}
    </>
  );
}
