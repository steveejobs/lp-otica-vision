"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";


import styles from "./catalog-transition-manager.module.css";

type Rect = { height: number; left: number; top: number; width: number };
type CardSnapshot = Rect & {
  id: string;
  objectPosition: string;
  src: string;
};
type FilterSnapshot = { cards: CardSnapshot[]; gridHeight: number };
type PendingMedia = {
  kind: "collection" | "product" | "return";
  node: HTMLImageElement;
  productId: string | null;
  source: Rect;
};

const RETURN_KEY = "vision:catalog-return";

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function rectOf(element: Element): Rect {
  const rect = element.getBoundingClientRect();
  return { height: rect.height, left: rect.left, top: rect.top, width: rect.width };
}

function mediaIn(element: Element | null) {
  return element?.matches("img")
    ? element as HTMLImageElement
    : element?.querySelector<HTMLImageElement>("[data-catalog-transition-media] img, img") ?? null;
}

function overlayFrom(image: HTMLImageElement, rect: Rect, className: string) {
  const node = document.createElement("img");
  node.alt = "";
  node.className = className;
  node.src = image.currentSrc || image.src;
  node.style.left = `${rect.left}px`;
  node.style.top = `${rect.top}px`;
  node.style.width = `${rect.width}px`;
  node.style.height = `${rect.height}px`;
  node.style.objectPosition = getComputedStyle(image).objectPosition;
  document.body.append(node);
  return node;
}

function captureCards(): FilterSnapshot | null {
  const grid = document.querySelector<HTMLElement>("[data-catalog-results-grid]");
  if (!grid) return null;
  const cards = [...grid.querySelectorAll<HTMLElement>("[data-catalog-product-id]")]
    .map((card): CardSnapshot | null => {
      const image = mediaIn(card);
      if (!image?.currentSrc && !image?.src) return null;
      return {
        ...rectOf(card),
        id: card.dataset.catalogProductId ?? "",
        objectPosition: getComputedStyle(image).objectPosition,
        src: image.currentSrc || image.src,
      };
    })
    .filter((card): card is CardSnapshot => Boolean(card?.id));
  return { cards, gridHeight: grid.getBoundingClientRect().height };
}

