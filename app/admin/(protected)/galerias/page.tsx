import Link from "next/link";

import { GalleryCreateForm } from "@/components/admin/gallery-create-form";
import styles from "@/components/admin/admin.module.css";
import { AdminEmptyState, AdminFeedback, AdminPageHeader, AdminStatus, AdminTable } from "@/components/admin/admin-ui";
import { formatAdminDate } from "@/lib/admin/format";
import { getGalleryLocation } from "@/lib/admin/gallery-locations";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
      <AdminPageHeader description="Organize as imagens por seção, ajuste o enquadramento e publique uma versão revisada." title="Galerias" />
      <AdminFeedback error={query.error} status={query.status} />
      <section className={styles.formPanel} aria-labelledby="new-gallery-title">
        <div className={styles.panelHeading}><div><h2 id="new-gallery-title">Nova galeria</h2><p>Escolha apenas o nome e a seção. As imagens entram na próxima tela.</p></div></div>
        <GalleryCreateForm />
      </section>
      <div className={styles.sectionBar}><h2>Galerias cadastradas</h2><span className={styles.phaseBadge}>{galleries.length} registros</span></div>
      {galleries.length === 0 ? <AdminEmptyState>Nenhuma galeria cadastrada.</AdminEmptyState> : (
        <><div className={styles.mobileRecordList}>{galleries.map((gallery) => { const location = getGalleryLocation(gallery.route_key, gallery.placement_key); return <article className={styles.mobileRecordCard} key={gallery.id}><div><strong>{gallery.name}</strong><AdminStatus active={gallery.published} trueLabel="Publicada" falseLabel="Rascunho" /></div><p>{location?.label ?? "Local não definido"} · {counts.get(gallery.id) ?? 0} imagens</p><Link className={styles.buttonLink} href={`/admin/galerias/${gallery.id}`} prefetch={false}>Abrir galeria</Link></article>; })}</div><div className={styles.desktopRecordTable}><AdminTable label="Galerias cadastradas">
          <thead><tr><th>Galeria</th><th>Aparece em</th><th>Imagens</th><th>Publicação</th><th>Troca</th><th>Atualização</th><th>Ações</th></tr></thead>
          <tbody>{galleries.map((gallery) => { const location = getGalleryLocation(gallery.route_key, gallery.placement_key); return (
            <tr key={gallery.id}><td>{gallery.name}</td><td>{location?.label ?? "Local não definido"}</td><td>{counts.get(gallery.id) ?? 0}</td><td><AdminStatus active={gallery.published} trueLabel="Publicada" falseLabel="Rascunho" /></td><td>{gallery.autoplay ? "Automática" : "Manual"}</td><td>{formatAdminDate(gallery.updated_at)}</td><td><Link className={styles.textButton} href={`/admin/galerias/${gallery.id}`} prefetch={false}>Editar</Link></td></tr>
          ); })}</tbody>
        </AdminTable></div></>
      )}
    </>
  );
}
