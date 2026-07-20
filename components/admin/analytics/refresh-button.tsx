"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import styles from "./analytics.module.css";

export function RefreshReportButton({ area }: { area: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  async function refresh() {
    setMessage("Atualizando…");
    const response = await fetch("/api/admin/analytics/refresh", { body: JSON.stringify({ area }), headers: { "Content-Type": "application/json" }, method: "POST" }).catch(() => null);
    if (!response?.ok) { setMessage("Não foi possível atualizar agora."); return; }
    router.refresh();
    setMessage("Relatório atualizado.");
  }
  return <div className={styles.refresh}><button onClick={() => void refresh()} type="button">Atualizar relatório</button><span aria-live="polite">{message}</span></div>;
}
