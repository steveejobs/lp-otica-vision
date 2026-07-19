"use client";

import { Glasses } from "lucide-react";
import Link from "next/link";

import { trackCatalogEvent } from "@/lib/analytics/client";

const VALID_STYLE = /^(classica|marcante|contemporanea|esportiva)$/;

export function BioCurationLink({ className }: { className?: string }) {
  function persistedHref() {
    try {
      const raw = window.sessionStorage.getItem("vision:curation-selection");
      if (!raw) return null;
      const selection = JSON.parse(raw) as { categorySlug?: string | null; styleSlug?: string };
      if (!selection.styleSlug || !VALID_STYLE.test(selection.styleSlug)) return null;

      const params = new URLSearchParams({ estilo: selection.styleSlug });
      if (selection.categorySlug) params.set("categoria", selection.categorySlug);
      return `/catalogo?${params.toString()}`;
    } catch {
      return null;
    }
  }

  return (
    <Link
      className={className}
      href="/#curadoria"
      onClick={(event) => {
        void trackCatalogEvent({ eventName: "curation_view_more", metadata: { source: "bio" } });
        const destination = persistedHref();
        if (!destination) return;
        event.preventDefault();
        window.location.assign(destination);
      }}
    >
      <Glasses aria-hidden="true" size={21} strokeWidth={1.55} />
      <span>Descobrir meu estilo</span>
    </Link>
  );
}
