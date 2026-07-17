"use client";

import { useFormStatus } from "react-dom";

import styles from "@/components/admin/admin.module.css";

export function LoginSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className={styles.primaryButton} type="submit" disabled={pending}>
      {pending ? "Verificando…" : "Entrar no ADM"}
    </button>
  );
}
