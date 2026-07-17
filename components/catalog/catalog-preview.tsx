import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { CatalogProductCard } from "@/lib/catalog/types";

import { CatalogPreviewRail } from "./catalog-preview-rail";
import styles from "./catalog-preview.module.css";

export function CatalogPreview({ products }: { products: CatalogProductCard[] }) {
  if (!products.length) return null;

  return (
    <section className={styles.section} aria-labelledby="catalog-preview-title">
      <div className={styles.inner}>
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Catálogo Vision</p>
            <h2 id="catalog-preview-title">Escolhas em foco.</h2>
          </div>
          <p>Uma prévia dos produtos selecionados no catálogo.</p>
          <Link className={styles.cta} href="/catalogo">
            Ver catálogo
            <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </header>
        <CatalogPreviewRail products={products} />
      </div>
    </section>
  );
}
