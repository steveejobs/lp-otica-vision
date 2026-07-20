"use client";

import { useState, type ReactNode } from "react";

import styles from "./admin.module.css";

export function CollectionHomePreview({ children }: { children: ReactNode }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("mobile");
  return (
    <section className={styles.collectionPreview} aria-labelledby="collection-preview-title">
      <div className={styles.previewHeader}>
        <div>
          <h2 id="collection-preview-title">Prévia do site</h2>
          <p>Mostra o mesmo componente da página inicial com o último rascunho salvo.</p>
        </div>
        <div className={styles.previewSwitch} aria-label="Dispositivo da prévia">
          <button aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")} type="button">Celular</button>
          <button aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")} type="button">Computador</button>
        </div>
      </div>
      <div className={styles.collectionPreviewViewport} data-device={device}>
        {children}
      </div>
    </section>
  );
}
