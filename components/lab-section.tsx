import Image from "next/image";
import { MessageCircle } from "lucide-react";
import type { CSSProperties } from "react";

import type { ImageAsset } from "@/lib/assets";
import { LINKS } from "@/lib/links";

import { SectionShell } from "./section-shell";
import { VisionButton } from "./vision-button";
import styles from "./lab-section.module.css";

type LabSectionProps = {
  media: readonly [ImageAsset, ImageAsset];
};

export function LabSection({ media }: LabSectionProps) {
  const [primaryMedia, secondaryMedia] = media;
  const primaryStyle = {
    "--placeholder-color": primaryMedia.placeholderColor,
  } as CSSProperties;
  const secondaryStyle = {
    "--placeholder-color": secondaryMedia.placeholderColor,
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

      <div className={styles.chapter} data-focus-reveal>
        <figure className={`${styles.media} ${styles.primaryMedia}`} style={primaryStyle}>
          <Image
            src={primaryMedia.src}
            width={primaryMedia.width}
            height={primaryMedia.height}
            sizes="(max-width: 720px) 62vw, 330px"
            alt={primaryMedia.alt}
            loading="lazy"
            placeholder="blur"
            blurDataURL={primaryMedia.blurDataURL}
            style={{ objectPosition: primaryMedia.objectPosition }}
          />
        </figure>
        <figure className={`${styles.media} ${styles.secondaryMedia}`} style={secondaryStyle}>
          <Image
            src={secondaryMedia.src}
            width={secondaryMedia.width}
            height={secondaryMedia.height}
            sizes="(max-width: 720px) 48vw, 230px"
            alt={secondaryMedia.alt}
            loading="lazy"
            placeholder="blur"
            blurDataURL={secondaryMedia.blurDataURL}
            style={{ objectPosition: secondaryMedia.objectPosition }}
          />
        </figure>
      </div>
    </SectionShell>
  );
}
