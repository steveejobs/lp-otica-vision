import Image from "next/image";
import type { CSSProperties } from "react";

import type { BrandAsset } from "@/lib/assets";

import { SectionShell } from "./section-shell";
import styles from "./brand-grid.module.css";

type BrandGridProps = {
  brands: readonly BrandAsset[];
};

type BrandLogoStyle = CSSProperties & {
  "--brand-scale": number;
  "--brand-max-width": string;
  "--brand-max-height": string;
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
        <h2 id="brand-grid-title">Marcas que passam pela Vision</h2>
        <p>Consulte a disponibilidade dos modelos pelo WhatsApp.</p>
      </header>

      <ul className={styles.grid} aria-label="Logos de marcas para consulta na Ótica Vision">
        {brands.map((brandItem) => {
          const logoStyle: BrandLogoStyle = {
            "--brand-scale": brandItem.scale,
            "--brand-max-width": `${brandItem.maxWidth}px`,
            "--brand-max-height": `${brandItem.maxHeight}px`,
          };

          return (
            <li className={styles.slot} key={brandItem.name}>
              <Image
                className={styles.logo}
                src={brandItem.src}
                width={brandItem.width}
                height={brandItem.height}
                sizes="(max-width: 720px) 132px, 150px"
                alt={brandItem.alt}
                loading="lazy"
                style={logoStyle}
              />
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}
