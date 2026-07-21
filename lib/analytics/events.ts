export const analyticsEventNames = [
  "page_view",
  "hero_interaction",
  "curation_viewed",
  "style_selected",
  "category_selected",
  "brand_selected",
  "collection_opened",
  "catalog_opened",
  "catalog_view_more",
  "catalog_filter_changed",
  "search_performed",
  "search_zero_results",
  "product_focused",
  "product_opened",
  "product_whatsapp_clicked",
  "general_whatsapp_clicked",
  "map_clicked",
  "instagram_clicked",
  "bio_link_clicked",
  "lab_cta_clicked",
  "external_link_clicked",
  "scroll_depth",
] as const;

export type AnalyticsEventName = (typeof analyticsEventNames)[number];

export const analyticsPropertyNames = [
  "source_route",
  "click_location",
  "product_id",
  "product_name",
  "product_slug",
  "brand_slug",
  "category_slug",
  "style_slug",
  "collection_slug",
  "search_result_count",
  "availability",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "filter_name",
  "filter_value",
  "page_title",
  "page_location",
  "page_referrer",
  "scroll_percent",
] as const;

export type AnalyticsPropertyName = (typeof analyticsPropertyNames)[number];
export type AnalyticsPropertyValue = boolean | number | string;
export type AnalyticsProperties = Partial<Record<AnalyticsPropertyName, AnalyticsPropertyValue>>;

export type AnalyticsEventInput = {
  collectionId?: string | null;
  eventName: AnalyticsEventName;
  internal?: boolean;
  productId?: string | null;
  properties?: AnalyticsProperties;
  transport?: "beacon" | "fetch";
};

export function analyticsEventSignature(
  input: Pick<AnalyticsEventInput, "collectionId" | "eventName" | "productId">,
  properties: AnalyticsProperties,
  pathname: string,
) {
  return JSON.stringify([
    input.eventName,
    input.productId,
    input.collectionId,
    properties,
    pathname,
  ]);
}

export const googleRecommendedEventMap: Partial<Record<AnalyticsEventName, string>> = {
  search_performed: "search",
  product_opened: "view_item",
};

export const principalAnalyticsEvents = [
  "product_whatsapp_clicked",
  "general_whatsapp_clicked",
] as const satisfies readonly AnalyticsEventName[];

export const legacyEventAliases: Record<string, AnalyticsEventName> = {
  catalog_filter: "catalog_filter_changed",
  catalog_filter_changed: "catalog_filter_changed",
  catalog_product_opened: "product_opened",
  catalog_search: "search_performed",
  collection_view: "collection_opened",
  curation_product_opened: "product_opened",
  curation_view_more: "catalog_opened",
  curation_whatsapp_clicked: "product_whatsapp_clicked",
  product_view: "product_opened",
  product_whatsapp_click: "product_whatsapp_clicked",
};
