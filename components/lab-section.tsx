import { MessageCircle } from "lucide-react";
import type { CSSProperties } from "react";

import type { DisplayGalleryMedia } from "@/lib/gallery/display-media";
import { LINKS } from "@/lib/links";

import { SectionShell } from "./section-shell";
import { GalleryMediaImage } from "./gallery-media-image";
import { VisionButton } from "./vision-button";
import styles from "./lab-section.module.css";

type LabSectionProps = {
  media: readonly [DisplayGalleryMedia, DisplayGalleryMedia];
};

export function LabSection({ media }: LabSectionProps) {
  const [primaryMedia, secondaryMedia] = media;
  const primaryStyle = {
    "--desktop-focus": primaryMedia.desktopObjectPosition,
    "--desktop-scale": primaryMedia.desktopScale,
    "--mobile-focus": primaryMedia.mobileObjectPosition,
    "--mobile-scale": primaryMedia.mobileScale,
    "--placeholder-color": primaryMedia.placeholderColor,
  } as CSSProperties;
  const secondaryStyle = {
    "--desktop-focus": secondaryMedia.desktopObjectPosition,
    "--desktop-scale": secondaryMedia.desktopScale,
    "--mobile-focus": secondaryMedia.mobileObjectPosition,
    "--mobile-scale": secondaryMedia.mobileScale,
    "--placeholder-color": secondaryMedia.placeholderColor,
  } as CSSProperties;

  return (
    <SectionShell
      id="lab-digital"
      className={styles.section}
      innerClassName={styles.inner}
      aria-labelledby="lab-section-title"
    >
      <div className={styles.copy}>
        <p className={`eyebrow ${styles.eyebrow}`}>LABORATÓRIO DIGITAL</p>
        <h2 id="lab-section-title">Lentes que nascem na própria Vision.</h2>
        <p className={styles.description}>
          Confecção própria em Araguaína - TO no Laboratório Digital da Ótica Vision.
        </p>
        <VisionButton
          analyticsEvent="lab_cta_clicked"
          analyticsLocation="lab_section"
          href="https://api.whatsapp.com/send/?phone=5563992231522&text=Ol%C3%A1%2C+gostaria+de+informa%C3%A7%C3%B5es+sobre+lentes+no+Laborat%C3%B3rio+Digital+da+%C3%93tica+Vision.&type=phone_number&app_absent=0&utm_source=ig"
          icon={MessageCircle}
          external
          ariaLabel="Falar sobre lentes pelo WhatsApp"
        >
          Falar sobre lentes
        </VisionButton>
      </div>

      <div className={styles.chapter} data-focus-reveal>
        <figure className={`${styles.media} ${styles.primaryMedia}`} style={primaryStyle}>
          <GalleryMediaImage
            media={primaryMedia}
            width={primaryMedia.width}
            height={primaryMedia.height}
            sizes="(max-width: 720px) 62vw, 330px"
            alt={primaryMedia.alt}
            loading="lazy"
            placeholder="blur"
            blurDataURL={primaryMedia.blurDataURL}
          />
        </figure>
        <figure className={`${styles.media} ${styles.secondaryMedia}`} style={secondaryStyle}>
          <GalleryMediaImage
            media={secondaryMedia}
            width={secondaryMedia.width}
            height={secondaryMedia.height}
            sizes="(max-width: 720px) 48vw, 230px"
            alt={secondaryMedia.alt}
            loading="lazy"
            placeholder="blur"
            blurDataURL={secondaryMedia.blurDataURL}
          />
        </figure>
      </div>
    </SectionShell>
  );
}
