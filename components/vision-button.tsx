import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import styles from "./vision-button.module.css";

type VisionButtonProps = {
  href?: string;
  children: ReactNode;
  icon: LucideIcon;
  variant?: "primary" | "secondary" | "compact";
  ariaLabel?: string;
  external?: boolean;
  className?: string;
  onClick?: () => void;
  analyticsEvent?: string;
  analyticsLocation?: string;
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
  analyticsEvent,
  analyticsLocation,
}: VisionButtonProps) {
  const content = (
    <>
      <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
      <span>{children}</span>
    </>
  );

  if (href) {
    return (
      <a
        className={`${styles.button} ${styles[variant]} ${className}`}
        href={href}
        aria-label={ariaLabel}
        data-analytics-event={analyticsEvent}
        data-analytics-location={analyticsLocation}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
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