export function CatalogTransitionManager() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pendingMediaRef = useRef<PendingMedia | null>(null);
  const filterSnapshotRef = useRef<FilterSnapshot | null>(null);
  const markerRef = useRef<HTMLSpanElement>(null);
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const currentHref = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`;

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const target = event.target as Element | null;
      const returnLink = target?.closest<HTMLElement>("[data-catalog-return-link]");

      if (returnLink) {
        let state: { href: string; productId: string; scrollY: number } | null = null;
        try { state = JSON.parse(sessionStorage.getItem(RETURN_KEY) ?? "null"); } catch { state = null; }
        if (state?.href) {
          event.preventDefault();
          const image = mediaIn(document.querySelector("[data-catalog-product-hero]"));
          if (image && !reducedMotion()) {
            const source = rectOf(image);
            const node = overlayFrom(image, source, styles.sharedMedia);
            pendingMediaRef.current = { kind: "return", node, productId: state.productId, source };
          }
          router.back();
          return;
        }
      }

      const filterLink = target?.closest<HTMLElement>("[data-catalog-filter-link]");
      if (filterLink) filterSnapshotRef.current = captureCards();

      const link = target?.closest<HTMLElement>("[data-catalog-transition-link]");
      if (!link) {
        return;
      }
      const card = link.closest<HTMLElement>("[data-catalog-product-id]");
      const productId = card?.dataset.catalogProductId ?? link.dataset.catalogProductId ?? null;
      if (reducedMotion()) return;
      const collection = link.hasAttribute("data-catalog-collection-link");
      const sourceElement = collection
        ? document.querySelector("[data-catalog-feature-media]")
        : link.querySelector("[data-catalog-transition-media]") ?? card?.querySelector("[data-catalog-transition-media]");
      const image = mediaIn(sourceElement ?? null);
      if (!image) {
        return;
      }
      const source = rectOf(sourceElement ?? image);
      const node = overlayFrom(image, source, styles.sharedMedia);
      pendingMediaRef.current = { kind: collection ? "collection" : "product", node, productId, source };
      node.animate(
        [{ clipPath: "inset(0)" }, { clipPath: "inset(1.5% 1.5% 1.5% 1.5%)" }],
        { duration: 140, easing: "cubic-bezier(.22,.61,.36,1)", fill: "forwards" },
      );

      if (pathname.endsWith("/catalogo") && productId) {
        sessionStorage.setItem(RETURN_KEY, JSON.stringify({
          href: `${pathname}${window.location.search}`,
          productId,
          scrollY: window.scrollY,
        }));
      }
    };

    const onSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement | null;
      if (!form?.matches("[data-catalog-filter-form]")) return;
      event.preventDefault();
      filterSnapshotRef.current = captureCards();
      const query = new URLSearchParams();
      new FormData(form).forEach((value, key) => {
        const clean = String(value).trim();
        if (clean) query.set(key, clean);
      });
      router.push(query.size ? `/catalogo?${query}` : "/catalogo", { scroll: false });
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    const marker = markerRef.current;
    if (marker) marker.dataset.ready = "true";
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      if (marker) delete marker.dataset.ready;
    };
  }, [pathname, router]);

  useEffect(() => {
    if (reducedMotion()) {
      pendingMediaRef.current?.node.remove();
      pendingMediaRef.current = null;
      filterSnapshotRef.current = null;
      return;
    }

    let firstFrame = 0;
    let secondFrame = 0;
    let pendingFrame = 0;
    const resolvePending = (pending: PendingMedia, attempt = 0) => {
      const target = pending.kind === "collection"
        ? document.querySelector("[data-catalog-results-grid] [data-catalog-transition-media]")
        : pending.kind === "product"
          ? document.querySelector(`[data-catalog-product-hero="${pending.productId ?? ""}"]`)
          : document.querySelector(`[data-catalog-product-id="${pending.productId ?? ""}"] [data-catalog-transition-media]`);

      if (!target && attempt < 60) {
        pendingFrame = requestAnimationFrame(() => resolvePending(pending, attempt + 1));
        return;
      }

      if (target) {
        const destination = rectOf(target);
        const dx = destination.left - pending.source.left;
        const dy = destination.top - pending.source.top;
        const sx = destination.width / Math.max(1, pending.source.width);
        const sy = destination.height / Math.max(1, pending.source.height);
        const transition = pending.node.animate(
          [
            { borderRadius: "var(--radius-md)", clipPath: "inset(1.5%)", transform: "translate3d(0,0,0) scale(1)" },
            { borderRadius: "var(--radius-md)", clipPath: "inset(0)", transform: `translate3d(${dx}px,${dy}px,0) scale(${sx},${sy})` },
          ],
          { duration: 360, easing: "cubic-bezier(.76,0,.24,1)", fill: "forwards" },
        );
        transition.finished.finally(() => {
          pending.node.remove();
        });
      } else {
        pending.node.animate(
          [{ clipPath: "inset(0)" }, { clipPath: "inset(0 0 100% 0)" }],
          { duration: 220, easing: "cubic-bezier(.76,0,.24,1)" },
        ).finished.finally(() => {
          pending.node.remove();
        });
      }
      pendingMediaRef.current = null;
    };
    firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        if (pathname.endsWith("/catalogo")) {
          try {
            const state = JSON.parse(sessionStorage.getItem(RETURN_KEY) ?? "null") as { href?: string; scrollY?: number } | null;
            if (state?.href === currentHref && typeof state.scrollY === "number") {
              window.scrollTo({ behavior: "auto", top: state.scrollY });
              sessionStorage.removeItem(RETURN_KEY);
            }
          } catch {
            sessionStorage.removeItem(RETURN_KEY);
          }
        }
        const pending = pendingMediaRef.current;
        if (pending) resolvePending(pending);

        const snapshot = filterSnapshotRef.current;
        const grid = document.querySelector<HTMLElement>("[data-catalog-results-grid]");
        if (snapshot && grid) {
          const layoutAnimations: Animation[] = [];
          const nextCards = new Map(
            [...grid.querySelectorAll<HTMLElement>("[data-catalog-product-id]")]
              .map((card) => [card.dataset.catalogProductId ?? "", card] as const),
          );
          grid.style.minHeight = `${Math.max(snapshot.gridHeight, grid.getBoundingClientRect().height)}px`;
          const previousIds = new Set(snapshot.cards.map((card) => card.id));

          for (const previous of snapshot.cards) {
            const next = nextCards.get(previous.id);
            if (next) {
              const destination = next.getBoundingClientRect();
              layoutAnimations.push(next.animate(
                [
                  { transform: `translate3d(${previous.left - destination.left}px,${previous.top - destination.top}px,0)`, clipPath: "inset(0)" },
                  { transform: "translate3d(0,0,0)", clipPath: "inset(0)" },
                ],
                { duration: 300, easing: "cubic-bezier(.22,.61,.36,1)" },
              ));
            } else {
              const ghost = document.createElement("img");
              ghost.alt = "";
              ghost.className = styles.filterGhost;
              ghost.src = previous.src;
              ghost.style.left = `${previous.left}px`;
              ghost.style.top = `${previous.top}px`;
              ghost.style.width = `${previous.width}px`;
              ghost.style.height = `${previous.height}px`;
              ghost.style.objectPosition = previous.objectPosition;
              document.body.append(ghost);
              ghost.animate(
                [
                  { clipPath: "inset(0)", opacity: 1, transform: "translateY(0)" },
                  { clipPath: "inset(0 0 100% 0)", opacity: .7, transform: "translateY(-8px)" },
                ],
                { duration: 230, easing: "cubic-bezier(.76,0,.24,1)" },
              ).finished.finally(() => ghost.remove());
            }
          }

          let newCardIndex = 0;
          nextCards.forEach((card, id) => {
            if (previousIds.has(id)) return;
            card.classList.add("is-motion-visible");
            const delay = Math.min(newCardIndex, 5) * 56;
            newCardIndex += 1;
            layoutAnimations.push(card.animate(
              [
                { clipPath: "inset(18% 0 0 0)", opacity: 0, transform: "translateY(22px) scale(.985)" },
                { clipPath: "inset(0)", opacity: 1, transform: "translateY(0) scale(1)" },
              ],
              { delay, duration: 480, easing: "cubic-bezier(.22,.61,.36,1)", fill: "both" },
            ));
          });
          void Promise.allSettled(layoutAnimations.map((animation) => animation.finished)).then(() => {
            grid.style.minHeight = "";
          });
          filterSnapshotRef.current = null;
        }

      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      cancelAnimationFrame(pendingFrame);
    };
  }, [currentHref, pathname, routeKey]);

  return <span aria-hidden="true" data-catalog-transition-manager hidden ref={markerRef} />;
}
