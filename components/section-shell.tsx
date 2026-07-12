import type { ComponentPropsWithoutRef } from "react";

import styles from "./section-shell.module.css";

type SectionShellProps = ComponentPropsWithoutRef<"section"> & {
  innerClassName?: string;
  tone?: "paper" | "soft";
  reveal?: boolean;
};

export function SectionShell({
  children,
  className = "",
  innerClassName = "",
  tone = "paper",
  reveal = true,
  ...props
}: SectionShellProps) {
  return (
    <section
      className={`${styles.shell} ${styles[tone]} ${reveal ? styles.reveal : ""} ${className}`}
      {...props}
    >
      <div className={`${styles.container} ${innerClassName}`}>{children}</div>
    </section>
  );
}
