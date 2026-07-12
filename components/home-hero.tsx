import { Camera, MessageCircle } from "lucide-react";

import { heroMedia } from "@/lib/assets";
import { LINKS } from "@/lib/links";

import { FocusPortrait } from "./focus-portrait";
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
        <p className="eyebrow">Ótica Vision · Araguaína - TO</p>
      </div>

      <h1
        className={styles.title}
        id="hero-title"
        aria-label="Armações que fazem sentido no rosto — e na rotina."
      >
        <span className={styles.titleLead}>Armações que </span>
        <span className={styles.titleSecond}>fazem sentido </span>
        <span className={styles.titleThird}>no rosto — </span>
        <span className={styles.titleEnd}>e na rotina.</span>
      </h1>

      <FocusPortrait asset={heroMedia} className={styles.media} priority />

      <div className={styles.copy}>
        <p className={styles.support}>
          Modelos nacionais e importados, com lentes feitas pela Vision em Araguaína.
        </p>
        <div className={styles.actions}>
          <VisionButton
            href={LINKS.whatsapp}
            icon={MessageCircle}
            external
            ariaLabel="Falar com a Ótica Vision pelo WhatsApp"
          >
            WhatsApp
          </VisionButton>
          <VisionButton
            href={LINKS.instagram}
            icon={Camera}
            variant="secondary"
            external
            ariaLabel="Abrir Instagram da Ótica Vision"
          >
            Instagram
          </VisionButton>
        </div>
      </div>
    </SectionShell>
  );
}
