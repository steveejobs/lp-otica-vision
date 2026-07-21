"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type Rect = { top: number; left: number; width: number; height: number };

type TransitionState = {
  status: "idle" | "preloading" | "armed" | "navigating" | "awaiting-target" | "animating" | "settling" | "cancelled" | "cleanup";
  productId: string | null;
  transitionId: string | null;
  mediaUrl: string | null;
  originRect: Rect | null;
  targetRect: Rect | null;
  objectPosition: string;
};

type TransitionContextValue = {
  state: TransitionState;
  enabled: boolean;
  registerOrigin: (productId: string, url: string, rect: Rect, objectPosition: string) => void;
  registerTarget: (productId: string, transitionId: string, rect: Rect) => void;
  markNavigating: () => void;
  reset: () => void;
};

const TransitionContext = createContext<TransitionContextValue | null>(null);

export function useCatalogMediaTransition() {
  const ctx = useContext(TransitionContext);
  if (!ctx) throw new Error("Missing CatalogMediaTransitionProvider");
  return ctx;
}

export function CatalogMediaTransitionProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const [state, setState] = useState<TransitionState>({
    status: "idle",
    productId: null,
    transitionId: null,
    mediaUrl: null,
    originRect: null,
    targetRect: null,
    objectPosition: "50% 50%"
  });

  const overlayRef = useRef<HTMLDivElement>(null);

  const registerOrigin = (productId: string, mediaUrl: string, originRect: Rect, objectPosition: string) => {
    setState({
      status: "armed",
      productId,
      transitionId: Math.random().toString(36).substring(2, 9),
      mediaUrl,
      originRect,
      targetRect: null,
      objectPosition
    });
  };

  const markNavigating = () => {
    setState(s => s.status === "armed" ? { ...s, status: "navigating" } : s);
  };

  const registerTarget = (productId: string, transitionId: string, targetRect: Rect) => {
    setState(s => {
      // Validate transitionId and productId match
      if (s.transitionId !== transitionId || s.productId !== productId) return s;
      if (s.status !== "navigating" && s.status !== "awaiting-target") return s;
      return { ...s, status: "animating", targetRect };
    });
  };

  const reset = () => {
    setState({
      status: "idle",
      productId: null,
      transitionId: null,
      mediaUrl: null,
      originRect: null,
      targetRect: null,
      objectPosition: "50% 50%"
    });
  };

  // Listen to path changes or timeout if target doesn't register
  useEffect(() => {
    if (state.status === "navigating") {
      // We are navigating, we await target. If target doesn't register in 2s, cancel.
      const timer = setTimeout(() => {
        setState(s => s.status === "animating" || s.status === "settling" ? s : { ...s, status: "cleanup" });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.status]);

  // Execute Animation
  useEffect(() => {
    if (state.status === "animating" && state.originRect && state.targetRect && overlayRef.current) {
      const el = overlayRef.current;
      
      const { originRect, targetRect } = state;
      
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReducedMotion) {
        setTimeout(() => {
          setState(s => ({ ...s, status: "cleanup" }));
        }, 0);
        return;
      }

      el.style.top = `${originRect.top}px`;
      el.style.left = `${originRect.left}px`;
      el.style.width = `${originRect.width}px`;
      el.style.height = `${originRect.height}px`;
      el.style.display = "block";
      
      const deltaX = targetRect.left - originRect.left;
      const deltaY = targetRect.top - originRect.top;
      const scaleX = targetRect.width / originRect.width;
      const scaleY = targetRect.height / originRect.height;

      const animation = el.animate([
        { transform: 'translate(0, 0) scale(1)', borderRadius: 'var(--radius-sm)' },
        { transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`, borderRadius: '0px' }
      ], {
        duration: 400,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards"
      });

      animation.finished.then(() => {
        setState(s => ({ ...s, status: "settling" }));
        setTimeout(() => {
          setState(s => ({ ...s, status: "cleanup" }));
        }, 150);
      });

      return () => {
        animation.cancel();
      };
    }

    if (state.status === "cleanup") {
      reset();
    }
  }, [state.status, state.originRect, state.targetRect, reset]);

  const showOverlay = enabled && (state.status === "animating" || state.status === "settling");

  return (
    <TransitionContext.Provider value={{ state, enabled, registerOrigin, registerTarget, markNavigating, reset }}>
      {children}
      {showOverlay && state.mediaUrl && (
        <div
          ref={overlayRef}
          style={{
            position: "fixed",
            zIndex: 9999,
            pointerEvents: "none",
            transformOrigin: "0 0",
            willChange: "transform",
            background: "transparent",
            mixBlendMode: "multiply",
            display: "none"
          }}
          aria-hidden="true"
        >
          <img 
            src={state.mediaUrl} 
            alt="" 
            style={{ 
              width: "100%", 
              height: "100%", 
              objectFit: "contain",
              objectPosition: state.objectPosition,
              display: "block"
            }} 
          />
        </div>
      )}
    </TransitionContext.Provider>
  );
}
