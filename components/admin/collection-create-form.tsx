"use client";

import { useState } from "react";

import { createCollectionAction } from "@/app/admin/(protected)/colecoes/actions";

import { AdminSubmitButton } from "./admin-form-controls";
import styles from "./admin.module.css";

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function CollectionCreateForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  return (
    <section className={styles.formPanel} aria-labelledby="new-collection-title">
      <div className={styles.panelHeading}>
        <div><h2 id="new-collection-title">Criar sem modelo</h2><p>Use quando nenhum dos modelos acima representar a seleção desejada.</p></div>
      </div>
      <form action={createCollectionAction} className={styles.adminForm}>
        <input name="display_order" type="hidden" value="0" />
        <div className={styles.formGrid}>
          <label className={styles.field}><span>Nome da coleção</span><input maxLength={160} name="name" onChange={(event) => { const value = event.currentTarget.value; setName(value); setSlug(slugify(value)); }} required value={name} /></label>
          <label className={`${styles.field} ${styles.fieldWide}`}><span>Descrição</span><textarea maxLength={1000} name="description" placeholder="Explique a proposta desta seleção." /></label>
        </div>
        <details className={styles.adminDetails}>
          <summary>Agenda e identificador avançado</summary>
          <p>As datas são opcionais. O identificador é criado automaticamente a partir do nome.</p>
          <div className={styles.formGrid}>
            <label className={styles.field}><span>Identificador na URL</span><input maxLength={120} name="slug" onChange={(event) => setSlug(event.currentTarget.value)} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required value={slug} /></label>
            <span aria-hidden="true" />
            <label className={styles.field}><span>Começar a exibir em</span><input name="starts_at" type="datetime-local" /></label>
            <label className={styles.field}><span>Parar de exibir em</span><input name="ends_at" type="datetime-local" /></label>
          </div>
        </details>
        <AdminSubmitButton pendingLabel="Criando coleção...">Criar rascunho</AdminSubmitButton>
      </form>
    </section>
  );
}
