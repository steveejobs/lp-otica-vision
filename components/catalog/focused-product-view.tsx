"use client";

import { useCatalogFocus } from "./catalog-focus-manager";
import type { CatalogProduct } from "@/lib/catalog/types";
import { ProductGallery } from "./product-gallery";
import { X } from "lucide-react";
import { ProductWhatsappButton } from "./product-whatsapp-button";

export function FocusedProductView({ product }: { product: CatalogProduct }) {
  const focusManager = useCatalogFocus();
  
  return (
    <div style={{ padding: "2rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
      <div>
         {/* Galeria */}
         <ProductGallery images={product.images} productId={product.id} productName={product.name} />
      </div>
      <div>
         {/* Infos */}
         <h2>{product.name}</h2>
         <p>{product.category?.name}</p>
         
         <div style={{ marginTop: "2rem" }}>
           <ProductWhatsappButton productName={product.name} />
         </div>
         
         <button onClick={() => focusManager?.closeFocus()} style={{ marginTop: "1rem" }}>
           <X /> Fechar Foco
         </button>
      </div>
    </div>
  );
}
