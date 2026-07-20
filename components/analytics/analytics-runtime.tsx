"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { readAnalyticsConsent, ANALYTICS_CONSENT_CHANGE_EVENT, type AnalyticsConsentChoice } from "@/lib/analytics/consent";
import { trackEvent, trackPageView } from "@/lib/analytics/client";

import { PrivacyConsent } from "./privacy-consent";

const CATALOG_PARAMS = new Set(["busca", "marca", "categoria", "estilo", "colecao", "disponibilidade", "pagina"]);

function filteredSearch(pathname: string, search: URLSearchParams) {
  if (pathname !== "/catalogo") return "";
  const filtered = new URLSearchParams();
  [...search.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([key, value]) => {
    if (!CATALOG_PARAMS.has(key) || !value) return;
    if (key === "busca") filtered.append(key, "ativa");
    else if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value)) filtered.append(key, value);
  });
  const value = filtered.toString();
  return value ? `?${value}` : "";
}

function isMeasurementId(value: string) {
  return /^G-[A-Z0-9]+$/i.test(value);
}

export function AnalyticsRuntime({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [consent, setConsent] = useState<AnalyticsConsentChoice>("unknown");
  const [initialized, setInitialized] = useState(false);
  const previousLocation = useRef("");
  const initializedMeasurementId = useRef<string | null>(null);
  const publicRoute = !pathname.startsWith("/admin") && !pathname.startsWith("/preview");
  const location = useMemo(() => `${pathname}${filteredSearch(pathname, searchParams)}`, [pathname, searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => { setConsent(readAnalyticsConsent()); setInitialized(true); }, 0);
    const update = (event: Event) => { setConsent((event as CustomEvent<{ choice: AnalyticsConsentChoice }>).detail.choice); setInitialized(true); };
    window.addEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, update);
    return () => { window.clearTimeout(timer); window.removeEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, update); };
  }, []);

  useEffect(() => {
    if (!publicRoute || consent !== "accepted" || !isMeasurementId(measurementId)) return;
    if (initializedMeasurementId.current === measurementId) return;

    window.dataLayer = window.dataLayer ?? [];
    window.gtag = window.gtag ?? ((...args: unknown[]) => { window.dataLayer?.push(args); });
    window.gtag("js", new Date());
    window.gtag("consent", "default", {
      ad_personalization: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      analytics_storage: "granted",
    });
    window.gtag("config", measurementId, { anonymize_ip: true });

    const script = document.createElement("script");
    script.async = true;
    script.id = "vision-google-analytics";
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.append(script);
    initializedMeasurementId.current = measurementId;
  }, [consent, measurementId, publicRoute]);

  useEffect(() => {
    if (!publicRoute) return;
    const referrer = previousLocation.current;
    trackPageView({ location, referrer, title: document.title });
    if (pathname === "/catalogo") trackEvent({ eventName: "catalog_opened", properties: { source_route: referrer || "/" } });
    previousLocation.current = location;
  }, [location, pathname, publicRoute]);

  useEffect(() => {
    if (!publicRoute) return;
    const timers = new WeakMap<Element, number>();
    const sent = new Set<string>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        const name = element.dataset.analyticsSection;
        if (!name || sent.has(name)) continue;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
          const timer = window.setTimeout(() => {
            sent.add(name);
            if (name === "curation_viewed") trackEvent({ eventName: "curation_viewed", properties: { source_route: pathname } });
          }, 800);
          timers.set(element, timer);
        } else {
          const timer = timers.get(element);
          if (timer) window.clearTimeout(timer);
        }
      }
    }, { threshold: [0.35] });
    document.querySelectorAll<HTMLElement>("[data-analytics-section]").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [location, pathname, publicRoute]);

  useEffect(() => {
    if (!publicRoute) return;
    const handleClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!link) return;
      const explicit = link.dataset.analyticsEvent;
      const href = link.href;
      let eventName = explicit;
      if (!eventName && /api\.whatsapp\.com|wa\.me/i.test(href)) eventName = pathname === "/bio" ? "bio_link_clicked" : "general_whatsapp_clicked";
      else if (!eventName && /instagram\.com/i.test(href)) eventName = pathname === "/bio" ? "bio_link_clicked" : "instagram_clicked";
      else if (!eventName && /maps\.app\.goo\.gl|google\.[^/]+\/maps/i.test(href)) eventName = pathname === "/bio" ? "bio_link_clicked" : "map_clicked";
      else if (!eventName && link.target === "_blank") eventName = "external_link_clicked";
      if (!eventName) return;
      trackEvent({
        eventName: eventName as Parameters<typeof trackEvent>[0]["eventName"],
        productId: link.dataset.analyticsProductId || null,
        properties: {
          click_location: link.dataset.analyticsLocation || pathname,
          product_slug: link.dataset.analyticsProductSlug,
          source_route: pathname,
        },
        transport: "beacon",
      });
    };
    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, [pathname, publicRoute]);

  return (
    <>
      {initialized && publicRoute ? <PrivacyConsent initialChoice={consent} key={consent} /> : null}
      {initialized ? <span data-analytics-runtime-ready hidden /> : null}
    </>
  );
}
