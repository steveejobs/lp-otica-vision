"use client";

/* eslint-disable @next/next/no-img-element -- private short-lived Storage URLs are not Next image sources. */

import { useState } from "react";

import type { GalleryLocation } from "@/lib/admin/gallery-locations";

import styles from "./admin.module.css";

export type GalleryPreviewItem = {
  altText: string;
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
  visualSeries: string | null;
  width: number | null;
};

type PreviewDevice = "desktop" | "mobile";

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

  return (
    <section className={styles.galleryPreviewPanel} aria-labelledby="gallery-preview-title">
      <div className={styles.panelHeading}>
        <div>
          <h3 id="gallery-preview-title">Prévia real do enquadramento</h3>
          <p>{location ? `${location.pageLabel} › ${location.sectionLabel} · ${location.component}` : "Defina a localização para carregar a proporção pública."}</p>
        </div>
        <div className={styles.previewDeviceSwitch} role="group" aria-label="Dispositivo da prévia">
          <button aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")} type="button">Mobile 390×844</button>
          <button aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")} type="button">Desktop 1440×900</button>
        </div>
      </div>

      <div className={styles.previewWorkspace} data-device={device}>
        <div className={styles.previewSequence}>
          {showContext ? <PreviewFrame item={previous} position={device === "desktop" ? previous.desktopObjectPosition : previous.mobileObjectPosition} ratio={aspectRatio} context="previous" /> : null}
          {location?.key === "home.hero" ? <HeroPreviewFrame device={device} item={active} position={position} ratio={aspectRatio} scale={scale} /> : <PreviewFrame item={active} position={position} ratio={aspectRatio} context="active" />}
          {showContext ? <PreviewFrame item={next} position={device === "desktop" ? next.desktopObjectPosition : next.mobileObjectPosition} ratio={aspectRatio} context="next" /> : null}
        </div>
        <div className={styles.cropControls}>
          <p><strong>{activeIndex + 1} de {items.length}</strong>{active.visualSeries ? ` · Série ${active.visualSeries} · posição ${active.seriesOrder ?? "?"}` : " · Item independente"}</p>
          <label><span>Posição horizontal <output>{horizontal}%</output></span><input aria-label="Posição horizontal" max="100" min="0" onChange={(event) => changePosition("horizontal", Number(event.target.value))} type="range" value={horizontal} /></label>
          <label><span>Posição vertical <output>{vertical}%</output></span><input aria-label="Posição vertical" max="100" min="0" onChange={(event) => changePosition("vertical", Number(event.target.value))} type="range" value={vertical} /></label>
          <label><span>Escala <output>{scale.toFixed(2)}×</output></span><input aria-label="Escala" max="1.4" min="0.8" onChange={(event) => onScaleChange(active.id, device, Number(event.target.value))} step="0.01" type="range" value={scale} /></label>
          <p className={styles.fieldHint}>Valor salvo para {device === "desktop" ? "desktop" : "mobile"}: {position}</p>
          {warnings.length ? <ul className={styles.previewWarnings}>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : <p className={styles.previewReady}>Enquadramento sem alertas automáticos.</p>}
        </div>
      </div>

      <div className={styles.previewItemRail} aria-label="Ordem real da galeria">
        {items.map((item, index) => <button aria-pressed={item.id === active.id} key={item.id} onClick={() => onActiveChange(item.id)} type="button"><span>{index + 1}</span>{item.signedUrl ? <img alt="" src={item.signedUrl} style={{ objectPosition: device === "desktop" ? item.desktopObjectPosition : item.mobileObjectPosition }} /> : null}</button>)}
      </div>
    </section>
  );
}

function HeroPreviewFrame({ item, position, ratio, scale, device }: { item: GalleryPreviewItem; position: string; ratio: string; scale: number; device: PreviewDevice }) {
  return (
    <figure className={styles.heroPreview} data-device={device} style={{ aspectRatio: ratio, background: item.backgroundColor ?? "#d7c3ad" }}>
      <span className={styles.heroPreviewBrand}>VISION</span>
      <span className={styles.heroPreviewPhoto}>{item.signedUrl ? <img alt={item.altText} src={item.signedUrl} style={{ objectPosition: position, transform: `scale(${scale})`, transformOrigin: position }} /> : null}<span className={styles.safeArea} aria-hidden="true" /></span>
      <strong><span>Seleção Vision.</span><span>Marcas com presença.</span></strong>
      <span className={styles.heroPreviewActions}>CATÁLOGO&nbsp;&nbsp;&nbsp; WHATSAPP</span>
    </figure>
  );
}

function PreviewFrame({ item, position, ratio, context }: { item: GalleryPreviewItem; position: string; ratio: string; context: "active" | "next" | "previous" }) {
  return (
    <figure className={styles.previewFrame} data-context={context} style={{ aspectRatio: ratio }}>
      {item.signedUrl ? <img alt={context === "active" ? item.altText : ""} src={item.signedUrl} style={{ objectPosition: position }} /> : <span>Prévia indisponível</span>}
      {context === "active" ? <span className={styles.safeArea} aria-hidden="true" /> : null}
    </figure>
  );
}
