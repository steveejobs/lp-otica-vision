type NetworkInformation = EventTarget & {
  saveData?: boolean;
};

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformation;
};

const hasRenderableSize = (video: HTMLVideoElement) => {
  const rect = video.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

export function observeVideoComposition(composition: HTMLElement) {
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const connection = (navigator as NavigatorWithConnection).connection;
  let isInView = false;
  let geometryFrame: number | null = null;

  const videos = () =>
    Array.from(composition.querySelectorAll<HTMLVideoElement>("video"));

  const pauseAll = () => {
    videos().forEach((video) => {
      video.pause();
      video.dataset.autoplayActive = "false";
    });
    composition.dataset.videoCompositionActive = "false";
  };

  const updatePlayback = () => {
    const candidates = videos();
    const canPlay =
      isInView &&
      document.visibilityState === "visible" &&
      !motionPreference.matches &&
      !connection?.saveData;

    if (!canPlay) {
      pauseAll();
      return;
    }

    const playable = candidates.filter(hasRenderableSize);
    if (playable.length !== candidates.length) {
      pauseAll();
      return;
    }

    composition.dataset.videoCompositionActive = "true";
    playable.forEach((video) => {
      void video.play().then(
        () => {
          video.dataset.autoplayActive = "true";
        },
        () => {
          video.dataset.autoplayActive = "false";
          video.pause();
        },
      );
    });
  };

  const updateFromGeometry = () => {
    geometryFrame = null;
    const rect = composition.getBoundingClientRect();
    const intersectionWidth = Math.max(
      0,
      Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0),
    );
    const intersectionHeight = Math.max(
      0,
      Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0),
    );
    const area = Math.max(1, rect.width * rect.height);
    isInView = (intersectionWidth * intersectionHeight) / area >= 0.18;
    updatePlayback();
  };

  const scheduleGeometryUpdate = () => {
    if (geometryFrame !== null) return;
    geometryFrame = window.requestAnimationFrame(updateFromGeometry);
  };

  pauseAll();

  const observer = "IntersectionObserver" in window
    ? new IntersectionObserver(
        ([entry]) => {
          isInView = entry.isIntersecting && entry.intersectionRatio >= 0.18;
          updatePlayback();
        },
        { threshold: [0, 0.18, 0.45, 0.72], rootMargin: "0px 0px -6%" },
      )
    : null;

  if (observer) observer.observe(composition);
  else {
    isInView = true;
    updatePlayback();
  }

  scheduleGeometryUpdate();
  window.addEventListener("scroll", scheduleGeometryUpdate, { passive: true });
  window.addEventListener("resize", scheduleGeometryUpdate, { passive: true });
  motionPreference.addEventListener("change", updatePlayback);
  connection?.addEventListener("change", updatePlayback);
  document.addEventListener("visibilitychange", updatePlayback);

  return () => {
    pauseAll();
    observer?.disconnect();
    if (geometryFrame !== null) window.cancelAnimationFrame(geometryFrame);
    window.removeEventListener("scroll", scheduleGeometryUpdate);
    window.removeEventListener("resize", scheduleGeometryUpdate);
    motionPreference.removeEventListener("change", updatePlayback);
    connection?.removeEventListener("change", updatePlayback);
    document.removeEventListener("visibilitychange", updatePlayback);
  };
}
