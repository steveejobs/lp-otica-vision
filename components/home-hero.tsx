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
      <div className={styles.eyebrowRail}>
        <p className="eyebrow">Armações e lentes · Araguaína - TO</p>
      </div>

      <h1
        className={styles.title}
        id="hero-title"
        aria-label="Armações que dão forma à sua presença."
      >
        <span className={styles.titleLead}>Armações que </span>
        <span className={styles.titleSecond}>dão forma </span>
        <span className={styles.titleThird}>à sua </span>
        <span className={styles.titleEnd}>presença.</span>
      </h1>

      <FocusPortrait asset={heroMedia} className={styles.media} priority />

      <div className={styles.copy}>
        <p className={styles.support}>
          Armações nacionais e importadas, com lentes confeccionadas pela Vision em
          Araguaína.
        </p>
        <div className={styles.actions}>
          <VisionButton
            href={LINKS.whatsapp}
            icon={MessageCircle}
            external
            ariaLabel="Falar com a Ótica Vision pelo WhatsApp"
          >
            Falar no WhatsApp
          </VisionButton>
          <VisionButton
            href={LINKS.instagram}
            icon={InstagramIcon}
            variant="secondary"
            external
            ariaLabel="Abrir Instagram da Ótica Vision"
          >
            Ver Instagram
          </VisionButton>
        </div>
      </div>
    </SectionShell>
  );
}
