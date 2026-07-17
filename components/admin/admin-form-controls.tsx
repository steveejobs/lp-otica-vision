"use client";

import { useFormStatus } from "react-dom";

import styles from "./admin.module.css";

export function AdminSubmitButton({
  children,
  pendingLabel = "Salvando...",
  variant = "primary",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "danger" | "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  const className =
    variant === "danger"
      ? styles.dangerButton
      : variant === "secondary"
        ? styles.secondaryButton
        : styles.primaryButton;

  return (
    <button className={className} disabled={pending} type="submit">
      {pending ? pendingLabel : children}
    </button>
  );
}

export function ConfirmSubmitButton({
  children,
  confirmation,
  pendingLabel = "Processando...",
  variant = "danger",
}: {
  children: React.ReactNode;
  confirmation: string;
  pendingLabel?: string;
  variant?: "danger" | "secondary";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className={variant === "danger" ? styles.dangerButton : styles.secondaryButton}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirmation)) event.preventDefault();
      }}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

