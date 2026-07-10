import { Newspaper } from "lucide-react";

import { getExameNews } from "@/lib/exame-news";
import { LINKS } from "@/lib/links";

import { NewsCard } from "./news-card";
import { VisionButton } from "./vision-button";
import styles from "./news-section.module.css";

export async function NewsSection() {
  const articles = await getExameNews(3);

  return (
    <section className={styles.section} aria-labelledby="news-title" data-reveal>
      <div className={`vision-container ${styles.layout} ${articles.length ? "" : styles.empty}`}>
        <header className={styles.intro}>
          <p className="eyebrow">Exame</p>
          <h2 id="news-title">Tendências em óculos</h2>
          <p>Matérias sobre moda, consumo e mercado óptico.</p>
          <VisionButton href={LINKS.exame} icon={Newspaper} external variant="secondary">
            Ver mais na Exame
          </VisionButton>
        </header>

        {articles.length ? (
          <div className={styles.cards} aria-label="Notícias da Exame sobre óculos">
            {articles.map((article) => (
              <NewsCard article={article} key={article.url} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
