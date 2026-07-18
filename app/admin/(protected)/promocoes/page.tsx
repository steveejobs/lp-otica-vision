import Link from "next/link";

import { AdminSubmitButton } from "@/components/admin/admin-form-controls";
import styles from "@/components/admin/admin.module.css";
import { AdminEmptyState, AdminFeedback, AdminPageHeader, AdminStatus, AdminTable } from "@/components/admin/admin-ui";
import { FilePreviewInput } from "@/components/admin/file-preview-input";
import { formatAdminDate, promotionTypeLabels } from "@/lib/admin/format";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { createPromotionAction } from "./actions";

export default async function AdminPromotionsPage({ searchParams }: { searchParams: Promise<{ error?: string; status?: string }> }) {
  await requireAdminRole(["admin", "editor"]);
  const supabase = await createSupabaseServerClient();
  const { data: promotions, error } = await supabase.from("promotions").select("id, title, slug, type, active, featured, priority, starts_at, ends_at").order("priority", { ascending: false }).limit(100);
  if (error || !promotions) throw new Error("Não foi possível carregar os destaques administrativos.");
  const query = await searchParams;
  return (
    <>
      <AdminPageHeader description="Promoções, destaques, lançamentos e coleções editoriais. Desconto e preço anterior nunca são presumidos." title="Destaques" />
      <AdminFeedback error={query.error} status={query.status} />
      <section className={styles.formPanel} aria-labelledby="new-promotion-title">
        <div className={styles.panelHeading}><div><h2 id="new-promotion-title">Novo destaque</h2><p>Imagem, período e CTA oficial são obrigatórios.</p></div></div>
        <form action={createPromotionAction} className={styles.adminForm}>
          <div className={styles.formGrid}>
            <label className={styles.field}><span>Tipo</span><select name="type" required><option value="promotion">Promoção</option><option value="highlight">Destaque</option><option value="launch">Lançamento</option><option value="collection">Coleção</option></select></label>
            <label className={styles.field}><span>Título</span><input maxLength={160} name="title" required /></label>
            <label className={styles.field}><span>Slug</span><input maxLength={120} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label>
            <label className={styles.field}><span>Prioridade</span><input defaultValue="0" min="0" name="priority" required type="number" /></label>
            <label className={`${styles.field} ${styles.fieldWide}`}><span>Descrição curta</span><textarea maxLength={600} name="short_description" /></label>
            <label className={styles.field}><span>Rótulo do CTA</span><input maxLength={80} name="cta_label" required /></label>
            <label className={styles.field}><span>Destino oficial</span><select defaultValue="whatsapp" name="cta_target"><option value="whatsapp">WhatsApp oficial</option><option value="instagram">Instagram oficial</option><option value="maps">Rota oficial</option></select></label>
            <label className={styles.field}><span>Início</span><input name="starts_at" required type="datetime-local" /></label>
            <label className={styles.field}><span>Fim</span><input name="ends_at" required type="datetime-local" /></label>
            <label className={styles.field}><span>Texto alternativo da imagem</span><input maxLength={220} name="image_alt_text" required /></label>
            <label className={styles.field}><span>Object-position</span><input defaultValue="50% 50%" name="image_object_position" pattern="(?:\d{1,3}%|left|center|right) (?:\d{1,3}%|top|center|bottom)" required /></label>
            <label className={styles.checkboxField}><input name="active" type="checkbox" /><span>Ativo</span></label>
            <label className={styles.checkboxField}><input name="featured" type="checkbox" /><span>Destaque principal</span></label>
            <div className={styles.fieldWide}><FilePreviewInput id="promotion-image" name="file" required /></div>
          </div>
          <AdminSubmitButton pendingLabel="Criando destaque...">Criar destaque</AdminSubmitButton>
        </form>
      </section>
      <div className={styles.sectionBar}><h2>Programação cadastrada</h2><span className={styles.phaseBadge}>{promotions.length} registros</span></div>
      {promotions.length === 0 ? <AdminEmptyState>Nenhum destaque cadastrado.</AdminEmptyState> : (
        <AdminTable label="Destaques cadastrados">
          <thead><tr><th>Título</th><th>Tipo</th><th>Prioridade</th><th>Status</th><th>Início</th><th>Fim</th><th>Ações</th></tr></thead>
          <tbody>{promotions.map((promotion) => (
            <tr key={promotion.id}><td>{promotion.title}</td><td>{promotionTypeLabels[promotion.type]}</td><td>{promotion.priority}</td><td><AdminStatus active={promotion.active} trueLabel={promotion.featured ? "Ativo · destaque" : "Ativo"} /></td><td>{formatAdminDate(promotion.starts_at)}</td><td>{formatAdminDate(promotion.ends_at)}</td><td><Link className={styles.textButton} href={`/admin/promocoes/${promotion.id}`} prefetch={false}>Editar</Link></td></tr>
          ))}</tbody>
        </AdminTable>
      )}
    </>
  );
}
