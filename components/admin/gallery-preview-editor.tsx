"use client";

/* eslint-disable @next/next/no-img-element -- private short-lived Storage URLs are not Next image sources. */

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import type { GalleryLocation } from "@/lib/admin/gallery-locations";

import { BrandLogo } from "@/components/brand-logo";

import styles from "./admin.module.css";

export type GalleryPreviewItem = {
  altText: string;
  activeInPublication: boolean;
  assetStatus: string;
  backgroundColor: string | null;
  desktopObjectPosition: string;
  desktopScale: number;
  editorialRole: "primary" | "secondary" | "detail";
  height: number | null;
  id: string;
  mobileObjectPosition: string;
  mobileScale: number;
  published: boolean;
  seriesOrder: number | null;
  signedUrl: string | null;
  updatedAt: string | null;
  visualSeries: string | null;
  width: number | null;
};

type PreviewDevice = "desktop" | "mobile";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function positionParts(value: string) {
  const keyword: Record<string, number> = { bottom: 100, center: 50, left: 0, right: 100, top: 0 };
  const [horizontal = "50%", vertical = "50%"] = value.split(/\s+/);
  const parse = (part: string) => keyword[part] ?? (Number.parseInt(part, 10) || 50);
  return [parse(horizontal), parse(vertical)] as const;
}

function hasBrokenSeries(items: GalleryPreviewItem[]) {
  const seen = new Set<string>();
  let current: string | null = null;
  const orders = new Map<string, number[]>();

  for (const item of items) {
    if (!item.visualSeries) {
      current = null;
      continue;
    }
    if (current !== item.visualSeries && seen.has(item.visualSeries)) return true;
    current = item.visualSeries;
    seen.add(item.visualSeries);
    const seriesOrders = orders.get(item.visualSeries) ?? [];
    if (item.seriesOrder === null) return true;
    seriesOrders.push(item.seriesOrder);
    orders.set(item.visualSeries, seriesOrders);
  }

  return [...orders.values()].some((values) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted.some((value, index) => index > 0 && value !== sorted[index - 1] + 1);
  });
}

