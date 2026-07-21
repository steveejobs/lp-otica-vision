import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ProductMediaShell } from "@/components/catalog/product-media-shell";
import { ArrowLeft } from "lucide-react";
import styles from "./product.module.css";

export default function CatalogProductLoading() {
  return (
    <div className={styles.page}>
      <SiteHeader />
      <main className={styles.main} id="main-content">
        <div className={styles.back} style={{ opacity: 0.5, pointerEvents: "none" }}>
          <ArrowLeft aria-hidden="true" size={16} />
          Voltar ao catálogo
        </div>

        <article className={styles.product}>
          {/* O Shell compartilha a mesma proporção e fundo garantindo Zero CLS */}
          <ProductMediaShell presentation="gallery" className={styles.loadingGalleryShell}>
            {/* O interior será vazio, servindo apenas como box model perfeito */}
          </ProductMediaShell>
          
          <div className={styles.details}>
            {/* Esqueletos mínimos que não disputam atenção com a transição visual principal */}
            <div style={{ height: "1.2rem", width: "30%", background: "var(--vision-line)", borderRadius: "var(--radius-sm)", marginBottom: "1rem" }} />
            <div style={{ height: "2.5rem", width: "70%", background: "var(--vision-line)", borderRadius: "var(--radius-sm)", marginBottom: "1.5rem" }} />
            <div style={{ height: "1.5rem", width: "40%", background: "var(--vision-line)", borderRadius: "var(--radius-sm)" }} />
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
