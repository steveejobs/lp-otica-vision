import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { LINKS } from "@/lib/links";

import { BrandLogo } from "./brand-logo";
import { InstagramIcon } from "./instagram-icon";
import { VisionButton } from "./vision-button";
import styles from "./site-header.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.brand} href={LINKS.home} aria-label="Ótica Vision - início">
          <BrandLogo priority />
        </Link>

        <nav className={styles.actions} aria-label="Canais oficiais">
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
