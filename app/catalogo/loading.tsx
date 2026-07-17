import { SiteHeader } from "@/components/site-header";

import styles from "./catalog.module.css";

export default function CatalogLoading() {
  return (
    <div className={styles.page}>
      <SiteHeader />
      <main id="main-content">
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <p className="eyebrow">Vitrine Vision</p>
            <h1>Catálogo</h1>
            <p className={styles.intro}>Preparando a seleção publicada.</p>
          </div>
        </section>
        <section className={styles.results} aria-busy="true" aria-label="Carregando catálogo">
          <div className={styles.resultsInner}>
            <div className={styles.loadingGrid}>
              {Array.from({ length: 8 }, (_, index) => (
                <span className={styles.loadingItem} key={index} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
