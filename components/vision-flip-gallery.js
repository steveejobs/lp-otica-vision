const FLIP_IMAGES = [
  { src: "galeria/6%20(1).jpg", width: 1440, height: 1919, position: "center 34%" },
  { src: "galeria/1%20(1).jpg", width: 1358, height: 1810, position: "center 34%" },
  { src: "galeria/2%20(1).jpg", width: 1440, height: 1919, position: "center 32%" },
  { src: "galeria/3%20(1).jpg", width: 1440, height: 1919, position: "center 32%" },
  { src: "galeria/7%20(1).jpg", width: 1440, height: 1919, position: "center 34%" },
  { src: "galeria/8%20(1).jpg", width: 1440, height: 1762, position: "center 48%" },
  { src: "galeria/6%20(2).jpg", width: 1440, height: 1919, position: "center 34%" },
  { src: "galeria/1%20(3).jpg", width: 1440, height: 1920, position: "center 34%" },
  { src: "galeria/8%20(4).jpg", width: 1440, height: 1762, position: "center 44%" },
  { src: "galeria/5%20(1).jpg", width: 1440, height: 1919, position: "center 34%" },
  { src: "galeria/4%20(1).jpg", width: 1440, height: 1919, position: "center 32%" },
  { src: "galeria/7%20(3).jpg", width: 1440, height: 1919, position: "center 34%" }
];

const motion = {
  duration: 680,
  iterations: 1,
  easing: "cubic-bezier(0.2, 0.8, 0.2, 1)"
};

const imageUrl = (value) => `url("${value}")`;

const preloadImages = (items) => {
  items.forEach((item, index) => {
    const image = new Image();
    image.decoding = "async";
    image.loading = index < 4 ? "eager" : "lazy";
    image.src = item.src;
  });
};

const createSideImage = (className, side) => {
  const wrapper = document.createElement("div");
  wrapper.className = `flip-support ${className}`;
  wrapper.setAttribute("aria-hidden", "true");

  const image = document.createElement("img");
  image.alt = "";
  image.loading = "lazy";
  image.decoding = "async";
  image.dataset.flipSide = side;
  wrapper.append(image);

  return wrapper;
};

const createGallery = () => {
  const frame = document.createElement("div");
  frame.className = "flip-gallery-frame";
  frame.setAttribute("aria-label", "Selecao visual de modelos da Otica Vision");
  frame.tabIndex = 0;

  const gallery = document.createElement("div");
  gallery.className = "flip-gallery";
  gallery.setAttribute("role", "img");
  gallery.setAttribute("aria-label", "Modelos e detalhes reais da Otica Vision");

  [
    ["top", "flip-panel-top"],
    ["bottom", "flip-panel-bottom"],
    ["overlay-top", "flip-overlay-top"],
    ["overlay-bottom", "flip-overlay-bottom"]
  ].forEach(([name, legacyClass]) => {
    const panel = document.createElement("div");
    panel.className = `flip-panel flip-panel-${name} ${legacyClass}`;
    gallery.append(panel);
  });

  frame.append(gallery);
  return frame;
};

const mountGallery = (root, images) => {
  root.replaceChildren(
    createSideImage("flip-support-before", "prev"),
    createGallery(),
    createSideImage("flip-support-after", "next")
  );

  const gallery = root.querySelector(".flip-gallery");
  const top = root.querySelector(".flip-overlay-top");
  const bottom = root.querySelector(".flip-overlay-bottom");
  const prevSide = root.querySelector('[data-flip-side="prev"]');
  const nextSide = root.querySelector('[data-flip-side="next"]');
  const frame = root.querySelector(".flip-gallery-frame");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let index = 0;
  let locked = false;
  let timer = 0;
  let pointerStart = null;
  let suppressClick = false;

  const relativeIndex = (offset) => (index + offset + images.length) % images.length;

  const sync = () => {
    const active = images[index];
    const previous = images[relativeIndex(-1)];
    const next = images[relativeIndex(1)];

    gallery.style.setProperty("--active-image", imageUrl(active.src));
    gallery.style.setProperty("--next-image", imageUrl(next.src));
    gallery.style.setProperty("--flip-position", active.position);

    prevSide.src = previous.src;
    prevSide.width = previous.width;
    prevSide.height = previous.height;
    prevSide.style.objectPosition = previous.position;

    nextSide.src = next.src;
    nextSide.width = next.width;
    nextSide.height = next.height;
    nextSide.style.objectPosition = next.position;
  };

  const animatePanels = (reverse) => {
    if (reduceMotion || !top?.animate || !bottom?.animate) return [];

    const topFrames = reverse
      ? [{ transform: "rotateX(-90deg)", opacity: 0 }, { transform: "rotateX(0)", opacity: 1 }]
      : [{ transform: "rotateX(0)", opacity: 1 }, { transform: "rotateX(-90deg)", opacity: 0 }];
    const bottomFrames = reverse
      ? [{ transform: "rotateX(0)", opacity: 1 }, { transform: "rotateX(90deg)", opacity: 0 }]
      : [{ transform: "rotateX(90deg)", opacity: 0 }, { transform: "rotateX(0)", opacity: 1 }];

    return [top.animate(topFrames, motion), bottom.animate(bottomFrames, motion)];
  };

  const go = (step) => {
    if (locked || step === 0) return;

    const nextIndex = (index + step + images.length) % images.length;
    const next = images[nextIndex];
    locked = true;

    gallery.style.setProperty("--next-image", imageUrl(next.src));
    gallery.style.setProperty("--next-position", next.position);

    const animations = animatePanels(step < 0);

    window.setTimeout(() => {
      index = nextIndex;
      sync();
      locked = false;
    }, animations.length ? motion.duration - 60 : 0);
  };

  const restart = () => {
    if (reduceMotion) return;
    window.clearInterval(timer);
    timer = window.setInterval(() => go(1), 3900);
  };

  const pause = () => window.clearInterval(timer);

  sync();
  preloadImages(images);

  if (reduceMotion) return;

  root.addEventListener("click", () => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    go(1);
    restart();
  });
  root.addEventListener("mouseenter", pause);
  root.addEventListener("mouseleave", restart);
  root.addEventListener("focusin", pause);
  root.addEventListener("focusout", restart);
  root.addEventListener("pointerdown", (event) => {
    pointerStart = { x: event.clientX, y: event.clientY };
  });
  root.addEventListener("pointerup", (event) => {
    if (!pointerStart) return;
    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(deltaX) < 34 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    suppressClick = true;
    window.setTimeout(() => { suppressClick = false; }, 120);
    go(deltaX > 0 ? -1 : 1);
    restart();
  });
  frame.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    go(event.key === "ArrowLeft" ? -1 : 1);
    restart();
  });

  restart();
};

export const visionFlipGalleryImages = FLIP_IMAGES;

export const initVisionFlipGallery = (selector = "[data-flip-gallery]") => {
  document.querySelectorAll(selector).forEach((root) => mountGallery(root, FLIP_IMAGES));
};
