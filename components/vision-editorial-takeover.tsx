"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";

import { HeroCopy } from "./hero/hero-copy";
import { HeroGalleryControls, HeroMedia } from "./hero/hero-media";
import type {
  HeroFieldLayout,
  HeroTransitionPhase,
  HeroWallMedia,
} from "./hero/hero-types";
import styles from "./vision-editorial-takeover.module.css";

type Props = { media: readonly HeroWallMedia[] };

const FIRST_HOLD_MS = 6_400;
const HOLD_MS = 5_400;
const CUT_DURATION_MS = 1_420;
const layouts: readonly HeroFieldLayout[] = ["offset", "narrow", "open"];
const desktopLinePosition: Record<HeroFieldLayout, number> = {
  open: 4,
  offset: 9,
  narrow: 15,
};
const mobileLinePosition: Record<HeroFieldLayout, number> = {
  open: 3,
  offset: 7,
  narrow: 11,
};

function atIndex(index: number, length: number) {
  return (index + length) % length;
}

function findNextIndex(
  activeIndex: number,
  media: readonly HeroWallMedia[],
  failedMediaIds: ReadonlySet<string>,
) {
  for (let offset = 1; offset < media.length; offset += 1) {
    const candidateIndex = atIndex(activeIndex + offset, media.length);
    if (!failedMediaIds.has(media[candidateIndex].id)) return candidateIndex;
  }
  return null;
}

function cutPath(position: number, compactViewport: boolean) {
  return compactViewport
    ? `inset(${position}% 0 0 0)`
    : `inset(0 0 0 ${position}%)`;
}

