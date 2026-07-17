"use client";

import { useMemo, useState } from "react";

import { syncCollectionProductsAction } from "@/app/admin/(protected)/colecoes/actions";
import { syncPromotionProductsAction } from "@/app/admin/(protected)/promocoes/actions";

import { AdminSubmitButton } from "./admin-form-controls";
import styles from "./admin.module.css";

type ProductOption = { id: string; name: string; sku: string };

export function OrderedProductPicker({
  entityId,
  initialIds,
  kind,
  products,
}: {
  entityId: string;
  initialIds: string[];
  kind: "collection" | "promotion";
  products: ProductOption[];
}) {
  const [orderedIds, setOrderedIds] = useState(initialIds);
  const [candidate, setCandidate] = useState("");
  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const available = products.filter((product) => !orderedIds.includes(product.id));
  const action = kind === "collection" ? syncCollectionProductsAction : syncPromotionProductsAction;

  function move(index: number, offset: number) {
    const target = index + offset;
    if (target < 0 || target >= orderedIds.length) return;
    setOrderedIds((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addCandidate() {
    if (!candidate || orderedIds.includes(candidate)) return;
    setOrderedIds((current) => [...current, candidate]);
    setCandidate("");
  }

  return (
    <div className={styles.stack}>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Adicionar produto</span>
          <select onChange={(event) => setCandidate(event.currentTarget.value)} value={candidate}>
            <option value="">Selecione um produto</option>
            {available.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.name}</option>)}
          </select>
        </label>
        <div className={styles.formActions}>
          <button className={styles.secondaryButton} disabled={!candidate} onClick={addCandidate} type="button">Adicionar à sequência</button>
        </div>
      </div>

      {orderedIds.length ? (
        <ol className={styles.orderList}>
          {orderedIds.map((id, index) => {
            const product = productMap.get(id);
            if (!product) return null;
            return (
              <li key={id}>
                <span>{index + 1}</span>
                <div><strong>{product.name}</strong><small>{product.sku}</small></div>
                <div className={styles.rowActions}>
                  <button className={styles.textButton} disabled={index === 0} onClick={() => move(index, -1)} type="button">Subir</button>
                  <button className={styles.textButton} disabled={index === orderedIds.length - 1} onClick={() => move(index, 1)} type="button">Descer</button>
                  <button className={styles.textButton} onClick={() => setOrderedIds((current) => current.filter((entry) => entry !== id))} type="button">Remover</button>
                </div>
              </li>
            );
          })}
        </ol>
      ) : <p className={styles.notice}>Nenhum produto relacionado.</p>}

      <form action={action}>
        <input name="entity_id" type="hidden" value={entityId} />
        <input name="ordered_ids" type="hidden" value={JSON.stringify(orderedIds)} />
        <AdminSubmitButton pendingLabel="Salvando produtos..." variant="secondary">Salvar produtos e ordem</AdminSubmitButton>
      </form>
    </div>
  );
}

