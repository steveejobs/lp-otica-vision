"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";

import { AdminSubmitButton } from "@/components/admin/admin-form-controls";
import { reorderFeaturedProductsAction } from "@/app/admin/(protected)/produtos/actions";
import styles from "./admin.module.css";
import { catalogImageUrl } from "@/lib/catalog/image-url";

type FeaturedProduct = {
  id: string;
  name: string;
  sku: string;
  brand: string;
  cover: {
    alt_text: string;
    object_position: string;
    blur_data_url: string | null;
    storage_path: string;
    asset_version: string;
  } | null;
};

export function FeaturedDndList({
  initialProducts,
}: {
  initialProducts: FeaturedProduct[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    setProducts((prev) => {
      const newProducts = [...prev];
      const draggedItem = newProducts[draggedIndex];
      newProducts.splice(draggedIndex, 1);
      newProducts.splice(index, 0, draggedItem);
      setDraggedIndex(index);
      return newProducts;
    });
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setProducts((prev) => {
      const newProducts = [...prev];
      const item = newProducts[index];
      newProducts.splice(index, 1);
      newProducts.splice(index - 1, 0, item);
      return newProducts;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === products.length - 1) return;
    setProducts((prev) => {
      const newProducts = [...prev];
      const item = newProducts[index];
      newProducts.splice(index, 1);
      newProducts.splice(index + 1, 0, item);
      return newProducts;
    });
  };

  return (
    <form ref={formRef} action={reorderFeaturedProductsAction} className={styles.adminToolbar}>
      <input 
        type="hidden" 
        name="ordered_ids" 
        value={products.map((p) => p.id).join(",")} 
      />
      
      <div className={styles.sectionBar}>
        <h2>Arraste para reordenar</h2>
        <AdminSubmitButton variant="primary" pendingLabel="Salvando ordem...">
          Salvar Ordem
        </AdminSubmitButton>
      </div>

      <div className={styles.grid}>
        {products.map((product, index) => (
          <div
            key={product.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            style={{
              padding: "1rem",
              border: "1px solid var(--vision-line)",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--vision-paper)",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              cursor: "grab",
              opacity: draggedIndex === index ? 0.5 : 1,
              transition: "transform 0.2s",
            }}
          >
            <div style={{ flex: "0 0 64px", height: "64px", position: "relative", backgroundColor: "var(--vision-warm-white)" }}>
              {product.cover ? (
                <Image
                  src={catalogImageUrl({ ...product.cover, id: "dummy", isCover: true, width: 200, height: 200, updatedAt: "0" }, "catalog_card")}
                  alt={product.cover.alt_text}
                  fill
                  style={{ objectFit: "cover", objectPosition: product.cover.object_position }}
                  unoptimized
                />
              ) : null}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: "0.85rem" }}>{product.name}</p>
              <p style={{ margin: 0, color: "var(--vision-muted)", fontSize: "0.7rem" }}>
                {product.brand} · {product.sku}
              </p>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              <button 
                type="button" 
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem", cursor: index === 0 ? "not-allowed" : "pointer", opacity: index === 0 ? 0.5 : 1 }}
              >
                ▲
              </button>
              <button 
                type="button" 
                onClick={() => handleMoveDown(index)}
                disabled={index === products.length - 1}
                style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem", cursor: index === products.length - 1 ? "not-allowed" : "pointer", opacity: index === products.length - 1 ? 0.5 : 1 }}
              >
                ▼
              </button>
            </div>
          </div>
        ))}
      </div>
    </form>
  );
}
