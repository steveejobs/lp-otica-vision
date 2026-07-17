"use client";

import { MessageCircle } from "lucide-react";

import { trackCatalogEvent } from "@/lib/analytics/client";

import styles from "./product-whatsapp-button.module.css";

export function ProductWhatsappButton({
  href,
  label,
  productId,
}: {
  href: string;
  label: string;
  productId: string;
}) {
  return (
    <a
      className={styles.button}
      href={href}
      onClick={() => {
        void trackCatalogEvent({
          eventName: "product_whatsapp_click",
          metadata: { surface: "product_detail" },
          productId,
        });
      }}
      rel="noopener noreferrer"
      target="_blank"
    >
      <MessageCircle aria-hidden="true" size={19} strokeWidth={1.8} />
      {label}
    </a>
  );
}
