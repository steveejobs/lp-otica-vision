"use client";

import { useEffect } from "react";

export function MotionController() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches || !("IntersectionObserver" in window)) return;

    const root = document.documentElement;
    const elements = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];
    root.classList.add("motion-enabled");

    const reveal = (element: HTMLElement) => {
      element.dataset.revealed = "true";
    };

    elements.forEach((element) => {
      if (element.getBoundingClientRect().top < window.innerHeight * 0.94) reveal(element);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          reveal(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    elements.forEach((element) => {
      if (!element.dataset.revealed) observer.observe(element);
    });

    return () => {
      observer.disconnect();
      root.classList.remove("motion-enabled");
    };
  }, []);

  return null;
}