export function GalleryPreviewEditor({
  activeId,
  items,
  location,
  onActiveChange,
  onPositionChange,
  onScaleChange,
}: {
  activeId: string;
  items: GalleryPreviewItem[];
  location: GalleryLocation | null;
  onActiveChange: (id: string) => void;
  onPositionChange: (id: string, device: PreviewDevice, value: string) => void;
  onScaleChange: (id: string, device: PreviewDevice, value: number) => void;
}) {
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const pointerRef = useRef<number | null>(null);
  const activeIndex = Math.max(0, items.findIndex((item) => item.id === activeId));
  const active = items[activeIndex];
  const previous = items[(activeIndex - 1 + items.length) % items.length];
  const next = items[(activeIndex + 1) % items.length];
  const position = device === "desktop" ? active.desktopObjectPosition : active.mobileObjectPosition;
  const scale = device === "desktop" ? active.desktopScale : active.mobileScale;
  const [horizontal, vertical] = positionParts(position);
  const aspectRatio = location
    ? device === "desktop" ? location.preview.desktopAspectRatio : location.preview.mobileAspectRatio
    : "3 / 4";
  const showContext = Boolean(location?.preview.surroundingItems && items.length > 1);
  const targetWidth = device === "desktop" ? 600 : 360;
  const ratioParts = aspectRatio.split("/").map((part) => Number(part.trim()));
  const targetHeight = ratioParts.length === 2 && ratioParts[0] > 0
    ? Math.round(targetWidth * ratioParts[1] / ratioParts[0])
    : Math.round(targetWidth * 4 / 3);
  const lowResolution = !active.width || !active.height || active.width < targetWidth || active.height < targetHeight;
  const nearEdge = horizontal < 16 || horizontal > 84 || vertical < 16 || vertical > 84;
  const seriesBroken = hasBrokenSeries(items);
  const warnings = [
    ...(!location ? ["Galeria sem localização pública definida."] : []),
    ...(!active.altText.trim() ? ["Item sem texto alternativo."] : []),
    ...(lowResolution ? ["A imagem pode não preencher esta proporção com nitidez suficiente."] : []),
    ...(nearEdge ? ["O ponto focal está próximo da borda; confira se rosto, olhos e armação permanecem na zona segura."] : []),
    ...(seriesBroken ? ["A série visual está fragmentada ou fora da ordem interna."] : []),
  ];

  const changePosition = (axis: "horizontal" | "vertical", value: number) => {
    const nextHorizontal = axis === "horizontal" ? value : horizontal;
    const nextVertical = axis === "vertical" ? value : vertical;
    onPositionChange(active.id, device, `${nextHorizontal}% ${nextVertical}%`);
  };

  const setFocusFromPoint = (element: HTMLElement, clientX: number, clientY: number) => {
    const bounds = element.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const nextHorizontal = Math.round(clamp(((clientX - bounds.left) / bounds.width) * 100, 0, 100));
    const nextVertical = Math.round(clamp(((clientY - bounds.top) / bounds.height) * 100, 0, 100));
    onPositionChange(active.id, device, `${nextHorizontal}% ${nextVertical}%`);
  };

  const pointerHandlers = {
    onPointerCancel: (event: PointerEvent<HTMLElement>) => {
      if (pointerRef.current === event.pointerId) pointerRef.current = null;
    },
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      pointerRef.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      setFocusFromPoint(event.currentTarget, event.clientX, event.clientY);
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (pointerRef.current !== event.pointerId) return;
      setFocusFromPoint(event.currentTarget, event.clientX, event.clientY);
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      if (pointerRef.current === event.pointerId) pointerRef.current = null;
    },
  };

  const handleKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    const step = event.shiftKey ? 10 : 3;
    const movement: Record<string, [number, number]> = {
      ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step],
    };
    const delta = movement[event.key];
    if (!delta) return;
    event.preventDefault();
    onPositionChange(active.id, device, `${clamp(horizontal + delta[0], 0, 100)}% ${clamp(vertical + delta[1], 0, 100)}%`);
  };

  return (
    <section className={styles.galleryPreviewPanel} aria-labelledby="gallery-preview-title">
      <div className={styles.panelHeading}>
        <div>
          <h3 id="gallery-preview-title">Enquadramento da imagem</h3>
          <p>{location ? `${location.label} · mesma proporção usada na página.` : "Defina onde a galeria aparece para carregar o formato correto."}</p>
        </div>
        <div className={styles.previewDeviceSwitch} role="group" aria-label="Dispositivo da prévia">
          <button aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")} type="button">Celular</button>
          <button aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")} type="button">Computador</button>
        </div>
      </div>

      <div className={styles.previewWorkspace} data-device={device}>
        <div className={styles.previewSequence}>
          {showContext ? <PreviewFrame backgroundColor={previous.backgroundColor} item={previous} position={device === "desktop" ? previous.desktopObjectPosition : previous.mobileObjectPosition} ratio={aspectRatio} scale={device === "desktop" ? previous.desktopScale : previous.mobileScale} context="previous" /> : null}
          {location?.key === "home.hero" ? <HeroPreviewFrame device={device} item={active} onKeyDown={handleKeyboard} pointerHandlers={pointerHandlers} position={position} ratio={aspectRatio} scale={scale} /> : <PreviewFrame backgroundColor={active.backgroundColor} item={active} onKeyDown={handleKeyboard} pointerHandlers={pointerHandlers} position={position} ratio={aspectRatio} scale={scale} context="active" />}
          {showContext ? <PreviewFrame backgroundColor={next.backgroundColor} item={next} position={device === "desktop" ? next.desktopObjectPosition : next.mobileObjectPosition} ratio={aspectRatio} scale={device === "desktop" ? next.desktopScale : next.mobileScale} context="next" /> : null}
        </div>
        <div className={styles.cropControls}>
          <p><strong>Imagem {activeIndex + 1} de {items.length}</strong> · {device === "desktop" ? "computador" : "celular"}</p>
          <p className={styles.focusInstruction}>Toque no rosto ou na armação, ou arraste o marcador sobre a imagem.</p>
          <label><span>Foco para os lados <output>{horizontal}%</output></span><input aria-label="Mover foco para os lados" max="100" min="0" onChange={(event) => changePosition("horizontal", Number(event.target.value))} type="range" value={horizontal} /></label>
          <label><span>Foco para cima ou para baixo <output>{vertical}%</output></span><input aria-label="Mover foco para cima ou para baixo" max="100" min="0" onChange={(event) => changePosition("vertical", Number(event.target.value))} type="range" value={vertical} /></label>
          <label><span>Aproximação <output>{Math.round(scale * 100)}%</output></span><input aria-label="Aproximação da imagem" max="1.4" min="0.8" onChange={(event) => onScaleChange(active.id, device, Number(event.target.value))} step="0.01" type="range" value={scale} /></label>
          <div className={styles.focusQuickActions}><button className={styles.textButton} onClick={() => onPositionChange(active.id, device, "50% 50%")} type="button">Centralizar foco</button><button className={styles.textButton} onClick={() => onPositionChange(active.id, device, "50% 35%")} type="button">Priorizar parte superior</button></div>
          <p className={styles.fieldHint}>Este ajuste ainda precisa ser salvo. Use o botão “Salvar enquadramento” logo abaixo da prévia.</p>
          {warnings.length ? <ul className={styles.previewWarnings}>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : <p className={styles.previewReady}>Enquadramento sem alertas automáticos.</p>}
        </div>
      </div>

      <div className={styles.previewItemRail} aria-label="Ordem real da galeria">
        {items.map((item, index) => <button aria-pressed={item.id === active.id} key={item.id} onClick={() => onActiveChange(item.id)} type="button"><span>{index + 1}</span>{item.signedUrl ? <img alt="" src={item.signedUrl} style={{ objectPosition: device === "desktop" ? item.desktopObjectPosition : item.mobileObjectPosition }} /> : null}</button>)}
      </div>
    </section>
  );
}

