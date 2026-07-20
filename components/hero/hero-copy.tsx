import { MessageCircle } from "lucide-react";

import { LINKS } from "@/lib/links";

import { InstagramIcon } from "../instagram-icon";
import { VisionButton } from "../vision-button";
import styles from "../vision-editorial-takeover.module.css";
import { heroContent } from "./hero-content";

export function HeroCopy() {
  return (
    <div className={styles.copyField}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{heroContent.eyebrow}</p>
        <h1 id="hero-title">
          {heroContent.titleLines.map((line) => (
            <span className={styles.titleLine} key={line}>
              <span>{line}</span>
            </span>
          ))}
        </h1>
        <p className={styles.support}>{heroContent.support}</p>
        <div className={styles.actions}>
          <VisionButton
            analyticsEvent="hero_interaction"
            analyticsLocation="hero_whatsapp"
            ariaLabel={heroContent.actions.primary.ariaLabel}
            external
            href={LINKS.whatsapp}
            icon={MessageCircle}
          >
            {heroContent.actions.primary.label}
          </VisionButton>
          <VisionButton
            analyticsEvent="hero_interaction"
            analyticsLocation="hero_instagram"
            ariaLabel={heroContent.actions.secondary.ariaLabel}
            external
            href={LINKS.instagram}
            icon={InstagramIcon}
            variant="secondary"
          >
            {heroContent.actions.secondary.label}
          </VisionButton>
        </div>
      </div>
    </div>
  );
}
