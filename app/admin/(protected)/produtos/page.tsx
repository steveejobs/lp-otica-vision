import Link from "next/link";

import { AdminSubmitButton, ConfirmSubmitButton } from "@/components/admin/admin-form-controls";
import styles from "@/components/admin/admin.module.css";
import { AdminEmptyState, AdminFeedback, AdminPageHeader, AdminStatus, AdminTable } from "@/components/admin/admin-ui";
import { availabilityLabels, formatAdminDate } from "@/lib/admin/format";
import { isUuidString, sanitizedSearch } from "@/lib/admin/validation";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { archiveProductAction, duplicateProductAction } from "./actions";

const PAGE_SIZE = 20;
const availabilityValues = ["available", "last_unit", "consultation", "unavailable"] as const;

type ProductSearchParams = {
  archive?: string;
  availability?: string;
  brand?: string;
  category?: string;
  error?: string;
  page?: string;
  publication?: string;
  q?: string;
  status?: string;
};

function pageUrl(params: ProductSearchParams, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && !["error", "status", "page"].includes(key)) query.set(key, value);
  }
  query.set("page", String(page));
  return `/admin/produtos?${query.toString()}`;
}

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<ProductSearchParams> }) {
  await requireAdminRole(["admin", "editor"]);
  const params = await searchParams;
  const q = sanitizedSearch(params.q);
  const requestedPage = Number(params.page ?? "1");
  const currentPage = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("products")
    .select(
      "id, name, slug, sku, published, featured, availability_status, archived_at, updated_at, brand:brands(name), category:categories(name), images:product_images(id, is_cover)",
      { count: "exact" },
    );
  if (q) query = query.or(`sku.ilike.%${q}%,name.ilike.%${q}%,model.ilike.%${q}%`);
  if (isUuidString(params.brand)) query = query.eq("brand_id", params.brand);
  if (isUuidString(params.category)) query = query.eq("category_id", params.category);
  if (availabilityValues.includes(params.availability as (typeof availabilityValues)[number])) {
    query = query.eq("availability_status", params.availability as (typeof availabilityValues)[number]);
  }
  if (params.publication === "published") query = query.eq("published", true);
  if (params.publication === "draft") query = query.eq("published", false);
  if (params.publication === "featured") query = query.eq("featured", true);
  if (params.archive === "archived") query = query.not("archived_at", "is", null);
  else if (params.archive !== "all") query = query.is("archived_at", null);

  const [{ data: products, error, count }, { data: brands }, { data: categories }] = await Promise.all([
    query.order("updated_at", { ascending: false }).range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1),
    supabase.from("brands").select("id, name").order("name"),
    supabase.from("categories").select("id, name").order("name"),
  ]);
  if (error || !products || !brands || !categories) throw new Error("Não foi possível carregar os produtos administrativos.");
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const currentPath = pageUrl(params, currentPage);

  return (
    <>
      <AdminPageHeader
        description="Busca, filtros, publicação, destaque e arquivamento do catálogo interno. Disponibilidade quantitativa não faz parte deste painel."
        title="Produtos"
      />
      <AdminFeedback error={params.error} status={params.status} />
      <div className={styles.adminToolbar}>
        <form className={styles.searchForm} method="get">
          <label className={styles.field}><span>Buscar por SKU, nome ou modelo</span><input defaultValue={q} name="q" /></label>
          <label className={styles.field}><span>Marca</span><select defaultValue={params.brand ?? ""} name="brand"><option value="">Todas</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>
          <label className={styles.field}><span>Categoria</span><select defaultValue={params.category ?? ""} name="category"><option value="">Todas</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className={styles.field}><span>Disponibilidade</span><select defaultValue={params.availability ?? ""} name="availability"><option value="">Todas</option>{availabilityValues.map((value) => <option key={value} value={value}>{availabilityLabels[value]}</option>)}</select></label>
          <button className={styles.secondaryButton} type="submit">Filtrar</button>
          <label className={styles.field}><span>Publicação</span><select defaultValue={params.publication ?? ""} name="publication"><option value="">Todas</option><option value="published">Publicados</option><option value="draft">Rascunhos</option><option value="featured">Destaques</option></select></label>
          <label className={styles.field}><span>Arquivo</span><select defaultValue={params.archive ?? "active"} name="archive"><option value="active">Ativos</option><option value="archived">Arquivados</option><option value="all">Todos</option></select></label>
        </form>
        <div className={styles.toolbarActions}>
          <Link className={styles.buttonLink} href="/admin/produtos/novo">Novo produto</Link>
          <Link className={styles.buttonLink} href="/admin/disponibilidade">Disponibilidade rápida</Link>
        </div>
      </div>

      <div className={styles.sectionBar}><h2>Catálogo cadastrado</h2><span className={styles.phaseBadge}>{count ?? 0} registros</span></div>
      {products.length === 0 ? (
        <AdminEmptyState>Nenhum produto corresponde aos filtros atuais.</AdminEmptyState>
      ) : (
        <AdminTable label="Produtos cadastrados">
          <thead><tr><th>Produto</th><th>SKU</th><th>Marca / categoria</th><th>Disponibilidade</th><th>Publicação</th><th>Atualização</th><th>Ações</th></tr></thead>
          <tbody>
            {products.map((product) => {
              const hasCover = product.images.some((image) => image.is_cover);
              const indicators = [
                ...(!hasCover ? ["Sem capa"] : []),
                ...(!product.brand ? ["Sem marca"] : []),
                ...(!product.category ? ["Sem categoria"] : []),
              ];
              return (
              <tr key={product.id}>
                <td>
                  {product.name}{product.archived_at ? " · arquivado" : ""}
                  {indicators.length ? <span className={styles.recordWarnings}>{indicators.join(" · ")}</span> : null}
                </td>
                <td>{product.sku}</td>
                <td>{product.brand?.name ?? "Sem marca"} · {product.category?.name ?? "Sem categoria"}</td>
                <td>{availabilityLabels[product.availability_status]}</td>
                <td><AdminStatus active={product.published && !product.archived_at} trueLabel={product.featured ? "Destaque" : "Publicado"} falseLabel={product.archived_at ? "Arquivado" : "Rascunho"} /></td>
                <td>{formatAdminDate(product.updated_at)}</td>
                <td>
                  <div className={styles.rowActions}>
                    <Link className={styles.textButton} href={`/admin/produtos/${product.id}`}>Editar</Link>
                    {product.published && !product.archived_at && hasCover ? (
                      <Link className={styles.textButton} href={`/catalogo/${product.slug}`} target="_blank">Abrir público</Link>
                    ) : null}
                    <form action={duplicateProductAction} className={styles.inlineForm}><input name="id" type="hidden" value={product.id} /><AdminSubmitButton pendingLabel="Duplicando..." variant="secondary">Duplicar</AdminSubmitButton></form>
                    {!product.archived_at ? (
                      <form action={archiveProductAction} className={styles.inlineForm}>
                        <input name="id" type="hidden" value={product.id} /><input name="return_to" type="hidden" value={currentPath} />
                        <ConfirmSubmitButton confirmation="Arquivar este produto e removê-lo de publicação?">Arquivar</ConfirmSubmitButton>
                      </form>
                    ) : null}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </AdminTable>
      )}
      <nav aria-label="Paginação de produtos" className={styles.pagination}>
        {currentPage > 1 ? <Link className={styles.buttonLink} href={pageUrl(params, currentPage - 1)}>Anterior</Link> : <span />}
        <span>Página {currentPage} de {totalPages}</span>
        {currentPage < totalPages ? <Link className={styles.buttonLink} href={pageUrl(params, currentPage + 1)}>Próxima</Link> : <span />}
      </nav>
    </>
  );
}
