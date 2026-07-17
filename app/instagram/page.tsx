import type { Metadata } from "next";
import {
  Home,
  MapPin,
  MessageCircle,
} from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { BrandRail } from "@/components/brand-rail";
import { InstagramIcon } from "@/components/instagram-icon";
import { InstagramImageRail } from "@/components/instagram-image-rail";
import { ObservedVideo } from "@/components/observed-video";
import { VideoComposition } from "@/components/video-composition";
import { brandLogos, instagramImages, instagramVideos } from "@/lib/assets";
import { LINKS } from "@/lib/links";
import { getMetadataBase } from "@/lib/metadata";

import styles from "./page.module.css";

const metadataBase = getMetadataBase();
const instagramTitle = "Ótica Vision no Instagram | Araguaína - TO";
const instagramDescription =
  "Armações nacionais e importadas, lentes feitas pela Vision e atendimento em Araguaína - TO.";

export const metadata: Metadata = {
  title: instagramTitle,
  description: instagramDescription,
  ...(metadataBase ? { alternates: { canonical: "/instagram" } } : {}),
  openGraph: {
    title: instagramTitle,
    description: instagramDescription,
    siteName: "Ótica Vision",
    locale: "pt_BR",
    type: "website",
    ...(metadataBase
      ? {
          url: "/instagram",
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
        <VideoComposition className={styles.mediaStage}>
          <span className={styles.aperture} aria-hidden="true" />
          <ObservedVideo asset={instagramVideos[0]} className={styles.mainVideo} />
          <ObservedVideo
            asset={instagramVideos[1]}
            className={styles.supportVideo}
          />
        </VideoComposition>

        <div className={styles.narrative}>
          <p className={styles.bio}>
            Armações nacionais e importadas. <strong>Lentes feitas pela Vision.</strong>{" "}
            Araguaína - TO.
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
            </a>
            <a
              href={LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
            >
              <InstagramIcon aria-hidden="true" size={21} strokeWidth={1.55} />
              <span>Instagram</span>
            </a>
            <a href={LINKS.maps} target="_blank" rel="noopener noreferrer">
              <MapPin aria-hidden="true" size={21} strokeWidth={1.55} />
              <span>Rota</span>
            </a>
            <a href={LINKS.home}>
              <Home aria-hidden="true" size={21} strokeWidth={1.55} />
              <span>Site completo</span>
            </a>
          </nav>
        </div>
      </section>

      <section className={styles.soloStory} aria-label="Seleção Vision em movimento">
        <VideoComposition className={styles.soloStage}>
          <ObservedVideo asset={instagramVideos[2]} className={styles.soloVideo} />
        </VideoComposition>
      </section>

      <InstagramImageRail images={instagramImages} />

      <section className={styles.brandSignature} aria-labelledby="instagram-brands-title">
        <header className={styles.brandIntro}>
          <h2 id="instagram-brands-title">Marcas premium. Seleção Vision.</h2>
        </header>
        <BrandRail
          brands={brandLogos}
          variant="compact"
          ariaLabel="Marcas premium na Ótica Vision"
        />
      </section>

      <section className={styles.location} aria-labelledby="instagram-location-title">
        <div>
          <p className="eyebrow">Ótica Vision</p>
          <h2 id="instagram-location-title">Araguaína - TO</h2>
        </div>
        <a href={LINKS.maps} target="_blank" rel="noopener noreferrer">
          <MapPin aria-hidden="true" size={20} strokeWidth={1.55} />
          <span>Ver rota</span>
        </a>
      </section>
    </main>
  );
}
