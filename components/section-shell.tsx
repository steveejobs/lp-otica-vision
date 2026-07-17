import type { ComponentPropsWithoutRef } from "react";

import styles from "./section-shell.module.css";

type SectionShellProps = ComponentPropsWithoutRef<"section"> & {
  innerClassName?: string;
  tone?: "paper" | "soft";
};

export function SectionShell({
  children,
  className = "",
  innerClassName = "",
  tone = "paper",
  ...props
}: SectionShellProps) {
  return (
    <section
      data-motion-reveal
      data-motion-variant="section"
      className={`${styles.shell} ${styles[tone]} ${className}`}
      {...props}
    >
      <div className={`${styles.container} ${innerClassName}`}>{children}</div>
    </section>
  );
}
