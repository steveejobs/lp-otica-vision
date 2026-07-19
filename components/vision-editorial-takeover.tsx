"use client";

import { BookOpenText, MessageCircle } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type Ref,
} from "react";

import { LINKS } from "@/lib/links";

import { VisionButton } from "./vision-button";
import styles from "./vision-editorial-takeover.module.css";

type WallMedia = {
  alt: string;
  desktopScale: number;
  desktopObjectPosition: string;
  height: number;
  id: string;
  mobileObjectPosition: string;
  mobileScale: number;
  mobileSrc?: string;
  src: string;
  width: number;
};

type Props = { media: readonly WallMedia[] };
type TransitionPhase = "idle" | "preparing" | "transitioning" | "committing";
type FieldLayout = "open" | "offset" | "narrow";

const HOLD_MS = 3_300;
const CUT_DURATION_MS = 1_080;
const layouts: readonly FieldLayout[] = ["offset", "narrow", "open"];
const desktopLinePosition: Record<FieldLayout, number> = { open: 5, offset: 11, narrow: 18 };
const mobileLinePosition: Record<FieldLayout, number> = { open: 4, offset: 8, narrow: 13 };

function atIndex(index: number, length: number) {
  return (index + length) % length;
}

function findNextIndex(
  activeIndex: number,
  media: readonly WallMedia[],
  failedMediaIds: ReadonlySet<string>,
) {
  for (let offset = 1; offset < media.length; offset += 1) {
    const candidateIndex = atIndex(activeIndex + offset, media.length);
    if (!failedMediaIds.has(media[candidateIndex].id)) return candidateIndex;
  }
  return null;
}

function sourceForViewport(item: WallMedia, compactViewport: boolean) {
  return compactViewport && item.mobileSrc ? item.mobileSrc : item.src;
}

function loadAndDecode(src: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = async () => {
      try {
        await image.decode?.();
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error(`Falha ao carregar a pr\u00f3xima imagem da hero: ${src}`));
    image.src = src;
  });
}

function desktopCutPath(upper: number, lower: number) {
  return `polygon(${upper}% 0, 100.5% 0, 100.5% 100%, ${lower}% 100%, ${lower}% 54%, ${upper}% 54%)`;
}

function mobileCutPath(upper: number, lower: number) {
  return `polygon(0 ${upper}%, 58% ${upper}%, 58% ${lower}%, 100% ${lower}%, 100% 100.5%, 0 100.5%)`;
}

