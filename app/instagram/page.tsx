import type { Metadata } from "next";
import { Camera, Home, MapPin, MessageCircle } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { InstagramImageRail } from "@/components/instagram-image-rail";
import { ObservedVideo } from "@/components/observed-video";
import { VisionButton } from "@/components/vision-button";
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

      <section className={styles.primary} aria-label="Conteúdo principal da Ótica Vision">
        <ObservedVideo
          asset={instagramVideos[0]}
          className={styles.mainVideo}
          focusReveal
        />

        <div className={styles.details}>
          <p className={styles.bio}>
            Armações nacionais e importadas, LAB. DIGITAL e atendimento em Araguaína - TO.
          </p>

          <nav className={styles.actions} aria-label="Links da Ótica Vision">
            <VisionButton href={LINKS.whatsapp} icon={MessageCircle} external>
              WhatsApp
            </VisionButton>
            <VisionButton
              href={LINKS.instagram}
              icon={Camera}
              variant="secondary"
              external
            >
              Instagram
            </VisionButton>
            <VisionButton href={LINKS.maps} icon={MapPin} variant="secondary" external>
              Rota
            </VisionButton>
            <VisionButton href={LINKS.home} icon={Home} variant="secondary">
              Site completo
            </VisionButton>
          </nav>

        </div>

        <div
          className={styles.supportVideos}
          role="group"
          aria-label="Mais vídeos da Ótica Vision"
        >
          <ObservedVideo asset={instagramVideos[1]} className={styles.supportVideo} />
          <ObservedVideo asset={instagramVideos[2]} className={styles.supportVideo} />
        </div>
      </section>

      <InstagramImageRail images={instagramImages} />

      <section className={styles.location} aria-labelledby="instagram-location-title">
        <div>
          <p className="eyebrow">Ótica Vision</p>
          <h2 id="instagram-location-title">Araguaína - TO</h2>
        </div>
        <VisionButton href={LINKS.maps} icon={MapPin} variant="secondary" external>
          Rota
        </VisionButton>
      </section>
    </main>
  );
}
