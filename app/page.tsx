import { BrandRail } from "@/components/brand-rail";
import { EditorialGallery } from "@/components/editorial-gallery";
import { HomeHero } from "@/components/home-hero";
import { LabSection } from "@/components/lab-section";
import { LocationSection } from "@/components/location-section";
import { NewsSection } from "@/components/news-section";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { VideoStory } from "@/components/video-story";
import { editorialGalleryImages, homeVideos } from "@/lib/assets";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <HomeHero />
        <VideoStory videos={homeVideos} />
        <EditorialGallery images={editorialGalleryImages} />
        <BrandRail />
        <LabSection />
        <NewsSection />
        <LocationSection />
      </main>
      <SiteFooter />
    </>
  );
}
