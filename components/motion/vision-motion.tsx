"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const REVEAL_SELECTOR = "[data-motion-reveal], [data-focus-reveal]";
const STAGGER_SELECTOR = "[data-motion-stagger]";
const ROUTE_EXIT_MS = 480;
const ROUTE_ENTER_MS = 680;
const CATALOG_ROUTE_EXIT_MS = 520;
const CATALOG_ROUTE_ENTER_MS = 760;
const HYDRATION_SETTLE_MS = 420;
const STAGGER_STEP_MS = 72;
const STAGGER_LIMIT = 9;
const CATALOG_STAGGER_STEP_MS = 64;
const CATALOG_STAGGER_LIMIT = 5;

const STAGGER_MOTIONS = [
  { x: "-18px", y: "38px", rotate: "-0.7deg" },
  { x: "0px", y: "44px", rotate: "0deg" },
  { x: "18px", y: "36px", rotate: "0.65deg" },
  { x: "-8px", y: "46px", rotate: "0.38deg" },
] as const;

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.altKey || event.ctrlKey || event.shiftKey || event.button !== 0;
}

function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function getInternalNavigationUrl(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;

  const anchor = target.closest<HTMLAnchorElement>("a[href]");
  if (!anchor) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;
  if (anchor.dataset.noPageTransition === "true") return null;
  if (
    anchor.hasAttribute("data-catalog-transition-link") ||
    anchor.hasAttribute("data-catalog-filter-link") ||
    anchor.hasAttribute("data-catalog-return-link")
  ) return null;

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  if (isAdminPath(url.pathname)) return null;

  const current = window.location;
  const samePage = url.pathname === current.pathname && url.search === current.search;
  if (samePage && url.hash) return null;
  if (samePage && !url.hash) return null;

  return url;
}

function setRouteState(state: "idle" | "leaving" | "entering") {
  document.documentElement.dataset.routeState = state;
}

function setRouteTarget(target?: "catalog" | "default") {
  if (target) document.documentElement.dataset.routeTarget = target;
  else delete document.documentElement.dataset.routeTarget;
}

