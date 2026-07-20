"use client";

import { useState, useTransition } from "react";

import {
  removeProductImageAction,
} from "@/app/admin/(protected)/produtos/actions";

import { ConfirmSubmitButton } from "./admin-form-controls";
import styles from "./admin.module.css";
import { ProductImageUploader } from "./product-image-uploader";
import { saveProductCover, saveProductImageOrder } from "./product-media-client";

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
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function move(id: string, offset: number) {
    const previous = ordered;
    const index = previous.findIndex((image) => image.id === id);
    const nextIndex = index + offset;
    if (index < 0 || nextIndex < 0 || nextIndex >= previous.length || pending) return;
    const next = [...previous];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setOrdered(next);
    setMessage("Salvando a nova sequência...");
    startTransition(async () => {
      const saved = await saveProductImageOrder(next.map((image) => image.id), productId);
      if (!saved) {
        setOrdered(previous);
        setMessage("Não foi possível salvar a sequência. A ordem anterior foi restaurada.");
      } else setMessage("Sequência salva automaticamente.");
    });
  }

  function chooseCover(id: string) {
    if (pending) return;
    const previous = ordered;
    setOrdered((current) => current.map((image) => ({ ...image, isCover: image.id === id })));
    setMessage("Salvando a nova capa...");
    startTransition(async () => {
      const saved = await saveProductCover(id, productId);
      if (!saved) {
        setOrdered(previous);
        setMessage("Não foi possível alterar a capa. A capa anterior foi restaurada.");
      } else setMessage("Capa atualizada automaticamente.");
    });
  }

  function addMoreImages() {
    const input = document.getElementById(`product-images-${productId}`) as HTMLInputElement | null;
    const section = document.getElementById("product-upload-title");
    section?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    input?.click();
  }

  if (!ordered.length) return <div className={styles.emptyMediaState}><p>Nenhuma imagem vinculada a este produto.</p>{!readOnly ? <button className={styles.buttonLink} onClick={addMoreImages} type="button">Adicionar imagens</button> : null}</div>;

  return (
    <div className={styles.stack}>
      {readOnly ? <p className={styles.notice}>As imagens ficam somente para leitura enquanto o produto estiver arquivado.</p> : <p className={message?.startsWith("Não foi possível") ? styles.formError : styles.fieldHint} role="status">{message ?? "Mudanças de capa e sequência são salvas automaticamente."}</p>}

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
              <button aria-label={`Mover imagem ${index + 1} uma posição para trás`} className={styles.textButton} disabled={pending || index === 0} onClick={() => move(image.id, -1)} type="button">Mover antes</button>
              <button aria-label={`Mover imagem ${index + 1} uma posição para frente`} className={styles.textButton} disabled={pending || index === ordered.length - 1} onClick={() => move(image.id, 1)} type="button">Mover depois</button>
            </div> : null}
          </div>
          {!readOnly ? <div className={styles.stack}>
            {!image.isCover ? (
              <button className={styles.secondaryButton} disabled={pending} onClick={() => chooseCover(image.id)} type="button">Usar como capa</button>
            ) : null}

            <details className={styles.adminDetails}>
              <summary>Substituir ou remover</summary>
              <div className={styles.destructiveActions}>
                <ProductImageUploader imageId={image.id} productId={productId} />
                <form action={removeProductImageAction}>
                  <input name="image_id" type="hidden" value={image.id} />
                  <input name="product_id" type="hidden" value={productId} />
                  <ConfirmSubmitButton confirmation="Remover esta imagem do produto e do armazenamento?">Remover imagem</ConfirmSubmitButton>
                </form>
              </div>
            </details>
          </div> : null}
        </article>
      ))}
      {!readOnly ? <div className={styles.galleryAddMore}><div><strong>Adicionar mais fotos</strong><span>As novas imagens entram depois da última.</span></div><button className={styles.buttonLink} onClick={addMoreImages} type="button">Escolher mais imagens</button></div> : null}
    </div>
  );
}
