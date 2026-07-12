"use client";

import { useEffect, useRef } from "react";

import type { VideoAsset } from "@/lib/assets";
import { observeAutoplayVideo } from "@/lib/video-observer";

import styles from "./observed-video.module.css";

type ObservedVideoProps = {
  asset: VideoAsset;
  className?: string;
};

export function ObservedVideo({ asset, className = "" }: ObservedVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    return observeAutoplayVideo(video);
  }, []);

  return (
    <div className={`${styles.frame} ${className}`} data-video-card>
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="metadata"
        poster={asset.poster}
        aria-label={asset.label}
        data-video-asset={asset.src}
        style={{ objectPosition: asset.objectPosition }}
      >
        <source src={asset.src} type="video/mp4" />
        Seu navegador não oferece suporte a vídeo HTML5.
      </video>
    </div>
  );
}
