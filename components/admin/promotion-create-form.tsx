"use client";

import { useState } from "react";

import { createPromotionAction } from "@/app/admin/(protected)/promocoes/actions";

import { AdminSubmitButton } from "./admin-form-controls";
import { ImageFocusInput } from "./image-focus-input";
import styles from "./admin.module.css";

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function PromotionCreateForm() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [active, setActive] = useState(false);
  const [featured, setFeatured] = useState(false);

  return (
    <form action={createPromotionAction} className={styles.adminForm}>
      <div className={styles.productFormSections}>
        <section className={styles.productFormSection}>
          <Step number="1" text="Escolha o tipo e escreva apenas o conteúdo confirmado." title="Conteúdo" />
          <div className={styles.formGrid}>
            <label className={styles.field}><span>Que tipo de destaque é este?</span><select defaultValue="highlight" name="type" required><option value="highlight">Destaque editorial</option><option value="launch">Lançamento</option><option value="collection">Seleção ou coleção</option><option value="promotion">Promoção com condição real confirmada</option></select></label>
            <label className={styles.field}><span>Título</span><input maxLength={160} name="title" onChange={(event) => { const value = event.currentTarget.value; setTitle(value); setSlug(slugify(value)); }} required value={title} /></label>
            <label className={`${styles.field} ${styles.fieldWide}`}><span>Descrição curta</span><textarea maxLength={600} name="short_description" placeholder="Explique o destaque sem criar prazo, desconto ou condição não confirmada." /></label>
            <label className={styles.field}><span>Texto do botão</span><input maxLength={80} name="cta_label" placeholder="Ex.: Falar no WhatsApp" required /></label>
            <label className={styles.field}><span>O que acontece ao tocar no botão</span><select defaultValue="whatsapp" name="cta_target"><option value="whatsapp">Abre o WhatsApp oficial</option><option value="instagram">Abre o Instagram oficial</option><option value="maps">Abre a rota oficial</option></select></label>
          </div>
        </section>

        <section className={styles.productFormSection}>
          <Step number="2" text="Escolha a imagem e toque no ponto que deve permanecer visível." title="Imagem e enquadramento" />
          <label className={styles.field}><span>Descrição da imagem para acessibilidade</span><input maxLength={220} name="image_alt_text" required /></label>
          <ImageFocusInput alt="Prévia do novo destaque" fileInput={{ id: "promotion-image", name: "file", required: true }} positionNames={{ desktop: "image_object_position" }} responsive={false} />
        </section>

        <section className={styles.productFormSection}>
          <Step number="3" text="Defina quando o conteúdo pode aparecer. O fim deve ser posterior ao início." title="Período e estado" />
          <div className={styles.formGrid}>
            <label className={styles.field}><span>Começar a exibir em</span><input name="starts_at" required type="datetime-local" /></label>
            <label className={styles.field}><span>Parar de exibir em</span><input name="ends_at" required type="datetime-local" /></label>
            <label className={styles.checkboxField}><input checked={active} name="active" onChange={(event) => { setActive(event.currentTarget.checked); if (!event.currentTarget.checked) setFeatured(false); }} type="checkbox" /><span>Ativar dentro deste período</span></label>
            <label className={styles.checkboxField}><input checked={featured} disabled={!active} name="featured" onChange={(event) => setFeatured(event.currentTarget.checked)} type="checkbox" /><span>Usar como destaque principal</span></label>
          </div>
        </section>
      </div>

      <details className={styles.adminDetails}>
        <summary>Configurações avançadas</summary>
        <p>O identificador é criado automaticamente. A prioridade só importa quando existem vários destaques ativos.</p>
        <div className={styles.formGrid}>
          <label className={styles.field}><span>Identificador na URL</span><input maxLength={120} name="slug" onChange={(event) => setSlug(event.currentTarget.value)} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required value={slug} /></label>
          <label className={styles.field}><span>Prioridade</span><input defaultValue="0" min="0" name="priority" required type="number" /><small className={styles.fieldHint}>O maior número vem primeiro.</small></label>
        </div>
      </details>
      <AdminSubmitButton pendingLabel="Criando destaque...">Criar rascunho do destaque</AdminSubmitButton>
    </form>
  );
}

function Step({ number, text, title }: { number: string; text: string; title: string }) {
  return <div className={styles.formSectionHeading}><span aria-hidden="true">{number}</span><div><h3>{title}</h3><p>{text}</p></div></div>;
}
