"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

import type { VideoAsset } from "@/lib/assets";
import { observeAutoplayVideo } from "@/lib/video-observer";

import styles from "./observed-video.module.css";

type ObservedVideoProps = {
  asset: VideoAsset;
  className?: string;
};

export function ObservedVideo({ asset, className = "" }: ObservedVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const userPausedRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    return observeAutoplayVideo(video, () => !userPausedRef.current);
  }, []);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      userPausedRef.current = false;
      void video.play().catch(() => setIsPlaying(false));
    } else {
      userPausedRef.current = true;
      video.pause();
    }
  };

  return (
    <div className={`${styles.tile} ${className}`}>
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="metadata"
        poster={asset.poster}
        aria-label={asset.title}
        style={{ objectPosition: asset.objectPosition }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      >
        <source src={asset.src} type="video/mp4" />
      </video>
      <button
        className={styles.control}
        type="button"
        onClick={togglePlayback}
        aria-label={isPlaying ? `Pausar: ${asset.title}` : `Reproduzir: ${asset.title}`}
        title={isPlaying ? "Pausar vídeo" : "Reproduzir vídeo"}
      >
        {isPlaying ? (
          <Pause aria-hidden="true" size={16} fill="currentColor" />
        ) : (
          <Play aria-hidden="true" size={16} fill="currentColor" />
        )}
      </button>
    </div>
  );
}
