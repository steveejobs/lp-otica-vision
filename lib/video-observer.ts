const visibleVideos = new Map<HTMLVideoElement, number>();

const currentVisibilityRatio = (video: HTMLVideoElement) => {
  const rect = video.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return 0;

  const intersectionWidth = Math.max(
    0,
    Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0),
  );
  const intersectionHeight = Math.max(
    0,
    Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0),
  );
  return (intersectionWidth * intersectionHeight) / (rect.width * rect.height);
};

const updatePlayback = () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canPlay = !reduceMotion && document.visibilityState === "visible";
  const candidates = [...visibleVideos.keys()]
    .map((video) => [video, currentVisibilityRatio(video)] as const)
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
  const handleScroll = () => updatePlayback();
  window.addEventListener("scroll", handleScroll, { passive: true });
  video.addEventListener("timeupdate", updatePlayback);
  motionPreference.addEventListener("change", updatePlayback);
  document.addEventListener("visibilitychange", updatePlayback);

  return () => {
    video.pause();
    visibleVideos.delete(video);
    updatePlayback();
    observer.disconnect();
    window.removeEventListener("scroll", handleScroll);
    video.removeEventListener("timeupdate", updatePlayback);
    motionPreference.removeEventListener("change", updatePlayback);
    document.removeEventListener("visibilitychange", updatePlayback);
  };
}
