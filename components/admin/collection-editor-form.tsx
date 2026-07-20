"use client";

import { useState } from "react";

import { updateCollectionAction } from "@/app/admin/(protected)/colecoes/actions";
import type { CollectionHomeVariant } from "@/lib/content-placements";

import { AdminSubmitButton } from "./admin-form-controls";
import styles from "./admin.module.css";

const VARIANT_GUIDES: Record<CollectionHomeVariant, string> = {
  "cinematic-cover": "Uma capa ampla com texto. Boa quando a foto conduz a seção.",
  "editorial-protagonist": "Uma galeria de fotos ganha o centro da composição.",
  "product-rail": "Os produtos aparecem em uma lista horizontal fácil de percorrer.",
  "split-diptych": "Capa e produtos dividem a seção em dois blocos.",
};

export type CollectionEditorValues = {
  description: string;
  displayOrder: number;
  endsAt: string;
  featured: boolean;
  homeCtaLabel: string;
  homeCtaTarget: string;
  homeDescription: string;
  homeEnabled: boolean;
  homeGalleryId: string;
  homeTitle: string;
  homeVariant: CollectionHomeVariant;
  id: string;
  name: string;
  published: boolean;
  slug: string;
  startsAt: string;
};

export function CollectionEditorForm({
  allowedVariants,
  galleryOptions,
  initial,
  variantLabels,
}: {
  allowedVariants: CollectionHomeVariant[];
  galleryOptions: { id: string; name: string }[];
  initial: CollectionEditorValues;
  variantLabels: Record<CollectionHomeVariant, string>;
}) {
  const [published, setPublished] = useState(initial.published);
  const [featured, setFeatured] = useState(initial.featured);
  const [homeEnabled, setHomeEnabled] = useState(initial.homeEnabled);
  const [variant, setVariant] = useState<CollectionHomeVariant>(initial.homeVariant);

  return (
    <form action={updateCollectionAction} className={styles.adminForm}>
      <input name="id" type="hidden" value={initial.id} />
      <input name="home_placement_key" type="hidden" value="featured_collection" />

      <div className={styles.formGrid}>
        <label className={styles.field}><span>Nome da coleção</span><input defaultValue={initial.name} maxLength={160} name="name" required /></label>
        <label className={`${styles.field} ${styles.fieldWide}`}><span>Descrição</span><textarea defaultValue={initial.description} maxLength={1000} name="description" placeholder="Explique a proposta da seleção em uma frase curta." /></label>
      </div>

      <fieldset className={styles.choiceGroup}>
        <legend>Onde esta coleção deve aparecer?</legend>
        <p className={styles.choiceHint}>Você pode usar a coleção somente no catálogo, somente na home ou nos dois lugares.</p>
        <div className={styles.visibilityChoices}>
          <label className={styles.checkboxField}>
            <input checked={published} name="published" onChange={(event) => { setPublished(event.currentTarget.checked); if (!event.currentTarget.checked) setFeatured(false); }} type="checkbox" />
            <span>Mostrar no catálogo</span>
          </label>
          <label className={styles.checkboxField}>
            <input checked={featured} disabled={!published} name="featured" onChange={(event) => setFeatured(event.currentTarget.checked)} type="checkbox" />
            <span>Dar destaque dentro do catálogo</span>
          </label>
          <label className={styles.checkboxField}>
            <input checked={homeEnabled} name="home_enabled" onChange={(event) => setHomeEnabled(event.currentTarget.checked)} type="checkbox" />
            <span>Preparar esta coleção para aparecer na página inicial</span>
          </label>
        </div>
      </fieldset>

      {homeEnabled ? (
        <section className={styles.homeEditorPanel} aria-labelledby="collection-home-options-title">
          <div className={styles.formSectionHeading}>
            <span aria-hidden="true">2</span>
            <div><h3 id="collection-home-options-title">Como ela aparece na página inicial</h3><p>Escolha uma composição e preencha somente o texto que o visitante verá.</p></div>
          </div>
          <fieldset className={styles.variantChoices}>
            <legend>Composição visual</legend>
            <div>
              {allowedVariants.map((value) => (
                <label key={value}>
                  <input checked={variant === value} name="home_variant" onChange={() => setVariant(value)} type="radio" value={value} />
                  <span><strong>{variantLabels[value]}</strong><small>{VARIANT_GUIDES[value]}</small></span>
                </label>
              ))}
            </div>
          </fieldset>
          {variant === "editorial-protagonist" ? (
            <label className={styles.field}><span>Galeria de fotos usada nesta composição</span><select defaultValue={initial.homeGalleryId} name="home_gallery_id" required><option disabled value="">Escolha uma galeria</option>{galleryOptions.map((gallery) => <option key={gallery.id} value={gallery.id}>{gallery.name}</option>)}</select><small className={styles.fieldHint}>Se nenhuma opção aparecer, crie primeiro uma galeria para “Coleção em destaque”.</small></label>
          ) : <input name="home_gallery_id" type="hidden" value="" />}
          <div className={styles.formGrid}>
            <label className={`${styles.field} ${styles.fieldWide}`}><span>Título que aparece no site</span><input defaultValue={initial.homeTitle} maxLength={160} name="home_title" required /></label>
            <label className={`${styles.field} ${styles.fieldWide}`}><span>Texto curto que aparece no site</span><textarea defaultValue={initial.homeDescription} maxLength={340} name="home_description" required /></label>
            <label className={styles.field}><span>Texto do botão</span><input defaultValue={initial.homeCtaLabel} maxLength={80} name="home_cta_label" required /></label>
            <label className={styles.field}><span>O que acontece ao tocar no botão</span><select defaultValue={initial.homeCtaTarget} name="home_cta_target"><option value="collection">Abre esta coleção no catálogo</option><option value="catalog">Abre o catálogo completo</option><option value="instagram">Abre o Instagram</option><option value="whatsapp">Abre o WhatsApp</option></select></label>
          </div>
        </section>
      ) : null}

      <details className={styles.adminDetails}>
        <summary>Agenda e configurações avançadas</summary>
        <p>Datas são opcionais e não criam mensagens de urgência no site. O identificador da URL só deve mudar antes da divulgação.</p>
        <div className={styles.formGrid}>
          <label className={styles.field}><span>Identificador na URL</span><input defaultValue={initial.slug} maxLength={120} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label>
          <label className={styles.field}><span>Ordem no catálogo</span><input defaultValue={initial.displayOrder} min="0" name="display_order" required type="number" /></label>
          <label className={styles.field}><span>Começar a exibir em</span><input defaultValue={initial.startsAt} name="starts_at" type="datetime-local" /></label>
          <label className={styles.field}><span>Parar de exibir em</span><input defaultValue={initial.endsAt} name="ends_at" type="datetime-local" /></label>
        </div>
      </details>

      <AdminSubmitButton>Salvar rascunho da coleção</AdminSubmitButton>
    </form>
  );
}
