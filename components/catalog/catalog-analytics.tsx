"use client";

import { useEffect, useRef } from "react";

import { trackCatalogEvent } from "@/lib/analytics/client";
import type { CatalogQuery } from "@/lib/catalog/types";

export function CatalogAnalytics({
  collectionId,
  query,
  resultCount,
}: {
  collectionId: string | null;
  query: CatalogQuery;
  resultCount: number;
}) {
  const lastSignature = useRef("");
  const previousFilters = useRef<Record<string, string | null | undefined>>({});

  useEffect(() => {
    const signature = JSON.stringify(query);
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;

    if (query.search) {
      void trackCatalogEvent({
        eventName: "search_performed",
        metadata: { search_result_count: resultCount },
      });
      if (resultCount === 0) void trackCatalogEvent({ eventName: "search_zero_results", metadata: { search_result_count: 0 } });
    }

    const filters = [
      ["marca", query.brand],
      ["categoria", query.category],
      ["disponibilidade", query.availability],
      ["colecao", query.collection],
      ["estilo", query.style],
    ] as const;

    for (const [filter, value] of filters) {
      const previousValue = previousFilters.current[filter];
      previousFilters.current[filter] = value;
      if (!value) continue;
      if (previousValue === value) continue;
      void trackCatalogEvent({
        eventName: "catalog_filter_changed",
        metadata: { filter_name: filter, filter_value: value },
      });
      if (filter === "marca") void trackCatalogEvent({ eventName: "brand_selected", metadata: { brand_slug: value } });
      if (filter === "categoria") void trackCatalogEvent({ eventName: "category_selected", metadata: { category_slug: value } });
      if (filter === "estilo") void trackCatalogEvent({ eventName: "style_selected", metadata: { style_slug: value } });
    }

    if (query.collection && collectionId) {
      void trackCatalogEvent({
        collectionId,
        eventName: "collection_opened",
        metadata: { collection_slug: query.collection, source_route: "/catalogo" },
      });
    }
  }, [collectionId, query, resultCount]);

  useEffect(() => {
    const observed = new Set<string>();
    const timers = new Map<string, number>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const card = entry.target as HTMLElement;
        const id = card.dataset.catalogProductId;
        if (!id || observed.has(id)) continue;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
          const timer = window.setTimeout(() => {
            observed.add(id);
            void trackCatalogEvent({
              eventName: "product_focused",
              metadata: {
                brand_slug: card.dataset.catalogProductBrand,
                product_name: card.dataset.catalogProductName,
                product_slug: card.dataset.catalogProductSlug,
                source_route: "/catalogo",
              },
              productId: id,
            });
          }, 1100);
          timers.set(id, timer);
        } else if (timers.has(id)) {
          window.clearTimeout(timers.get(id));
          timers.delete(id);
        }
      }
    }, { threshold: [0.65] });
    document.querySelectorAll<HTMLElement>("article[data-catalog-product-id]").forEach((card) => observer.observe(card));
    return () => { observer.disconnect(); timers.forEach((timer) => window.clearTimeout(timer)); };
  }, [query]);

  return null;
}

export function ProductViewAnalytics({
  brandSlug,
  categorySlug,
  productId,
  productName,
  productSlug,
}: {
  brandSlug?: string;
  categorySlug?: string;
  productId: string;
  productName: string;
  productSlug: string;
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void trackCatalogEvent({
      eventName: "product_opened",
      metadata: {
        brand_slug: brandSlug,
        category_slug: categorySlug,
        product_name: productName,
        product_slug: productSlug,
        source_route: `/catalogo/${productSlug}`,
      },
      productId,
    });
  }, [brandSlug, categorySlug, productId, productName, productSlug]);

  return null;
}
