"use client";

import { useEffect, useState } from "react";

import { updateAnalyticsConsent } from "@/lib/analytics/client";
import {
  ANALYTICS_PREFERENCES_OPEN_EVENT,
  type AnalyticsConsentChoice,
} from "@/lib/analytics/consent";

import styles from "./privacy-consent.module.css";

export function PrivacyConsent({ initialChoice }: { initialChoice: AnalyticsConsentChoice }) {
  const [choice, setChoice] = useState(initialChoice);
  const [open, setOpen] = useState(initialChoice === "unknown");
  const [configuring, setConfiguring] = useState(false);
  const [experience, setExperience] = useState(initialChoice === "accepted");

  useEffect(() => {
    const show = () => { setConfiguring(true); setOpen(true); };
    window.addEventListener(ANALYTICS_PREFERENCES_OPEN_EVENT, show);
    return () => window.removeEventListener(ANALYTICS_PREFERENCES_OPEN_EVENT, show);
  }, []);

  function save(next: "accepted" | "rejected") {
    updateAnalyticsConsent(next);
    setChoice(next);
    setExperience(next === "accepted");
    setOpen(false);
    setConfiguring(false);
  }

  if (!open) return null;

  return (
    <aside aria-label="Preferências de cookies" className={styles.panel} data-configuring={configuring || undefined}>
      <div className={styles.heading}>
        <strong>Cookies</strong>
        <p>Usamos cookies necessários para o funcionamento e, com sua escolha, cookies opcionais para melhorar a experiência.</p>
      </div>
      {configuring ? (
        <div className={styles.options}>
          <div><span><strong>Cookies necessários</strong><small>Sessão, segurança e funcionamento técnico.</small></span><b>Sempre ativos</b></div>
          <label><span><strong>Cookies opcionais</strong><small>Ajudam a melhorar a experiência no site.</small></span><input checked={experience} onChange={(event) => setExperience(event.currentTarget.checked)} type="checkbox" /></label>
        </div>
      ) : null}
      <div className={styles.actions}>
        {configuring ? (
          <button className={styles.primary} onClick={() => save(experience ? "accepted" : "rejected")} type="button">Salvar preferências</button>
        ) : (
          <>
            <button className={styles.primary} onClick={() => save("accepted")} type="button">Aceitar cookies</button>
            <button onClick={() => save("rejected")} type="button">Recusar opcionais</button>
            <button onClick={() => setConfiguring(true)} type="button">Configurar cookies</button>
          </>
        )}
      </div>
      {choice !== "unknown" && configuring ? <button className={styles.close} onClick={() => setOpen(false)} type="button">Fechar</button> : null}
    </aside>
  );
}
