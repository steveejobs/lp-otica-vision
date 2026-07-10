import { MapPin, MessageCircle } from "lucide-react";

import { LINKS } from "@/lib/links";

import { VisionButton } from "./vision-button";
import styles from "./location-section.module.css";

export function LocationSection() {
  return (
    <section className={styles.section} aria-labelledby="location-title" data-reveal>
      <div className={`vision-container ${styles.inner}`}>
        <div className={styles.heading}>
          <p className="eyebrow">Araguaína - TO</p>
          <h2 id="location-title">Escolha seus próximos óculos em Araguaína.</h2>
        </div>

        <div className={styles.actionBlock}>
          <p>Fale com a Ótica Vision ou veja a rota até a loja.</p>
          <div className={styles.actions}>
            <VisionButton href={LINKS.whatsapp} icon={MessageCircle} external>
              WhatsApp
            </VisionButton>
            <VisionButton href={LINKS.maps} icon={MapPin} external variant="secondary">
              Ver rota
            </VisionButton>
          </div>
        </div>
      </div>
    </section>
  );
}
