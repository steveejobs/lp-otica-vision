import { Suspense } from "react";

import { BrandGrid } from "@/components/brand-grid";
import { EditorialGallery } from "@/components/editorial-gallery";
import { HomeHero } from "@/components/home-hero";
import { LabSection } from "@/components/lab-section";
import { LocationSection } from "@/components/location-section";
import { NewsSection } from "@/components/news-section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { VideoStory } from "@/components/video-story";
import {
  brandLogos,
  editorialGalleryImages,
  homeVideos,
  labMedia,
} from "@/lib/assets";
import { getExameNews } from "@/lib/exame-news";

export const revalidate = 28_800;

async function ExameNewsSection() {
  const newsItems = await getExameNews();

  return <NewsSection items={newsItems} />;
}

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <HomeHero />
        <VideoStory videos={homeVideos} />
        <EditorialGallery images={editorialGalleryImages} />
        <BrandGrid brands={brandLogos} />
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
