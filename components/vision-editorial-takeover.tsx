import { HeroCopy } from "./hero/hero-copy";
import { HeroGallery } from "./hero/hero-gallery";
import type { HeroWallMedia } from "./hero/hero-types";
import styles from "./vision-editorial-takeover.module.css";

type Props = { media: readonly HeroWallMedia[] };

/** Composes the documented message with a fixed-frame editorial image collection. */
export function VisionEditorialTakeover({ media }: Props) {
  return (
    <section aria-labelledby="hero-title" className={styles.stage} id="hero">
      <HeroCopy />

      <HeroGallery media={media} />
    </section>
  );
}
