"use client";

import { MessageCircle } from "lucide-react";

import styles from "./product-whatsapp-button.module.css";

export function ProductWhatsappButton({
  href,
  label,
  productId,
  curated = false,
}: {
  href: string;
  label: string;
  productId: string;
  curated?: boolean;
}) {
  return (
    <a
      className={styles.button}
      data-analytics-event="product_whatsapp_clicked"
      data-analytics-location={curated ? "curated_product_detail" : "product_detail"}
      data-analytics-product-id={productId}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <MessageCircle aria-hidden="true" size={19} strokeWidth={1.8} />
      {label}
    </a>
  );
}
