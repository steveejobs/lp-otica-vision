import { Suspense } from "react";

import { BrandGrid } from "@/components/brand-grid";
import { HomeCuration } from "@/components/curation/home-curation";
import { EditorialGallery } from "@/components/editorial-gallery";
import { HomeCollectionSection } from "@/components/home-collection-section";
import { HomeHero } from "@/components/home-hero";
import { LabSection } from "@/components/lab-section";
import { LocationSection } from "@/components/location-section";
import { NewsSection } from "@/components/news-section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { VideoStory } from "@/components/video-story";
import { editorialGalleryImages, homeVideos, labMedia } from "@/lib/assets";
import { getExameNews } from "@/lib/exame-news";
import { getPublishedHomeCollection } from "@/lib/collections/home";
import {
  displayMediaFromLocalList,
  displayMediaFromPublished,
} from "@/lib/gallery/display-media";
import { getPublishedGalleryMedia } from "@/lib/gallery/public";
import { LINKS } from "@/lib/links";
import { featuredBrands } from "@/lib/brand-content";

export const revalidate = 28_800;

async function ExameNewsSection() {
  const newsItems = await getExameNews();

  return <NewsSection items={newsItems} />;
}

async function HomeLabSection() {
  const published = await getPublishedGalleryMedia("home", "lab_digital");
  const media =
    published.length === 2
      ? published.map((item, index) =>
          displayMediaFromPublished(item, labMedia[index]),
        )
      : displayMediaFromLocalList(labMedia);

  return (
    <LabSection
      media={media as [(typeof media)[number], (typeof media)[number]]}
    />
  );
}

async function HomeFeaturedGallerySection() {
  const collection = await getPublishedHomeCollection("featured_collection");
  if (collection && collection.variant !== "editorial-protagonist") {
    return <HomeCollectionSection collection={collection} />;
  }
  const published = await getPublishedGalleryMedia(
    "home",
    "featured_collection",
  );
  const images = published.length
    ? published.map((item, index) =>
        displayMediaFromPublished(item, editorialGalleryImages[index]),
      )
    : displayMediaFromLocalList(editorialGalleryImages);
  return (
    <EditorialGallery
      collection={{
        action: collection
          ? {
              ariaLabel: collection.cta.label,
              external:
                collection.cta.target === "instagram" ||
                collection.cta.target === "whatsapp",
              href:
                collection.cta.target === "instagram"
                  ? LINKS.instagram
                  : collection.cta.target === "whatsapp"
                    ? LINKS.whatsapp
                    : collection.cta.target === "catalog"
                      ? "/catalogo"
                      : `/catalogo?colecao=${encodeURIComponent(collection.slug)}`,
              label: collection.cta.label,
            }
          : {
              ariaLabel: "Ver Instagram da Ótica Vision",
              external: true,
              href: LINKS.instagram,
              label: "Ver Instagram",
            },
        description:
          collection?.description ??
          "Linhas, proporções e acabamentos reunidos pela Vision.",
        eyebrow: "Seleção Vision",
        galleryLabel: "Galeria editorial da Ótica Vision",
        images,
        sectionId: "colecao-em-destaque",
        title: collection?.title ?? "A escolha ganha contorno.",
      }}
    />
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const categorySlug =
    typeof params.categoria === "string" ? params.categoria : undefined;
  const styleSlug =
    typeof params.estilo === "string" ? params.estilo : undefined;

  return (
    <>
      <SiteHeader heroEntrance />
      <main id="main-content">
        <HomeHero />
        <VideoStory videos={homeVideos} />
        <HomeFeaturedGallerySection />
        <Suspense fallback={null}>
          <HomeCuration categorySlug={categorySlug} styleSlug={styleSlug} />
        </Suspense>
        <BrandGrid content={featuredBrands} />
        <HomeLabSection />
        <Suspense fallback={<NewsSection items={[]} loading />}>
          <ExameNewsSection />
        </Suspense>
        <LocationSection />
      </main>
      <SiteFooter />
    </>
  );
}
