"use client";

import { useEffect, useRef, type ReactNode } from "react";

type CatalogResultsMotionProps = {
  children: ReactNode;
  motionKey: string;
};

/** Enhances catalog changes without hiding content before JavaScript is ready. */
export function CatalogResultsMotion({ children, motionKey }: CatalogResultsMotionProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cards = [...root.querySelectorAll<HTMLElement>("[data-catalog-product-id]")];
    const animations = cards.map((card, index) => card.animate(
      [
        { clipPath: "inset(12% 0 0 0)", opacity: 0, transform: "translate3d(0, 24px, 0) scale(.988)" },
        { clipPath: "inset(0)", opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
      ],
      {
        delay: Math.min(index, 7) * 58,
        duration: 620,
        easing: "cubic-bezier(.22,.72,.18,1)",
        fill: "both",
      },
    ));

    return () => animations.forEach((animation) => animation.cancel());
  }, [motionKey]);

  return <div className="catalog-results-motion" ref={rootRef}>{children}</div>;
}
