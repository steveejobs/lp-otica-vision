import Image from "next/image";

import { identityAssets } from "@/lib/assets";

import styles from "./brand-logo.module.css";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
  size?: "header" | "hero" | "profile";
};

export function BrandLogo({
  className = "",
  priority = false,
  size = "header",
}: BrandLogoProps) {
  return (
    <span className={`${styles.wrap} ${styles[size]} ${className}`}>
      <Image
        className={styles.image}
        src={identityAssets.logo}
        width={1448}
        height={1086}
        sizes={size === "header" ? "140px" : "(max-width: 720px) 180px, 280px"}
        priority={priority}
        alt="Ótica Vision"
      />
    </span>
  );
}
