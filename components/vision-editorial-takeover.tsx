import type { CatalogProductCard } from "@/lib/catalog/types";
import { HeroCopy } from "./hero/hero-copy";
import { HeroGallery } from "./hero/hero-gallery";
import type { HeroWallMedia } from "./hero/hero-types";
import { CatalogHeaderSpotlight } from "@/components/catalog/catalog-header-spotlight";
import styles from "./vision-editorial-takeover.module.css";

type Props = { 
  media: readonly HeroWallMedia[];
  heroProducts?: CatalogProductCard[];
};

/** Composes the documented message with a fixed-frame editorial image collection. */
export function VisionEditorialTakeover({ media, heroProducts = [] }: Props) {
  return (
    <section aria-labelledby="hero-title" className={styles.stage} id="hero">
      <HeroCopy />

      <HeroGallery media={media} />

      {heroProducts.length > 0 && (
        <div style={{ position: "absolute", top: "2rem", left: "2rem", zIndex: 10, maxWidth: "320px", width: "100%" }}>
          <CatalogHeaderSpotlight products={heroProducts} />
        </div>
      )}
    </section>
  );
}
