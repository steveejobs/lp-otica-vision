import type { ComponentPropsWithoutRef } from "react";

import styles from "./section-shell.module.css";

type SectionShellProps = ComponentPropsWithoutRef<"section"> & {
  innerClassName?: string;
  motion?: boolean;
  tone?: "paper" | "soft";
};

export function SectionShell({
  children,
  className = "",
  innerClassName = "",
  motion = true,
  tone = "paper",
  ...props
}: SectionShellProps) {
  const motionProps = motion
    ? { "data-motion-reveal": true, "data-motion-variant": "section" }
    : {};

  return (
    <section
      {...motionProps}
      className={`${styles.shell} ${styles[tone]} ${className}`}
      {...props}
    >
      <div className={`${styles.container} ${innerClassName}`}>{children}</div>
    </section>
  );
}
