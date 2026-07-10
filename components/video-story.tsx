"use client";

import type { VideoAsset } from "@/lib/assets";

import { ObservedVideo } from "./observed-video";
import styles from "./video-story.module.css";

type VideoStoryProps = {
  videos: readonly [VideoAsset, VideoAsset, VideoAsset];
};

export function VideoStory({ videos }: VideoStoryProps) {
  return (
    <section className={styles.section} aria-labelledby="video-story-title" data-reveal>
      <div className="vision-container">
        <header className={styles.intro}>
          <p className="eyebrow">Em movimento</p>
          <h2 id="video-story-title">No rosto, na luz, no detalhe.</h2>
          <p>Veja como as armações se comportam em uso real.</p>
        </header>

        <div className={styles.stage}>
          <ObservedVideo asset={videos[0]} className={styles.main} />
          <div className={styles.supportRow}>
            <ObservedVideo asset={videos[1]} className={styles.support} />
            <ObservedVideo asset={videos[2]} className={styles.support} />
          </div>
        </div>
      </div>
    </section>
  );
}