export function VisionMotion() {
  const pathname = usePathname();
  const router = useRouter();
  const exitTimerRef = useRef<number | null>(null);
  const enterTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (enterTimerRef.current) {
      window.clearTimeout(enterTimerRef.current);
    }

    if (isAdminPath(pathname)) {
      setRouteTarget();
      setRouteState("idle");
      return;
    }

    const isCatalogPath = pathname === "/catalogo" || pathname.startsWith("/catalogo/");
    const isCatalogArrival =
      isCatalogPath &&
      document.documentElement.dataset.routeTarget === "catalog" &&
      document.documentElement.dataset.routeState === "leaving";

    if (pathname === "/" || (isCatalogPath && !isCatalogArrival)) {
      setRouteTarget();
      setRouteState("idle");
      return;
    }

    setRouteTarget(isCatalogArrival ? "catalog" : "default");
    setRouteState("entering");
    enterTimerRef.current = window.setTimeout(() => {
      setRouteState("idle");
      setRouteTarget();
    }, isCatalogArrival ? CATALOG_ROUTE_ENTER_MS : ROUTE_ENTER_MS);

    return () => {
      if (enterTimerRef.current) {
        window.clearTimeout(enterTimerRef.current);
      }
    };
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    if (isAdminPath(pathname)) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observedTargets = new WeakSet<HTMLElement>();
    const revealTimers = new WeakMap<HTMLElement, number>();
    let animationFrame = 0;
    let startTimer = 0;
    let observer: IntersectionObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let disposed = false;

    const revealTarget = (target: HTMLElement) => {
      const queuedTimer = revealTimers.get(target);
      if (queuedTimer) {
        window.clearTimeout(queuedTimer);
        revealTimers.delete(target);
      }
      target.dataset.motionExit = "";
      target.classList.add("is-motion-visible");
      if (target.matches("[data-focus-reveal]")) {
        target.classList.add("is-focus-visible");
      }
    };

    const exitTarget = (target: HTMLElement, direction: "up" | "down") => {
      const queuedTimer = revealTimers.get(target);
      if (queuedTimer) {
        window.clearTimeout(queuedTimer);
        revealTimers.delete(target);
      }
      target.dataset.motionExit = direction;
      target.classList.remove("is-motion-visible");
      target.classList.remove("is-focus-visible");
    };

    const queueRevealTarget = (target: HTMLElement) => {
      if (target.classList.contains("is-motion-visible")) return;

      const queuedTimer = revealTimers.get(target);
      if (queuedTimer) {
        window.clearTimeout(queuedTimer);
      }

      const delay = Number.parseInt(target.style.getPropertyValue("--motion-delay") || "0", 10);
      const timer = window.setTimeout(() => {
        revealTimers.delete(target);
        window.requestAnimationFrame(() => {
          revealTarget(target);
        });
      }, Math.min(delay * 0.24 + 120, 360));
      revealTimers.set(target, timer);
    };

    const syncStaggerOrder = () => {
      document.querySelectorAll<HTMLElement>(STAGGER_SELECTOR).forEach((container) => {
        Array.from(container.children).forEach((child, index) => {
          if (!(child instanceof HTMLElement)) return;

          const isCatalogCard = child.dataset.motionVariant === "catalog-card";
          const motion = STAGGER_MOTIONS[index % STAGGER_MOTIONS.length];
          const delay = isCatalogCard
            ? Math.min(index, CATALOG_STAGGER_LIMIT) * CATALOG_STAGGER_STEP_MS
            : Math.min(index, STAGGER_LIMIT) * STAGGER_STEP_MS;
          child.style.setProperty("--motion-delay", `${delay}ms`);
          child.style.setProperty("--motion-entry-x", isCatalogCard ? "0px" : motion.x);
          child.style.setProperty("--motion-entry-y", isCatalogCard ? "34px" : motion.y);
          child.style.setProperty("--motion-entry-rotate", isCatalogCard ? "0deg" : motion.rotate);
        });
      });
    };

    const targetsInDocument = () =>
      Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));

    const observeNewTargets = () => {
      const motionIsReady = root.dataset.motionReady === "true";
      syncStaggerOrder();

      targetsInDocument().forEach((target) => {
        const bounds = target.getBoundingClientRect();
        const isWithinRevealBand = bounds.top < window.innerHeight * 0.92 && bounds.bottom > window.innerHeight * 0.06;

        if (isWithinRevealBand && !target.classList.contains("is-motion-visible")) {
          if (motionIsReady) queueRevealTarget(target);
          else revealTarget(target);
        }

        if (!observedTargets.has(target)) {
          observer?.observe(target);
          observedTargets.add(target);
        }
      });

      root.dataset.motionReady = "true";
    };

    const startRevealSystem = () => {
      if (disposed) return;

      if (reducedMotion.matches || !("IntersectionObserver" in window)) {
        root.dataset.motionReady = "true";
        syncStaggerOrder();
        targetsInDocument().forEach(revealTarget);
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const target = entry.target as HTMLElement;
            const bounds = entry.boundingClientRect;
            const isVisibleEnough = entry.isIntersecting && entry.intersectionRatio >= 0.12;

            if (isVisibleEnough) {
              queueRevealTarget(target);
              return;
            }

            if (root.dataset.motionReady !== "true" || !target.classList.contains("is-motion-visible")) return;

            if (bounds.bottom < window.innerHeight * 0.08) {
              exitTarget(target, "up");
            } else if (bounds.top > window.innerHeight * 0.92) {
              exitTarget(target, "down");
            }
          });
        },
        { threshold: [0, 0.08, 0.12, 0.24, 0.42], rootMargin: "-4% 0px -8%" },
      );

      observeNewTargets();

      mutationObserver = new MutationObserver(() => {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = window.requestAnimationFrame(observeNewTargets);
      });

      mutationObserver.observe(document.body, { childList: true, subtree: true });
    };

    const scheduleStart = () => {
      startTimer = window.setTimeout(startRevealSystem, HYDRATION_SETTLE_MS);
    };

    if (document.readyState === "complete") {
      scheduleStart();
    } else {
      window.addEventListener("load", scheduleStart, { once: true });
    }

    return () => {
      disposed = true;
      window.clearTimeout(startTimer);
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("load", scheduleStart);
      observer?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [pathname]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || isModifiedClick(event) || reducedMotion.matches) return;

      const url = getInternalNavigationUrl(event.target);
      if (!url) return;
      const destination = `${url.pathname}${url.search}${url.hash}`;
      const catalogDestination = url.pathname === "/catalogo" || url.pathname.startsWith("/catalogo/");

      event.preventDefault();

      if (exitTimerRef.current) {
        window.clearTimeout(exitTimerRef.current);
      }
      if (enterTimerRef.current) {
        window.clearTimeout(enterTimerRef.current);
      }

      setRouteTarget(catalogDestination ? "catalog" : "default");
      setRouteState("leaving");
      exitTimerRef.current = window.setTimeout(() => {
        router.push(destination);
      }, catalogDestination ? CATALOG_ROUTE_EXIT_MS : ROUTE_EXIT_MS);
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      if (exitTimerRef.current) {
        window.clearTimeout(exitTimerRef.current);
      }
      if (enterTimerRef.current) {
        window.clearTimeout(enterTimerRef.current);
      }
      setRouteTarget();
    };
  }, [router]);

  return null;
}
