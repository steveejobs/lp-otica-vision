"use client";

import { useState } from "react";

import { createGalleryAction } from "@/app/admin/(protected)/galerias/actions";
import { GALLERY_LOCATIONS } from "@/lib/admin/gallery-locations";

import { AdminSubmitButton } from "./admin-form-controls";
import { AdminInfoTip } from "./admin-info-tip";
import styles from "./admin.module.css";

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function GalleryCreateForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  return (
    <form action={createGalleryAction} className={styles.adminForm}>
      <input name="display_order" type="hidden" value="0" />
      <div className={styles.formGrid}>
        <label className={styles.field}><span>Nome para identificar no ADM</span><input maxLength={160} name="name" onChange={(event) => { const value = event.currentTarget.value; setName(value); setSlug(slugify(value)); }} required value={name} /></label>
        <label className={styles.field}><span>Onde as imagens devem aparecer</span><select defaultValue="" name="location_key" required><option disabled value="">Escolha uma seção do site</option>{GALLERY_LOCATIONS.map((location) => <option key={location.key} value={location.key}>{location.label}</option>)}</select></label>
        <div className={`${styles.checkboxWithInfo} ${styles.fieldWide}`}>
          <label className={styles.checkboxField}><input name="autoplay" type="checkbox" /><span>Trocar as imagens automaticamente no site</span></label>
          <AdminInfoTip label="O que significa trocar as imagens automaticamente?">Quando ativado, o site avança sozinho entre as fotos. O visitante ainda pode trocar manualmente e o movimento é desativado quando o aparelho pede menos animações.</AdminInfoTip>
        </div>
      </div>
      <details className={styles.adminDetails}>
        <summary>Identificador avançado</summary>
        <p>Ele é criado automaticamente a partir do nome.</p>
        <div className={styles.formGrid}><label className={styles.field}><span>Identificador na URL</span><input maxLength={120} name="slug" onChange={(event) => setSlug(event.currentTarget.value)} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required value={slug} /></label></div>
      </details>
      <AdminSubmitButton pendingLabel="Criando galeria...">Criar rascunho</AdminSubmitButton>
    </form>
  );
}
