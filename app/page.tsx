import { Suspense } from "react";

import { BrandGrid } from "@/components/brand-grid";
import { CatalogPreview } from "@/components/catalog/catalog-preview";
import { EditorialGallery } from "@/components/editorial-gallery";
import { HomeHero } from "@/components/home-hero";
import { LabSection } from "@/components/lab-section";
import { LocationSection } from "@/components/location-section";
import { NewsSection } from "@/components/news-section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { VideoStory } from "@/components/video-story";
import { homeVideos, labMedia } from "@/lib/assets";
import { getFeaturedCatalogProducts } from "@/lib/catalog/data";
import { getExameNews } from "@/lib/exame-news";
import { featuredBrands, featuredCollection } from "@/lib/showcase-content";

export const revalidate = 28_800;

async function ExameNewsSection() {
  const newsItems = await getExameNews();

  return <NewsSection items={newsItems} />;
}

async function CatalogPreviewSection() {
  const products = await getFeaturedCatalogProducts();
  return <CatalogPreview products={products} />;
}

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <HomeHero />
        <VideoStory videos={homeVideos} />
        <EditorialGallery collection={featuredCollection} />
        <BrandGrid content={featuredBrands} />
        <Suspense fallback={null}>
          <CatalogPreviewSection />
        </Suspense>
        <LabSection media={labMedia} />
        <Suspense fallback={<NewsSection items={[]} loading />}>
          <ExameNewsSection />
        </Suspense>
        <LocationSection />
      </main>
      <SiteFooter />
    </>
  );
}
