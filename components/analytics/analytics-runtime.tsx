"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { readAnalyticsConsent, ANALYTICS_CONSENT_CHANGE_EVENT, type AnalyticsConsentChoice } from "@/lib/analytics/consent";
import { trackEvent, trackGooglePageView, trackPageView } from "@/lib/analytics/client";

import { PrivacyConsent } from "./privacy-consent";

const CATALOG_PARAMS = new Set(["busca", "marca", "categoria", "estilo", "colecao", "disponibilidade", "pagina"]);
const CAMPAIGN_PARAMS = new Set(["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]);

function filteredSearch(pathname: string, search: URLSearchParams) {
  const filtered = new URLSearchParams();
  [...search.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([key, value]) => {
    if (!value) return;
    if (CAMPAIGN_PARAMS.has(key)) {
      filtered.append(key, value.normalize("NFKC").replace(/\s+/g, " ").trim().slice(0, 100));
      return;
    }
    if (pathname !== "/catalogo" || !CATALOG_PARAMS.has(key)) return;
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
    if (!initialized || consent !== "accepted" || !publicRoute || !isMeasurementId(measurementId)) return;
    if (initializedMeasurementId.current === measurementId) return;

    window.dataLayer = window.dataLayer ?? [];
    window.gtag = window.gtag ?? function gtag() {
      // gtag.js expects the native Arguments object used by Google's bootstrap contract.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    };
    window.gtag("consent", "default", {
      ad_personalization: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      analytics_storage: "granted",
    });
    window.gtag("js", new Date());
    window.gtag("config", measurementId, { anonymize_ip: true, send_page_view: false });

    const existing = document.getElementById("vision-google-analytics");
    if (!existing) {
      const script = document.createElement("script");
      script.async = true;
      script.id = "vision-google-analytics";
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
      document.head.append(script);
    }
    initializedMeasurementId.current = measurementId;
  }, [consent, initialized, measurementId, publicRoute]);

  useEffect(() => {
    if (!publicRoute || consent === "unknown") return;
    window.gtag?.("consent", "update", {
      analytics_storage: consent === "accepted" ? "granted" : "denied",
    });
  }, [consent, publicRoute]);

  useEffect(() => {
    if (!initialized || consent !== "accepted" || !publicRoute) return;
    const url = new URL(location, window.location.origin);
    trackGooglePageView({
      page_location: url.href,
      page_title: document.title.slice(0, 100),
      source_route: pathname,
    });
  }, [consent, initialized, location, pathname, publicRoute]);

  useEffect(() => {
    if (!publicRoute) return;
    const milestones = [25, 50, 75, 100];
    const sent = new Set<number>();
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      const currentScroll = Math.min(Math.max(window.scrollY, 0), scrollHeight);
      const percent = (currentScroll / scrollHeight) * 100;
      for (const milestone of milestones) {
        if (percent >= milestone && !sent.has(milestone)) {
          sent.add(milestone);
          trackEvent({
            eventName: "scroll_depth",
            properties: { scroll_percent: milestone, source_route: pathname },
          });
        }
      }
    };
    const initialFrame = window.requestAnimationFrame(handleScroll);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(initialFrame);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [location, pathname, publicRoute]);

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
