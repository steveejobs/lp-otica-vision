import { ArrowUpRight, ExternalLink } from "lucide-react";

import {
  EXAME_TOPIC_URL,
  type ExameNewsItem,
} from "@/lib/exame-news";

import { NewsImage } from "./news-image";
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
        <div
          className={styles.cards}
          role="region"
          aria-label="Matérias recentes da Exame"
          tabIndex={0}
        >
          {items.map((item) => (
            <article className={styles.article} key={item.url}>
              <a
                className={styles.card}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${item.title} — ler na Exame`}
              >
                {item.imageUrl ? (
                  <NewsImage
                    className={styles.media}
                    src={item.imageUrl}
                    alt={item.imageAlt ?? item.title}
                  />
                ) : null}

                <div className={styles.body}>
                  <p className={styles.meta}>
                    <span>{item.category}</span>
                    {item.timeLabel ? <span>{item.timeLabel}</span> : null}
                    <span>{item.source}</span>
                  </p>
                  <h3>{item.title}</h3>
                  <span className={styles.readLink}>
                    Ler na Exame
                    <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.7} />
                  </span>
                </div>
              </a>
            </article>
          ))}
        </div>
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
