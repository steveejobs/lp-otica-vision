import { LINKS } from "@/lib/links";

import styles from "./site-footer.module.css";

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.identity}>
          <p className={styles.name}>Ótica Vision</p>
          <p>Araguaína - TO</p>
        </div>

        <nav className={styles.links} aria-label="Links da Ótica Vision">
          <a href={LINKS.instagram} target="_blank" rel="noopener noreferrer">
            Instagram
          </a>
          <a href={LINKS.whatsapp} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
        </nav>

        <p className={styles.copyright}>© {currentYear} Ótica Vision</p>
      </div>
    </footer>
  );
}
