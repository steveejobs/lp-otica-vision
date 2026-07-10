import fs from 'node:fs';
const path = 'index.html';
let html = fs.readFileSync(path, 'utf8');
if (!html.includes('const images = [') && html.includes('[data-exame-news]')) {
  const galleryScript = `      (() => {
        const root = document.querySelector("[data-flip-gallery]");
        if (!root) return;

        const images = [
          "galeria/6%20(1).jpg",
          "galeria/6%20(2).jpg",
          "galeria/6%20(3).jpg",
          "galeria/1%20(1).jpg",
          "galeria/1%20(2).jpg",
          "galeria/1%20(3).jpg",
          "galeria/2%20(1).jpg",
          "galeria/2%20(2).jpg",
          "galeria/3%20(1).jpg",
          "galeria/7%20(1).jpg",
          "galeria/7%20(2).jpg",
          "galeria/7%20(3).jpg",
          "galeria/8%20(1).jpg",
          "galeria/8%20(4).jpg",
          "galeria/5%20(1).jpg",
          "galeria/4%20(1).jpg",
          "galeria/4%20(2).jpg"
        ];
        const gallery = root.querySelector(".flip-gallery");
        const top = root.querySelector(".flip-overlay-top");
        const bottom = root.querySelector(".flip-overlay-bottom");
        const prevButton = root.querySelector("[data-flip-prev]");
        const nextButton = root.querySelector("[data-flip-next]");
        const prevSide = root.querySelector('[data-flip-side="prev"]');
        const nextSide = root.querySelector('[data-flip-side="next"]');
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const timing = { duration: 720, iterations: 1, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" };
        let index = 0;
        let locked = false;
        let timer = 0;

        const imageUrl = (value) => "url('" + value + "')";
        const relativeIndex = (offset) => (index + offset + images.length) % images.length;
        const sync = () => {
          gallery.style.setProperty("--active-image", imageUrl(images[index]));
          if (prevSide) prevSide.src = images[relativeIndex(-1)];
          if (nextSide) nextSide.src = images[relativeIndex(1)];
        };
        const animatePanels = (reverse) => {
          if (reduceMotion || !top?.animate || !bottom?.animate) return [];
          const topFrames = reverse
            ? [{ transform: "rotateX(-90deg)" }, { transform: "rotateX(-90deg)" }, { transform: "rotateX(0)" }]
            : [{ transform: "rotateX(0)" }, { transform: "rotateX(-90deg)" }, { transform: "rotateX(-90deg)" }];
          const bottomFrames = reverse
            ? [{ transform: "rotateX(0)" }, { transform: "rotateX(90deg)" }, { transform: "rotateX(90deg)" }]
            : [{ transform: "rotateX(90deg)" }, { transform: "rotateX(90deg)" }, { transform: "rotateX(0)" }];
          return [top.animate(topFrames, timing), bottom.animate(bottomFrames, timing)];
        };
        const go = (step) => {
          if (locked) return;
          const next = (index + step + images.length) % images.length;
          locked = true;
          gallery.style.setProperty("--next-image", imageUrl(images[next]));
          const animations = animatePanels(step < 0);
          window.setTimeout(() => {
            index = next;
            sync();
            locked = false;
          }, animations.length ? timing.duration - 80 : 0);
        };
        const restart = () => {
          if (reduceMotion) return;
          window.clearInterval(timer);
          timer = window.setInterval(() => go(1), 4200);
        };

        sync();
        prevButton?.addEventListener("click", () => { go(-1); restart(); });
        nextButton?.addEventListener("click", () => { go(1); restart(); });
        root.addEventListener("mouseenter", () => window.clearInterval(timer));
        root.addEventListener("mouseleave", restart);
        root.addEventListener("focusin", () => window.clearInterval(timer));
        root.addEventListener("focusout", restart);
        restart();
      })();

`;
  const newsRoot = '        const root = document.querySelector("[data-exame-news]");';
  const rootIndex = html.indexOf(newsRoot);
  const insertIndex = html.lastIndexOf('      (() => {', rootIndex);
  if (insertIndex < 0) throw new Error('news script marker not found');
  html = html.slice(0, insertIndex) + galleryScript + html.slice(insertIndex);
}
if (!html.includes('const images = [') || !html.includes('video%20(4).mp4')) throw new Error('gallery script insertion failed');
fs.writeFileSync(path, html);