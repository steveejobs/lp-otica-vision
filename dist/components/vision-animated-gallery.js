const animatedGalleryImages = [
  { src: "galeria/6%20(1).jpg", width: 1440, height: 1919, position: "center 34%" },
  { src: "galeria/6%20(2).jpg", width: 1440, height: 1919, position: "center 34%" },
  { src: "galeria/6%20(3).jpg", width: 1440, height: 1919, position: "center 38%" },
  { src: "galeria/1%20(1).jpg", width: 1358, height: 1810, position: "center 34%" },
  { src: "galeria/1%20(2).jpg", width: 1440, height: 1919, position: "center 34%" },
  { src: "galeria/1%20(3).jpg", width: 1440, height: 1920, position: "center 34%" },
  { src: "galeria/2%20(1).jpg", width: 1440, height: 1919, position: "center 32%" },
  { src: "galeria/2%20(2).jpg", width: 1440, height: 1919, position: "center 32%" },
  { src: "galeria/8%20(1).jpg", width: 1440, height: 1762, position: "center 48%" },
  { src: "galeria/8%20(2).jpg", width: 1440, height: 1762, position: "center 44%" }
];

const supportGalleryImages = [
  { src: "galeria/3%20(1).jpg", width: 1440, height: 1919, position: "center 32%" },
  { src: "galeria/3%20(2).jpg", width: 1440, height: 1919, position: "center 32%" },
  { src: "galeria/4%20(1).jpg", width: 1440, height: 1919, position: "center 32%" },
  { src: "galeria/4%20(2).jpg", width: 1440, height: 1911, position: "center 36%" },
  { src: "galeria/5%20(1).jpg", width: 1440, height: 1919, position: "center 34%" },
  { src: "galeria/5%20(2).jpg", width: 1440, height: 1919, position: "center 38%" },
  { src: "galeria/7%20(1).jpg", width: 1440, height: 1919, position: "center 34%" },
  { src: "galeria/7%20(2).jpg", width: 1440, height: 1919, position: "center 34%" },
  { src: "galeria/7%20(3).jpg", width: 1440, height: 1919, position: "center 34%" },
  { src: "galeria/8%20(4).jpg", width: 1440, height: 1762, position: "center 44%" }
];

