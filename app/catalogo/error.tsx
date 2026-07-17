"use client";

import Link from "next/link";

import { LINKS } from "@/lib/links";

import styles from "./catalog.module.css";

export default function CatalogError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className={styles.page} id="main-content">
      <section className={styles.results}>
        <div className={styles.resultsInner}>
          <div className={styles.empty}>
            <p className="eyebrow">Catálogo Vision</p>
            <h1>Não foi possível abrir a vitrine agora.</h1>
            <p>Tente novamente ou fale diretamente com nossa equipe.</p>
            <div className={styles.emptyActions}>
              <button className={styles.submit} onClick={reset} type="button">Tentar novamente</button>
              <Link href="/">Voltar para a home</Link>
              <a href={LINKS.whatsapp} rel="noopener noreferrer" target="_blank">WhatsApp</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
