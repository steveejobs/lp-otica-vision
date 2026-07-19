"use client";

import { useState } from "react";

import { reorderStyleProductsAction } from "@/app/admin/(protected)/estilos/actions";

import { AdminSubmitButton } from "./admin-form-controls";
import styles from "./admin.module.css";

export function StyleProductOrder({
  initialProducts,
  styleId,
}: {
  initialProducts: { id: string; name: string; sku: string }[];
  styleId: string;
}) {
  const [products, setProducts] = useState(initialProducts);

  function move(index: number, offset: number) {
    const destination = index + offset;
    if (destination < 0 || destination >= products.length) return;
    setProducts((current) => {
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  }

  return (
    <div className={styles.stack}>
      {products.length ? (
        <ol className={styles.orderList}>
          {products.map((product, index) => (
            <li key={product.id}>
              <span>{index + 1}</span>
              <div><strong>{product.name}</strong><small>{product.sku}</small></div>
              <div className={styles.rowActions}>
                <button className={styles.textButton} disabled={index === 0} onClick={() => move(index, -1)} type="button">Subir</button>
                <button className={styles.textButton} disabled={index === products.length - 1} onClick={() => move(index, 1)} type="button">Descer</button>
              </div>
            </li>
          ))}
        </ol>
      ) : <p className={styles.notice}>Nenhum produto classificado neste estilo.</p>}
      {products.length ? (
        <form action={reorderStyleProductsAction}>
          <input name="style_id" type="hidden" value={styleId} />
          <input name="ordered_ids" type="hidden" value={JSON.stringify(products.map((product) => product.id))} />
          <AdminSubmitButton pendingLabel="Salvando ordem..." variant="secondary">Salvar ordem editorial</AdminSubmitButton>
        </form>
      ) : null}
    </div>
  );
}
