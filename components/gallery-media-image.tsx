"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

import type { DisplayGalleryMedia } from "@/lib/gallery/display-media";

type GalleryMediaImageProps = Omit<ImageProps, "onError" | "src" | "unoptimized"> & {
  media: Pick<DisplayGalleryMedia, "fallbackSrc" | "src">;
};

/** Keeps a verified local master available when a transient private Storage read fails. */
export function GalleryMediaImage({ media, ...props }: GalleryMediaImageProps) {
  const [usingFallback, setUsingFallback] = useState(false);
  const src = usingFallback && media.fallbackSrc ? media.fallbackSrc : media.src;

  return (
    <Image
      {...props}
      alt={props.alt}
      onError={() => {
        if (!usingFallback && media.fallbackSrc) setUsingFallback(true);
      }}
      src={src}
      unoptimized={src.startsWith("/api/")}
    />
  );
}
