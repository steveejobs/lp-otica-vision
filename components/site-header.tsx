import Link from "next/link";
import { Camera, MessageCircle } from "lucide-react";

import { LINKS } from "@/lib/links";

import { BrandLogo } from "./brand-logo";
import { VisionButton } from "./vision-button";
import styles from "./site-header.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={`vision-container ${styles.inner}`}>
        <Link className={styles.brand} href={LINKS.home} aria-label="Ótica Vision - início">
          <BrandLogo priority />
        </Link>

        <nav className={styles.actions} aria-label="Canais oficiais">
          <a className={styles.instagram} href={LINKS.instagram} target="_blank" rel="noreferrer">
            <Camera aria-hidden="true" size={17} strokeWidth={1.8} />
            <span>Instagram</span>
          </a>
          <VisionButton
            href={LINKS.whatsapp}
            icon={MessageCircle}
            external
            variant="primary"
          >
            WhatsApp
          </VisionButton>
        </nav>
      </div>
    </header>
  );
}
