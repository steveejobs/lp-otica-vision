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
    
    // Luxurious entrance
    const animations = cards.map((card, index) => card.animate(
      [
        { clipPath: "inset(12% 0 0 0)", opacity: 0, transform: "translate3d(0, 16px, 0) scale(0.98)", filter: "blur(3px)" },
        { clipPath: "inset(0)", opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", filter: "blur(0px)" },
      ],
      {
        delay: index * 60,
        duration: 480,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        fill: "both",
      },
    ));

    return () => animations.forEach((animation) => animation.cancel());
  }, [displayedContent.motionKey]);

  return <div className="catalog-results-motion" ref={rootRef}>{displayedContent.children}</div>;
}
