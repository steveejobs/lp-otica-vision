import Image from "next/image";
import { MessageCircle } from "lucide-react";

import { labMedia } from "@/lib/assets";
import { LINKS } from "@/lib/links";

import { VisionButton } from "./vision-button";
import styles from "./lab-section.module.css";

export function LabSection() {
  return (
    <section className={styles.section} aria-labelledby="lab-title" data-reveal>
      <div className={`vision-container ${styles.inner}`}>
        <div className={styles.copy}>
          <p className="eyebrow">LAB. DIGITAL</p>
          <h2 id="lab-title">Lentes feitas pela própria Vision.</h2>
          <p>Confecção própria de lentes em Araguaína - TO, com cuidado no acabamento.</p>
          <VisionButton href={LINKS.whatsapp} icon={MessageCircle} external variant="secondary">
            Falar sobre lentes
          </VisionButton>
        </div>

        <figure className={styles.media}>
          <Image
            src={labMedia.src}
            alt={labMedia.alt}
            fill
            sizes="(max-width: 720px) 92vw, 45vw"
          />
        </figure>
      </div>
    </section>
  );
}
