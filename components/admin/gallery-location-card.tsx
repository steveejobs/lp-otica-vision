/* eslint-disable @next/next/no-img-element -- private short-lived Storage URLs are not Next image sources. */

import styles from "./admin.module.css";
import { galleryDeviceLabels, type GalleryLocation } from "@/lib/admin/gallery-locations";

export function GalleryLocationCard({
  images,
  location,
  published,
}: {
  images: { id: string; signedUrl: string | null }[];
  location: GalleryLocation | null;
  published: boolean;
}) {
  if (!location) {
    return (
      <aside className={`${styles.locationCard} ${styles.locationMissing}`} aria-label="Localização da galeria">
        <span className={styles.eyebrow}>Lugar das imagens</span>
        <strong>Localização não definida</strong>
        <p>Escolha uma seção pública explícita antes de publicar esta galeria.</p>
      </aside>
    );
  }

  return (
    <aside className={styles.locationCard} aria-label="Localização da galeria">
      <div className={styles.locationHeader}>
        <div>
          <span className={styles.eyebrow}>Lugar das imagens</span>
          <strong>{location.label}</strong>
        </div>
        <span className={published ? styles.statusPositive : styles.statusNeutral}>
          {published ? "Publicada" : "Rascunho"}
        </span>
      </div>
      <dl className={styles.locationDetails}>
        <div><dt>Página</dt><dd>{location.route === "/" ? "Página inicial" : "Bio"}</dd></div>
        <div><dt>Onde fica</dt><dd>{location.description}</dd></div>
        <div><dt>Formatos</dt><dd>{galleryDeviceLabels[location.device]}</dd></div>
      </dl>
      <details className={styles.locationImages}>
        <summary>Ver imagens atuais</summary>
        {images.length ? (
          <div aria-label={`${images.length} imagens atuais`} className={styles.locationImageStrip}>
            {images.map((image, index) => (
              <figure key={image.id}>
                {image.signedUrl ? <img alt="" src={image.signedUrl} /> : <span>Sem prévia</span>}
                <figcaption>{index + 1}</figcaption>
              </figure>
            ))}
          </div>
        ) : <p>Ainda não há imagens neste lugar.</p>}
      </details>
      <a className={styles.buttonLink} href={location.href} target="_blank" rel="noopener noreferrer">Ver na página</a>
    </aside>
  );
}