const FLIP_SPEED = 750;
const flipTiming = { duration: FLIP_SPEED, iterations: 1, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" };
const flipAnimationTop = [{ transform: "rotateX(0)" }, { transform: "rotateX(-90deg)" }, { transform: "rotateX(-90deg)" }];
const flipAnimationBottom = [{ transform: "rotateX(90deg)" }, { transform: "rotateX(90deg)" }, { transform: "rotateX(0)" }];
const flipAnimationTopReverse = [{ transform: "rotateX(-90deg)" }, { transform: "rotateX(-90deg)" }, { transform: "rotateX(0)" }];
const flipAnimationBottomReverse = [{ transform: "rotateX(0)" }, { transform: "rotateX(90deg)" }, { transform: "rotateX(90deg)" }];

const url = (src) => `url("${src}")`;
const wrap = (index, total) => (index + total) % total;

const panel = (className) => {
  const node = document.createElement("div");
  node.className = `vision-flip-panel ${className}`;
  return node;
};

const setBg = (node, item) => {
  node.style.backgroundImage = url(item.src);
  node.style.backgroundPosition = item.position;
};

const preload = (items) => items.forEach((item, index) => {
  const image = new Image();
  image.decoding = "async";
  image.loading = index < 4 ? "eager" : "lazy";
  image.src = item.src;
});

const mountAnimatedGallery = (root, images) => {
  const shell = document.createElement("div");
  shell.className = "vision-animated-shell";

  const previous = new Image();
  previous.className = "vision-animated-side vision-animated-side-prev";
  previous.alt = "";
  previous.decoding = "async";
  previous.loading = "lazy";
  previous.setAttribute("aria-hidden", "true");

  const next = new Image();
  next.className = "vision-animated-side vision-animated-side-next";
  next.alt = "";
  next.decoding = "async";
  next.loading = "lazy";
  next.setAttribute("aria-hidden", "true");

  const frame = document.createElement("div");
  frame.className = "vision-animated-frame";
  frame.tabIndex = 0;
  frame.setAttribute("role", "img");
  frame.setAttribute("aria-label", "Modelos e detalhes reais da Otica Vision");

  const stage = document.createElement("div");
  stage.className = "vision-animated-stage";
  stage.append(
    panel("vision-flip-top unite"),
    panel("vision-flip-bottom unite"),
    panel("vision-flip-overlay-top unite"),
    panel("vision-flip-overlay-bottom unite")
  );
  frame.append(stage);
  shell.append(previous, frame, next);
  root.replaceChildren(shell);

  const panels = [...stage.querySelectorAll(".unite")];
  const top = stage.querySelector(".vision-flip-overlay-top");
  const bottom = stage.querySelector(".vision-flip-overlay-bottom");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let currentIndex = 0;
  let locked = false;
  let timer = 0;
  let pointerStart = null;
  let suppressClick = false;

  const syncSides = () => {
    const prev = images[wrap(currentIndex - 1, images.length)];
    const nextItem = images[wrap(currentIndex + 1, images.length)];
    previous.src = prev.src;
    previous.width = prev.width;
    previous.height = prev.height;
    previous.style.objectPosition = prev.position;
    next.src = nextItem.src;
    next.width = nextItem.width;
    next.height = nextItem.height;
    next.style.objectPosition = nextItem.position;
  };

  const syncActive = () => {
    const active = images[currentIndex];
    panels.forEach((item) => setBg(item, active));
    syncSides();
  };

  const resetOverlay = () => {
    top.style.transform = "rotateX(0)";
    bottom.style.transform = "rotateX(90deg)";
  };

  const updateGallery = (nextIndex, reverse = false) => {
    if (locked || nextIndex === currentIndex) return;
    locked = true;
    setBg(top, images[nextIndex]);
    setBg(bottom, images[nextIndex]);
    if (reduced || !top.animate || !bottom.animate) {
      currentIndex = nextIndex;
      syncActive();
      locked = false;
      return;
    }
    top.animate(reverse ? flipAnimationTopReverse : flipAnimationTop, flipTiming);
    bottom.animate(reverse ? flipAnimationBottomReverse : flipAnimationBottom, flipTiming);
    window.setTimeout(() => {
      currentIndex = nextIndex;
      syncActive();
      resetOverlay();
      locked = false;
    }, FLIP_SPEED - 70);
  };

  const updateIndex = (step) => updateGallery(wrap(currentIndex + step, images.length), step < 0);
  const pause = () => window.clearInterval(timer);
  const restart = () => {
    pause();
    if (!reduced) timer = window.setInterval(() => updateIndex(1), 4300);
  };

  syncActive();
  resetOverlay();
  preload(images);
  restart();

  root.addEventListener("click", () => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    updateIndex(1);
    restart();
  });
  root.addEventListener("pointerdown", (event) => {
    pointerStart = { x: event.clientX, y: event.clientY };
  }, { passive: true });
  root.addEventListener("pointerup", (event) => {
    if (!pointerStart) return;
    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(deltaX) < 36 || Math.abs(deltaX) < Math.abs(deltaY) * 1.12) return;
    suppressClick = true;
    window.setTimeout(() => { suppressClick = false; }, 140);
    updateIndex(deltaX > 0 ? -1 : 1);
    restart();
  }, { passive: true });
  frame.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    updateIndex(event.key === "ArrowLeft" ? -1 : 1);
    restart();
  });
  root.addEventListener("mouseenter", pause);
  root.addEventListener("mouseleave", restart);
  root.addEventListener("focusin", pause);
  root.addEventListener("focusout", restart);
};

const supportItem = (item, index) => {
  const figure = document.createElement("figure");
  figure.className = index === 0 ? "vision-support-item vision-support-feature" : "vision-support-item";
  const image = new Image();
  image.src = item.src;
  image.width = item.width;
  image.height = item.height;
  image.alt = "Imagem real da Otica Vision";
  image.decoding = "async";
  image.loading = index < 3 ? "eager" : "lazy";
  image.style.objectPosition = item.position;
  figure.append(image);
  return figure;
};

const mountSupportGallery = (root, images) => {
  const shell = document.createElement("div");
  shell.className = "vision-support-shell";
  images.forEach((item, index) => shell.append(supportItem(item, index)));
  root.replaceChildren(shell);
};

const assertUniqueImages = () => {
  const animated = new Set(animatedGalleryImages.map((item) => item.src));
  const support = new Set(supportGalleryImages.map((item) => item.src));
  const repeated = [...animated].filter((src) => support.has(src));
  if (repeated.length) throw new Error(`Repeated gallery image: ${repeated.join(", ")}`);
};

export { animatedGalleryImages, supportGalleryImages };

export const initVisionGalleries = () => {
  assertUniqueImages();
  document.querySelectorAll("[data-vision-animated-gallery]").forEach((root) => mountAnimatedGallery(root, animatedGalleryImages));
  document.querySelectorAll("[data-vision-support-gallery]").forEach((root) => mountSupportGallery(root, supportGalleryImages));
};
