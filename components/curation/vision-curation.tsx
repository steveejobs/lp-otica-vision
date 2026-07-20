"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

import { trackCatalogEvent } from "@/lib/analytics/client";
import { catalogImageUrl } from "@/lib/catalog/image-url";
import { ProductWhatsappButton } from "@/components/catalog/product-whatsapp-button";
import { fixtureCurationSelection } from "@/lib/curation/fixtures";
import type { CurationSelection } from "@/lib/curation/types";

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
  const requestRef = useRef<AbortController | null>(null);
  const manualPrimaryPauseUntil = useRef(0);
  const focusTimerRef = useRef<number | null>(null);
  const pendingFocusRef = useRef<string | null>(null);
  const readyImagesRef = useRef(new Set<string>());
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
  const products = selection.products;
  const selectedStyle = selection.styles.find((style) => style.slug === requestedStyle)
    ?? selection.styles.find((style) => style.slug === selection.styleSlug)
    ?? selection.styles[0];
  const activeProduct = products.find((product) => product.id === focusId) ?? products[0];
  const activeWhatsappUrl = activeProduct ? whatsappUrls[activeProduct.id] : undefined;

  useEffect(() => () => {
    requestRef.current?.abort();
    if (focusTimerRef.current) window.clearTimeout(focusTimerRef.current);
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

  useEffect(() => {
    if (selection.products.length < 2 || reducedMotion || !wideScreen || !inViewport || !pageVisible) return;

    const remainingManualHold = manualPrimaryPauseUntil.current - Date.now();
    const delay = Math.max(PRIMARY_AUTOPLAY_MS, remainingManualHold);
    const timeout = window.setTimeout(() => {
      setFocusId((currentId) => {
        const currentIndex = selection.products.findIndex((product) => product.id === currentId);
        const nextId = selection.products[(currentIndex + 1) % selection.products.length]?.id ?? selection.products[0]?.id ?? null;
        return nextId && readyImagesRef.current.has(nextId) ? nextId : currentId;
      });
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [focusId, inViewport, pageVisible, reducedMotion, selection.products, wideScreen]);

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
  }, [analytics, fixtureMode, persistSelection]);

  const changeFocus = useCallback((id: string) => {
    if (id === focusId) return;
    if (focusTimerRef.current) window.clearTimeout(focusTimerRef.current);
    focusTimerRef.current = window.setTimeout(() => {
      if (!readyImagesRef.current.has(id)) {
        pendingFocusRef.current = id;
        return;
      }
      manualPrimaryPauseUntil.current = Date.now() + PRIMARY_MANUAL_HOLD_MS;
      setFocusId(id);
    }, 80);
  }, [focusId]);

  const markImageReady = useCallback((id: string) => {
    readyImagesRef.current.add(id);
    if (pendingFocusRef.current !== id) return;
    pendingFocusRef.current = null;
    manualPrimaryPauseUntil.current = Date.now() + PRIMARY_MANUAL_HOLD_MS;
    setFocusId(id);
  }, []);

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
          {activeProduct ? (
            <article className={styles.feature} data-catalog-product-id={activeProduct.id}>
              <Link
                aria-label={`Abrir ${activeProduct.name}`}
                className={styles.featureLink}
                data-catalog-product-id={activeProduct.id}
                data-catalog-transition-link
                href={demoBasePath
                  ? `${demoBasePath}/produto/${activeProduct.slug}?${queryString(selection.styleSlug, selection.categorySlug)}`
                  : `/catalogo/${activeProduct.slug}?${queryString(selection.styleSlug, selection.categorySlug)}`}
              >
                <span className={styles.featureMedia} data-catalog-feature-media>
                  {products.map((product, index) => {
                    const imageSrc = product.fixture && product.fixtureImageSrc
                      ? product.fixtureImageSrc
                      : catalogImageUrl(product.cover, "product_detail");
                    const selected = product.id === activeProduct.id;
                    return (
                      <span
                        aria-hidden={!selected}
                        className={styles.featureLayer}
                        data-active={selected || undefined}
                        data-catalog-transition-media={selected ? "" : undefined}
                        key={product.id}
                      >
                        <Image
                          alt={selected ? product.cover.altText : ""}
                          fill
                          onLoad={() => markImageReady(product.id)}
                          priority={index === 0}
                          sizes="(max-width: 720px) 92vw, (max-width: 1120px) 56vw, 700px"
                          src={imageSrc}
                          style={{ objectPosition: product.cover.objectPosition }}
                          unoptimized
                        />
                      </span>
                    );
                  })}
                  <span aria-hidden="true" className={styles.featureIndex}>
                    {String(products.findIndex((product) => product.id === activeProduct.id) + 1).padStart(2, "0")}
                    <i />
                    {String(products.length).padStart(2, "0")}
                  </span>
                </span>
                <span className={styles.featureCopy}>
                  <small>{activeProduct.fixture ? "Demonstração visual" : activeProduct.brand?.name ?? "Seleção Vision"}</small>
                  <strong>{activeProduct.name}</strong>
                  <span>{activeProduct.fixture ? `Identificador ${activeProduct.sku}` : [activeProduct.model, activeProduct.color].filter(Boolean).join(" · ")}</span>
                  <b>Abrir modelo <ArrowUpRight aria-hidden="true" size={17} /></b>
                </span>
              </Link>
            </article>
          ) : null}

          <div aria-label="Selecionar produto em destaque" className={styles.productRail}>
            {products.map((product) => {
              const imageSrc = product.fixture && product.fixtureImageSrc
                ? product.fixtureImageSrc
                : catalogImageUrl(product.cover, "home_preview");
              return (
                <button
                  aria-label={`Destacar ${product.name}`}
                  aria-pressed={product.id === activeProduct?.id}
                  className={styles.product}
                  key={product.id}
                  onFocus={() => changeFocus(product.id)}
                  onClick={() => changeFocus(product.id)}
                  onPointerEnter={(event) => {
                    if (event.pointerType === "mouse") changeFocus(product.id);
                  }}
                  type="button"
                >
                  <span className={styles.media}>
                    <Image
                      alt=""
                      fill
                      sizes="(max-width: 720px) 38vw, 170px"
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
                  <span aria-hidden="true" className={styles.selectionMark} />
                </button>
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
              onClick={() => {
                if (analytics) void trackCatalogEvent({ eventName: "catalog_opened", metadata: { source_route: "/", style_slug: selection.styleSlug } });
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
