import { MessageCircle } from "lucide-react";

import { heroMedia } from "@/lib/assets";
import { LINKS } from "@/lib/links";

import { FocusPortrait } from "./focus-portrait";
import { InstagramIcon } from "./instagram-icon";
import { SectionShell } from "./section-shell";
import { VisionButton } from "./vision-button";
import styles from "./home-hero.module.css";

export function HomeHero() {
  return (
    <SectionShell
      className={styles.hero}
      innerClassName={styles.inner}
      aria-labelledby="hero-title"
    >
      <div className={styles.copy}>
        <div className={styles.eyebrowRail}>
          <p className="eyebrow">Armações e lentes · Araguaína - TO</p>
        </div>

        <h1 className={styles.title} id="hero-title">
          Armações que dão forma à sua presença.
        </h1>

        <p className={styles.support}>
          Armações nacionais e importadas, com lentes confeccionadas pela Vision em
          Araguaína.
        </p>
        <div className={styles.actions}>
          <VisionButton
            href={LINKS.whatsapp}
            icon={MessageCircle}
            external
            ariaLabel="Falar no WhatsApp"
          >
            Falar no WhatsApp
          </VisionButton>
          <VisionButton
            href={LINKS.instagram}
            icon={InstagramIcon}
            variant="secondary"
            external
            ariaLabel="Ver Instagram"
          >
            Ver Instagram
          </VisionButton>
        </div>
      </div>

      <div className={styles.mediaStage} data-focus-reveal>
        <FocusPortrait asset={heroMedia} className={styles.media} priority />
        <span className={styles.mediaLine} aria-hidden="true" />
      </div>
    </SectionShell>
  );
}
