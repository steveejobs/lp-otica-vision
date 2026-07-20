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
    <aside aria-label="Preferências de privacidade" className={styles.panel} data-configuring={configuring || undefined}>
      <div className={styles.heading}>
        <strong>Medição e privacidade</strong>
        <p>Usamos dados agregados para entender a experiência. O Google Analytics só é ativado com sua escolha.</p>
      </div>
      {configuring ? (
        <div className={styles.options}>
          <div><span><strong>Medição necessária</strong><small>Sessão, segurança e funcionamento técnico.</small></span><b>Sempre ativa</b></div>
          <label><span><strong>Medição de experiência</strong><small>Controla o Google Analytics.</small></span><input checked={experience} onChange={(event) => setExperience(event.currentTarget.checked)} type="checkbox" /></label>
          <div><span><strong>Publicidade</strong><small>Nenhuma integração publicitária nesta etapa.</small></span><b>Desativada</b></div>
        </div>
      ) : null}
      <div className={styles.actions}>
        {configuring ? (
          <button className={styles.primary} onClick={() => save(experience ? "accepted" : "rejected")} type="button">Salvar preferência</button>
        ) : (
          <>
            <button className={styles.primary} onClick={() => save("accepted")} type="button">Aceitar medição</button>
            <button onClick={() => save("rejected")} type="button">Recusar</button>
            <button onClick={() => setConfiguring(true)} type="button">Configurar</button>
          </>
        )}
      </div>
      {choice !== "unknown" && configuring ? <button className={styles.close} onClick={() => setOpen(false)} type="button">Fechar</button> : null}
    </aside>
  );
}
