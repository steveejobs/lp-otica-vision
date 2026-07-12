"use client";

import Image from "next/image";
import { useState } from "react";

type NewsImageProps = {
  src: string;
  alt: string;
  className: string;
};

export function NewsImage({ src, alt, className }: NewsImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <div className={className} data-news-media>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 720px) 285px, (max-width: 1100px) 42vw, 300px"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
