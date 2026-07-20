import { VisionCuration } from "@/components/curation/vision-curation";
import { getCurationSelection } from "@/lib/curation/data";
import { getCurationProductWhatsappUrls } from "@/lib/curation/product-whatsapp";
import { getHomeCurationSettings } from "@/lib/curation/settings";
import { getMetadataBase } from "@/lib/metadata";

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

  const siteUrl = getMetadataBase() ?? new URL("http://localhost:3000");
  const productWhatsappUrls = await getCurationProductWhatsappUrls(selection.products, siteUrl);

  return <VisionCuration initialSelection={selection} productWhatsappUrls={productWhatsappUrls} />;
}
