"use client";

import { useMemo, useState, useTransition } from "react";

import { saveCollectionProductOrderAction } from "@/app/admin/(protected)/colecoes/actions";
import { savePromotionProductOrderAction } from "@/app/admin/(protected)/promocoes/actions";

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
  const [status, setStatus] = useState<"error" | "idle" | "saved" | "saving">("idle");
  const [pending, startTransition] = useTransition();
  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const available = products.filter((product) => !orderedIds.includes(product.id));
  const saveOrder = kind === "collection" ? saveCollectionProductOrderAction : savePromotionProductOrderAction;

  function commit(next: string[]) {
    setOrderedIds(next);
    setStatus("saving");
    startTransition(async () => {
      const result = await saveOrder({ entityId, orderedIds: next });
      setStatus(result.ok ? "saved" : "error");
    });
  }

  function move(index: number, offset: number) {
    const target = index + offset;
    if (target < 0 || target >= orderedIds.length || pending) return;
    const next = [...orderedIds];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  }

  function addCandidate() {
    if (!candidate || orderedIds.includes(candidate) || pending) return;
    commit([...orderedIds, candidate]);
    setCandidate("");
  }

  return (
    <div className={styles.stack}>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Adicionar produto</span>
          <select disabled={pending} onChange={(event) => setCandidate(event.currentTarget.value)} value={candidate}>
            <option value="">Selecione um produto</option>
            {available.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.name}</option>)}
          </select>
        </label>
        <div className={styles.formActions}>
          <button className={styles.secondaryButton} disabled={!candidate || pending} onClick={addCandidate} type="button">Adicionar à sequência</button>
        </div>
      </div>

      {orderedIds.length ? (
        <ol className={styles.orderList}>
          {orderedIds.map((id, index) => {
            const product = productMap.get(id);
            if (!product) return null;
            return (
              <li
                key={id}
              >
                <span>{index + 1}</span>
                <div><strong>{product.name}</strong><small>{product.sku}</small></div>
                <div className={styles.rowActions}>
                  <button aria-label={`Mover ${product.name} uma posição para trás`} className={styles.textButton} disabled={index === 0 || pending} onClick={() => move(index, -1)} type="button">Mover antes</button>
                  <button aria-label={`Mover ${product.name} uma posição para frente`} className={styles.textButton} disabled={index === orderedIds.length - 1 || pending} onClick={() => move(index, 1)} type="button">Mover depois</button>
                  <button className={styles.textButton} disabled={pending} onClick={() => commit(orderedIds.filter((entry) => entry !== id))} type="button">Remover</button>
                </div>
              </li>
            );
          })}
        </ol>
      ) : <p className={styles.notice}>Nenhum produto relacionado.</p>}

      <p className={status === "error" ? styles.formError : styles.fieldStatus} role="status">
        {status === "saving" ? "Salvando ordem..." : status === "saved" ? "Ordem salva." : status === "error" ? "Não foi possível salvar a ordem. Tente novamente." : "Use “Mover antes” e “Mover depois”. Cada mudança é salva automaticamente."}
      </p>
    </div>
  );
}
