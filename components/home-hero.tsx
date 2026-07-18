import { brandLogos, visionEditMedia } from "@/lib/assets";

import { VisionEdit } from "./vision-edit";

export function HomeHero() {
  return (
    <VisionEdit
      assets={visionEditMedia}
      brandNames={brandLogos.map((brand) => brand.name)}
    />
  );
}
