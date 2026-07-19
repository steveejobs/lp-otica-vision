import Link from "next/link";

import styles from "@/components/admin/admin.module.css";
import { AdminEmptyState, AdminPageHeader, AdminTable } from "@/components/admin/admin-ui";
import { auditJson } from "@/lib/admin/audit";
import { listAuthorizedAuthUsers } from "@/lib/admin/auth-users";
import { formatAdminDateTime } from "@/lib/admin/format";
import { isUuidString } from "@/lib/admin/validation";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PAGE_SIZE = 50;
const entities = ["profiles", "brands", "categories", "products", "product_images", "product_image_variants", "collections", "collection_products", "galleries", "gallery_items", "gallery_publications", "gallery_publication_items", "promotions", "promotion_products", "site_settings"];
const actions = ["insert", "update", "delete"];

type AuditParams = { action?: string; entity?: string; from?: string; page?: string; to?: string; user?: string };

function auditPageUrl(params: AuditParams, page: number) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value && key !== "page") query.set(key, value); });
  query.set("page", String(page));
  return `/admin/auditoria?${query.toString()}`;
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<AuditParams> }) {
  await requireAdminRole(["admin"]);
  const params = await searchParams;
  const requestedPage = Number(params.page ?? "1");
  const currentPage = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("audit_logs").select("id, actor_id, action, entity_type, entity_id, old_data, new_data, created_at, actor:profiles(name)", { count: "exact" });
  if (isUuidString(params.user)) query = query.eq("actor_id", params.user);
  if (params.entity && entities.includes(params.entity)) query = query.eq("entity_type", params.entity);
  if (params.action && actions.includes(params.action)) query = query.eq("action", params.action);
  if (params.from && /^\d{4}-\d{2}-\d{2}$/.test(params.from)) query = query.gte("created_at", `${params.from}T00:00:00-03:00`);
  if (params.to && /^\d{4}-\d{2}-\d{2}$/.test(params.to)) query = query.lte("created_at", `${params.to}T23:59:59-03:00`);
  const [{ data: logs, error, count }, { data: profiles, error: profileError }, authUsers] = await Promise.all([
    query.order("created_at", { ascending: false }).range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1),
    supabase.from("profiles").select("id, name").order("name"),
    listAuthorizedAuthUsers(),
  ]);
  if (error || profileError || !logs || !profiles) throw new Error("Não foi possível carregar a auditoria.");
  const emailMap = new Map(authUsers.map((user) => [user.id, user.email ?? ""]));
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  return (
    <>
      <AdminPageHeader eyebrow="Administração" description="Histórico imutável para editores, com antes/depois e redaction recursiva de campos sensíveis." title="Auditoria" />
      <form className={styles.searchForm} method="get">
        <label className={styles.field}><span>Usuário</span><select defaultValue={params.user ?? ""} name="user"><option value="">Todos</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name ?? "Sem nome"} · {emailMap.get(profile.id) ?? "sem e-mail"}</option>)}</select></label>
        <label className={styles.field}><span>Entidade</span><select defaultValue={params.entity ?? ""} name="entity"><option value="">Todas</option>{entities.map((entity) => <option key={entity} value={entity}>{entity}</option>)}</select></label>
        <label className={styles.field}><span>Ação</span><select defaultValue={params.action ?? ""} name="action"><option value="">Todas</option>{actions.map((action) => <option key={action} value={action}>{action}</option>)}</select></label>
        <label className={styles.field}><span>De</span><input defaultValue={params.from ?? ""} name="from" type="date" /></label>
        <label className={styles.field}><span>Até</span><input defaultValue={params.to ?? ""} name="to" type="date" /></label>
        <button className={styles.secondaryButton} type="submit">Filtrar</button>
      </form>
      <div className={styles.sectionBar}><h2>Eventos administrativos</h2><span className={styles.phaseBadge}>{count ?? 0} eventos</span></div>
      {logs.length === 0 ? <AdminEmptyState>Nenhum evento corresponde aos filtros.</AdminEmptyState> : (
        <AdminTable label="Eventos de auditoria">
          <thead><tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Entidade</th><th>ID</th><th>Antes</th><th>Depois</th></tr></thead>
          <tbody>{logs.map((log) => (
            <tr key={log.id}>
              <td>{formatAdminDateTime(log.created_at)}</td>
              <td>{log.actor?.name ?? "Sistema"}{log.actor_id && emailMap.get(log.actor_id) ? ` · ${emailMap.get(log.actor_id)}` : ""}</td>
              <td>{log.action}</td><td>{log.entity_type}</td><td>{log.entity_id ?? "—"}</td>
              <td><details><summary>Visualizar</summary><pre className={styles.auditJson}>{auditJson(log.old_data)}</pre></details></td>
              <td><details><summary>Visualizar</summary><pre className={styles.auditJson}>{auditJson(log.new_data)}</pre></details></td>
            </tr>
          ))}</tbody>
        </AdminTable>
      )}
      <nav aria-label="Paginação da auditoria" className={styles.pagination}>
        {currentPage > 1 ? <Link className={styles.buttonLink} href={auditPageUrl(params, currentPage - 1)} prefetch={false}>Anterior</Link> : <span />}
        <span>Página {currentPage} de {totalPages}</span>
        {currentPage < totalPages ? <Link className={styles.buttonLink} href={auditPageUrl(params, currentPage + 1)} prefetch={false}>Próxima</Link> : <span />}
      </nav>
    </>
  );
}
