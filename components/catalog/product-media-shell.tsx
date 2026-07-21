import { type ReactNode, forwardRef } from "react";
import styles from "./product-media-shell.module.css";

type ProductMediaShellProps = {
  children?: ReactNode;
  className?: string;
  presentation?: "catalog" | "gallery" | "loading" | "transition";
  style?: React.CSSProperties;
};

export const ProductMediaShell = forwardRef<HTMLDivElement, ProductMediaShellProps>(
  ({ children, className = "", presentation = "catalog", style, ...props }, ref) => {
    return (
      <div 
        ref={ref}
        className={`${styles.shell} ${styles[presentation]} ${className}`}
        data-media-shell={presentation}
        style={style}
        {...props}
      >
        <div className={styles.inner}>
          {children}
        </div>
      </div>
    );
  }
);
ProductMediaShell.displayName = "ProductMediaShell";
