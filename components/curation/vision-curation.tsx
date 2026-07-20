"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { trackCatalogEvent } from "@/lib/analytics/client";
import { catalogImageUrl } from "@/lib/catalog/image-url";
import { ProductWhatsappButton } from "@/components/catalog/product-whatsapp-button";
import { fixtureCurationSelection } from "@/lib/curation/fixtures";
import type { CurationSelection, CuratedProduct } from "@/lib/curation/types";

import styles from "./vision-curation.module.css";

const SELECTION_KEY = "vision:curation-selection";
const PRIMARY_AUTOPLAY_MS = 5200;
const PRIMARY_MANUAL_HOLD_MS = 7200;

type Props = {
  analytics?: boolean;
  demoBasePath?: string;
  initialSelection: CurationSelection;
  previewLabel?: string;
  productWhatsappUrls?: Readonly<Record<string, string>>;
};

function queryString(styleSlug: string, categorySlug: string | null) {
  const params = new URLSearchParams({ estilo: styleSlug });
  if (categorySlug) params.set("categoria", categorySlug);
  return params.toString();
}

function orderedProducts(products: CuratedProduct[], focusId: string | null) {
  if (!focusId) return products;
  const focused = products.find((product) => product.id === focusId);
  return focused ? [focused, ...products.filter((product) => product.id !== focusId)] : products;
}

function useFixtureMode(demoBasePath?: string) {
  return Boolean(demoBasePath);
}

