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
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={className}
      data-news-media
      data-loaded={loaded ? "true" : "false"}
      data-failed={failed ? "true" : "false"}
    >
      {!failed ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 720px) 82vw, (max-width: 1100px) 40vw, 360px"
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : null}
    </div>
  );
}
