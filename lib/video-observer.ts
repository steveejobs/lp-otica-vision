const visibleVideos = new Map<HTMLVideoElement, number>();

const updatePlayback = () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canPlay = !reduceMotion && document.visibilityState === "visible";
  const candidates = [...visibleVideos.entries()]
    .filter(([, ratio]) => ratio >= 0.45)
    .sort(([videoA, ratioA], [videoB, ratioB]) => {
      if (ratioA !== ratioB) return ratioB - ratioA;
      return videoA.compareDocumentPosition(videoB) & Node.DOCUMENT_POSITION_FOLLOWING
        ? -1
        : 1;
    });
  const selected = canPlay ? candidates[0]?.[0] : undefined;

  visibleVideos.forEach((_, candidate) => {
    if (candidate !== selected) {
      candidate.pause();
      return;
    }

    void candidate.play().catch(() => candidate.pause());
  });
};

export function observeAutoplayVideo(video: HTMLVideoElement) {
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

  video.pause();

  if (!("IntersectionObserver" in window)) return () => video.pause();

  visibleVideos.set(video, 0);

  const observer = new IntersectionObserver(
    ([entry]) => {
      visibleVideos.set(video, entry.isIntersecting ? entry.intersectionRatio : 0);
      updatePlayback();
    },
    { threshold: [0, 0.45, 0.8], rootMargin: "0px 0px -6%" },
  );

  observer.observe(video);
  motionPreference.addEventListener("change", updatePlayback);
  document.addEventListener("visibilitychange", updatePlayback);

  return () => {
    video.pause();
    visibleVideos.delete(video);
    updatePlayback();
    observer.disconnect();
    motionPreference.removeEventListener("change", updatePlayback);
    document.removeEventListener("visibilitychange", updatePlayback);
  };
}