export function VisionCuration({
  analytics = true,
  demoBasePath,
  initialSelection,
  previewLabel,
  productWhatsappUrls,
}: Props) {
  const fixtureMode = useFixtureMode(demoBasePath);
  const rootRef = useRef<HTMLElement>(null);
  const productRefs = useRef(new Map<string, HTMLElement>());
  const currentRects = useRef(new Map<string, DOMRect>());
  const previousRects = useRef(new Map<string, DOMRect>());
  const requestRef = useRef<AbortController | null>(null);
  const manualPrimaryPauseUntil = useRef(0);
  const hoverDebounceRef = useRef<number | null>(null);
  const activeAnimations = useRef<Animation[]>([]);
  const [selection, setSelection] = useState(initialSelection);
  const [requestedStyle, setRequestedStyle] = useState(initialSelection.styleSlug);
  const [focusId, setFocusId] = useState(initialSelection.products[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [inViewport, setInViewport] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [wideScreen, setWideScreen] = useState(false);
  const [whatsappUrls, setWhatsappUrls] = useState(productWhatsappUrls ?? {});
  const products = useMemo(
    () => orderedProducts(selection.products, focusId),
    [focusId, selection.products],
  );
  const selectedStyle = selection.styles.find((style) => style.slug === requestedStyle)
    ?? selection.styles.find((style) => style.slug === selection.styleSlug)
    ?? selection.styles[0];
  const activeProduct = products[0];
  const activeWhatsappUrl = activeProduct ? whatsappUrls[activeProduct.id] : undefined;

  useEffect(() => () => {
    requestRef.current?.abort();
    if (hoverDebounceRef.current) window.clearTimeout(hoverDebounceRef.current);
  }, []);

  useEffect(() => {
    const element = rootRef.current;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = window.matchMedia("(min-width: 721px)");
    const syncMotionPreference = () => setReducedMotion(media.matches);
    const syncPageVisibility = () => setPageVisible(!document.hidden);
    const syncViewport = () => setWideScreen(desktop.matches);
    syncMotionPreference();
    syncPageVisibility();
    syncViewport();

    const observer = element
      ? new IntersectionObserver(([entry]) => setInViewport(entry?.isIntersecting ?? false), { threshold: 0.2 })
      : null;
    if (element) observer?.observe(element);
    media.addEventListener("change", syncMotionPreference);
    desktop.addEventListener("change", syncViewport);
    document.addEventListener("visibilitychange", syncPageVisibility);

    return () => {
      observer?.disconnect();
      media.removeEventListener("change", syncMotionPreference);
      desktop.removeEventListener("change", syncViewport);
      document.removeEventListener("visibilitychange", syncPageVisibility);
    };
  }, []);

  useLayoutEffect(() => {
    const previousRectsSnapshot = previousRects.current;
    previousRects.current.clear();
    const frame = requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const nextRects = new Map<string, DOMRect>();
      for (const [id, element] of productRefs.current) {
        const next = element.getBoundingClientRect();
        nextRects.set(id, next);
        const previous = previousRectsSnapshot.get(id);
        if (!previous || reduceMotion) continue;
        const deltaX = previous.left - next.left;
        const deltaY = previous.top - next.top;
        const scaleX = previous.width / Math.max(next.width, 1);
        const scaleY = previous.height / Math.max(next.height, 1);
        if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1 && Math.abs(scaleX - 1) < 0.01 && Math.abs(scaleY - 1) < 0.01) continue;
        const anim = element.animate(
          [
            { transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleX}, ${scaleY})` },
            { transform: "translate3d(0, 0, 0) scale(1)" },
          ],
          { duration: 420, easing: "cubic-bezier(.22,.72,.18,1)" },
        );
        activeAnimations.current.push(anim);
      }
      currentRects.current = nextRects;
    });
    return () => cancelAnimationFrame(frame);
  }, [products]);

  const captureRects = useCallback(() => {
    previousRects.current = new Map(currentRects.current);
  }, []);

  useEffect(() => {
    if (selection.products.length < 2 || reducedMotion || !wideScreen || !inViewport || !pageVisible) return;

    const remainingManualHold = manualPrimaryPauseUntil.current - Date.now();
    const delay = Math.max(PRIMARY_AUTOPLAY_MS, remainingManualHold);
    const timeout = window.setTimeout(() => {
      captureRects();
      setFocusId((currentId) => {
        const currentIndex = selection.products.findIndex((product) => product.id === currentId);
        return selection.products[(currentIndex + 1) % selection.products.length]?.id ?? selection.products[0]?.id ?? null;
      });
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [captureRects, focusId, inViewport, pageVisible, reducedMotion, selection.products, wideScreen]);

  const persistSelection = useCallback((next: CurationSelection) => {
    try {
      sessionStorage.setItem(SELECTION_KEY, JSON.stringify({
        categorySlug: next.categorySlug,
        styleSlug: next.styleSlug,
      }));
      if (!fixtureMode && location.pathname === "/") {
        const url = new URL(location.href);
        url.searchParams.set("estilo", next.styleSlug);
        if (next.categorySlug) url.searchParams.set("categoria", next.categorySlug);
        else url.searchParams.delete("categoria");
        history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
      }
    } catch {
      // Shared URL remains the primary state when storage is unavailable.
    }
  }, [fixtureMode]);

  const loadSelection = useCallback(async (styleSlug: string, categorySlug: string | null, eventName: "style_selected" | "category_selected") => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setRequestedStyle(styleSlug);
    setBusy(true);
    setMessage("");

    try {
      const payload = fixtureMode
        ? {
          productWhatsappUrls: {},
          selection: fixtureCurationSelection(styleSlug, categorySlug),
        }
        : await fetch(`/api/curadoria?${queryString(styleSlug, categorySlug)}`, {
          cache: "no-store",
          signal: controller.signal,
        }).then(async (response) => {
          if (!response.ok) throw new Error("curation-request");
          const payload = await response.json() as {
            productWhatsappUrls?: Record<string, string>;
            selection: CurationSelection | null;
          };
          if (!payload.selection) throw new Error("curation-empty");
          return {
            productWhatsappUrls: payload.productWhatsappUrls ?? {},
            selection: payload.selection,
          };
        });
      if (controller.signal.aborted) return;
      const nextSelection = payload.selection;
      captureRects();
      setSelection(nextSelection);
      setWhatsappUrls(payload.productWhatsappUrls ?? {});
      setRequestedStyle(nextSelection.styleSlug);
      setFocusId(nextSelection.products[0]?.id ?? null);
      persistSelection(nextSelection);
      if (analytics) {
        void trackCatalogEvent({
          eventName,
          metadata: eventName === "style_selected" ? { style_slug: nextSelection.styleSlug } : { category_slug: nextSelection.categorySlug ?? "todos" },
        });
      }
    } catch {
      if (!controller.signal.aborted) setMessage("A seleção atual foi mantida. Tente novamente.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }, [analytics, captureRects, fixtureMode, persistSelection]);

  const changeFocus = useCallback((id: string) => {
    if (id === focusId) return;
    if (typeof window !== "undefined" && !window.matchMedia("(min-width: 721px)").matches) return;
    if (hoverDebounceRef.current) window.clearTimeout(hoverDebounceRef.current);
    hoverDebounceRef.current = window.setTimeout(() => {
      // Cancel any in-flight FLIP animations
      for (const anim of activeAnimations.current) {
        try { anim.cancel(); } catch { /* already finished */ }
      }
      activeAnimations.current = [];
      manualPrimaryPauseUntil.current = Date.now() + PRIMARY_MANUAL_HOLD_MS;
      captureRects();
      setFocusId(id);
    }, 120);
  }, [captureRects, focusId]);

  function moveChoice(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    const buttons = [...(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
    const current = buttons.indexOf(event.currentTarget);
    if (current < 0 || !buttons.length) return;
    event.preventDefault();
    const offset = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
    const destination = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (current + offset + buttons.length) % buttons.length;
    buttons[destination]?.focus();
    buttons[destination]?.click();
  }

  const catalogHref = `${demoBasePath ? `${demoBasePath}/catalogo` : "/catalogo"}?${queryString(selection.styleSlug, selection.categorySlug)}`;

  return (
    <section
      aria-labelledby="curation-title"
      aria-busy={busy}
      className={styles.section}
      data-analytics-section={analytics ? "curation_viewed" : undefined}
      data-style={requestedStyle}
      id="curadoria"
      ref={rootRef}
    >
      <div className={styles.inner}>
        <header className={styles.header}>
          <div className={styles.intro}>
            {previewLabel ? <p className={styles.previewLabel}>{previewLabel}</p> : null}
            <h2 id="curation-title">Qual presença você quer construir?</h2>
          </div>
          <p className={styles.support}>Escolha uma direção. A vitrine reorganiza a seleção publicada pela Vision.</p>
        </header>

        <div aria-label="Direções de estilo" className={styles.styleTabs} role="tablist">
          {selection.styles.map((style) => (
            <button
              aria-controls="curation-products"
              aria-selected={requestedStyle === style.slug}
              disabled={busy && requestedStyle === style.slug}
              key={style.id}
              onClick={() => void loadSelection(style.slug, null, "style_selected")}
              onKeyDown={moveChoice}
              role="tab"
              tabIndex={requestedStyle === style.slug ? 0 : -1}
              type="button"
            >
              <span>{style.label}</span>
              <small>{style.description}</small>
            </button>
          ))}
        </div>

        {selection.categories.length ? (
          <div aria-label="Filtrar por categoria" className={styles.categoryFilters} role="radiogroup">
            <button
              aria-checked={!selection.categorySlug}
              onClick={() => void loadSelection(selection.styleSlug, null, "category_selected")}
              onKeyDown={moveChoice}
              role="radio"
              tabIndex={!selection.categorySlug ? 0 : -1}
              type="button"
            >Todos</button>
            {selection.categories.map((category) => (
              <button
                aria-checked={selection.categorySlug === category.slug}
                key={category.id}
                onClick={() => void loadSelection(selection.styleSlug, category.slug, "category_selected")}
                onKeyDown={moveChoice}
                role="radio"
                tabIndex={selection.categorySlug === category.slug ? 0 : -1}
                type="button"
              >{category.label}</button>
            ))}
          </div>
        ) : null}

        <div className={styles.composition} id="curation-products">
          <span aria-hidden="true" className={styles.visionLine} />
          <div className={styles.productRail} data-count={products.length}>
            {products.map((product, index) => {
              const productHref = demoBasePath
                ? `${demoBasePath}/produto/${product.slug}?${queryString(selection.styleSlug, selection.categorySlug)}`
                : `/catalogo/${product.slug}?${queryString(selection.styleSlug, selection.categorySlug)}`;
              const imageSrc = product.fixture && product.fixtureImageSrc
                ? product.fixtureImageSrc
                : catalogImageUrl(product.cover, "home_preview");
              return (
                <article
                  className={styles.product}
                  data-protagonist={product.id === focusId || undefined}
                  key={product.id}
                  onFocus={() => changeFocus(product.id)}
                  onPointerEnter={() => changeFocus(product.id)}
                  ref={(element) => {
                    if (element) productRefs.current.set(product.id, element);
                    else productRefs.current.delete(product.id);
                  }}
                >
                  <Link
                    aria-label={`Abrir ${product.name}`}
                    data-catalog-product-id={product.id}
                    data-catalog-transition-link
                    href={productHref}
                    onClick={(event) => {
                      if (event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
                        event.preventDefault();
                        window.location.assign(productHref);
                      }
                    }}
                  >
                    <span className={styles.media} data-catalog-transition-media>
                      <Image
                        alt={product.cover.altText}
                        blurDataURL={product.cover.blurDataUrl ?? undefined}
                        fill
                        loading={index === 0 ? "eager" : "lazy"}
                        placeholder={product.cover.blurDataUrl ? "blur" : "empty"}
                        priority={index === 0}
                        sizes={index === 0 ? "(max-width: 720px) 82vw, 50vw" : "(max-width: 720px) 82vw, 18vw"}
                        src={imageSrc}
                        style={{ objectPosition: product.cover.objectPosition }}
                        unoptimized
                      />
                    </span>
                    <span className={styles.productCopy}>
                      <small>{product.fixture ? "Demonstração visual" : product.brand?.name ?? "Seleção Vision"}</small>
                      <strong>{product.name}</strong>
                      <span>{product.fixture ? `Identificador ${product.sku}` : [product.model, product.color].filter(Boolean).join(" · ")}</span>
                    </span>
                  </Link>
                </article>
              );
            })}
          </div>
        </div>

        <footer className={styles.footer}>
          <p aria-live="polite">
            <strong>{selection.total}</strong> {selection.total === 1 ? "produto compatível" : "produtos compatíveis"}
            {selectedStyle ? ` com a direção ${selectedStyle.label}` : ""}.
          </p>
          <div className={styles.footerActions}>
            <Link
              data-catalog-collection-link
              data-catalog-transition-link
              href={catalogHref}
              onClick={(event) => {
                if (analytics) void trackCatalogEvent({ eventName: "catalog_opened", metadata: { source_route: "/", style_slug: selection.styleSlug } });
                if (event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
                  event.preventDefault();
                  window.location.assign(catalogHref);
                }
              }}
            >
              Ver seleção completa
              <ArrowUpRight aria-hidden="true" size={18} />
            </Link>
            {activeProduct && activeWhatsappUrl ? (
              <span className={styles.whatsappAction}>
                <ProductWhatsappButton
                  curated
                  href={activeWhatsappUrl}
                  label={`Falar sobre ${activeProduct.name}`}
                  productId={activeProduct.id}
                />
              </span>
            ) : null}
          </div>
        </footer>
        {message ? <p className={styles.message} role="status">{message}</p> : null}
      </div>
    </section>
  );
}
