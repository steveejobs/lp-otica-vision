"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type CatalogResultsMotionProps = {
  children: ReactNode;
  motionKey: string;
};

/** Enhances catalog changes with editorial entrance and exit animations */
export function CatalogResultsMotion({ children, motionKey }: CatalogResultsMotionProps) {
  const [displayedContent, setDisplayedContent] = useState({
    children,
    motionKey,
  });
  const rootRef = useRef<HTMLDivElement>(null);

  // 1. Handle Exit Animation when motionKey changes
  useEffect(() => {
    if (displayedContent.motionKey === motionKey) return;

    const root = rootRef.current;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!root || prefersReducedMotion) {
      setDisplayedContent({ children, motionKey });
      return;
    }

    const cards = [...root.querySelectorAll<HTMLElement>("[data-catalog-product-id]")];
    if (cards.length === 0) {
      setDisplayedContent({ children, motionKey });
      return;
    }

    let isCancelled = false;

    // Editorial exit: fade + lift + gentle blur, stagger outward
    const animations = cards.map((card, index) =>
      card.animate(
        [
          { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", filter: "blur(0px)", clipPath: "inset(0 0 0 0)" },
          { opacity: 0, transform: "translate3d(0, -10px, 0) scale(0.984)", filter: "blur(3px)", clipPath: "inset(0 0 8% 0)" },
        ],
        {
          delay: Math.min(index, 7) * 18,
          duration: 300,
          easing: "cubic-bezier(0.5, 0, 0.2, 1)",
          fill: "forwards",
        },
      ),
    );

    const longestAnimation = animations[animations.length - 1] ?? animations[0];

    longestAnimation.onfinish = () => {
      if (!isCancelled) {
        setDisplayedContent({ children, motionKey });
      }
    };

    return () => {
      isCancelled = true;
      animations.forEach((a) => a.cancel());
    };
  }, [children, motionKey, displayedContent.motionKey]);

  // 2. Handle Entrance Animation when displayedContent updates
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cards = [...root.querySelectorAll<HTMLElement>("[data-catalog-product-id]")];

    const isMobile = window.innerWidth <= 720;
    // Editorial timing: 700ms on desktop, 580ms on mobile — luxury feel
    const duration = isMobile ? 580 : 720;
    // Stagger: 70ms mobile, 90ms desktop — sequential cascade
    const stagger = isMobile ? 70 : 90;

    let indexInView = 0;

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const card = entry.target as HTMLElement;
            obs.unobserve(card);

            // Stagger only the first 9 visible cards; rest enter immediately
            const delay = indexInView < 9 ? indexInView * stagger : 0;
            indexInView++;

            card.animate(
              [
                {
                  clipPath: "inset(18% 0 0 0)",
                  opacity: 0,
                  transform: "translate3d(0, 22px, 0) scale(0.975)",
                  filter: "blur(4px) saturate(0.88)",
                },
                {
                  clipPath: "inset(6% 0 0 0)",
                  opacity: 0.6,
                  transform: "translate3d(0, 8px, 0) scale(0.990)",
                  filter: "blur(1.5px) saturate(0.95)",
                  offset: 0.45,
                },
                {
                  clipPath: "inset(0 0 0 0)",
                  opacity: 1,
                  transform: "translate3d(0, 0, 0) scale(1)",
                  filter: "blur(0px) saturate(1)",
                },
              ],
              {
                delay,
                duration,
                easing: "cubic-bezier(0.16, 1, 0.3, 1)",
                fill: "forwards",
              },
            ).finished.then(() => {
              // Clean up inline styles after animation
              card.style.transform = "";
              card.style.clipPath = "";
              card.style.opacity = "1";
              card.style.filter = "";
            }).catch(() => {
              // Cancelled — no-op
            });
          }
        });
      },
      { rootMargin: "60px" },
    );

    // Set initial hidden state before IO fires
    cards.forEach((card) => {
      card.style.opacity = "0";
      observer.observe(card);
    });

    return () => {
      observer.disconnect();
    };
  }, [displayedContent.motionKey]);

  return (
    <div className="catalog-results-motion" ref={rootRef}>
      {displayedContent.children}
    </div>
  );
}
