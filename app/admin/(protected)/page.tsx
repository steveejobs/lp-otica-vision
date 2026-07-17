import Link from "next/link";

import styles from "@/components/admin/admin.module.css";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { requireAdminSession } from "@/lib/auth/admin-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DashboardPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminDashboardPage({ searchParams }: DashboardPageProps) {
  const { profile } = await requireAdminSession();
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const [
    publishedProducts,
    featuredProducts,
    unavailableProducts,
    publishedCollections,
    activePromotions,
    publishedGalleries,
  ] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("published", true),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("featured", true),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("availability_status", "unavailable"),
    supabase.from("collections").select("id", { count: "exact", head: true }).eq("published", true),
    supabase
      .from("promotions")
      .select("id", { count: "exact", head: true })
      .eq("active", true)
      .lte("starts_at", now)
      .gte("ends_at", now),
    supabase.from("galleries").select("id", { count: "exact", head: true }).eq("published", true),
  ]);
  const params = await searchParams;
  const databaseError = [
    publishedProducts,
    featuredProducts,
    unavailableProducts,
    publishedCollections,
    activePromotions,
    publishedGalleries,
  ].some((result) => result.error);

  const metrics = [
    { label: "Produtos publicados", value: publishedProducts.count ?? 0 },
    { label: "Produtos em destaque", value: featuredProducts.count ?? 0 },
    { label: "Produtos indisponíveis", value: unavailableProducts.count ?? 0 },
    { label: "Coleções publicadas", value: publishedCollections.count ?? 0 },
    { label: "Destaques ativos", value: activePromotions.count ?? 0 },
    { label: "Galerias publicadas", value: publishedGalleries.count ?? 0 },
  ];

  return (
    <>
      <AdminPageHeader
        description="Uma leitura objetiva do conteúdo editorial e da disponibilidade, respeitando as ações permitidas para cada papel."
        eyebrow="Painel editorial"
        title="Visão geral"
      />

      {params.status === "forbidden" ? (
        <p className={styles.notice} role="alert">
          Seu papel não permite acessar essa configuração.
        </p>
      ) : null}

      {databaseError ? (
        <p className={styles.notice} role="alert">
          Não foi possível atualizar todos os indicadores. Tente novamente em instantes.
        </p>
      ) : null}

      <section aria-label="Indicadores do catálogo" className={styles.metricsGrid}>
        {metrics.map((metric) => (
          <article className={styles.metricCard} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </section>

      <div className={styles.sectionBar}>
        <h2>Acessos rápidos</h2>
        <span className={styles.phaseBadge}>Fase 2 · operação administrativa</span>
      </div>

      <section aria-label="Acessos rápidos" className={styles.quickGrid}>
        {profile.role === "attendant" ? (
          <Link className={styles.quickLink} href="/admin/disponibilidade">
            <span>Atendimento</span>
            <strong>Atualizar disponibilidade</strong>
          </Link>
        ) : (
          <>
            <Link className={styles.quickLink} href="/admin/produtos">
              <span>Catálogo</span>
              <strong>Organizar produtos</strong>
            </Link>
            <Link className={styles.quickLink} href="/admin/galerias">
              <span>Imagem editorial</span>
              <strong>Revisar galerias</strong>
            </Link>
            <Link className={styles.quickLink} href="/admin/colecoes">
              <span>Curadoria</span>
              <strong>Revisar coleções</strong>
            </Link>
          </>
        )}
      </section>
    </>
  );
}
