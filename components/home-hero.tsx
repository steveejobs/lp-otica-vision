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
      id="hero"
      className={styles.hero}
      innerClassName={styles.inner}
      aria-labelledby="hero-title"
    >
      <div className={styles.copy} data-motion-stagger>
        <div className={styles.eyebrowRail}>
          <p className="eyebrow" data-motion-reveal data-motion-variant="hero">
            Armações e lentes · Araguaína - TO
          </p>
        </div>

        <h1
          className={styles.title}
          data-motion-reveal
          data-motion-variant="hero"
          id="hero-title"
        >
          Armações que dão forma à sua presença.
        </h1>

        <p className={styles.support} data-motion-reveal data-motion-variant="hero">
          Armações nacionais e importadas, com lentes confeccionadas pela Vision em
          Araguaína.
        </p>
        <div className={styles.actions} data-motion-reveal data-motion-variant="hero">
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

      <div className={styles.mediaStage} data-focus-reveal data-motion-variant="media">
        <FocusPortrait asset={heroMedia} className={styles.media} priority />
        <span className={styles.mediaLine} aria-hidden="true" />
      </div>
    </SectionShell>
  );
}
