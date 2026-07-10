export function observeAutoplayVideo(
  video: HTMLVideoElement,
  shouldPlay: () => boolean = () => true,
) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const pause = () => video.pause();

  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    pause();
    return pause;
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.55 && shouldPlay()) {
        void video.play().catch(pause);
      } else {
        pause();
      }
    },
    { threshold: [0, 0.55, 1] },
  );

  observer.observe(video);

  const handleMotionChange = () => {
    if (reducedMotion.matches) {
      pause();
    }
  };

  reducedMotion.addEventListener("change", handleMotionChange);

  return () => {
    pause();
    observer.disconnect();
    reducedMotion.removeEventListener("change", handleMotionChange);
  };
}
