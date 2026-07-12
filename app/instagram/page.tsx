import type { Metadata } from "next";
import { Camera, Home, MapPin, MessageCircle } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { InstagramImageRail } from "@/components/instagram-image-rail";
import { ObservedVideo } from "@/components/observed-video";
import { instagramImages, instagramVideos } from "@/lib/assets";
import { LINKS } from "@/lib/links";
import { getMetadataBase } from "@/lib/metadata";

import styles from "./page.module.css";

const metadataBase = getMetadataBase();
const instagramTitle = "Instagram da Ótica Vision em Araguaína";
const instagramDescription =
  "Armações nacionais e importadas, LAB. DIGITAL e atendimento em Araguaína - TO.";

export const metadata: Metadata = {
  title: instagramTitle,
  description: instagramDescription,
  openGraph: {
    title: instagramTitle,
    description: instagramDescription,
    siteName: "Ótica Vision",
    locale: "pt_BR",
    type: "website",
    ...(metadataBase
      ? {
          images: [
            {
              url: instagramImages[0].src,
              width: instagramImages[0].width,
              height: instagramImages[0].height,
              alt: instagramImages[0].alt,
            },
          ],
        }
      : {}),
  },
  twitter: {
    card: "summary_large_image",
    title: instagramTitle,
    description: instagramDescription,
    ...(metadataBase ? { images: [instagramImages[0].src] } : {}),
  },
};

export default function InstagramPage() {
  return (
    <main className={styles.page} id="main-content">
      <header className={styles.identity}>
        <BrandLogo className={styles.logo} size="instagram" priority />
        <h1>@oticavisionaraguaina</h1>
      </header>

      <section className={styles.poster} aria-label="Ótica Vision em movimento">
        <div className={styles.mediaStage}>
          <span className={styles.aperture} aria-hidden="true" />
          <ObservedVideo asset={instagramVideos[0]} className={styles.mainVideo} />
          <ObservedVideo
            asset={instagramVideos[1]}
            className={`${styles.supportVideo} ${styles.supportOne}`}
          />
          <ObservedVideo
            asset={instagramVideos[2]}
            className={`${styles.supportVideo} ${styles.supportTwo}`}
          />
        </div>

        <div className={styles.narrative}>
          <p className={styles.bio}>
            Armações nacionais e importadas, <strong>LAB. DIGITAL</strong> e atendimento
            em Araguaína - TO.
          </p>

          <nav className={styles.actions} aria-label="Links da Ótica Vision">
            <a
              className={styles.primaryLink}
              href={LINKS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle aria-hidden="true" size={21} strokeWidth={1.55} />
              <span>WhatsApp</span>
              <small aria-hidden="true">01</small>
            </a>
            <a
              href={LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Camera aria-hidden="true" size={21} strokeWidth={1.55} />
              <span>Instagram</span>
              <small aria-hidden="true">02</small>
            </a>
            <a href={LINKS.maps} target="_blank" rel="noopener noreferrer">
              <MapPin aria-hidden="true" size={21} strokeWidth={1.55} />
              <span>Rota</span>
              <small aria-hidden="true">03</small>
            </a>
            <a href={LINKS.home}>
              <Home aria-hidden="true" size={21} strokeWidth={1.55} />
              <span>Site completo</span>
              <small aria-hidden="true">04</small>
            </a>
          </nav>
        </div>
      </section>

      <InstagramImageRail images={instagramImages} />

      <section className={styles.location} aria-labelledby="instagram-location-title">
        <div>
          <p className="eyebrow">Ótica Vision</p>
          <h2 id="instagram-location-title">Araguaína - TO</h2>
        </div>
        <a href={LINKS.maps} target="_blank" rel="noopener noreferrer">
          <MapPin aria-hidden="true" size={20} strokeWidth={1.55} />
          <span>Rota</span>
        </a>
      </section>
    </main>
  );
}
