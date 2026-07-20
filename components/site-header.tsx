import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { LINKS } from "@/lib/links";

import { BrandLogo } from "./brand-logo";
import { InstagramIcon } from "./instagram-icon";
import { VisionButton } from "./vision-button";
import styles from "./site-header.module.css";

export function SiteHeader({
  heroEntrance = false,
}: {
  heroEntrance?: boolean;
}) {
  return (
    <header
      className={`${styles.header} ${heroEntrance ? styles.heroEntrance : ""}`}
    >
      <div className={styles.inner}>
        <Link
          className={styles.brand}
          href={LINKS.home}
          aria-label="Ótica Vision - início"
        >
          <BrandLogo animated={heroEntrance} priority />
        </Link>

        <nav className={styles.actions} aria-label="Navegação principal">
          <Link className={styles.catalog} href={LINKS.catalog}>
            Catálogo
          </Link>
          <a
            className={styles.instagram}
            href={LINKS.instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir Instagram da Ótica Vision"
          >
            <InstagramIcon aria-hidden="true" size={18} strokeWidth={1.7} />
            <span>Instagram</span>
          </a>
          <VisionButton
            className={styles.whatsapp}
            href={LINKS.whatsapp}
            icon={MessageCircle}
            external
            variant="compact"
            ariaLabel="Falar com a Ótica Vision pelo WhatsApp"
          >
            WhatsApp
          </VisionButton>
        </nav>
      </div>
    </header>
  );
}
