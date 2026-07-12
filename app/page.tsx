import { HomeHero } from "@/components/home-hero";
import { SiteHeader } from "@/components/site-header";
import { VideoStory } from "@/components/video-story";
import { homeVideos } from "@/lib/assets";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <HomeHero />
        <VideoStory videos={homeVideos} />
      </main>
    </>
  );
}
