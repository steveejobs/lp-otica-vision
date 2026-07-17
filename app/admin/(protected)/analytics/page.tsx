import Link from "next/link";

import styles from "@/components/admin/admin.module.css";
import { AdminEmptyState, AdminPageHeader, AdminTable } from "@/components/admin/admin-ui";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

type ProductMetric = { click_rate: number | null; clicks: number; id: string; name: string; slug: string; views: number };
type BrandMetric = { id: string; name: string; slug: string; views: number };
type SearchMetric = { query: string; uses: number };
type FilterMetric = { filter_name: string; uses: number; value: string };

function objectValue(value: Json | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function rows(value: Json | undefined) {
  return Array.isArray(value) ? value.map(objectValue) : [];
}

function stringValue(value: Json | undefined) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: Json | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function parseReport(value: Json) {
  const root = objectValue(value);
  const products: ProductMetric[] = rows(root.topProducts).map((row) => ({
    click_rate: typeof row.click_rate === "number" ? row.click_rate : null,
    clicks: numberValue(row.clicks),
    id: stringValue(row.id),
    name: stringValue(row.name),
    slug: stringValue(row.slug),
    views: numberValue(row.views),
  })).filter((row) => row.id && row.name);
  const brands: BrandMetric[] = rows(root.topBrands).map((row) => ({
    id: stringValue(row.id),
    name: stringValue(row.name),
    slug: stringValue(row.slug),
    views: numberValue(row.views),
  })).filter((row) => row.id && row.name);
  const searches: SearchMetric[] = rows(root.topSearches).map((row) => ({
    query: stringValue(row.query),
    uses: numberValue(row.uses),
  })).filter((row) => row.query);
  const filters: FilterMetric[] = rows(root.topFilters).map((row) => ({
    filter_name: stringValue(row.filter_name),
    uses: numberValue(row.uses),
    value: stringValue(row.value),
  })).filter((row) => row.filter_name && row.value);
  return { brands, filters, products, searches };
}

const filterLabels: Record<string, string> = {
  categoria: "Categoria",
  colecao: "Coleção",
  disponibilidade: "Disponibilidade",
  marca: "Marca",
};

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  await requireAdminRole(["admin"]);
  const requestedDays = Number((await searchParams).dias ?? "30");
  const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_catalog_analytics", { p_days: days });
  if (error || !data) throw new Error("Não foi possível carregar os indicadores do catálogo.");
  const report = parseReport(data);
  const empty = !report.products.length && !report.brands.length && !report.searches.length && !report.filters.length;

  return (
    <>
      <AdminPageHeader
        description="Leitura agregada de visualizações, cliques e escolhas do catálogo. Nenhum dado pessoal é armazenado."
        title="Analytics do catálogo"
      />
      <div className={styles.adminToolbar}>
        <div className={styles.toolbarActions} aria-label="Período do relatório">
          {[7, 30, 90].map((period) => (
            <Link className={period === days ? styles.buttonLink : styles.textButton} href={`/admin/analytics?dias=${period}`} key={period}>
              {period} dias
            </Link>
          ))}
        </div>
        <span className={styles.phaseBadge}>Eventos relevantes · sem PII</span>
      </div>

      {empty ? <AdminEmptyState>Ainda não existem eventos públicos no período selecionado.</AdminEmptyState> : null}

      {report.products.length ? (
        <section>
          <div className={styles.sectionBar}><h2>Produtos mais vistos</h2><span className={styles.phaseBadge}>CTR aproximada</span></div>
          <AdminTable label="Produtos mais vistos e cliques no WhatsApp">
            <thead><tr><th>Produto</th><th>Visualizações</th><th>WhatsApp</th><th>Taxa aproximada</th></tr></thead>
            <tbody>{report.products.map((product) => <tr key={product.id}><td><Link href={`/catalogo/${product.slug}`} target="_blank">{product.name}</Link></td><td>{product.views}</td><td>{product.clicks}</td><td>{product.click_rate === null ? "—" : `${product.click_rate.toLocaleString("pt-BR")}%`}</td></tr>)}</tbody>
          </AdminTable>
        </section>
      ) : null}

      <div className={styles.stack}>
        {report.brands.length ? (
          <section>
            <div className={styles.sectionBar}><h2>Marcas acessadas</h2></div>
            <AdminTable label="Marcas mais acessadas"><thead><tr><th>Marca</th><th>Views</th></tr></thead><tbody>{report.brands.map((brand) => <tr key={brand.id}><td>{brand.name}</td><td>{brand.views}</td></tr>)}</tbody></AdminTable>
          </section>
        ) : null}
        {report.searches.length ? (
          <section>
            <div className={styles.sectionBar}><h2>Buscas comuns</h2></div>
            <AdminTable label="Buscas mais comuns"><thead><tr><th>Busca</th><th>Usos</th></tr></thead><tbody>{report.searches.map((search) => <tr key={search.query}><td>{search.query}</td><td>{search.uses}</td></tr>)}</tbody></AdminTable>
          </section>
        ) : null}
        {report.filters.length ? (
          <section>
            <div className={styles.sectionBar}><h2>Filtros usados</h2></div>
            <AdminTable label="Filtros mais usados"><thead><tr><th>Filtro</th><th>Valor</th><th>Usos</th></tr></thead><tbody>{report.filters.map((filter) => <tr key={`${filter.filter_name}-${filter.value}`}><td>{filterLabels[filter.filter_name] ?? filter.filter_name}</td><td>{filter.value}</td><td>{filter.uses}</td></tr>)}</tbody></AdminTable>
          </section>
        ) : null}
      </div>
    </>
  );
}
