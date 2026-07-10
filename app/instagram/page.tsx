import type { Metadata } from "next";
import Image from "next/image";
import { Camera, Globe, MapPin, MessageCircle } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { ObservedVideo } from "@/components/observed-video";
import { VisionButton } from "@/components/vision-button";
import { instagramImages, instagramVideos } from "@/lib/assets";
import { LINKS } from "@/lib/links";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "@oticavisionaraguaina | Ótica Vision",
  description:
    "Armações nacionais e importadas, LAB. DIGITAL e atendimento em Araguaína - TO.",
};

export default function InstagramPage() {
  return (
    <main className={styles.page} id="main-content">
      <header className={styles.profileHeader}>
        <BrandLogo size="profile" priority />
        <p>@oticavisionaraguaina</p>
      </header>

      <section className={styles.profile} aria-label="Perfil da Ótica Vision">
        <ObservedVideo asset={instagramVideos[0]} className={styles.mainVideo} />

        <p className={styles.bio}>
          Armações nacionais e importadas, LAB. DIGITAL e atendimento em Araguaína - TO.
        </p>

        <div className={styles.actions} aria-label="Links da Ótica Vision">
          <VisionButton href={LINKS.whatsapp} icon={MessageCircle} external>
            WhatsApp
          </VisionButton>
          <VisionButton href={LINKS.instagram} icon={Camera} external variant="secondary">
            Instagram
          </VisionButton>
          <VisionButton href={LINKS.maps} icon={MapPin} external variant="secondary">
            Rota
          </VisionButton>
          <VisionButton href={LINKS.home} icon={Globe} variant="secondary">
            Site completo
          </VisionButton>
        </div>

        <div className={styles.supportVideos} aria-label="Mais vídeos da Vision">
          <ObservedVideo asset={instagramVideos[1]} />
          <ObservedVideo asset={instagramVideos[2]} />
        </div>
      </section>

      <section className={styles.imageBand} aria-labelledby="instagram-images-title">
        <div className={styles.bandHeader}>
          <p className="eyebrow">Ótica Vision</p>
          <h1 id="instagram-images-title">Armações em uso real.</h1>
        </div>
        <div className={styles.imageRail}>
          {instagramImages.map((image) => (
            <figure key={image.src}>
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(max-width: 720px) 42vw, 170px"
              />
            </figure>
          ))}
        </div>
      </section>

      <section className={styles.location} aria-label="Localização">
        <MapPin aria-hidden="true" size={20} strokeWidth={1.7} />
        <div>
          <p>Araguaína - TO</p>
          <a href={LINKS.maps} target="_blank" rel="noreferrer">
            Ver rota
          </a>
        </div>
      </section>
    </main>
  );
}
