"use client";

import { useCatalogFocus } from "./catalog-focus-manager";
import type { CatalogProduct } from "@/lib/catalog/types";
import { ProductGallery } from "./product-gallery";
import { X } from "lucide-react";
import { ProductWhatsappButton } from "./product-whatsapp-button";
import styles from "./focused-product-view.module.css";

export function FocusedProductView({ product }: { product: CatalogProduct }) {
  const focusManager = useCatalogFocus();
  
  return (
    <div className={styles.container}>
      <button 
        className={styles.closeButton} 
        onClick={() => focusManager?.closeFocus()}
        aria-label="Fechar detalhes do produto"
      >
        <X size={20} strokeWidth={1.5} />
      </button>

      <div className={styles.galleryCol}>
         <ProductGallery images={product.images} productId={product.id} productName={product.name} />
      </div>

      <div className={styles.infoCol}>
         {product.brand && (
           <span className={styles.brand}>{product.brand.name}</span>
         )}
         <h2 className={styles.title}>{product.name}</h2>
         
         <div className={styles.description}>
           <p>Estrutura Premium selecionada. Entre em contato para consultar numerações, cores disponíveis e valores exatos desta armação com as suas lentes de grau feitas em nosso Laboratório Digital.</p>
         </div>
         
         <div className={styles.actions}>
           <ProductWhatsappButton 
             href={`https://api.whatsapp.com/send/?phone=5563992231522&text=Ol%C3%A1%21+Gostaria+de+saber+mais+sobre+o+modelo+${encodeURIComponent(product.name)}&type=phone_number&app_absent=0&utm_source=ig`}
             label={`Consultar ${product.name}`}
             productId={product.id}
           />
         </div>
      </div>
    </div>
  );
}
