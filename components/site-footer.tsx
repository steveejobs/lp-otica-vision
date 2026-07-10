import { LINKS } from "@/lib/links";

import styles from "./site-footer.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`vision-container ${styles.inner}`}>
        <p>
          <strong>Ótica Vision</strong>
          <span>Araguaína - TO</span>
        </p>
        <nav aria-label="Links oficiais no rodapé">
          <a href={LINKS.whatsapp} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
          <a href={LINKS.instagram} target="_blank" rel="noreferrer">
            Instagram
          </a>
          <a href={LINKS.maps} target="_blank" rel="noreferrer">
            Rota
          </a>
        </nav>
      </div>
    </footer>
  );
}
