"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const REVEAL_SELECTOR = "[data-motion-reveal], [data-focus-reveal]";
const STAGGER_SELECTOR = "[data-motion-stagger]";
const ROUTE_EXIT_MS = 340;
const ROUTE_ENTER_MS = 620;
const HYDRATION_SETTLE_MS = 520;

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.altKey || event.ctrlKey || event.shiftKey || event.button !== 0;
}

function getInternalNavigationUrl(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;

  const anchor = target.closest<HTMLAnchorElement>("a[href]");
  if (!anchor) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;
  if (anchor.dataset.noPageTransition === "true") return null;

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;

  const current = window.location;
  const samePage = url.pathname === current.pathname && url.search === current.search;
  if (samePage && url.hash) return null;
  if (samePage && !url.hash) return null;

  return url;
}

function setRouteState(state: "idle" | "leaving" | "entering") {
  document.documentElement.dataset.routeState = state;
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

    setRouteState("entering");
    enterTimerRef.current = window.setTimeout(() => {
      setRouteState("idle");
    }, ROUTE_ENTER_MS);

    return () => {
      if (enterTimerRef.current) {
        window.clearTimeout(enterTimerRef.current);
      }
    };
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observedTargets = new WeakSet<HTMLElement>();
    const queuedTargets = new WeakSet<HTMLElement>();
    let animationFrame = 0;
    let startTimer = 0;
    let observer: IntersectionObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let disposed = false;

    const revealTarget = (target: HTMLElement) => {
      target.classList.add("is-motion-visible");
      if (target.matches("[data-focus-reveal]")) {
        target.classList.add("is-focus-visible");
      }
    };

    const queueRevealTarget = (target: HTMLElement) => {
      if (queuedTargets.has(target)) return;
      queuedTargets.add(target);
      window.setTimeout(() => {
        window.requestAnimationFrame(() => {
          revealTarget(target);
        });
      }, 80);
    };

    const syncStaggerOrder = () => {
      document.querySelectorAll<HTMLElement>(STAGGER_SELECTOR).forEach((container) => {
        Array.from(container.children).forEach((child, index) => {
          if (child instanceof HTMLElement && !child.style.getPropertyValue("--motion-delay")) {
            child.style.setProperty("--motion-delay", `${Math.min(index, 10) * 86}ms`);
          }
        });
      });
    };

    const targetsInDocument = () =>
      Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));

    const observeNewTargets = () => {
      const motionIsReady = root.dataset.motionReady === "true";
      syncStaggerOrder();

      targetsInDocument().forEach((target) => {
        if (target.classList.contains("is-motion-visible")) return;

        const bounds = target.getBoundingClientRect();
        if (bounds.top < window.innerHeight * 1.04 && bounds.bottom > 0) {
          if (motionIsReady) queueRevealTarget(target);
          else revealTarget(target);
          return;
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
            if (!entry.isIntersecting) return;
            revealTarget(entry.target as HTMLElement);
            observer?.unobserve(entry.target);
          });
        },
        { threshold: 0.16, rootMargin: "0px 0px -8%" },
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

      event.preventDefault();

      if (exitTimerRef.current) {
        window.clearTimeout(exitTimerRef.current);
      }
      if (enterTimerRef.current) {
        window.clearTimeout(enterTimerRef.current);
      }

      setRouteState("leaving");
      exitTimerRef.current = window.setTimeout(() => {
        router.push(`${url.pathname}${url.search}${url.hash}`);

        enterTimerRef.current = window.setTimeout(() => {
          setRouteState("entering");
          enterTimerRef.current = window.setTimeout(() => {
            setRouteState("idle");
          }, ROUTE_ENTER_MS);
        }, 80);
      }, ROUTE_EXIT_MS);
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
    };
  }, [router]);

  return null;
}
