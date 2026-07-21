"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import type { CatalogFilterOptions, CatalogPageResult, CatalogQuery } from "@/lib/catalog/types";
import type { CurationStyle } from "@/lib/curation/types";
import type { CatalogProductCard as CatalogProductCardData } from "@/lib/catalog/types";

import { CinematicCard } from "./cinematic-card";
import { BrandRail, CompactFilters } from "./ui-placeholders";
import styles from "./experience.module.css";

export type Phase = "preparing" | "intro" | "settling" | "catalog";

export function ExperienceView({
  catalog,
}: {
  catalog: CatalogPageResult;
  featuredProducts: CatalogProductCardData[];
  filters: CatalogFilterOptions;
  query: CatalogQuery;
  styleOptions: CurationStyle[];
  scale: string;
}) {
  const [phase, setPhase] = useState<Phase>("preparing");
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Check if we already saw the intro in this session
    const hasSeenIntro = sessionStorage.getItem("vision:introCompleted");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    setTimeout(() => {
      if (hasSeenIntro === "true" || prefersReducedMotion) {
        setPhase("catalog");
      } else {
        setPhase("intro");
      }
    }, 0);
  }, []);

  const triggerTransition = () => {
    if (phase !== "intro") return;
    
    // Snapshot FIRST (intro state)
    const stage = stageRef.current;
    if (!stage) return;
    
    const elements = Array.from(stage.querySelectorAll("[data-id]"));
    const firstRects = new Map<Element, DOMRect>();
    elements.forEach(el => firstRects.set(el, el.getBoundingClientRect()));

    // Change DOM state to catalog
    setPhase("catalog");
    sessionStorage.setItem("vision:introCompleted", "true");

    // Let React render the new state, then measure LAST and animate
    requestAnimationFrame(() => {
      elements.forEach(el => {
        const lastRect = el.getBoundingClientRect();
        const firstRect = firstRects.get(el);
        if (!firstRect) return;

        const deltaX = firstRect.left - lastRect.left;
        const deltaY = firstRect.top - lastRect.top;
        const scaleX = firstRect.width / lastRect.width;
        const scaleY = firstRect.height / lastRect.height;

        // Invert and Play
        el.animate(
          [
            {
              transformOrigin: "top left",
              transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`
            },
            {
              transformOrigin: "top left",
              transform: "none"
            }
          ],
          {
            duration: 800,
            easing: "cubic-bezier(0.25, 1, 0.5, 1)", // Smooth ease out
            fill: "both"
          }
        );
      });
    });
  };

  // Interruption listeners
  useEffect(() => {
    if (phase !== "intro") return;

    let touchStartY = 0;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 30) {
        triggerTransition();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      if (Math.abs(touchStartY - touchY) > 40) {
        triggerTransition();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab" || e.key === "ArrowDown" || e.key === " ") {
        triggerTransition();
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    // Auto-advance after 3.5s if not interrupted
    const timer = setTimeout(triggerTransition, 3500);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Roles assignment
  const assignRole = (index: number) => {
    if (index === 0) return "protagonist";
    if (index === 1) return "support-vertical";
    if (index === 2) return "support-horizontal";
    if (index >= 3 && index <= 5) return "accent";
    return "standard";
  };

  return (
    <div className={styles.container} data-phase={phase}>
      {/* QA Controls */}
      <div className={styles.qaControls}>
        <span>QA (Preview Only): </span>
        <Link href="?scale=4">4 (Real)</Link>
        <Link href="?scale=24">24 (Fixture)</Link>
        <Link href="?scale=100">100 (Fixture)</Link>
        <button onClick={() => {
          sessionStorage.removeItem("vision:introCompleted");
          window.location.reload();
        }}>Reset Intro</button>
      </div>

      {/* Header/UI Stage - hidden in intro */}
      <header className={styles.uiHeader} aria-hidden={phase !== "catalog"}>
        <BrandRail />
        <CompactFilters />
      </header>

      {/* Stage */}
      <main className={styles.stage} ref={stageRef}>
        {catalog.products.map((product, index) => {
          const role = assignRole(index);
          const isIntroStage = phase === "preparing" || phase === "intro";
          
          // If we are in intro, hide items beyond 6 to preserve the asymmetric grid
          if (isIntroStage && index > 5) return null;

          return (
            <CinematicCard
              key={product.id}
              product={product}
              role={role}
              phase={phase}
              index={index}
            />
          );
        })}
      </main>
    </div>
  );
}
