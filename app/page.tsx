import { BrandGrid } from "@/components/brand-grid";
import { EditorialGallery } from "@/components/editorial-gallery";
import { HomeHero } from "@/components/home-hero";
import { LabSection } from "@/components/lab-section";
import { LocationSection } from "@/components/location-section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { VideoStory } from "@/components/video-story";
import {
  brandLogos,
  editorialGalleryImages,
  homeVideos,
  labMedia,
} from "@/lib/assets";

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
        <LocationSection />
      </main>
      <SiteFooter />
    </>
  );
}
