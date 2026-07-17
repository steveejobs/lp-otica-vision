"use client";

import { useId, useRef, useState, useTransition } from "react";

import { generateProductSkuAction } from "@/app/admin/(protected)/produtos/actions";

import styles from "./admin.module.css";

export function ProductSkuField({
  defaultValue = "",
  generateEnabled = false,
}: {
  defaultValue?: string;
  generateEnabled?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [sku, setSku] = useState(defaultValue);
  const [message, setMessage] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [pending, startTransition] = useTransition();

  function generateSku() {
    setMessage(null);
    setHasError(false);
    startTransition(async () => {
      try {
        const result = await generateProductSkuAction();
        if (!result.ok) {
          setHasError(true);
          setMessage(result.error);
          return;
        }
        setSku(result.sku);
        setMessage(`SKU ${result.sku} gerado.`);
        requestAnimationFrame(() => inputRef.current?.focus());
      } catch {
        setHasError(true);
        setMessage("Não foi possível gerar o SKU. Tente novamente.");
      }
    });
  }

  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={inputId}>SKU</label>
      <div className={styles.skuControl}>
        <input
          autoCapitalize="characters"
          autoComplete="off"
          id={inputId}
          maxLength={80}
          name="sku"
          onChange={(event) => {
            setSku(event.currentTarget.value);
            setMessage(null);
            setHasError(false);
          }}
          ref={inputRef}
          required
          spellCheck={false}
          value={sku}
        />
        {generateEnabled ? (
          <button
            className={styles.secondaryButton}
            disabled={pending}
            onClick={generateSku}
            type="button"
          >
            {pending ? "Gerando..." : "Gerar SKU"}
          </button>
        ) : null}
      </div>
      {generateEnabled ? (
        <small className={styles.fieldHint}>Gere um código exclusivo ou digite o SKU manualmente.</small>
      ) : null}
      {message ? (
        <p aria-live="polite" className={styles.fieldStatus} data-error={hasError || undefined} role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
