import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { opticalBenchProduct, opticalBenchWhatsapp } from "../../prototype-data";

import styles from "@/components/curation/optical-bench-prototype.module.css";

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
  const product = opticalBenchProduct(slug);
  if (!product) notFound();
  const suffix = new URLSearchParams(
    Object.entries(query).flatMap(([key, value]) => typeof value === "string" ? [[key, value]] : []),
  ).toString();
  const backHref = `/preview/curadoria${suffix ? `?${suffix}` : ""}`;

  return (
    <main className={styles.detailPage} id="main-content">
      <Link className={styles.detailBack} data-catalog-return-link href={backHref} scroll={false}>
        <ArrowLeft aria-hidden="true" size={17} /> Voltar à bancada
      </Link>
      <article className={styles.detailLayout}>
        <div className={styles.detailMedia} data-catalog-product-hero={product.id}>
          <Image
            alt={product.alt}
            height={product.height}
            priority
            sizes="(max-width: 720px) 92vw, 60vw"
            src={product.imageSrc}
            style={{ maxWidth: `${product.width}px` }}
            unoptimized
            width={product.width}
          />
        </div>
        <div className={styles.detailCopy}>
          <p>Versace · Clássica</p>
          <h1>{product.name}</h1>
          <dl>
            <div><dt>Identificador</dt><dd>{product.sku}</dd></div>
            <div><dt>Disponibilidade</dt><dd>Consulte pelo WhatsApp</dd></div>
          </dl>
          <a className={styles.detailAction} href={opticalBenchWhatsapp(product)} rel="noreferrer" target="_blank">
            Consultar este modelo
          </a>
        </div>
      </article>
    </main>
  );
}
