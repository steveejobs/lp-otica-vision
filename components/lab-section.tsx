import Image from "next/image";
import { MessageCircle } from "lucide-react";
import type { CSSProperties } from "react";

import type { ImageAsset } from "@/lib/assets";
import { LINKS } from "@/lib/links";

import { SectionShell } from "./section-shell";
import { VisionButton } from "./vision-button";
import styles from "./lab-section.module.css";

type LabSectionProps = {
  media: ImageAsset;
};

export function LabSection({ media }: LabSectionProps) {
  const mediaStyle = {
    "--placeholder-color": media.placeholderColor,
  } as CSSProperties;

  return (
    <SectionShell
      className={styles.section}
      innerClassName={styles.inner}
      aria-labelledby="lab-section-title"
    >
      <div className={styles.copy}>
        <p className={`eyebrow ${styles.eyebrow}`}>LAB. DIGITAL</p>
        <h2 id="lab-section-title">Lentes que nascem na própria Vision.</h2>
        <p className={styles.description}>
          Confecção própria em Araguaína - TO, com cuidado no acabamento.
        </p>
        <VisionButton
          href={LINKS.whatsapp}
          icon={MessageCircle}
          external
          ariaLabel="Falar sobre lentes pelo WhatsApp"
        >
          Falar sobre lentes
        </VisionButton>
      </div>

      <figure className={styles.media} data-focus-reveal style={mediaStyle}>
        <Image
          src={media.src}
          width={media.width}
          height={media.height}
          sizes="(max-width: 720px) 78vw, 380px"
          alt={media.alt}
          loading="lazy"
          placeholder="blur"
          blurDataURL={media.blurDataURL}
          style={{ objectPosition: media.objectPosition }}
        />
      </figure>
    </SectionShell>
  );
}