function HeroPreviewFrame({ item, position, ratio, scale, device, onKeyDown, pointerHandlers }: { item: GalleryPreviewItem; position: string; ratio: string; scale: number; device: PreviewDevice; onKeyDown: (event: KeyboardEvent<HTMLElement>) => void; pointerHandlers: Record<string, (event: PointerEvent<HTMLElement>) => void> }) {
  return (
    <figure aria-label="Ajustar ponto principal da imagem" className={styles.heroPreview} data-device={device} onKeyDown={onKeyDown} role="button" style={{ aspectRatio: ratio, background: item.backgroundColor ?? "#d7c3ad" }} tabIndex={0}>
      <span className={styles.heroPreviewCopy}>
        <BrandLogo size="header" />
        <strong>Armações que dão forma à sua presença.</strong>
        <em>Armações nacionais e importadas, com lentes confeccionadas pela Vision em Araguaína.</em>
        <span className={styles.heroPreviewActions}><span>Catálogo</span><span>WhatsApp</span></span>
      </span>
      <span className={`${styles.heroPreviewPhoto} ${styles.focusablePreview}`} data-focus-surface {...pointerHandlers}>{item.signedUrl ? <img alt={item.altText} draggable={false} src={item.signedUrl} style={{ objectPosition: position, transform: `scale(${scale})`, transformOrigin: position }} /> : null}<span className={styles.safeArea} aria-hidden="true" /><i className={styles.focusMarker} aria-hidden="true" style={{ left: `${positionParts(position)[0]}%`, top: `${positionParts(position)[1]}%` }} /></span>
    </figure>
  );
}

function PreviewFrame({ item, position, ratio, scale, context, backgroundColor, onKeyDown, pointerHandlers }: { item: GalleryPreviewItem; position: string; ratio: string; scale: number; context: "active" | "next" | "previous"; backgroundColor?: string | null; onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void; pointerHandlers?: Record<string, (event: PointerEvent<HTMLElement>) => void> }) {
  const interactive = context === "active";
  return (
    <figure aria-label={interactive ? "Ajustar ponto principal da imagem" : undefined} className={`${styles.previewFrame} ${interactive ? styles.focusablePreview : ""}`} data-context={context} data-focus-surface={interactive || undefined} onKeyDown={onKeyDown} role={interactive ? "button" : undefined} style={{ aspectRatio: ratio, background: backgroundColor ?? "#ddd4ca" }} tabIndex={interactive ? 0 : undefined} {...pointerHandlers}>
      {item.signedUrl ? <img alt={interactive ? item.altText : ""} draggable={false} src={item.signedUrl} style={{ objectPosition: position, transform: `scale(${scale})`, transformOrigin: position }} /> : <span>Prévia indisponível. Recarregue a página para renovar o acesso à imagem.</span>}
      {interactive ? <><span className={styles.safeArea} aria-hidden="true" /><i className={styles.focusMarker} aria-hidden="true" style={{ left: `${positionParts(position)[0]}%`, top: `${positionParts(position)[1]}%` }} /></> : null}
    </figure>
  );
}
