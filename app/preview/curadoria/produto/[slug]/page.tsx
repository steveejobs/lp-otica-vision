import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { fixtureProduct } from "@/lib/curation/fixtures";

import styles from "../../preview.module.css";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Produto de demonstração | Ótica Vision",
};

export default async function CurationProductPreview({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const product = fixtureProduct(slug);
  if (!product?.fixtureImageSrc) notFound();
  const suffix = new URLSearchParams(
    Object.entries(query).flatMap(([key, value]) => typeof value === "string" ? [[key, value]] : []),
  ).toString();
  const backHref = `/preview/curadoria/catalogo${suffix ? `?${suffix}` : ""}`;

  return (
    <main className={styles.productPage} id="main-content">
      <Link className={styles.back} data-catalog-return-link href={backHref} scroll={false}>
        <ArrowLeft aria-hidden="true" size={17} />
        Voltar ao catálogo de demonstração
      </Link>
      <article className={styles.productLayout}>
        <div className={styles.productMedia} data-catalog-product-hero={product.id}>
          <Image
            alt={product.cover.altText}
            fill
            priority
            sizes="(max-width: 720px) 100vw, 62vw"
            src={product.fixtureImageSrc}
          />
        </div>
        <div className={styles.productCopy}>
          <p>Demonstração visual · sem afirmação comercial</p>
          <h1>{product.name}</h1>
          <dl>
            <div><dt>Identificador</dt><dd>{product.sku}</dd></div>
            <div><dt>Uso</dt><dd>Validação da composição e navegação</dd></div>
          </dl>
        </div>
      </article>
    </main>
  );
}
