import Image from "next/image";
import Link from "next/link";

import type { AnalyticsProductCover, InternalAnalyticsReport } from "@/lib/analytics/internal-reports";
import { catalogImageUrl } from "@/lib/catalog/image-url";

import { SourceBadge } from "./analytics-ui";
import styles from "./analytics.module.css";

type Product = InternalAnalyticsReport["topProducts"][number];

function conversion(product: Product) {
  if (!product.views) return "Sem base";
  return `${(product.whatsapp / product.views * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% abriram o WhatsApp`;
}

function ProductCover({ cover, name, sizes }: { cover?: AnalyticsProductCover; name: string; sizes: string }) {
  return <div className={styles.productInterestMedia} data-empty={!cover || undefined}>
    {cover ? <Image
      alt={cover.altText || name}
      fill
      sizes={sizes}
      src={catalogImageUrl({ id: cover.id, updatedAt: cover.assetVersion }, "catalog_card")}
      style={{ objectPosition: cover.objectPosition }}
      unoptimized
    /> : <span>Imagem de capa indisponível</span>}
  </div>;
}

export function ProductInterest({ covers, products }: { covers: Record<string, AnalyticsProductCover>; products: Product[] }) {
  const lead = products[0];
  return <section className={styles.section} aria-labelledby="product-interest-title">
    <div className={styles.sectionHeader}>
      <div><SourceBadge>Dados internos</SourceBadge><h2 id="product-interest-title">Armações que mais despertam interesse</h2><p>Aberturas reais da página do produto no período selecionado.</p></div>
      <Link className={styles.textAction} href="/admin/analytics/catalogo">Análise completa</Link>
    </div>
    {!lead ? <div className={styles.analyticsEmpty}><strong>Ainda não há uma armação mais vista.</strong><p>O ranking aparecerá quando visitantes abrirem produtos no catálogo.</p></div> : <div className={styles.productInterestLayout}>
      <article className={styles.leadProduct}>
        <ProductCover cover={covers[lead.id]} name={lead.name} sizes="(max-width: 620px) 92vw, (max-width: 1100px) 50vw, 38vw" />
        <div className={styles.leadProductContent}>
          <span className={styles.rankLabel}>Armação mais vista</span>
          <h3>{lead.name}</h3>
          <dl><div><dt>Aberturas</dt><dd>{lead.views}</dd></div><div><dt>WhatsApp</dt><dd>{lead.whatsapp}</dd></div></dl>
          <p>{conversion(lead)}</p>
          <div className={styles.productActions}><Link href={`/catalogo/${lead.slug}`} target="_blank">Ver no site</Link><Link href={`/admin/produtos/${lead.id}`}>Editar produto</Link></div>
        </div>
      </article>
      <ol className={styles.productRanking} aria-label="Ranking de armações mais vistas">
        {products.slice(0, 5).map((product, index) => <li key={product.id}>
          <span className={styles.rankingPosition}>{String(index + 1).padStart(2, "0")}</span>
          <ProductCover cover={covers[product.id]} name={product.name} sizes="72px" />
          <div><strong>{product.name}</strong><small>{product.views} {product.views === 1 ? "abertura" : "aberturas"} · {product.whatsapp} WhatsApp</small></div>
          <Link aria-label={`Abrir métricas de ${product.name}`} href="/admin/analytics/catalogo">Ver</Link>
        </li>)}
      </ol>
    </div>}
  </section>;
}
