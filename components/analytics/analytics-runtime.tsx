"use client";

import Script from "next/script";
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

export function AnalyticsRuntime({ measurementId }: { measurementId?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [consent, setConsent] = useState<AnalyticsConsentChoice>("unknown");
  const [initialized, setInitialized] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const previousLocation = useRef("");
  const publicRoute = !pathname.startsWith("/admin") && !pathname.startsWith("/preview");
  const location = useMemo(() => `${pathname}${filteredSearch(pathname, searchParams)}`, [pathname, searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => { setConsent(readAnalyticsConsent()); setInitialized(true); }, 0);
    const update = (event: Event) => { setConsent((event as CustomEvent<{ choice: AnalyticsConsentChoice }>).detail.choice); setInitialized(true); };
    window.addEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, update);
    return () => { window.clearTimeout(timer); window.removeEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, update); };
  }, []);

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

  const enableGoogle = initialized && publicRoute && consent === "accepted" && Boolean(measurementId);

  return (
    <>
      {enableGoogle && !scriptReady ? (
        <Script id="vision-google-consent" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};window.gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});window.gtag('consent','update',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});`}
        </Script>
      ) : null}
      {enableGoogle ? (
        <Script
          id="vision-google-analytics"
          onReady={() => {
            if (!measurementId || typeof window.gtag !== "function") return;
            window.gtag("js", new Date());
            window.gtag("config", measurementId, {
              allow_ad_personalization_signals: false,
              allow_google_signals: false,
              send_page_view: false,
            });
            const debugMode = (() => { try { return window.sessionStorage.getItem("vision.ga.debug") === "1"; } catch { return false; } })();
            window.gtag("event", "page_view", {
              ...(debugMode ? { debug_mode: true } : {}),
              page_location: `${window.location.origin}${location}`,
              page_title: document.title,
            });
            window.__visionGaReady = true;
            setScriptReady(true);
            window.dispatchEvent(new Event("vision:ga-ready"));
          }}
          src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId ?? "")}`}
          strategy="afterInteractive"
        />
      ) : null}
      {initialized && publicRoute ? <PrivacyConsent initialChoice={consent} key={consent} /> : null}
      {initialized ? <span data-analytics-runtime-ready hidden /> : null}
    </>
  );
}
