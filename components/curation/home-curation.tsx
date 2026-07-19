import { VisionCuration } from "@/components/curation/vision-curation";
import { getCurationSelection } from "@/lib/curation/data";
import { getHomeCurationSettings } from "@/lib/curation/settings";

type HomeCurationProps = {
  categorySlug?: string;
  styleSlug?: string;
};

export async function HomeCuration({ categorySlug, styleSlug }: HomeCurationProps) {
  const settings = await getHomeCurationSettings();
  if (!settings.enabled || !settings.published) return null;

  const selection = await getCurationSelection({
    categorySlug: categorySlug ?? settings.categorySlug,
    styleSlug: styleSlug ?? settings.initialStyle,
  });

  if (!selection || selection.products.length === 0) return null;
  return <VisionCuration initialSelection={selection} />;
}
