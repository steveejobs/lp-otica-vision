import Link from "next/link";

import styles from "@/components/admin/admin.module.css";
import { AdminEmptyState, AdminFeedback, AdminPageHeader, AdminStatus, AdminTable } from "@/components/admin/admin-ui";
import { PromotionCreateForm } from "@/components/admin/promotion-create-form";
import { formatAdminDate, promotionTypeLabels } from "@/lib/admin/format";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminPromotionsPage({ searchParams }: { searchParams: Promise<{ error?: string; status?: string }> }) {
  await requireAdminRole(["admin", "editor"]);
  const supabase = await createSupabaseServerClient();
  const { data: promotions, error } = await supabase.from("promotions").select("id, title, slug, type, active, featured, priority, starts_at, ends_at").order("priority", { ascending: false }).limit(100);
  if (error || !promotions) throw new Error("Não foi possível carregar os destaques administrativos.");
  const query = await searchParams;
  return (
    <>
      <AdminPageHeader description="Programe um conteúdo editorial com imagem, período e um caminho oficial de contato." title="Destaques" />
      <AdminFeedback error={query.error} status={query.status} />
      <section className={styles.formPanel} aria-labelledby="new-promotion-title">
        <div className={styles.panelHeading}><div><h2 id="new-promotion-title">Novo destaque</h2><p>O conteúdo nasce como rascunho e só fica ativo quando você marcar essa opção.</p></div></div>
        <PromotionCreateForm />
      </section>
      <div className={styles.sectionBar}><h2>Programação cadastrada</h2><span className={styles.phaseBadge}>{promotions.length} registros</span></div>
      {promotions.length === 0 ? <AdminEmptyState>Nenhum destaque cadastrado.</AdminEmptyState> : (
        <><div className={styles.mobileRecordList}>{promotions.map((promotion) => <article className={styles.mobileRecordCard} key={promotion.id}><div><strong>{promotion.title}</strong><AdminStatus active={promotion.active} trueLabel={promotion.featured ? "Ativo · principal" : "Ativo"} /></div><p>{promotionTypeLabels[promotion.type]} · {formatAdminDate(promotion.starts_at)} — {formatAdminDate(promotion.ends_at)}</p><Link className={styles.buttonLink} href={`/admin/promocoes/${promotion.id}`} prefetch={false}>Abrir destaque</Link></article>)}</div><div className={styles.desktopRecordTable}><AdminTable label="Destaques cadastrados">
          <thead><tr><th>Título</th><th>Tipo</th><th>Status</th><th>Período</th><th>Ações</th></tr></thead>
          <tbody>{promotions.map((promotion) => (
            <tr key={promotion.id}><td>{promotion.title}</td><td>{promotionTypeLabels[promotion.type]}</td><td><AdminStatus active={promotion.active} trueLabel={promotion.featured ? "Ativo · principal" : "Ativo"} /></td><td>{formatAdminDate(promotion.starts_at)} — {formatAdminDate(promotion.ends_at)}</td><td><Link className={styles.textButton} href={`/admin/promocoes/${promotion.id}`} prefetch={false}>Editar</Link></td></tr>
          ))}</tbody>
        </AdminTable></div></>
      )}
    </>
  );
}
