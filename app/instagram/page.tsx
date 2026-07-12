import Image from "next/image";
import type { Metadata } from "next";
import { Camera, Home, MapPin, MessageCircle } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
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
        <ObservedVideo asset={instagramVideos[0]} className={styles.mainVideo} />

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

          <div
            className={styles.supportVideos}
            role="group"
            aria-label="Mais vídeos da Ótica Vision"
          >
            <ObservedVideo asset={instagramVideos[1]} className={styles.supportVideo} />
            <ObservedVideo asset={instagramVideos[2]} className={styles.supportVideo} />
          </div>
        </div>
      </section>

      <section className={styles.imageSection} aria-labelledby="instagram-images-title">
        <h2 className={styles.srOnly} id="instagram-images-title">
          Seleção editorial da Ótica Vision
        </h2>
        <div
          className={styles.imageStrip}
          role="region"
          aria-label="Seis imagens da Ótica Vision"
          tabIndex={0}
        >
          {instagramImages.map((asset) => (
            <figure className={styles.imageCard} key={asset.src}>
              <Image
                src={asset.src}
                width={asset.width}
                height={asset.height}
                sizes="(max-width: 720px) 145px, 170px"
                alt={asset.alt}
                loading="lazy"
                style={{ objectPosition: asset.objectPosition }}
              />
            </figure>
          ))}
        </div>
      </section>

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
