"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type CatalogResultsMotionProps = {
  children: ReactNode;
  motionKey: string;
};

/** Enhances catalog changes with elegant entrance and exit animations natively */
export function CatalogResultsMotion({ children, motionKey }: CatalogResultsMotionProps) {
  const [displayedContent, setDisplayedContent] = useState({
    children,
    motionKey
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

    // Clean exit animation (shutter close / fade blur)
    const animations = cards.map((card, index) => card.animate(
      [
        { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", filter: "blur(0px)" },
        { opacity: 0, transform: "translate3d(0, -6px, 0) scale(0.99)", filter: "blur(2px)" },
      ],
      {
        delay: Math.min(index, 6) * 20, // super fast stagger out
        duration: 250,
        easing: "cubic-bezier(0.5, 0, 0.2, 1)",
        fill: "forwards",
      },
    ));

    const longestAnimation = animations[animations.length - 1] || animations[0];
    
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
    const duration = isMobile ? 550 : 650;
    const stagger = isMobile ? 60 : 80;

    let indexInView = 0;

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const card = entry.target as HTMLElement;
          obs.unobserve(card);

          // Only stagger the first 6 items that enter the viewport.
          const delay = indexInView < 6 ? indexInView * stagger : 0;
          indexInView++;

          const animation = card.animate(
            [
              { clipPath: "inset(12% 0 0 0)", opacity: 0, transform: "translate3d(0, 16px, 0)" },
              { clipPath: "inset(0 0 0 0)", opacity: 1, transform: "translate3d(0, 0, 0)" },
            ],
            {
              delay,
              duration,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)", // Clean smooth easing
              fill: "forwards",
            }
          );
          
          animation.finished.then(() => {
            // Remove will-change and transform after animation completes for performance
            card.style.transform = "";
            card.style.clipPath = "";
            card.style.opacity = "1";
          }).catch(() => {
            // Cancelled
          });
        }
      });
    }, { rootMargin: "50px" });

    // Initialize state
    cards.forEach(card => {
      card.style.opacity = "0"; // initial hidden state before animation takes over
      observer.observe(card);
    });

    return () => {
      observer.disconnect();
    };
  }, [displayedContent.motionKey]);

  return <div className="catalog-results-motion" ref={rootRef}>{displayedContent.children}</div>;
}
