import { MapPin, MessageCircle } from "lucide-react";

import { LINKS } from "@/lib/links";

import { SectionShell } from "./section-shell";
import { VisionButton } from "./vision-button";
import styles from "./location-section.module.css";

export function LocationSection() {
  return (
    <SectionShell
      className={styles.section}
      innerClassName={styles.inner}
      tone="soft"
      aria-labelledby="location-section-title"
    >
      <div className={styles.copy}>
        <h2 id="location-section-title">Escolha seus próximos óculos em Araguaína.</h2>
        <p>Fale com a Ótica Vision ou veja a rota até a loja.</p>
      </div>

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
          href={LINKS.maps}
          icon={MapPin}
          variant="secondary"
          external
          ariaLabel="Ver rota até a Ótica Vision"
        >
          Ver rota
        </VisionButton>
      </div>
    </SectionShell>
  );
}
