"use client";

import { useState } from "react";

import {
  removeProductImageAction,
  reorderProductImagesAction,
  setProductCoverAction,
} from "@/app/admin/(protected)/produtos/actions";

import { AdminSubmitButton, ConfirmSubmitButton } from "./admin-form-controls";
import styles from "./admin.module.css";
import { ProductImageUploader } from "./product-image-uploader";

type ManagedProductImage = {
  altText: string;
  height: number | null;
  id: string;
  isCover: boolean;
  mimeType: string | null;
  objectPosition: string;
  signedUrl: string | null;
  sizeBytes: number | null;
  variants: Array<{
    height: number;
    kind: string;
    mime_type: string;
    size_bytes: number;
    storage_path: string;
    width: number;
  }>;
  width: number | null;
};

export function ProductImageManager({
  images,
  productId,
  readOnly = false,
}: {
  images: ManagedProductImage[];
  productId: string;
  readOnly?: boolean;
}) {
  const [ordered, setOrdered] = useState(images);

  function move(id: string, offset: number) {
    setOrdered((current) => {
      const index = current.findIndex((image) => image.id === id);
      const nextIndex = index + offset;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  if (!ordered.length) return <p className={styles.notice}>Nenhuma imagem vinculada a este produto.</p>;

  return (
    <div className={styles.stack}>
      {!readOnly ? (
        <form action={reorderProductImagesAction} className={styles.formActions}>
          <input name="product_id" type="hidden" value={productId} />
          <input name="ordered_ids" type="hidden" value={JSON.stringify(ordered.map((image) => image.id))} />
          <AdminSubmitButton pendingLabel="Salvando ordem..." variant="secondary">Salvar ordem das imagens</AdminSubmitButton>
        </form>
      ) : <p className={styles.notice}>As imagens ficam somente para leitura enquanto o produto estiver arquivado.</p>}

      {ordered.map((image, index) => (
        <article
          className={styles.imageRow}
          key={image.id}
        >
          <div>
            {image.signedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- short-lived private Storage URL.
              <img alt={image.altText} className={styles.imagePreview} src={image.signedUrl} style={{ objectPosition: image.objectPosition }} />
            ) : (
              <div className={styles.imagePreview}>Prévia indisponível</div>
            )}
            <p className={styles.recordMeta}>
              <span>{index + 1} de {ordered.length}</span>
              {image.isCover ? <strong>Capa</strong> : null}
            </p>
            {!readOnly ? <div className={styles.rowActions}>
              <button aria-label={`Mover imagem ${index + 1} uma posição para trás`} className={styles.textButton} disabled={index === 0} onClick={() => move(image.id, -1)} type="button">Mover antes</button>
              <button aria-label={`Mover imagem ${index + 1} uma posição para frente`} className={styles.textButton} disabled={index === ordered.length - 1} onClick={() => move(image.id, 1)} type="button">Mover depois</button>
            </div> : null}
          </div>
          {!readOnly ? <div className={styles.stack}>
            {!image.isCover ? (
              <form action={setProductCoverAction}>
                <input name="image_id" type="hidden" value={image.id} />
                <input name="product_id" type="hidden" value={productId} />
                <AdminSubmitButton pendingLabel="Definindo capa..." variant="secondary">Definir como capa</AdminSubmitButton>
              </form>
            ) : null}

            <ProductImageUploader imageId={image.id} productId={productId} />

            <form action={removeProductImageAction}>
              <input name="image_id" type="hidden" value={image.id} />
              <input name="product_id" type="hidden" value={productId} />
              <ConfirmSubmitButton confirmation="Remover esta imagem do produto e do Storage?">Remover imagem</ConfirmSubmitButton>
            </form>
          </div> : null}
        </article>
      ))}
    </div>
  );
}
