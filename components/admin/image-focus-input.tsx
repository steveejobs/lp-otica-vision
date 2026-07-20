"use client";

/* eslint-disable @next/next/no-img-element -- previews use local object URLs or short-lived private Storage URLs. */

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import styles from "./admin.module.css";

type Device = "desktop" | "mobile";

type FocusValue = {
  position: string;
  scale: number;
};

type FileInputOptions = {
  id: string;
  name?: string;
  required?: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function positionParts(value: string) {
  const keywords: Record<string, number> = { bottom: 100, center: 50, left: 0, right: 100, top: 0 };
  const [horizontal = "50%", vertical = "50%"] = value.trim().split(/\s+/);
  const parse = (part: string) => keywords[part] ?? clamp(Number.parseInt(part, 10) || 50, 0, 100);
  return [parse(horizontal), parse(vertical)] as const;
}

function focusDescription(position: string) {
  const [horizontal, vertical] = positionParts(position);
  const horizontalLabel = horizontal < 34 ? "à esquerda" : horizontal > 66 ? "à direita" : "ao centro";
  const verticalLabel = vertical < 34 ? "na parte superior" : vertical > 66 ? "na parte inferior" : "na altura central";
  return `Ponto principal ${horizontalLabel}, ${verticalLabel}.`;
}

export function ImageFocusInput({
  alt,
  aspectRatios = { desktop: "16 / 9", mobile: "3 / 4" },
  backgroundColor = "#d7c3ad",
  fileInput,
  initialDesktopPosition = "50% 50%",
  initialDesktopScale = 1,
  initialImageUrl = null,
  initialMobilePosition = "50% 50%",
  initialMobileScale = 1,
  positionNames,
  responsive = true,
  scaleNames,
}: {
  alt: string;
  aspectRatios?: { desktop: string; mobile: string };
  backgroundColor?: string;
  fileInput?: FileInputOptions;
  initialDesktopPosition?: string;
  initialDesktopScale?: number;
  initialImageUrl?: string | null;
  initialMobilePosition?: string;
  initialMobileScale?: number;
  positionNames: { desktop: string; mobile?: string };
  responsive?: boolean;
  scaleNames?: { desktop: string; mobile?: string };
}) {
  const [device, setDevice] = useState<Device>(responsive ? "mobile" : "desktop");
  const [desktop, setDesktop] = useState<FocusValue>({ position: initialDesktopPosition, scale: initialDesktopScale });
  const [mobile, setMobile] = useState<FocusValue>({ position: initialMobilePosition, scale: initialMobileScale });
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl);
  const [fileName, setFileName] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const pointerRef = useRef<number | null>(null);
  const current = responsive && device === "mobile" ? mobile : desktop;
  const [horizontal, vertical] = positionParts(current.position);
  const aspectRatio = responsive && device === "mobile" ? aspectRatios.mobile : aspectRatios.desktop;

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  function updateCurrent(next: Partial<FocusValue>) {
    if (responsive && device === "mobile") {
      setMobile((value) => ({ ...value, ...next }));
    } else {
      setDesktop((value) => ({ ...value, ...next }));
    }
  }

  function setFocusFromPoint(element: HTMLElement, clientX: number, clientY: number) {
    const bounds = element.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const nextHorizontal = Math.round(clamp(((clientX - bounds.left) / bounds.width) * 100, 0, 100));
    const nextVertical = Math.round(clamp(((clientY - bounds.top) / bounds.height) * 100, 0, 100));
    updateCurrent({ position: `${nextHorizontal}% ${nextVertical}%` });
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!previewUrl || imageFailed) return;
    pointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    setFocusFromPoint(event.currentTarget, event.clientX, event.clientY);
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (pointerRef.current !== event.pointerId) return;
    setFocusFromPoint(event.currentTarget, event.clientX, event.clientY);
  }

  function handlePointerEnd(event: PointerEvent<HTMLButtonElement>) {
    if (pointerRef.current === event.pointerId) pointerRef.current = null;
  }

  function handleKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    const step = event.shiftKey ? 10 : 3;
    const movement: Record<string, [number, number]> = {
      ArrowDown: [0, step],
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
    };
    const delta = movement[event.key];
    if (!delta) return;
    event.preventDefault();
    updateCurrent({ position: `${clamp(horizontal + delta[0], 0, 100)}% ${clamp(vertical + delta[1], 0, 100)}%` });
  }

  return (
    <div className={styles.focusEditor}>
      <div className={styles.focusEditorHeader}>
        <div>
          <strong>Escolha o ponto principal da foto</strong>
          <p>Toque no rosto ou na armação. Você também pode arrastar o marcador; a área tracejada indica a zona mais segura.</p>
        </div>
        {responsive ? (
          <div className={styles.previewDeviceSwitch} role="group" aria-label="Formato do enquadramento">
            <button aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")} type="button">Celular</button>
            <button aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")} type="button">Computador</button>
          </div>
        ) : null}
      </div>

      {fileInput ? (
        <label className={styles.friendlyFileInput} htmlFor={fileInput.id}>
          <span>{initialImageUrl ? "Escolher outra imagem" : "Escolher imagem"}</span>
          <small>{fileName || "JPEG, PNG, WebP ou AVIF · até 8 MB"}</small>
          <input
            accept="image/avif,image/jpeg,image/png,image/webp"
            id={fileInput.id}
            name={fileInput.name ?? "file"}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (!file) return;
              if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
              objectUrlRef.current = URL.createObjectURL(file);
              setPreviewUrl(objectUrlRef.current);
              setFileName(file.name);
              setImageFailed(false);
            }}
            required={fileInput.required}
            type="file"
          />
        </label>
      ) : null}

      <div className={styles.focusEditorWorkspace}>
        <button
          aria-label="Definir ponto principal da imagem. Use toque, arraste ou as setas do teclado."
          className={styles.focusStage}
          data-focus-surface
          data-empty={!previewUrl || imageFailed || undefined}
          onKeyDown={handleKeyboard}
          onPointerCancel={handlePointerEnd}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          style={{ aspectRatio, background: backgroundColor }}
          type="button"
        >
          {previewUrl && !imageFailed ? (
            <img
              alt={alt}
              draggable={false}
              onError={() => setImageFailed(true)}
              src={previewUrl}
              style={{ objectPosition: current.position, transform: `scale(${current.scale})`, transformOrigin: current.position }}
            />
          ) : (
            <span>{imageFailed ? "A prévia expirou ou não carregou. Recarregue a página ou escolha a imagem novamente." : "Escolha uma imagem para ajustar o enquadramento."}</span>
          )}
          {previewUrl && !imageFailed ? <><i className={styles.safeArea} aria-hidden="true" /><i className={styles.focusMarker} aria-hidden="true" style={{ left: `${horizontal}%`, top: `${vertical}%` }} /></> : null}
        </button>

        <div className={styles.focusControls}>
          <div>
            <strong>{responsive && device === "mobile" ? "Enquadramento no celular" : "Enquadramento no computador"}</strong>
            <p>{focusDescription(current.position)}</p>
          </div>
          <div className={styles.focusQuickActions}>
            <button className={styles.textButton} onClick={() => updateCurrent({ position: "50% 50%" })} type="button">Centralizar foco</button>
            <button className={styles.textButton} onClick={() => updateCurrent({ position: "50% 35%" })} type="button">Priorizar parte superior</button>
          </div>
          {scaleNames ? (
            <label className={styles.focusRange}>
              <span>Aproximação <output>{Math.round(current.scale * 100)}%</output></span>
              <input max="1.4" min="0.8" onChange={(event) => updateCurrent({ scale: Number(event.currentTarget.value) })} step="0.01" type="range" value={current.scale} />
            </label>
          ) : null}
          <p className={styles.focusKeyboardHint}>No teclado, use as setas. Segure Shift para mover mais rápido.</p>
        </div>
      </div>

      <input name={positionNames.desktop} type="hidden" value={desktop.position} />
      {responsive && positionNames.mobile ? <input name={positionNames.mobile} type="hidden" value={mobile.position} /> : null}
      {scaleNames ? <input name={scaleNames.desktop} type="hidden" value={desktop.scale.toFixed(2)} /> : null}
      {responsive && scaleNames?.mobile ? <input name={scaleNames.mobile} type="hidden" value={mobile.scale.toFixed(2)} /> : null}
    </div>
  );
}
