"use client";

import { useState } from "react";

import {
  removeGalleryItemAction,
  reorderGalleryItemsAction,
  replaceGalleryItemAction,
  updateGalleryItemAction,
} from "@/app/admin/(protected)/galerias/actions";

import { AdminSubmitButton, ConfirmSubmitButton } from "./admin-form-controls";
import { FilePreviewInput } from "./file-preview-input";
import styles from "./admin.module.css";

type GalleryItem = {
  altText: string;
  desktopObjectPosition: string;
  height: number | null;
  id: string;
  mobileObjectPosition: string;
  published: boolean;
  seriesOrder: number | null;
  signedUrl: string | null;
  visualSeries: string | null;
  width: number | null;
};

export function GalleryItemManager({ galleryId, items }: { galleryId: string; items: GalleryItem[] }) {
  const [ordered, setOrdered] = useState(items);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function move(id: string, offset: number) {
    setOrdered((current) => {
      const index = current.findIndex((item) => item.id === id);
      const target = index + offset;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function drop(targetId: string) {
    if (!draggingId || draggingId === targetId) return;
    setOrdered((current) => {
      const source = current.find((item) => item.id === draggingId);
      if (!source) return current;
      const next = current.filter((item) => item.id !== draggingId);
      next.splice(next.findIndex((item) => item.id === targetId), 0, source);
      return next;
    });
    setDraggingId(null);
  }

  if (!ordered.length) return <p className={styles.notice}>Nenhum item cadastrado nesta galeria.</p>;

  return (
    <div className={styles.stack}>
      <p className={styles.notice}>Itens da mesma série devem permanecer contíguos e na ordem interna indicada. O servidor rejeita qualquer sequência que quebre silenciosamente essa regra.</p>
      <form action={reorderGalleryItemsAction} className={styles.formActions}>
        <input name="gallery_id" type="hidden" value={galleryId} />
        <input name="ordered_ids" type="hidden" value={JSON.stringify(ordered.map((item) => item.id))} />
        <AdminSubmitButton pendingLabel="Validando sequência..." variant="secondary">Salvar ordem geral</AdminSubmitButton>
      </form>
      {ordered.map((item, index) => {
        const previousSeries = index > 0 ? ordered[index - 1].visualSeries : null;
        const startsSeries = Boolean(item.visualSeries && item.visualSeries !== previousSeries);
        return (
          <article
            aria-grabbed={draggingId === item.id}
            className={`${styles.imageRow} ${startsSeries ? styles.seriesBoundary : ""}`}
            draggable
            key={item.id}
            onDragEnd={() => setDraggingId(null)}
            onDragOver={(event) => event.preventDefault()}
            onDragStart={() => setDraggingId(item.id)}
            onDrop={() => drop(item.id)}
          >
            <div>
              {item.visualSeries ? <span className={styles.seriesBadge}>Série: {item.visualSeries} · posição {item.seriesOrder ?? "?"}</span> : <span className={styles.phaseBadge}>Item independente</span>}
              {item.signedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- short-lived private Storage URL.
                <img alt={item.altText} className={styles.imagePreview} src={item.signedUrl} style={{ objectPosition: item.desktopObjectPosition }} />
              ) : <div className={styles.imagePreview}>Prévia indisponível</div>}
              <p className={styles.recordMeta}><span>{index + 1} de {ordered.length}</span><span>{item.width ?? "?"} × {item.height ?? "?"}</span><span>{item.published ? "Publicado" : "Rascunho"}</span></p>
              <div className={styles.rowActions}>
                <button className={styles.textButton} disabled={index === 0} onClick={() => move(item.id, -1)} type="button">Subir</button>
                <button className={styles.textButton} disabled={index === ordered.length - 1} onClick={() => move(item.id, 1)} type="button">Descer</button>
              </div>
            </div>
            <div className={styles.stack}>
              <form action={updateGalleryItemAction} className={styles.adminForm}>
                <input name="gallery_id" type="hidden" value={galleryId} /><input name="item_id" type="hidden" value={item.id} />
                <div className={styles.formGrid}>
                  <label className={`${styles.field} ${styles.fieldWide}`}><span>Texto alternativo</span><input defaultValue={item.altText} maxLength={220} name="alt_text" required /></label>
                  <label className={styles.field}><span>Série visual</span><input defaultValue={item.visualSeries ?? ""} maxLength={80} name="visual_series" /></label>
                  <label className={styles.field}><span>Ordem na série</span><input defaultValue={item.seriesOrder ?? ""} min="0" name="series_order" type="number" /></label>
                  <label className={styles.field}><span>Enquadramento mobile</span><input defaultValue={item.mobileObjectPosition} name="mobile_object_position" pattern="(?:\d{1,3}%|left|center|right) (?:\d{1,3}%|top|center|bottom)" required /></label>
                  <label className={styles.field}><span>Enquadramento desktop</span><input defaultValue={item.desktopObjectPosition} name="desktop_object_position" pattern="(?:\d{1,3}%|left|center|right) (?:\d{1,3}%|top|center|bottom)" required /></label>
                  <label className={styles.checkboxField}><input defaultChecked={item.published} name="published" type="checkbox" /><span>Publicado</span></label>
                </div>
                <AdminSubmitButton pendingLabel="Salvando item..." variant="secondary">Salvar item</AdminSubmitButton>
              </form>
              <form action={replaceGalleryItemAction} className={styles.adminForm}>
                <input name="gallery_id" type="hidden" value={galleryId} /><input name="item_id" type="hidden" value={item.id} />
                <FilePreviewInput id={`gallery-replace-${item.id}`} name="file" required />
                <AdminSubmitButton pendingLabel="Substituindo..." variant="secondary">Substituir arquivo</AdminSubmitButton>
              </form>
              <form action={removeGalleryItemAction}>
                <input name="gallery_id" type="hidden" value={galleryId} /><input name="item_id" type="hidden" value={item.id} />
                <ConfirmSubmitButton confirmation="Remover este item do banco e do Storage?">Remover item</ConfirmSubmitButton>
              </form>
            </div>
          </article>
        );
      })}
    </div>
  );
}

