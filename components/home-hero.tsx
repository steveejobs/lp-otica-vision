import Image from "next/image";
import { Camera, MessageCircle } from "lucide-react";

import { heroMedia } from "@/lib/assets";
import { LINKS } from "@/lib/links";

import { BrandLogo } from "./brand-logo";
import { VisionButton } from "./vision-button";
import styles from "./home-hero.module.css";

export function HomeHero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={`vision-container ${styles.inner}`}>
        <div className={styles.copy}>
          <BrandLogo className={styles.heroLogo} priority size="hero" />
          <p className={`eyebrow ${styles.eyebrow}`}>Ótica Vision · Araguaína - TO</p>
          <h1 id="hero-title">Armações que fazem sentido no rosto — e na rotina.</h1>
          <p className={styles.support}>
            Modelos nacionais e importados, com lentes feitas pela Vision em Araguaína.
          </p>
          <div className={styles.actions}>
            <VisionButton href={LINKS.whatsapp} icon={MessageCircle} external>
              WhatsApp
            </VisionButton>
            <VisionButton
              href={LINKS.instagram}
              icon={Camera}
              variant="secondary"
              external
            >
              Instagram
            </VisionButton>
          </div>
        </div>

        <figure className={styles.media}>
          <Image
            src={heroMedia.src}
            alt={heroMedia.alt}
            fill
            priority
            sizes="(max-width: 720px) 92vw, 46vw"
          />
        </figure>
      </div>
    </section>
  );
}
