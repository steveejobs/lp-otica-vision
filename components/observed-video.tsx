import type { VideoAsset } from "@/lib/assets";

import styles from "./observed-video.module.css";

type ObservedVideoProps = {
  asset: VideoAsset;
  className?: string;
  focusReveal?: boolean;
};

export function ObservedVideo({
  asset,
  className = "",
  focusReveal = false,
}: ObservedVideoProps) {
  return (
    <div
      className={`${styles.frame} ${className}`}
      data-video-card
      data-focus-reveal={focusReveal || undefined}
    >
      <video
        muted
        loop
        playsInline
        preload="none"
        poster={asset.poster}
        aria-label={asset.label}
        data-video-asset={asset.src}
        disablePictureInPicture
        style={{ objectPosition: asset.objectPosition }}
      >
        <source src={asset.src} type="video/mp4" />
        Seu navegador não oferece suporte a vídeo HTML5.
      </video>
    </div>
  );
}
