import Image from "next/image";
import { Camera, MessageCircle } from "lucide-react";

import { heroMedia } from "@/lib/assets";
import { LINKS } from "@/lib/links";

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
        <p className={`eyebrow ${styles.eyebrow}`}>Ótica Vision · Araguaína - TO</p>
        <h1 id="hero-title">
          Armações que fazem sentido <span>no rosto — e na rotina.</span>
        </h1>
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

      <figure className={styles.media}>
        <div className={styles.mediaFrame} data-focus-reveal>
          <Image
            src={heroMedia.src}
            alt={heroMedia.alt}
            fill
            priority
            placeholder="blur"
            blurDataURL={heroMedia.blurDataURL}
            sizes="(max-width: 720px) 70vw, (max-width: 1100px) 39vw, 470px"
          />
        </div>
        <figcaption className={styles.mediaNote} aria-hidden="true">
          <span>Vision</span>
          <span>01</span>
        </figcaption>
      </figure>
    </SectionShell>
  );
}
