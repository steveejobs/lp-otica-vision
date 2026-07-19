import styles from "./admin.module.css";
import { galleryDeviceLabels, type GalleryLocation } from "@/lib/admin/gallery-locations";

export function GalleryLocationCard({ location, published }: { location: GalleryLocation | null; published: boolean }) {
  if (!location) {
    return (
      <aside className={`${styles.locationCard} ${styles.locationMissing}`} aria-label="Localização da galeria">
        <span className={styles.eyebrow}>Aparece em</span>
        <strong>Localização não definida</strong>
        <p>Escolha uma seção pública explícita antes de publicar esta galeria.</p>
      </aside>
    );
  }

  return (
    <aside className={styles.locationCard} aria-label="Localização da galeria">
      <div className={styles.locationHeader}>
        <div>
          <span className={styles.eyebrow}>Aparece em</span>
          <strong>{location.label}</strong>
        </div>
        <span className={published ? styles.statusPositive : styles.statusNeutral}>
          {published ? "Publicada" : "Rascunho"}
        </span>
      </div>
      <dl className={styles.locationDetails}>
        <div><dt>Rota</dt><dd>{location.route}</dd></div>
        <div><dt>Posição</dt><dd>{location.description}</dd></div>
        <div><dt>Dispositivo</dt><dd>{galleryDeviceLabels[location.device]}</dd></div>
        <div><dt>Componente</dt><dd>{location.component}</dd></div>
      </dl>
      <a className={styles.buttonLink} href={location.href} target="_blank" rel="noopener noreferrer">Ver na página</a>
    </aside>
  );
}
