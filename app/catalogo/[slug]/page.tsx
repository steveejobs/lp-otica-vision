import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";

import { ProductViewAnalytics } from "@/components/catalog/catalog-analytics";
import { CatalogProductCard } from "@/components/catalog/catalog-product-card";
import { ProductGallery } from "@/components/catalog/product-gallery";
import { ProductWhatsappButton } from "@/components/catalog/product-whatsapp-button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublishedCatalogProduct, getRelatedCatalogProducts } from "@/lib/catalog/data";
import { availabilityLabels, formatCatalogPrice } from "@/lib/catalog/format";
import { catalogImageUrl } from "@/lib/catalog/image-url";
import { getCatalogProductUrl, getCatalogSiteBase } from "@/lib/catalog/site-url";
import { buildProductWhatsappUrl } from "@/lib/whatsapp/product-link";

import styles from "./product.module.css";

export const dynamic = "force-static";
export const dynamicParams = true;
export const revalidate = 300;

function metadataDescription(name: string, brand: string | null, description: string | null) {
  if (description) return description.slice(0, 160);
  return `${name}${brand ? `, da ${brand}` : ""}, no catálogo da Ótica Vision em Araguaína - TO.`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublishedCatalogProduct(slug);
  if (!product) notFound();

  const title = `${product.name} | Catálogo Ótica Vision`;
  const description = metadataDescription(product.name, product.brand?.name ?? null, product.shortDescription);
  const image = catalogImageUrl(product.cover);
  return {
    alternates: { canonical: `/catalogo/${product.slug}` },
    description,
    openGraph: {
      description,
      images: [{
        alt: product.cover.altText,
        height: product.cover.height,
        url: image,
        width: product.cover.width,
      }],
      title,
      type: "website",
      url: `/catalogo/${product.slug}`,
    },
    title,
    twitter: {
      card: "summary_large_image",
      description,
      images: [image],
      title,
    },
  };
}

export default async function CatalogProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getPublishedCatalogProduct(slug);
  if (!product) notFound();

  const [related, whatsappUrl] = await Promise.all([
    getRelatedCatalogProducts(product),
    buildProductWhatsappUrl({
      brand: product.brand?.name,
      color: product.color,
      model: product.model,
      productName: product.name,
      productUrl: getCatalogProductUrl(product.slug),
      sku: product.sku,
    }),
  ]);
  const price = formatCatalogPrice(product.price, product.priceVisibility);
  const canonicalUrl = getCatalogProductUrl(product.slug);
  const imageUrl = new URL(catalogImageUrl(product.cover), getCatalogSiteBase()).toString();
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    image: imageUrl,
    name: product.name,
    sku: product.sku,
    url: canonicalUrl,
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand.name } } : {}),
    ...(product.color ? { color: product.color } : {}),
    ...(product.shortDescription ? { description: product.shortDescription } : {}),
    ...(product.priceVisibility === "visible" && product.price !== null
      ? {
          offers: {
            "@type": "Offer",
            price: product.price.toFixed(2),
            priceCurrency: "BRL",
            url: canonicalUrl,
          },
        }
      : {}),
  };
  const specifications = [
    ["Código", product.sku],
    ["Modelo", product.model],
    ["Cor", product.color],
    ["Categoria", product.category?.name],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <div className={styles.page}>
      <SiteHeader />
      <main className={styles.main} id="main-content">
        <Link className={styles.back} href="/catalogo">
          <ArrowLeft aria-hidden="true" size={16} />
          Voltar ao catálogo
        </Link>

        <article className={styles.product}>
          <ProductGallery images={product.images} productName={product.name} />
          <div className={styles.details}>
            <header className={styles.detailsHeader}>
              <p className={styles.brand}>{product.brand?.name ?? "Seleção Vision"}</p>
              <h1>{product.name}</h1>
            </header>
            {product.shortDescription ? <p className={styles.description}>{product.shortDescription}</p> : null}
            <div className={styles.commercial}>
              <span className={styles.availability}>{availabilityLabels[product.availability]}</span>
              {price ? <strong className={styles.price}>{price}</strong> : null}
            </div>
            {specifications.length ? (
              <dl className={styles.specs}>
                {specifications.map(([label, value]) => (
                  <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
                ))}
              </dl>
            ) : null}
            <ProductWhatsappButton
              href={whatsappUrl}
              label={product.availability === "unavailable" ? "Consultar modelo" : "Consultar no WhatsApp"}
              productId={product.id}
            />
            <p className={styles.consultationNote}>
              A consulta confirma a disponibilidade comercial do modelo. Nenhuma reserva é feita automaticamente.
            </p>
          </div>
        </article>

        {related.length ? (
          <section className={styles.related} aria-labelledby="related-title">
            <div className={styles.relatedHeader}>
              <div>
                <p className="eyebrow">Na mesma curadoria</p>
                <h2 id="related-title">Outros modelos</h2>
              </div>
              <Link href="/catalogo">
                Ver catálogo
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </div>
            <div className={styles.relatedGrid}>
              {related.map((item) => <CatalogProductCard key={item.id} product={item} />)}
            </div>
          </section>
        ) : null}

        <ProductViewAnalytics productId={product.id} />
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
          type="application/ld+json"
        />
      </main>
      <SiteFooter />
    </div>
  );
}
