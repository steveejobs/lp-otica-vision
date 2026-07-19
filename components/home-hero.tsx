import { getHomeHeroMedia } from "@/lib/gallery/hero";

import { VisionEditorialTakeover } from "./vision-editorial-takeover";

export async function HomeHero() {
  const media = await getHomeHeroMedia();
  const first = media[0];
  return (
    <>
      {first ? (
        <>
          <link
            as="image"
            fetchPriority="high"
            href={`/api/galerias/imagem/${first.id}?variant=mobile&v=${first.assetVersion}`}
            media="(max-width: 720px)"
            rel="preload"
          />
          <link
            as="image"
            fetchPriority="high"
            href={`/api/galerias/imagem/${first.id}?variant=desktop&v=${first.assetVersion}`}
            media="(min-width: 721px)"
            rel="preload"
          />
        </>
      ) : null}
      <VisionEditorialTakeover media={media} />
    </>
  );
}
