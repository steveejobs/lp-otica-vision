"use client";

import { useEffect, useRef } from "react";

import { trackCatalogEvent } from "@/lib/analytics/client";
import type { CatalogQuery } from "@/lib/catalog/types";

export function CatalogAnalytics({
  collectionId,
  query,
}: {
  collectionId: string | null;
  query: CatalogQuery;
}) {
  const lastSignature = useRef("");

  useEffect(() => {
    const signature = JSON.stringify(query);
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;

    if (query.search) {
      void trackCatalogEvent({
        eventName: "catalog_search",
        metadata: { query: query.search },
      });
    }

    const filters = [
      ["marca", query.brand],
      ["categoria", query.category],
      ["disponibilidade", query.availability],
      ["colecao", query.collection],
      ["estilo", query.style],
    ] as const;

    for (const [filter, value] of filters) {
      if (!value) continue;
      void trackCatalogEvent({
        eventName: "catalog_filter",
        metadata: { filter, value },
      });
      void trackCatalogEvent({
        eventName: "catalog_filter_changed",
        metadata: { filter, value },
      });
    }

    if (query.collection && collectionId) {
      void trackCatalogEvent({
        collectionId,
        eventName: "collection_view",
        metadata: { source: "catalog_filter" },
      });
    }
  }, [collectionId, query]);

  return null;
}

export function ProductViewAnalytics({ productId }: { productId: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void trackCatalogEvent({ eventName: "product_view", productId });
  }, [productId]);

  return null;
}
