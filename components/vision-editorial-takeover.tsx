import { HeroCopy } from "./hero/hero-copy";
import { HeroMedia } from "./hero/hero-media";
import type { HeroWallMedia } from "./hero/hero-types";
import styles from "./vision-editorial-takeover.module.css";

type Props = { media: HeroWallMedia };

/** Composes one documented hero message with one stable protagonist image. */
export function VisionEditorialTakeover({ media }: Props) {
  return (
    <section aria-labelledby="hero-title" className={styles.stage} id="hero">
      <HeroCopy />

      <div
        aria-label="Imagem editorial da Ótica Vision"
        className={styles.visual}
        role="group"
      >
        <div className={styles.mediaField} data-vision-media-field>
          <HeroMedia item={media} priority />
          <span className={styles.entryCurtain} aria-hidden="true" />
          <span className={styles.entryLine} aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
