"use client";

import { useEffect, useState } from "react";

import styles from "./analytics.module.css";

export function ConfigurationActions() {
  const [message, setMessage] = useState("");
  const [debug, setDebug] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => { try { setDebug(sessionStorage.getItem("vision.ga.debug") === "1"); } catch {} }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  async function test() {
    setMessage("Testando conexão…");
    const response = await fetch("/api/admin/analytics/test", { method: "POST" }).catch(() => null);
    const payload = response ? await response.json().catch(() => null) as { message?: unknown } | null : null;
    setMessage(typeof payload?.message === "string" ? payload.message : "Não foi possível testar agora.");
  }
  function toggleDebug() {
    const next = !debug; setDebug(next);
    try { if (next) sessionStorage.setItem("vision.ga.debug", "1"); else sessionStorage.removeItem("vision.ga.debug"); } catch {}
    setMessage(next ? "Debug ativado somente nesta sessão administrativa." : "Debug desativado nesta sessão.");
  }
  return <div className={styles.configurationActions}><button onClick={() => void test()} type="button">Testar Data API</button><button onClick={toggleDebug} type="button">{debug ? "Desativar debug da sessão" : "Ativar debug da sessão"}</button><p aria-live="polite">{message}</p></div>;
}
