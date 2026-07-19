"use client";

import { useState, type ReactNode } from "react";

import styles from "./admin.module.css";

export function CollectionHomePreview({ children }: { children: ReactNode }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("mobile");
  return (
    <section className={styles.collectionPreview} aria-labelledby="collection-preview-title">
      <div className={styles.previewHeader}>
        <div>
          <h2 id="collection-preview-title">Prévia pública</h2>
          <p>Usa o mesmo componente da home com os itens, enquadramentos e CTA desta coleção.</p>
        </div>
        <div className={styles.previewSwitch} aria-label="Dispositivo da prévia">
          <button aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")} type="button">Mobile 390×844</button>
          <button aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")} type="button">Desktop 1440×900</button>
        </div>
      </div>
      <div className={styles.collectionPreviewViewport} data-device={device}>
        {children}
      </div>
    </section>
  );
}
