import type { VideoAsset } from "@/lib/assets";

import { ObservedVideo } from "./observed-video";
import { SectionShell } from "./section-shell";
import { VideoComposition } from "./video-composition";
import styles from "./video-story.module.css";

type VideoStoryProps = {
  videos: readonly [VideoAsset, VideoAsset, VideoAsset];
};

export function VideoStory({ videos }: VideoStoryProps) {
  return (
    <SectionShell
      className={styles.section}
      innerClassName={styles.inner}
      tone="soft"
      aria-labelledby="video-story-title"
    >
      <header className={styles.intro}>
        <h2 id="video-story-title">A armação entra em cena.</h2>
        <p>Forma, proporção e acabamento em movimento.</p>
      </header>

      <VideoComposition className={styles.stage}>
        <span className={styles.aperture} aria-hidden="true" />
        <ObservedVideo asset={videos[0]} className={styles.main} />
        <ObservedVideo
          asset={videos[1]}
          className={`${styles.support} ${styles.supportOne}`}
        />
        <ObservedVideo
          asset={videos[2]}
          className={`${styles.support} ${styles.supportTwo}`}
        />
      </VideoComposition>
    </SectionShell>
  );
}
