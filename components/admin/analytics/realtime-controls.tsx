"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { REALTIME_REFRESH_INTERVAL_MS, shouldRefreshRealtime } from "@/lib/analytics/realtime-policy";

import styles from "./analytics.module.css";

export function RealtimeControls({ error, updatedAt }: { error: string | null; updatedAt: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const initial = window.setTimeout(() => setOnline(navigator.onLine), 0);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    const interval = window.setInterval(() => {
      if (!shouldRefreshRealtime(document.visibilityState, navigator.onLine)) return;
      void fetch("/api/admin/analytics/refresh", { body: JSON.stringify({ area: "realtime" }), headers: { "Content-Type": "application/json" }, method: "POST" }).then((response) => { if (response.ok) router.refresh(); }).catch(() => undefined);
    }, REALTIME_REFRESH_INTERVAL_MS);
    return () => { window.clearTimeout(initial); window.clearInterval(interval); window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); };
  }, [router]);

  async function refresh() {
    if (!navigator.onLine) { setOnline(false); setMessage("Sem conexão. A atualização foi pausada."); return; }
    setBusy(true); setMessage("Atualizando atividade…");
    const response = await fetch("/api/admin/analytics/refresh", { body: JSON.stringify({ area: "realtime" }), headers: { "Content-Type": "application/json" }, method: "POST" }).catch(() => null);
    if (response?.ok) { router.refresh(); setMessage("Atividade atualizada."); }
    else setMessage("Não foi possível atualizar agora.");
    setBusy(false);
  }

  const state = !online ? "offline" : error ? "error" : "connected";
  const label = !online ? "Offline · atualização pausada" : error ? "Data API indisponível" : "Conectado";
  return <div className={styles.realtimeControls}>
    <div><span className={styles.connectionState} data-state={state}>{label}</span><small>{updatedAt ? `Última atualização: ${new Date(updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Nenhum relatório obtido"}</small></div>
    <button disabled={busy} onClick={() => void refresh()} type="button">{busy ? "Atualizando…" : "Atualizar"}</button>
    <p aria-live="polite">{message}</p>
  </div>;
}
