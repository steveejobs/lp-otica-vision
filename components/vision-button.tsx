import type { LucideIcon } from "lucide-react";

import styles from "./vision-button.module.css";

type VisionButtonProps = {
  href?: string;
  children?: React.ReactNode;
  icon: LucideIcon;
  variant?: "primary" | "secondary" | "icon";
  ariaLabel?: string;
  external?: boolean;
  className?: string;
  onClick?: () => void;
};

export function VisionButton({
  href,
  children,
  icon: Icon,
  variant = "primary",
  ariaLabel,
  external = false,
  className = "",
  onClick,
}: VisionButtonProps) {
  const content = (
    <>
      <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
      {children ? <span>{children}</span> : null}
    </>
  );

  if (href) {
    return (
    <a
      className={`${styles.button} ${styles[variant]} ${className}`}
      href={href}
      aria-label={ariaLabel}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
    >
      {content}
    </a>
  );
  }

  return (
    <button
      className={`${styles.button} ${styles[variant]} ${className}`}
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {content}
    </button>
  );
}