/** A persistent deck keeps one current medium visible and one decoded incoming medium ready for the cut. */
export function VisionEditorialTakeover({ media }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const outgoingRef = useRef<HTMLElement>(null);
  const paperPlaneRef = useRef<HTMLSpanElement>(null);
  const cutLineRef = useRef<HTMLSpanElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const preparationFrame = useRef<number | null>(null);
  const animationsRef = useRef<Animation[]>([]);
  const transitionRunRef = useRef(0);
  const mediaElementsRef = useRef(new Map<string, HTMLElement>());
  const pendingManualAdvanceRef = useRef(false);
  const previousCompactViewportRef = useRef<boolean | null>(null);
  const completedFirstAdvanceRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null);
  const [nextReady, setNextReady] = useState<{
    id: string;
    source: string;
  } | null>(null);
  const [failedMediaIds, setFailedMediaIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [fallbackMediaIds, setFallbackMediaIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [enabledMediaIds, setEnabledMediaIds] = useState<ReadonlySet<string>>(
    () =>
      new Set(media.slice(0, Math.min(2, media.length)).map((item) => item.id)),
  );
  const [inViewport, setInViewport] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [compactViewport, setCompactViewport] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 720px)").matches,
  );
  const [phase, setPhase] = useState<HeroTransitionPhase>("idle");

  const active = media[activeIndex];
  const nextIndex =
    media.length > 1 ? findNextIndex(activeIndex, media, failedMediaIds) : null;
  const next = nextIndex === null ? null : media[nextIndex];
  const isNextReady = nextReady?.id === next?.id;
  const motionEnabled =
    Boolean(next) && inViewport && isVisible && !reducedMotion;
  const layout = layouts[activeIndex % layouts.length];
  const nextLayout =
    nextIndex === null ? layout : layouts[nextIndex % layouts.length];

  const cancelTransition = useCallback(() => {
    transitionRunRef.current += 1;
    animationsRef.current.forEach((animation) => animation.cancel());
    animationsRef.current = [];
    pendingManualAdvanceRef.current = false;
    setIncomingIndex(null);
    setPhase((currentPhase) =>
      currentPhase === "idle" ? currentPhase : "committing",
    );
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
    const syncVisibility = () =>
      setIsVisible(document.visibilityState === "visible");
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
    if (previous !== null && previous !== compactViewport) {
      const frame = window.requestAnimationFrame(() => {
        setNextReady(null);
        if (phase !== "idle") cancelTransition();
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [cancelTransition, compactViewport, phase]);

  useEffect(() => {
    if (!reducedMotion || phase !== "transitioning") return;
    animationsRef.current.forEach((animation) => animation.finish());
  }, [phase, reducedMotion]);

  useEffect(() => {
    if (!active.fallbackSrc || fallbackMediaIds.has(active.id)) return;
    const image = outgoingRef.current?.querySelector<HTMLImageElement>("img");
    if (!image) return;

    let cancelled = false;
    const fallbackToLocalMedia = () => {
      if (cancelled) return;
      setFallbackMediaIds((current) => new Set(current).add(active.id));
    };
    const verifyLoadedImage = () => {
      if (!image.naturalWidth) {
        fallbackToLocalMedia();
        return;
      }
      void image.decode?.().catch(fallbackToLocalMedia);
    };

    if (image.complete) {
      verifyLoadedImage();
      return () => {
        cancelled = true;
      };
    }

    image.addEventListener("load", verifyLoadedImage, { once: true });
    image.addEventListener("error", fallbackToLocalMedia, { once: true });
    return () => {
      cancelled = true;
      image.removeEventListener("load", verifyLoadedImage);
      image.removeEventListener("error", fallbackToLocalMedia);
    };
  }, [active.fallbackSrc, active.id, compactViewport, fallbackMediaIds]);

  useEffect(() => {
    if (!next || !inViewport || !isVisible) return;

    if (!enabledMediaIds.has(next.id)) {
      const frame = window.requestAnimationFrame(() => {
        setEnabledMediaIds((current) => new Set(current).add(next.id));
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const image = mediaElementsRef.current
      .get(next.id)
      ?.querySelector<HTMLImageElement>("img");
    if (!image) return;

    let cancelled = false;
    setNextReady((ready) => (ready?.id === next.id ? ready : null));

    const markReady = () => {
      if (!image.naturalWidth) return;
      void image
        .decode?.()
        .then(() => {
          if (cancelled) return;
          setNextReady({ id: next.id, source: image.currentSrc || image.src });
        })
        .catch(() => {
          if (cancelled) return;
          setFailedMediaIds((current) => new Set(current).add(next.id));
        });
    };
    const markFailed = () => {
      if (cancelled) return;
      if (next.fallbackSrc && !fallbackMediaIds.has(next.id)) return;
      pendingManualAdvanceRef.current = false;
      setNextReady(null);
      setFailedMediaIds((current) => new Set(current).add(next.id));
    };

    if (image.complete) {
      if (image.naturalWidth) markReady();
      else markFailed();
    } else {
      image.addEventListener("load", markReady, { once: true });
      image.addEventListener("error", markFailed, { once: true });
    }

    return () => {
      cancelled = true;
      image.removeEventListener("load", markReady);
      image.removeEventListener("error", markFailed);
    };
  }, [
    compactViewport,
    enabledMediaIds,
    fallbackMediaIds,
    inViewport,
    isVisible,
    next,
  ]);

  useEffect(() => {
    if (!next || !enabledMediaIds.has(next.id)) return;
    const image = mediaElementsRef.current
      .get(next.id)
      ?.querySelector<HTMLImageElement>("img");
    if (!image || !image.complete || !image.naturalWidth) return;
    let cancelled = false;
    void image.decode?.().then(() => {
      if (cancelled) return;
      setNextReady({ id: next.id, source: image.currentSrc || image.src });
    });

    return () => {
      cancelled = true;
    };
  }, [enabledMediaIds, next]);

  const requestAdvance = useCallback(
    (manual = false) => {
      if (!next || nextIndex === null || phase !== "idle") return;
      if (!isNextReady) {
        pendingManualAdvanceRef.current = manual;
        return;
      }

      pendingManualAdvanceRef.current = false;
      setIncomingIndex(nextIndex);
      setPhase("preparing");
    },
    [isNextReady, next, nextIndex, phase],
  );

  useEffect(() => {
    if (!pendingManualAdvanceRef.current || !isNextReady || phase !== "idle")
      return;
    requestAdvance(true);
  }, [isNextReady, phase, requestAdvance]);

  useEffect(() => {
    if (!motionEnabled || phase !== "idle" || !isNextReady) return;
    const dwellTimer = window.setTimeout(
      () => requestAdvance(),
      completedFirstAdvanceRef.current ? HOLD_MS : FIRST_HOLD_MS,
    );
    return () => window.clearTimeout(dwellTimer);
  }, [isNextReady, motionEnabled, phase, requestAdvance]);

  useEffect(() => {
    if (phase !== "preparing" || incomingIndex === null) return;

    preparationFrame.current = window.requestAnimationFrame(() => {
      if (reducedMotion) {
        setPhase("committing");
        setActiveIndex(incomingIndex);
        setIncomingIndex(null);
        return;
      }

      const outgoing = outgoingRef.current;
      const paperPlane = paperPlaneRef.current;
      const cutLine = cutLineRef.current;
      if (!outgoing || !paperPlane || !cutLine || !outgoing.animate) {
        setPhase("committing");
        setActiveIndex(incomingIndex);
        setIncomingIndex(null);
        return;
      }

      const runId = transitionRunRef.current + 1;
      transitionRunRef.current = runId;
      const start = compactViewport
        ? mobileLinePosition[layout]
        : desktopLinePosition[layout];
      const destination = compactViewport
        ? mobileLinePosition[nextLayout]
        : desktopLinePosition[nextLayout];
      const fieldRect = outgoing.getBoundingClientRect();
      const easing = "cubic-bezier(0.72, 0, 0.18, 1)";
      const timing: KeyframeAnimationOptions = {
        duration: CUT_DURATION_MS,
        easing,
        fill: "forwards",
      };
      const activeKeyframes: Keyframe[] = [
        { clipPath: cutPath(start, compactViewport) },
        { clipPath: cutPath(100.5, compactViewport) },
      ];
      const lineDistance = compactViewport
        ? ((100.5 - start) / 100) * fieldRect.height
        : ((100.5 - start) / 100) * fieldRect.width;
      const lineFrames: Keyframe[] = [
        { opacity: 1, transform: "translate3d(0, 0, 0)" },
        {
          offset: 0.94,
          opacity: 1,
          transform: compactViewport
            ? `translate3d(0, ${lineDistance * 0.94}px, 0)`
            : `translate3d(${lineDistance * 0.94}px, 0, 0)`,
        },
        {
          opacity: 0,
          transform: compactViewport
            ? `translate3d(0, ${lineDistance}px, 0)`
            : `translate3d(${lineDistance}px, 0, 0)`,
        },
      ];
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
        paperPlane.animate(planeFrames, {
          duration: 430,
          easing: "cubic-bezier(0.45, 0, 0.2, 1)",
          fill: "forwards",
        }),
        cutLine.animate(lineFrames, timing),
      ];
      animationsRef.current = animations;

      void Promise.all(animations.map((animation) => animation.finished))
        .then(() => {
          if (transitionRunRef.current !== runId) return;
          completedFirstAdvanceRef.current = true;
          setPhase("committing");
          setActiveIndex(incomingIndex);
          setIncomingIndex(null);
        })
        .catch(() => {
          // Cancellation is handled by cancelTransition and component cleanup.
        });
    });

    return () => {
      if (preparationFrame.current !== null)
        window.cancelAnimationFrame(preparationFrame.current);
      preparationFrame.current = null;
    };
  }, [
    compactViewport,
    incomingIndex,
    layout,
    nextLayout,
    phase,
    reducedMotion,
  ]);

  useEffect(() => {
    if (phase !== "committing") return;
    preparationFrame.current = window.requestAnimationFrame(() => {
      animationsRef.current.forEach((animation) => animation.cancel());
      animationsRef.current = [];
      setPhase("idle");
    });
    return () => {
      if (preparationFrame.current !== null)
        window.cancelAnimationFrame(preparationFrame.current);
      preparationFrame.current = null;
    };
  }, [phase]);

  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerStart.current = { x: event.clientX, y: event.clientY };
  }, []);

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const start = pointerStart.current;
      pointerStart.current = null;
      if (!start) return;
      const x = event.clientX - start.x;
      const y = event.clientY - start.y;
      if (x < -54 && Math.abs(x) > Math.abs(y) * 1.45) requestAdvance(true);
    },
    [requestAdvance],
  );

  if (!active) return null;

  return (
    <section
      aria-labelledby="hero-title"
      className={styles.stage}
      data-layout={layout}
      data-next-layout={nextLayout}
      data-state={phase}
      id="hero"
      ref={rootRef}
    >
      <HeroCopy />

      <div
        aria-label={"Sequ\u00eancia editorial da \u00d3tica Vision"}
        className={styles.visual}
        data-layout={layout}
        data-next-layout={nextLayout}
        data-state={phase}
        onPointerCancel={() => {
          pointerStart.current = null;
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        role="group"
      >
        <div className={styles.mediaField} data-vision-media-field>
          {media.map((item, index) => {
            const isActive = index === activeIndex;
            const isIncoming = index === incomingIndex;
            return (
              <HeroMedia
                ariaHidden={!isActive}
                className={
                  isActive
                    ? styles.active
                    : isIncoming
                      ? styles.incoming
                      : styles.staged
                }
                elementRef={(element) => {
                  if (element) mediaElementsRef.current.set(item.id, element);
                  else mediaElementsRef.current.delete(item.id);
                  if (isActive) outgoingRef.current = element;
                }}
                enabled={enabledMediaIds.has(item.id)}
                item={item}
                key={`media-${item.id}`}
                onUseFallback={() =>
                  setFallbackMediaIds((current) =>
                    new Set(current).add(item.id),
                  )
                }
                priority={index === 0}
                tracked={isActive || isIncoming}
                useFallback={fallbackMediaIds.has(item.id)}
              />
            );
          })}
          <span
            className={styles.paperPlane}
            ref={paperPlaneRef}
            aria-hidden="true"
          >
            <span className={styles.restLine} />
          </span>
          <span className={styles.entryCurtain} aria-hidden="true" />
          <span className={styles.entryLine} aria-hidden="true" />
          <span className={styles.cutGuide} aria-hidden="true">
            <span className={styles.cutLine} ref={cutLineRef} />
          </span>
        </div>
        <HeroGalleryControls
          activeIndex={activeIndex}
          disabled={phase !== "idle" || !isNextReady}
          onAdvance={() => requestAdvance(true)}
          total={media.length}
        />
      </div>
    </section>
  );
}