/** One current medium at rest; one decoded incoming medium joins only for the cut. */
export function VisionEditorialTakeover({ media }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const outgoingRef = useRef<HTMLElement>(null);
  const paperPlaneRef = useRef<HTMLSpanElement>(null);
  const cutUpperRef = useRef<HTMLSpanElement>(null);
  const cutStepRef = useRef<HTMLSpanElement>(null);
  const cutLowerRef = useRef<HTMLSpanElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const preparationFrame = useRef<number | null>(null);
  const animationsRef = useRef<Animation[]>([]);
  const transitionRunRef = useRef(0);
  const decodedSourcesRef = useRef(new Set<string>());
  const pendingManualAdvanceRef = useRef(false);
  const previousCompactViewportRef = useRef<boolean | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null);
  const [nextReadySrc, setNextReadySrc] = useState<string | null>(null);
  const [failedMediaIds, setFailedMediaIds] = useState<ReadonlySet<string>>(() => new Set());
  const [inViewport, setInViewport] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [compactViewport, setCompactViewport] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 720px)").matches,
  );
  const [phase, setPhase] = useState<TransitionPhase>("idle");

  const active = media[activeIndex];
  const nextIndex = media.length > 1
    ? findNextIndex(activeIndex, media, failedMediaIds)
    : null;
  const next = nextIndex === null ? null : media[nextIndex];
  const nextSource = next ? sourceForViewport(next, compactViewport) : null;
  const incoming = incomingIndex === null ? null : media[incomingIndex];
  const motionEnabled = Boolean(next) && inViewport && isVisible && !reducedMotion;
  const layout = layouts[activeIndex % layouts.length];
  const nextLayout = nextIndex === null ? layout : layouts[nextIndex % layouts.length];

  const cancelTransition = useCallback(() => {
    transitionRunRef.current += 1;
    animationsRef.current.forEach((animation) => animation.cancel());
    animationsRef.current = [];
    pendingManualAdvanceRef.current = false;
    setIncomingIndex(null);
    setPhase((currentPhase) => currentPhase === "idle" ? currentPhase : "committing");
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compactQuery = window.matchMedia("(max-width: 720px)");
    const observer = new IntersectionObserver(
      ([entry]) => setInViewport(Boolean(entry?.isIntersecting)),
      { threshold: 0.12 },
    );
    const syncVisibility = () => setIsVisible(document.visibilityState === "visible");
    const syncMotion = () => setReducedMotion(motionQuery.matches);
    const syncCompactViewport = () => setCompactViewport(compactQuery.matches);

    observer.observe(root);
    syncVisibility();
    syncMotion();
    syncCompactViewport();
    document.addEventListener("visibilitychange", syncVisibility);
    motionQuery.addEventListener("change", syncMotion);
    compactQuery.addEventListener("change", syncCompactViewport);
    return () => {
      transitionRunRef.current += 1;
      animationsRef.current.forEach((animation) => animation.cancel());
      animationsRef.current = [];
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncVisibility);
      motionQuery.removeEventListener("change", syncMotion);
      compactQuery.removeEventListener("change", syncCompactViewport);
    };
  }, []);

  useEffect(() => {
    animationsRef.current.forEach((animation) => {
      if (isVisible && inViewport) animation.play();
      else animation.pause();
    });
  }, [inViewport, isVisible]);

  useEffect(() => {
    const previous = previousCompactViewportRef.current;
    previousCompactViewportRef.current = compactViewport;
    if (previous !== null && previous !== compactViewport && phase !== "idle") cancelTransition();
  }, [cancelTransition, compactViewport, phase]);

  useEffect(() => {
    if (!reducedMotion || phase !== "transitioning") return;
    animationsRef.current.forEach((animation) => animation.finish());
  }, [phase, reducedMotion]);

  useEffect(() => {
    if (!next || !nextSource || !inViewport || !isVisible) return;

    if (decodedSourcesRef.current.has(nextSource)) {
      setNextReadySrc(nextSource);
      return;
    }

    let cancelled = false;
    setNextReadySrc((readySource) => readySource === nextSource ? readySource : null);
    void loadAndDecode(nextSource)
      .then(() => {
        if (cancelled) return;
        decodedSourcesRef.current.add(nextSource);
        setNextReadySrc(nextSource);
      })
      .catch(() => {
        if (cancelled) return;
        pendingManualAdvanceRef.current = false;
        setNextReadySrc(null);
        setFailedMediaIds((current) => new Set(current).add(next.id));
      });

    return () => {
      cancelled = true;
    };
  }, [inViewport, isVisible, next, nextSource]);

  const requestAdvance = useCallback((manual = false) => {
    if (!next || nextIndex === null || phase !== "idle") return;
    if (nextReadySrc !== nextSource) {
      pendingManualAdvanceRef.current = manual;
      return;
    }

    pendingManualAdvanceRef.current = false;
    if (reducedMotion) {
      setActiveIndex(nextIndex);
      return;
    }

    setIncomingIndex(nextIndex);
    setPhase("preparing");
  }, [next, nextIndex, nextReadySrc, nextSource, phase, reducedMotion]);

  useEffect(() => {
    if (!pendingManualAdvanceRef.current || nextReadySrc !== nextSource || phase !== "idle") return;
    requestAdvance(true);
  }, [nextReadySrc, nextSource, phase, requestAdvance]);

  useEffect(() => {
    if (!motionEnabled || phase !== "idle" || nextReadySrc !== nextSource) return;
    const dwellTimer = window.setTimeout(() => requestAdvance(), HOLD_MS);
    return () => window.clearTimeout(dwellTimer);
  }, [motionEnabled, nextReadySrc, nextSource, phase, requestAdvance]);

  useEffect(() => {
    if (phase !== "preparing" || incomingIndex === null) return;

    preparationFrame.current = window.requestAnimationFrame(() => {
      const outgoing = outgoingRef.current;
      const paperPlane = paperPlaneRef.current;
      const upper = cutUpperRef.current;
      const step = cutStepRef.current;
      const lower = cutLowerRef.current;
      if (!outgoing || !paperPlane || !upper || !step || !lower || !outgoing.animate) {
        setPhase("committing");
        setActiveIndex(incomingIndex);
        setIncomingIndex(null);
        return;
      }

      const runId = transitionRunRef.current + 1;
      transitionRunRef.current = runId;
      const start = compactViewport ? mobileLinePosition[layout] : desktopLinePosition[layout];
      const destination = compactViewport ? mobileLinePosition[nextLayout] : desktopLinePosition[nextLayout];
      const fieldRect = outgoing.getBoundingClientRect();
      const easing = "cubic-bezier(0.72, 0, 0.18, 1)";
      const timing: KeyframeAnimationOptions = { duration: CUT_DURATION_MS, easing, fill: "forwards" };
      const activeKeyframes: Keyframe[] = compactViewport
        ? [
          { clipPath: mobileCutPath(start, start), offset: 0 },
          { clipPath: mobileCutPath(start + 3, start), offset: 0.14 },
          { clipPath: mobileCutPath(56, 47), offset: 0.56 },
          { clipPath: mobileCutPath(96, 90), offset: 0.9 },
          { clipPath: mobileCutPath(100.5, 100.5), offset: 1 },
        ]
        : [
          { clipPath: desktopCutPath(start, start), offset: 0 },
          { clipPath: desktopCutPath(start + 3, start), offset: 0.14 },
          { clipPath: desktopCutPath(57, 48), offset: 0.56 },
          { clipPath: desktopCutPath(96, 90), offset: 0.9 },
          { clipPath: desktopCutPath(100.5, 100.5), offset: 1 },
        ];
      const upperPercentages = compactViewport
        ? [start, start + 3, 56, 96, 100.5]
        : [start, start + 3, 57, 96, 100.5];
      const lowerPercentages = compactViewport
        ? [start, start, 47, 90, 100.5]
        : [start, start, 48, 90, 100.5];
      const stepSizes = [0, 3, 9, 6, 0];
      const offsets = [0, 0.14, 0.56, 0.9, 1];
      const lineOpacity = [1, 1, 1, 1, 0];
      const positionFrames = (percentages: number[]) => percentages.map((percentage, index) => ({
        offset: offsets[index],
        opacity: lineOpacity[index],
        transform: compactViewport
          ? `translate3d(0, ${((percentage - start) / 100) * fieldRect.height}px, 0)`
          : `translate3d(${((percentage - start) / 100) * fieldRect.width}px, 0, 0)`,
      }));
      const stepFrames = lowerPercentages.map((percentage, index) => ({
        offset: offsets[index],
        opacity: lineOpacity[index],
        transform: compactViewport
          ? `translate3d(0, ${((percentage - start) / 100) * fieldRect.height}px, 0) scaleY(${stepSizes[index] / 9})`
          : `translate3d(${((percentage - start) / 100) * fieldRect.width}px, 0, 0) scaleX(${stepSizes[index] / 9})`,
      }));
      const planeFrames = compactViewport
        ? [
          { clipPath: `inset(0 0 ${100 - start}% 0)` },
          { clipPath: `inset(0 0 ${100 - destination}% 0)` },
        ]
        : [
          { clipPath: `inset(0 ${100 - start}% 0 0)` },
          { clipPath: `inset(0 ${100 - destination}% 0 0)` },
        ];

      setPhase("transitioning");
      const animations = [
        outgoing.animate(activeKeyframes, timing),
        paperPlane.animate(planeFrames, { duration: 430, easing: "cubic-bezier(0.45, 0, 0.2, 1)", fill: "forwards" }),
        upper.animate(positionFrames(upperPercentages), timing),
        lower.animate(positionFrames(lowerPercentages), timing),
        step.animate(stepFrames, timing),
      ];
      animationsRef.current = animations;

      void Promise.all(animations.map((animation) => animation.finished))
        .then(() => {
          if (transitionRunRef.current !== runId) return;
          animationsRef.current = [];
          animations.forEach((animation) => animation.cancel());
          setPhase("committing");
          setActiveIndex(incomingIndex);
          setIncomingIndex(null);
        })
        .catch(() => {
          // Cancellation is handled by cancelTransition and component cleanup.
        });
    });

    return () => {
      if (preparationFrame.current !== null) window.cancelAnimationFrame(preparationFrame.current);
      preparationFrame.current = null;
    };
  }, [compactViewport, incomingIndex, layout, nextLayout, phase]);

  useEffect(() => {
    if (phase !== "committing") return;
    preparationFrame.current = window.requestAnimationFrame(() => setPhase("idle"));
    return () => {
      if (preparationFrame.current !== null) window.cancelAnimationFrame(preparationFrame.current);
      preparationFrame.current = null;
    };
  }, [phase]);

  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerStart.current = { x: event.clientX, y: event.clientY };
  }, []);

  const onPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const x = event.clientX - start.x;
    const y = event.clientY - start.y;
    if (x < -54 && Math.abs(x) > Math.abs(y) * 1.45) requestAdvance(true);
  }, [requestAdvance]);

  if (!active) return null;

  return (
    <section className={styles.stage} id="hero" ref={rootRef} aria-labelledby="hero-title">
      <div className={styles.copyField}>
        <div className={styles.copy}>
          <h1 id="hero-title">{"Arma\u00e7\u00f5es que d\u00e3o forma \u00e0 sua presen\u00e7a."}</h1>
          <p>{"Arma\u00e7\u00f5es nacionais e importadas, com lentes confeccionadas pela Vision em Aragua\u00edna."}</p>
          <div className={styles.actions}>
            <VisionButton ariaLabel={"Ver cat\u00e1logo da \u00d3tica Vision"} href={LINKS.catalog} icon={BookOpenText}>{"Cat\u00e1logo"}</VisionButton>
            <VisionButton ariaLabel={"Falar com a \u00d3tica Vision pelo WhatsApp"} external href={LINKS.whatsapp} icon={MessageCircle} variant="secondary">WhatsApp</VisionButton>
          </div>
        </div>
      </div>

      <div
        aria-label={"Sequ\u00eancia editorial da \u00d3tica Vision"}
        className={styles.visual}
        data-layout={layout}
        data-next-layout={nextLayout}
        data-state={phase}
        onPointerCancel={() => { pointerStart.current = null; }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        role="group"
      >
        <div className={styles.mediaField} data-vision-media-field>
          {incoming ? <HeroMedia ariaHidden className={styles.incoming} item={incoming} /> : null}
          <HeroMedia
            className={styles.active}
            elementRef={outgoingRef}
            item={active}
            key={`active-${active.id}`}
            priority={activeIndex === 0}
          />
          <span className={styles.paperPlane} ref={paperPlaneRef} aria-hidden="true">
            <span className={styles.restLine} />
          </span>
          <span className={styles.cutGuide} aria-hidden="true">
            <span className={styles.cutUpper} ref={cutUpperRef} />
            <span className={styles.cutStep} ref={cutStepRef} />
            <span className={styles.cutLower} ref={cutLowerRef} />
          </span>
        </div>
      </div>
    </section>
  );
}

function HeroMedia({
  ariaHidden = false,
  className,
  elementRef,
  item,
  priority = false,
}: {
  ariaHidden?: boolean;
  className: string;
  elementRef?: Ref<HTMLElement>;
  item: WallMedia;
  priority?: boolean;
}) {
  return (
    <figure
      aria-hidden={ariaHidden || undefined}
      className={className}
      data-vision-media
      ref={elementRef}
      style={{
        "--desktop-object-position": item.desktopObjectPosition,
        "--desktop-media-scale": Math.max(1, item.desktopScale),
        "--mobile-object-position": item.mobileObjectPosition,
        "--mobile-media-scale": Math.max(1, item.mobileScale),
      } as CSSProperties}
    >
      <picture>
        {item.mobileSrc ? <source media="(max-width: 720px)" srcSet={item.mobileSrc} /> : null}
        <img
          alt={ariaHidden ? "" : item.alt}
          decoding={priority ? "sync" : "async"}
          fetchPriority={priority ? "high" : "auto"}
          height={item.height}
          loading={priority ? "eager" : "lazy"}
          src={item.src}
          width={item.width}
        />
      </picture>
    </figure>
  );
}
