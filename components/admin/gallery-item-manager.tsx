"use client";

/* eslint-disable @next/next/no-img-element -- private short-lived Storage URLs are not Next image sources. */

import { useState } from "react";

import {
  removeGalleryItemAction,
  reorderGalleryItemsAction,
  replaceGalleryItemAction,
  updateGalleryItemAction,
} from "@/app/admin/(protected)/galerias/actions";
import type { GalleryLocation } from "@/lib/admin/gallery-locations";

import { AdminSubmitButton, ConfirmSubmitButton } from "./admin-form-controls";
import { BackgroundColorField } from "./background-color-field";
import { FilePreviewInput } from "./file-preview-input";
import { GalleryPreviewEditor, type GalleryPreviewItem } from "./gallery-preview-editor";
import styles from "./admin.module.css";

export function GalleryItemManager({ galleryId, items, location }: { galleryId: string; items: GalleryPreviewItem[]; location: GalleryLocation | null }) {
  const [ordered, setOrdered] = useState(items);
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const activeItem = ordered.find((item) => item.id === activeId) ?? ordered[0];

  function updatePosition(id: string, device: "desktop" | "mobile", value: string) {
    setOrdered((current) => current.map((item) => item.id === id
      ? { ...item, [device === "desktop" ? "desktopObjectPosition" : "mobileObjectPosition"]: value }
      : item));
  }

  function updateScale(id: string, device: "desktop" | "mobile", value: number) {
    setOrdered((current) => current.map((item) => item.id === id
      ? { ...item, [device === "desktop" ? "desktopScale" : "mobileScale"]: value }
      : item));
  }

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

  if (!ordered.length) return <p className={styles.notice}>Nenhuma imagem cadastrada. Comece adicionando uma foto na etapa anterior.</p>;

  return (
    <div className={styles.stackLarge}>
      <GalleryPreviewEditor activeId={activeId} items={ordered} location={location} onActiveChange={setActiveId} onPositionChange={updatePosition} onScaleChange={updateScale} />

      {activeItem ? (
        <form action={updateGalleryItemAction} className={styles.focusSaveBar}>
          <input name="gallery_id" type="hidden" value={galleryId} />
          <input name="item_id" type="hidden" value={activeItem.id} />
          <input name="alt_text" type="hidden" value={activeItem.altText} />
          <input name="visual_series" type="hidden" value={activeItem.visualSeries ?? ""} />
          <input name="series_order" type="hidden" value={activeItem.seriesOrder ?? ""} />
          <input name="mobile_object_position" type="hidden" value={activeItem.mobileObjectPosition} />
          <input name="desktop_object_position" type="hidden" value={activeItem.desktopObjectPosition} />
          <input name="mobile_scale" type="hidden" value={activeItem.mobileScale.toFixed(2)} />
          <input name="desktop_scale" type="hidden" value={activeItem.desktopScale.toFixed(2)} />
          <input name="editorial_role" type="hidden" value={activeItem.editorialRole} />
          <input name="background_color" type="hidden" value={activeItem.backgroundColor ?? ""} />
          {activeItem.published ? <input name="published" type="hidden" value="true" /> : null}
          <div><strong>Imagem {ordered.findIndex((item) => item.id === activeItem.id) + 1}</strong><span>Salva o foco e a aproximação do celular e do computador.</span></div>
          <AdminSubmitButton pendingLabel="Salvando enquadramento...">Salvar enquadramento</AdminSubmitButton>
        </form>
      ) : null}

      <section className={styles.orderPlanner} aria-labelledby="gallery-order-title">
        <div className={styles.panelHeading}>
          <div><h3 id="gallery-order-title">Ordem das imagens</h3><p>A primeira aparece antes. No celular, use os botões; nenhuma ação depende de arrastar.</p></div>
        </div>
        <ol className={styles.galleryOrderList}>
          {ordered.map((item, index) => (
            <li data-active={item.id === activeId || undefined} key={item.id}>
              <button className={styles.orderThumbnail} onClick={() => setActiveId(item.id)} type="button">
                <span>{index + 1}</span>
                {item.signedUrl ? <img alt="" src={item.signedUrl} /> : null}
              </button>
              <div><strong>Imagem {index + 1}</strong><small>{item.published ? "Publicada" : "Rascunho"}</small></div>
              <div className={styles.rowActions}>
                <button aria-label={`Mover imagem ${index + 1} uma posição para trás`} className={styles.textButton} disabled={index === 0} onClick={() => move(item.id, -1)} type="button">Mover antes</button>
                <button aria-label={`Mover imagem ${index + 1} uma posição para frente`} className={styles.textButton} disabled={index === ordered.length - 1} onClick={() => move(item.id, 1)} type="button">Mover depois</button>
              </div>
            </li>
          ))}
        </ol>
        <form action={reorderGalleryItemsAction} className={styles.formActions}>
          <input name="gallery_id" type="hidden" value={galleryId} />
          <input name="ordered_ids" type="hidden" value={JSON.stringify(ordered.map((item) => item.id))} />
          <AdminSubmitButton pendingLabel="Salvando nova ordem..." variant="secondary">Salvar ordem das imagens</AdminSubmitButton>
        </form>
      </section>

      <section aria-labelledby="gallery-details-title">
        <div className={styles.panelHeading}><div><h3 id="gallery-details-title">Informações de cada imagem</h3><p>Abra apenas a imagem que deseja editar. As opções técnicas ficam recolhidas.</p></div></div>
        <div className={styles.itemEditorList}>
          {ordered.map((item, index) => (
            <article className={styles.itemEditorCard} key={item.id}>
              <div className={styles.itemEditorSummary}>
                <button className={styles.itemPreviewButton} onClick={() => setActiveId(item.id)} type="button">
                  {item.signedUrl ? <img alt={item.altText} src={item.signedUrl} style={{ objectPosition: item.desktopObjectPosition }} /> : <span>Prévia indisponível</span>}
                </button>
                <div>
                  <span className={item.published ? styles.statusPositive : styles.statusNeutral}>{item.published ? "Publicada" : "Rascunho"}</span>
                  <strong>Imagem {index + 1}</strong>
                  <p>{item.altText}</p>
                  <button aria-pressed={activeId === item.id} className={styles.textButton} onClick={() => setActiveId(item.id)} type="button">Ajustar enquadramento acima</button>
                </div>
              </div>

              <form action={updateGalleryItemAction} className={styles.adminForm}>
                <input name="gallery_id" type="hidden" value={galleryId} />
                <input name="item_id" type="hidden" value={item.id} />
                <input name="mobile_object_position" type="hidden" value={item.mobileObjectPosition} />
                <input name="desktop_object_position" type="hidden" value={item.desktopObjectPosition} />
                <input name="mobile_scale" type="hidden" value={item.mobileScale.toFixed(2)} />
                <input name="desktop_scale" type="hidden" value={item.desktopScale.toFixed(2)} />
                <div className={styles.formGrid}>
                  <label className={`${styles.field} ${styles.fieldWide}`}><span>Descrição da imagem para acessibilidade</span><input defaultValue={item.altText} maxLength={220} name="alt_text" required /><small className={styles.fieldHint}>Descreva o que aparece, sem texto promocional.</small></label>
                  <label className={`${styles.checkboxField} ${styles.fieldWide}`}><input defaultChecked={item.published} name="published" type="checkbox" /><span>Incluir esta imagem na próxima publicação</span></label>
                </div>

                <details className={styles.adminDetails}>
                  <summary>Opções avançadas da imagem</summary>
                  <p>Use somente quando precisar agrupar uma sequência ou mudar a função visual.</p>
                  <div className={styles.formGrid}>
                    <label className={styles.field}><span>Nome do grupo de imagens</span><input defaultValue={item.visualSeries ?? ""} maxLength={80} name="visual_series" /><small className={styles.fieldHint}>Deixe vazio para uma imagem independente.</small></label>
                    <label className={styles.field}><span>Posição dentro do grupo</span><input defaultValue={item.seriesOrder ?? ""} min="0" name="series_order" type="number" /></label>
                    <label className={`${styles.field} ${styles.fieldWide}`}><span>Função visual</span><select defaultValue={item.editorialRole} name="editorial_role"><option value="primary">Principal — recebe mais destaque</option><option value="secondary">Complementar — acompanha a principal</option><option value="detail">Detalhe — mostra acabamento</option></select></label>
                    <BackgroundColorField initialValue={item.backgroundColor} />
                  </div>
                </details>
                <AdminSubmitButton pendingLabel="Salvando imagem..." variant="secondary">Salvar informações da imagem</AdminSubmitButton>
              </form>

              <details className={styles.adminDetails}>
                <summary>Substituir ou remover esta imagem</summary>
                <div className={styles.destructiveActions}>
                  <form action={replaceGalleryItemAction} className={styles.adminForm}>
                    <input name="gallery_id" type="hidden" value={galleryId} /><input name="item_id" type="hidden" value={item.id} />
                    <FilePreviewInput id={`gallery-replace-${item.id}`} name="file" required />
                    <AdminSubmitButton pendingLabel="Substituindo..." variant="secondary">Substituir arquivo</AdminSubmitButton>
                  </form>
                  <form action={removeGalleryItemAction}>
                    <input name="gallery_id" type="hidden" value={galleryId} /><input name="item_id" type="hidden" value={item.id} />
                    <ConfirmSubmitButton confirmation="Remover esta imagem do banco e do armazenamento?">Remover imagem</ConfirmSubmitButton>
                  </form>
                </div>
              </details>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
