"use client";

import { useActionState, useRef, useState } from "react";

import {
  createInlineBrandAction,
  type InlineBrandState,
} from "@/app/admin/(protected)/marcas/actions";
import { brandSlugFromName } from "@/lib/admin/brand-identity";

import { AdminSubmitButton } from "./admin-form-controls";
import { FilePreviewInput } from "./file-preview-input";
import { ProductSkuField } from "./product-sku-field";
import { ProductStyleSelector, type ProductStyleAssignment } from "./product-style-selector";
import styles from "./admin.module.css";

type ProductDefaults = {
  availability_status?: "available" | "consultation" | "last_unit" | "unavailable";
  brand_id?: string | null;
  category_id?: string | null;
  color?: string | null;
  display_order?: number;
  featured?: boolean;
  id?: string;
  model?: string | null;
  name?: string;
  price?: number | null;
  price_visibility?: "consult" | "hidden" | "visible";
  published?: boolean;
  short_description?: string | null;
  sku?: string;
  slug?: string;
  whatsapp_message_override?: string | null;
};

const initialInlineBrandState: InlineBrandState = { status: "idle" };

export function ProductForm({
  action,
  archived = false,
  brands,
  categories,
  defaults = {},
  editing = false,
  styleAssignments = [],
  styleEligibilityReasons = [],
  styleOptions = [],
}: {
  action: (formData: FormData) => Promise<void>;
  archived?: boolean;
  brands: { active: boolean; id: string; name: string }[];
  categories: { active: boolean; id: string; name: string }[];
  defaults?: ProductDefaults;
  editing?: boolean;
  styleAssignments?: ProductStyleAssignment[];
  styleEligibilityReasons?: string[];
  styleOptions?: { active: boolean; description: string; id: string; label: string }[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [brandOptions, setBrandOptions] = useState(brands);
  const [selectedBrandId, setSelectedBrandId] = useState(defaults.brand_id ?? "");
  const [brandName, setBrandName] = useState("");
  const [brandState, submitBrand, brandPending] = useActionState(
    async (previous: InlineBrandState, formData: FormData) => {
      const result = await createInlineBrandAction(previous, formData);
      if (result.status === "created" && result.brand) {
        const createdBrand = result.brand;
        setBrandOptions((current) => current.some((brand) => brand.id === createdBrand.id)
          ? current
          : [...current, createdBrand].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
        setSelectedBrandId(createdBrand.id);
        setBrandName("");
        dialogRef.current?.close();
      }
      return result;
    },
    initialInlineBrandState,
  );

  function useExistingBrand() {
    if (!brandState.brand) return;
    const existingBrand = brandState.brand;
    setBrandOptions((current) => current.some((brand) => brand.id === existingBrand.id)
      ? current
      : [...current, existingBrand].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
    setSelectedBrandId(existingBrand.id);
    setBrandName("");
    dialogRef.current?.close();
  }

  return (
    <>
      <form action={action} className={styles.adminForm}>
      {defaults.id ? <input name="id" type="hidden" value={defaults.id} /> : null}
      <fieldset className={styles.formFieldset} disabled={archived}>
        <div className={styles.formGrid}>
          <ProductSkuField defaultValue={defaults.sku} generateEnabled={!editing} />
          <label className={styles.field}>
            <span>Slug</span>
            <input defaultValue={defaults.slug} maxLength={120} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span>Nome</span>
            <input defaultValue={defaults.name} maxLength={160} name="name" required />
          </label>
          <div className={styles.field}>
            <span id="product-brand-label">Marca</span>
            <div className={styles.inlineSelectAction}>
              <select aria-labelledby="product-brand-label" name="brand_id" onChange={(event) => setSelectedBrandId(event.target.value)} value={selectedBrandId}>
                <option value="">Sem marca vinculada</option>
                {brandOptions.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}{brand.active ? "" : " · inativa"}</option>)}
              </select>
              <button className={styles.secondaryButton} onClick={() => dialogRef.current?.showModal()} type="button">Nova marca</button>
            </div>
            {brandState.status === "created" ? <small className={styles.fieldStatus}>{brandState.message}</small> : null}
          </div>
          <label className={styles.field}>
            <span>Categoria</span>
            <select defaultValue={defaults.category_id ?? ""} name="category_id">
              <option value="">Sem categoria vinculada</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}{category.active ? "" : " · inativa"}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Modelo</span>
            <input defaultValue={defaults.model ?? ""} maxLength={120} name="model" />
          </label>
          <label className={styles.field}>
            <span>Cor</span>
            <input defaultValue={defaults.color ?? ""} maxLength={120} name="color" />
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span>Descrição curta</span>
            <textarea defaultValue={defaults.short_description ?? ""} maxLength={600} name="short_description" />
          </label>
          <label className={styles.field}>
            <span>Preço opcional</span>
            <input defaultValue={defaults.price ?? ""} min="0" name="price" step="0.01" type="number" />
          </label>
          <label className={styles.field}>
            <span>Visibilidade do preço</span>
            <select defaultValue={defaults.price_visibility ?? "consult"} name="price_visibility" required>
              <option value="consult">Consultar</option>
              <option value="visible">Visível</option>
              <option value="hidden">Oculto</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>Disponibilidade</span>
            <select defaultValue={defaults.availability_status ?? "consultation"} name="availability_status" required>
              <option value="consultation">Sob consulta</option>
              <option value="available">Disponível</option>
              <option value="last_unit">Última unidade</option>
              <option value="unavailable">Indisponível</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>Ordem</span>
            <input defaultValue={defaults.display_order ?? 0} min="0" name="display_order" required type="number" />
          </label>
          {editing ? (
            <>
              <label className={styles.checkboxField}>
                <input defaultChecked={defaults.published} name="published" type="checkbox" />
                <span>Publicado</span>
              </label>
              <label className={styles.checkboxField}>
                <input defaultChecked={defaults.featured} name="featured" type="checkbox" />
                <span>Destaque na home</span>
              </label>
            </>
          ) : (
            <>
              <input name="published" type="hidden" value="false" />
              <input name="featured" type="hidden" value="false" />
            </>
          )}
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span>Mensagem personalizada do WhatsApp</span>
            <textarea defaultValue={defaults.whatsapp_message_override ?? ""} maxLength={1200} name="whatsapp_message_override" />
            <small className={styles.fieldHint}>Opcional. Não inclua prazo, estoque ou condição comercial não confirmada.</small>
          </label>
          {styleOptions.length ? (
            <ProductStyleSelector
              assignments={styleAssignments}
              eligibilityReasons={styleEligibilityReasons}
              options={styleOptions}
            />
          ) : null}
        </div>
        <div className={styles.formActions}>
          <AdminSubmitButton pendingLabel={editing ? "Salvando produto..." : "Criando rascunho..."}>
            {editing ? "Salvar produto" : "Criar rascunho"}
          </AdminSubmitButton>
        </div>
      </fieldset>
      </form>

      <dialog aria-labelledby="new-inline-brand-title" className={styles.inlineDialog} ref={dialogRef}>
        <form action={submitBrand} className={styles.inlineDialogCard}>
          <div className={styles.panelHeading}>
            <div><p className={styles.eyebrow}>Produtos</p><h2 id="new-inline-brand-title">Nova marca</h2><p>Confirme a criação. Digitar um nome no produto nunca cria uma marca automaticamente.</p></div>
            <button aria-label="Fechar criação de marca" className={styles.textButton} onClick={() => dialogRef.current?.close()} type="button">Fechar</button>
          </div>
          <div className={styles.formGrid}>
            <label className={`${styles.field} ${styles.fieldWide}`}><span>Nome</span><input autoFocus maxLength={120} name="name" onChange={(event) => setBrandName(event.target.value)} required value={brandName} /></label>
            <label className={styles.field}><span>Slug gerado automaticamente</span><input aria-readonly="true" name="slug_preview" readOnly value={brandSlugFromName(brandName)} /></label>
            <label className={styles.field}><span>Ordem opcional</span><input min="0" name="display_order" placeholder="0" type="number" /></label>
            <div className={styles.fieldWide}><FilePreviewInput id="inline-brand-logo" name="logo" /></div>
          </div>
          {brandState.status === "duplicate" ? <div className={styles.inlineSuggestion}><p>{brandState.message} Use o cadastro existente para evitar duplicidade.</p><button className={styles.secondaryButton} onClick={useExistingBrand} type="button">Usar marca existente</button></div> : null}
          {brandState.status === "error" ? <p className={styles.formError}>{brandState.message}</p> : null}
          <div className={styles.formActions}>
            <button className={styles.secondaryButton} onClick={() => dialogRef.current?.close()} type="button">Cancelar</button>
            <button className={styles.primaryButton} disabled={brandPending || !brandName.trim()} type="submit">{brandPending ? "Criando marca..." : "Confirmar nova marca"}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
