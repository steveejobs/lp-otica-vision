import { MessageCircle } from "lucide-react";

import type { FeaturedBrandsContent } from "@/lib/showcase-content";

import { BrandRail } from "./brand-rail";
import { SectionShell } from "./section-shell";
import { VisionButton } from "./vision-button";
import styles from "./brand-grid.module.css";

type BrandGridProps = {
  content: FeaturedBrandsContent;
};

export function BrandGrid({ content }: BrandGridProps) {
  const { sectionId, eyebrow, title, description, action, brands } = content;
  const titleId = `${sectionId}-title`;

  return (
    <SectionShell
      id={sectionId}
      className={styles.section}
      innerClassName={styles.inner}
      tone="soft"
      aria-labelledby={titleId}
    >
      <header className={styles.intro}>
        <p className={`eyebrow ${styles.eyebrow}`}>{eyebrow}</p>
        <h2 id={titleId}>{title}</h2>
        <p className={styles.description}>{description}</p>
        <VisionButton
          href={action.href}
          icon={MessageCircle}
          external={action.external}
          ariaLabel={action.ariaLabel}
        >
          {action.label}
        </VisionButton>
      </header>

      <div className={styles.railWrap}>
        <BrandRail
          brands={brands}
          ariaLabel="Marcas premium na selecao da Otica Vision"
        />
      </div>
    </SectionShell>
  );
}
