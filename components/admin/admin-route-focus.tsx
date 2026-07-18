"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function AdminRouteFocus() {
  const pathname = usePathname();
  const lastHeadingRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const previousHeading = lastHeadingRef.current;
    let attempts = 0;
    let frame = 0;

    const focusNewHeading = () => {
      const heading = document.querySelector<HTMLElement>("#main-content h1");
      attempts += 1;
      if (heading && (heading !== previousHeading || attempts >= 60)) {
        heading.focus({ preventScroll: true });
        lastHeadingRef.current = heading;
        return;
      }
      frame = window.requestAnimationFrame(focusNewHeading);
    };

    frame = window.requestAnimationFrame(focusNewHeading);
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
