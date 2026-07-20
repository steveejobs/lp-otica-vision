import { Glasses, MessageCircle } from "lucide-react";

import { LINKS } from "@/lib/links";

import { VisionButton } from "../vision-button";
import styles from "../vision-editorial-takeover.module.css";

const titleLines = ["Armações que dão", "forma à sua", "presença."] as const;

export function HeroCopy() {
  return (
    <div className={styles.copyField}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>Armações e lentes · Araguaína - TO</p>
        <h1 id="hero-title">
          {titleLines.map((line) => (
            <span className={styles.titleLine} key={line}>
              <span>{line}</span>
            </span>
          ))}
        </h1>
        <p className={styles.support}>
          Armações nacionais e importadas, com lentes confeccionadas pela Vision
          em Araguaína.
        </p>
        <div className={styles.actions}>
          <VisionButton
            ariaLabel="Ver catálogo da Ótica Vision"
            href={LINKS.catalog}
            icon={Glasses}
          >
            Catálogo
          </VisionButton>
          <VisionButton
            ariaLabel="Falar com a Ótica Vision pelo WhatsApp"
            external
            href={LINKS.whatsapp}
            icon={MessageCircle}
            variant="secondary"
          >
            WhatsApp
          </VisionButton>
        </div>
      </div>
    </div>
  );
}
