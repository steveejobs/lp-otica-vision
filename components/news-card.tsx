"use client";

import { useState } from "react";

import type { ExameArticle } from "@/lib/exame-news";

import styles from "./news-card.module.css";

type NewsCardProps = {
  article: ExameArticle;
};

export function NewsCard({ article }: NewsCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(article.image) && !imageFailed;

  return (
    <article className={`${styles.card} ${showImage ? "" : styles.textOnly}`}>
      {showImage ? (
        <div className={styles.media}>
          {/* The source image stays on Exame's CDN and is never re-hosted. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.image ?? undefined}
            alt={article.title}
            width="640"
            height="400"
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        </div>
      ) : null}

      <div className={styles.content}>
        <div className={styles.meta}>
          <span>{article.category}</span>
          {article.meta ? <span>{article.meta}</span> : null}
        </div>
        <h3>
          <a href={article.url} target="_blank" rel="noreferrer">
            {article.title}
          </a>
        </h3>
        <a className={styles.read} href={article.url} target="_blank" rel="noreferrer">
          Ler na Exame
        </a>
      </div>
    </article>
  );
}
