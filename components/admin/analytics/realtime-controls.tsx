"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { REALTIME_REFRESH_INTERVAL_MS, shouldRefreshRealtime } from "@/lib/analytics/realtime-policy";

import styles from "./analytics.module.css";

export function RealtimeControls({ error, updatedAt }: { error: string | null; updatedAt: string | null }) {
  const router = useRouter();
  const inFlightRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async (manual = false) => {
    if (inFlightRef.current) return;
    if (!navigator.onLine) {
      setOnline(false);
      if (manual) setMessage("Sem conexão. A atualização foi pausada.");
      return;
    }

    inFlightRef.current = true;
    const controller = new AbortController();
    controllerRef.current = controller;
    if (manual) {
      setBusy(true);
      setMessage("Atualizando atividade…");
    }

    try {
      const response = await fetch("/api/admin/analytics/refresh", {
        body: JSON.stringify({ area: "realtime" }),
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        method: "POST",
        signal: controller.signal,
      });
      if (!mountedRef.current) return;
      if (response.ok) {
        router.refresh();
        if (manual) setMessage("Atividade atualizada.");
      } else if (manual) {
        setMessage("Não foi possível atualizar agora.");
      }
    } catch (requestError) {
      if (manual && mountedRef.current && (requestError as Error).name !== "AbortError") {
        setMessage("Não foi possível atualizar agora.");
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      inFlightRef.current = false;
      if (manual && mountedRef.current) setBusy(false);
    }
  }, [router]);

  useEffect(() => {
    mountedRef.current = true;
    const updateOnline = () => setOnline(navigator.onLine);
    const handleOnline = () => {
      setOnline(true);
      if (document.visibilityState === "visible") void refresh();
    };
    const handleOffline = () => setOnline(false);
    const handleVisibility = () => {
      if (shouldRefreshRealtime(document.visibilityState, navigator.onLine)) void refresh();
    };
    updateOnline();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);
    const interval = window.setInterval(() => {
      if (shouldRefreshRealtime(document.visibilityState, navigator.onLine)) void refresh();
    }, REALTIME_REFRESH_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
      window.clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);

  const state = !online ? "offline" : error ? "error" : "connected";
  const label = !online ? "Offline · atualização pausada" : error ? "Data API indisponível" : "Conectado";
  return <div className={styles.realtimeControls}>
    <div>
      <span className={styles.connectionState} data-state={state}>{label}</span>
      <small>{updatedAt ? `Último relatório obtido: ${new Date(updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Araguaina" })} (Araguaína)` : "Nenhum relatório obtido"}</small>
    </div>
    <button disabled={busy || !online} onClick={() => void refresh(true)} type="button">{busy ? "Atualizando…" : "Atualizar"}</button>
    <p aria-live="polite">{message}</p>
  </div>;
}
