"use client";

import {
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
} from "react";

import { observeVideoComposition } from "@/lib/video-observer";

type VideoCompositionProps = ComponentPropsWithoutRef<"div">;

export function VideoComposition({
  children,
  className = "",
  ...props
}: VideoCompositionProps) {
  const compositionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const composition = compositionRef.current;
    if (!composition) return;

    return observeVideoComposition(composition);
  }, []);

  return (
    <div
      ref={compositionRef}
      className={className}
      data-video-composition
      data-video-composition-active="false"
      {...props}
    >
      {children}
    </div>
  );
}
