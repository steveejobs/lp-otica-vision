"use client";

import { useEffect } from "react";

const FOCUS_SELECTOR = "[data-focus-reveal]";

export function VisionMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const targets = Array.from(document.querySelectorAll<HTMLElement>(FOCUS_SELECTOR));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const showEverything = () => {
      targets.forEach((target) => target.classList.add("is-focus-visible"));
    };

    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      root.dataset.motionReady = "true";
      showEverything();
      return;
    }

    targets.forEach((target) => {
      const bounds = target.getBoundingClientRect();
      if (bounds.top < window.innerHeight * 1.04 && bounds.bottom > 0) {
        target.classList.add("is-focus-visible");
      }
    });
    root.dataset.motionReady = "true";

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).classList.add("is-focus-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8%" },
    );

    targets
      .filter((target) => !target.classList.contains("is-focus-visible"))
      .forEach((target) => observer.observe(target));

    return () => {
      observer.disconnect();
      delete root.dataset.motionReady;
    };
  }, []);

  return null;
}
