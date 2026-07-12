export function observeAutoplayVideo(
  video: HTMLVideoElement,
) {
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  let isVisible = false;

  const updatePlayback = () => {
    const canPlay =
      isVisible &&
      !motionPreference.matches &&
      document.visibilityState === "visible";

    if (!canPlay) {
      video.pause();
      return;
    }

    void video.play().catch(() => video.pause());
  };

  video.pause();

  if (!("IntersectionObserver" in window)) return () => video.pause();

  const observer = new IntersectionObserver(
    ([entry]) => {
      isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.45;
      updatePlayback();
    },
    { threshold: [0, 0.45, 0.8], rootMargin: "0px 0px -6%" },
  );

  observer.observe(video);
  motionPreference.addEventListener("change", updatePlayback);
  document.addEventListener("visibilitychange", updatePlayback);

  return () => {
    video.pause();
    observer.disconnect();
    motionPreference.removeEventListener("change", updatePlayback);
    document.removeEventListener("visibilitychange", updatePlayback);
  };
}
