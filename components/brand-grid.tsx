import type { BrandAsset } from "@/lib/assets";

import { BrandRail } from "./brand-rail";
import { SectionShell } from "./section-shell";
import styles from "./brand-grid.module.css";

type BrandGridProps = {
  brands: readonly BrandAsset[];
};

export function BrandGrid({ brands }: BrandGridProps) {
  return (
    <SectionShell
      className={styles.section}
      innerClassName={styles.inner}
      tone="soft"
      aria-labelledby="brand-grid-title"
    >
      <header className={styles.intro}>
        <h2 id="brand-grid-title">Marcas premium. Seleção Vision.</h2>
        <p>Consulte os modelos pelo WhatsApp.</p>
      </header>

      <BrandRail brands={brands} className={styles.rail} />
    </SectionShell>
  );
}
