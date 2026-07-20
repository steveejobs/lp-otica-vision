import Link from "next/link";

import { AdminSubmitButton } from "@/components/admin/admin-form-controls";
import styles from "@/components/admin/admin.module.css";
import { AdminEmptyState, AdminFeedback, AdminPageHeader, AdminStatus, AdminTable } from "@/components/admin/admin-ui";
import { FilePreviewInput } from "@/components/admin/file-preview-input";
import { formatAdminDate } from "@/lib/admin/format";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { createAdminImageUrls } from "@/lib/storage/images";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { createBrandAction, toggleBrandAction } from "./actions";

const PAGE_SIZE = 24;

export default async function AdminBrandsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; page?: string; status?: string }>;
}) {
  await requireAdminRole(["admin", "editor"]);
  const params = await searchParams;
  const requestedPage = Number(params.page ?? "1");
  const currentPage = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const supabase = await createSupabaseServerClient();
  const { data: brands, error, count } = await supabase
    .from("brands")
    .select("id, name, slug, logo_url, active, display_order, updated_at", { count: "exact" })
    .order("display_order")
    .order("name")
    .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);
  if (error) throw new Error("Não foi possível carregar as marcas administrativas.");
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const signedLogos = await createAdminImageUrls("brand-logos", brands.map((brand) => brand.logo_url));

  return (
    <>
      <AdminPageHeader
        description="Cadastre somente marcas comercialmente confirmadas. Logos ficam em bucket privado e a ordem controla a curadoria futura."
        title="Marcas"
      />
      <AdminFeedback error={params.error} status={params.status} />

      <section className={styles.formPanel} aria-labelledby="new-brand-title">
        <div className={styles.panelHeading}>
          <div>
            <h2 id="new-brand-title">Nova marca</h2>
            <p>Uma marca só pode ser ativada depois de receber um logo validado.</p>
          </div>
        </div>
        <form action={createBrandAction} className={styles.adminForm}>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Nome</span>
              <input maxLength={120} name="name" required />
            </label>
            <label className={styles.field}>
              <span>Identificador na URL</span>
              <input maxLength={120} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
              <small className={styles.fieldHint}>Use letras minúsculas e hífens, sem espaços.</small>
            </label>
            <label className={styles.field}>
              <span>Ordem</span>
              <input defaultValue="0" min="0" name="display_order" required type="number" />
            </label>
            <label className={styles.checkboxField}>
              <input name="active" type="checkbox" />
              <span>Ativa</span>
            </label>
            <div className={styles.fieldWide}>
              <FilePreviewInput id="new-brand-logo" name="logo" />
            </div>
          </div>
          <div className={styles.formActions}>
            <AdminSubmitButton pendingLabel="Criando marca...">Criar marca</AdminSubmitButton>
          </div>
        </form>
      </section>

      <div className={styles.sectionBar}>
        <h2>Marcas cadastradas</h2>
        <span className={styles.phaseBadge}>{count ?? 0} registros</span>
      </div>
      {brands.length === 0 ? (
        <AdminEmptyState>Cadastre somente marcas confirmadas pela Ótica Vision.</AdminEmptyState>
      ) : (
        <><div className={styles.mobileRecordList}>{brands.map((brand) => {
          const logo = brand.logo_url ? signedLogos.get(brand.logo_url) : null;
          return <article className={styles.mobileRecordCard} key={brand.id}>
            <div><strong>{brand.name}</strong><AdminStatus active={brand.active} /></div>
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived private Storage URL. */}
            {logo ? <img alt="" className={styles.mobileRecordImage} src={logo} /> : <p>Logo ainda não enviado.</p>}
            <p>Ordem {brand.display_order} · atualizado em {formatAdminDate(brand.updated_at)}</p>
            <div className={styles.rowActions}><Link className={styles.textButton} href={`/admin/marcas/${brand.id}`} prefetch={false}>Editar</Link><form action={toggleBrandAction}><input name="id" type="hidden" value={brand.id} /><AdminSubmitButton pendingLabel="Salvando..." variant="secondary">{brand.active ? "Desativar" : "Ativar"}</AdminSubmitButton></form></div>
          </article>;
        })}</div><div className={styles.desktopRecordTable}><AdminTable label="Marcas cadastradas">
          <thead>
            <tr>
              <th>Logo</th>
              <th>Marca</th>
              <th>Identificador</th>
              <th>Ordem</th>
              <th>Status</th>
              <th>Atualização</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((brand) => {
              const logo = brand.logo_url ? signedLogos.get(brand.logo_url) : null;
              return (
                <tr key={brand.id}>
                  <td>
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- short-lived private Storage URL.
                      <img alt="" className={styles.imagePreview} src={logo} />
                    ) : (
                      "Sem logo"
                    )}
                  </td>
                  <td>{brand.name}</td>
                  <td>{brand.slug}</td>
                  <td>{brand.display_order}</td>
                  <td><AdminStatus active={brand.active} /></td>
                  <td>{formatAdminDate(brand.updated_at)}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <Link className={styles.textButton} href={`/admin/marcas/${brand.id}`} prefetch={false}>Editar</Link>
                      <form action={toggleBrandAction} className={styles.inlineForm}>
                        <input name="id" type="hidden" value={brand.id} />
                        <AdminSubmitButton pendingLabel="Salvando..." variant="secondary">
                          {brand.active ? "Desativar" : "Ativar"}
                        </AdminSubmitButton>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </AdminTable></div></>
      )}
      <nav aria-label="Paginação de marcas" className={styles.pagination}>
        {currentPage > 1 ? <Link className={styles.buttonLink} href={`/admin/marcas?page=${currentPage - 1}`} prefetch={false}>Anterior</Link> : <span />}
        <span>Página {currentPage} de {totalPages}</span>
        {currentPage < totalPages ? <Link className={styles.buttonLink} href={`/admin/marcas?page=${currentPage + 1}`} prefetch={false}>Próxima</Link> : <span />}
      </nav>
    </>
  );
}
