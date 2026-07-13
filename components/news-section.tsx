import { ExternalLink } from "lucide-react";

import {
  EXAME_TOPIC_URL,
  type ExameNewsItem,
} from "@/lib/exame-news";

import { NewsCarousel } from "./news-carousel";
import { SectionShell } from "./section-shell";
import { VisionButton } from "./vision-button";
import styles from "./news-section.module.css";

type NewsSectionProps = {
  items: readonly ExameNewsItem[];
  loading?: boolean;
};

export function NewsSection({ items, loading = false }: NewsSectionProps) {
  const titleId = loading ? "news-section-loading-title" : "news-section-title";

  return (
    <SectionShell
      className={styles.section}
      innerClassName={styles.inner}
      tone="soft"
      aria-labelledby={titleId}
      aria-busy={loading || undefined}
    >
      <div className={styles.intro}>
        <p className="eyebrow">Exame</p>
        <h2 id={titleId}>Óculos em pauta.</h2>
        <p className={styles.description}>
          Moda, consumo e mercado óptico em matérias da Exame.
        </p>
        <VisionButton
          className={styles.button}
          href={EXAME_TOPIC_URL}
          icon={ExternalLink}
          variant="secondary"
          external
        >
          Ler mais na Exame
        </VisionButton>
      </div>

      {items.length > 0 ? (
        <NewsCarousel items={items} />
      ) : loading ? (
        <div className={styles.loadingCards} aria-hidden="true" data-news-loading>
          {Array.from({ length: 3 }, (_, index) => (
            <div className={styles.loadingCard} key={index}>
              <span className={styles.loadingMedia} />
              <span className={styles.loadingLine} />
              <span className={styles.loadingLineShort} />
            </div>
          ))}
        </div>
      ) : null}
    </SectionShell>
  );
}
