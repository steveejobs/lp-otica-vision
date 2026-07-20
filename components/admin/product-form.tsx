"use client";

import { useActionState, useRef, useState } from "react";

import {
  createInlineBrandAction,
  type InlineBrandState,
} from "@/app/admin/(protected)/marcas/actions";

import { AdminSubmitButton } from "./admin-form-controls";
import { ProductStyleSelector, type ProductStyleAssignment } from "./product-style-selector";
import styles from "./admin.module.css";

type ProductDefaults = {
  availability_status?: "available" | "consultation" | "last_unit" | "unavailable";
  brand_id?: string | null;
  category_id?: string | null;
  color?: string | null;
  featured?: boolean;
  id?: string;
  model?: string | null;
  name?: string;
  price?: number | null;
  price_visibility?: "consult" | "hidden" | "visible";
  published?: boolean;
  short_description?: string | null;
};

const initialInlineBrandState: InlineBrandState = { status: "idle" };
const NEW_BRAND_VALUE = "__create_brand__";
const brlFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  minimumFractionDigits: 2,
  style: "currency",
});

function priceInCents(defaults: ProductDefaults) {
  if (defaults.price_visibility !== "visible" || !defaults.price || defaults.price <= 0) return "";
  return String(Math.round(defaults.price * 100));
}

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
  const [priceMode, setPriceMode] = useState<"consult" | "defined">(
    defaults.price_visibility === "visible" && Boolean(defaults.price && defaults.price > 0)
      ? "defined"
      : "consult",
  );
  const [priceCents, setPriceCents] = useState(() => priceInCents(defaults));
  const [publication, setPublication] = useState<"draft" | "published">(
    defaults.published ? "published" : "draft",
  );
  const [featured, setFeatured] = useState(Boolean(defaults.featured));
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

  function selectBrand(value: string) {
    if (value === NEW_BRAND_VALUE) {
      dialogRef.current?.showModal();
      return;
    }
    setSelectedBrandId(value);
  }

  const maskedPrice = priceCents ? brlFormatter.format(Number(priceCents) / 100) : "";
  const submitLabel = !editing
    ? "Salvar rascunho"
    : !defaults.published && publication === "published"
      ? "Publicar produto"
      : !defaults.published
        ? "Salvar rascunho"
        : "Salvar alterações";

  return (
    <>
      <form action={action} className={styles.adminForm}>
        {defaults.id ? <input name="id" type="hidden" value={defaults.id} /> : null}
        <fieldset className={styles.formFieldset} disabled={archived}>
          <div className={styles.productFormSections}>
            <section aria-labelledby="product-main-title" className={styles.productFormSection}>
              <div className={styles.formSectionHeading}>
                <span>1</span>
                <div><h3 id="product-main-title">Informações</h3><p>O essencial para apresentar o produto na vitrine.</p></div>
              </div>
              <div className={styles.formGrid}>
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span>Nome do produto</span>
                  <input autoFocus defaultValue={defaults.name} maxLength={160} name="name" required />
                </label>
                <div className={styles.field}>
                  <span id="product-brand-label">Marca</span>
                  <select
                    aria-labelledby="product-brand-label"
                    name="brand_id"
                    onChange={(event) => selectBrand(event.target.value)}
                    value={selectedBrandId}
                  >
                    <option value="">Sem marca informada</option>
                    {brandOptions.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}{brand.active ? "" : " · inativa"}</option>)}
                    <option value={NEW_BRAND_VALUE}>Criar nova marca</option>
                  </select>
                  {brandState.status === "created" ? <small className={styles.fieldStatus}>{brandState.message}</small> : null}
                </div>
                <label className={styles.field}>
                  <span>Modelo (opcional)</span>
                  <input defaultValue={defaults.model ?? ""} maxLength={120} name="model" />
                </label>
                <label className={styles.field}>
                  <span>Categoria</span>
                  <select defaultValue={defaults.category_id ?? ""} name="category_id">
                    <option value="">Sem categoria informada</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}{category.active ? "" : " · inativa"}</option>)}
                  </select>
                </label>
              </div>
              {styleOptions.length ? (
                <ProductStyleSelector
                  assignments={styleAssignments}
                  eligibilityReasons={styleEligibilityReasons}
                  options={styleOptions}
                />
              ) : null}
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>Cor (opcional)</span>
                  <input defaultValue={defaults.color ?? ""} maxLength={120} name="color" />
                </label>
              </div>
            </section>

            <section aria-labelledby="product-presentation-title" className={styles.productFormSection}>
              <div className={styles.formSectionHeading}>
                <span>2</span>
                <div><h3 id="product-presentation-title">Apresentação</h3><p>{editing ? "Imagens e capa podem ser ajustadas logo abaixo. Depois, complete a descrição curta." : "Salve o rascunho para adicionar imagens e escolher a capa."}</p></div>
              </div>
              <div className={styles.formGrid}>
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span>Descrição curta (opcional)</span>
                  <textarea defaultValue={defaults.short_description ?? ""} maxLength={600} name="short_description" />
                </label>
              </div>
            </section>

            <section aria-labelledby="product-sale-title" className={styles.productFormSection}>
              <div className={styles.formSectionHeading}>
                <span>3</span>
                <div><h3 id="product-sale-title">Contato</h3><p>Defina como o produto aparece para quem consulta a Vision.</p></div>
              </div>
              <div className={styles.commercialFields}>
                <fieldset className={styles.choiceGroup}>
                  <legend>Preço</legend>
                  <div className={styles.segmentedControl}>
                    <label><input checked={priceMode === "consult"} name="price_mode" onChange={() => { setPriceMode("consult"); setPriceCents(""); }} type="radio" value="consult" /><span>Sob consulta</span></label>
                    <label><input checked={priceMode === "defined"} name="price_mode" onChange={() => setPriceMode("defined")} type="radio" value="defined" /><span>Preço definido</span></label>
                  </div>
                  <input name="price_cents" type="hidden" value={priceMode === "defined" ? priceCents : ""} />
                  {priceMode === "defined" ? (
                    <label className={styles.field}>
                      <span>Valor</span>
                      <input
                        autoComplete="off"
                        inputMode="numeric"
                        name="price_display"
                        onChange={(event) => {
                          const cents = event.currentTarget.value.replace(/\D/g, "").slice(0, 12);
                          setPriceCents(cents);
                          event.currentTarget.setCustomValidity(Number(cents) > 0 ? "" : "Informe um valor maior que zero.");
                        }}
                        onInvalid={(event) => event.currentTarget.setCustomValidity("Informe um valor maior que zero.")}
                        placeholder="R$ 1.290,00"
                        required
                        value={maskedPrice}
                      />
                      <small className={styles.fieldHint}>Digite somente o valor; a formatação em reais é automática.</small>
                    </label>
                  ) : <p className={styles.choiceHint}>A vitrine mostrará “Sob consulta” e nenhum valor será armazenado.</p>}
                </fieldset>

                <fieldset className={styles.choiceGroup}>
                  <legend>Disponibilidade</legend>
                  <div className={styles.availabilityChoices}>
                    {([
                      ["available", "Disponível"],
                      ["last_unit", "Última unidade"],
                      ["unavailable", "Indisponível"],
                    ] as const).map(([value, label]) => (
                      <label data-availability={value} key={value}>
                        <input defaultChecked={(defaults.availability_status === "consultation" ? "available" : defaults.availability_status ?? "available") === value} name="availability_status" type="radio" value={value} />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            </section>

            <section aria-labelledby="product-publication-title" className={styles.productFormSection}>
              <div className={styles.formSectionHeading}>
                <span>4</span>
                <div><h3 id="product-publication-title">Publicação</h3><p>Rascunhos ficam visíveis somente no painel administrativo.</p></div>
              </div>
              {editing ? (
                <div className={styles.publicationFields}>
                  <fieldset className={styles.choiceGroup}>
                    <legend>Estado</legend>
                    <div className={styles.segmentedControl}>
                      <label><input checked={publication === "draft"} name="published" onChange={() => { setPublication("draft"); setFeatured(false); }} type="radio" value="false" /><span>Rascunho</span></label>
                      <label><input checked={publication === "published"} name="published" onChange={() => setPublication("published")} type="radio" value="true" /><span>Publicado</span></label>
                    </div>
                  </fieldset>
                  <label className={styles.checkboxField}>
                    <input checked={featured} disabled={publication !== "published"} name="featured" onChange={(event) => setFeatured(event.target.checked)} type="checkbox" />
                    <span>Destacar na vitrine</span>
                  </label>
                </div>
              ) : (
                <>
                  <input name="published" type="hidden" value="false" />
                  <input name="featured" type="hidden" value="false" />
                  <p className={styles.choiceHint}>Este produto será salvo como rascunho. Adicione uma capa antes de publicar.</p>
                </>
              )}
            </section>
          </div>
          <div className={styles.formActions}>
            <AdminSubmitButton pendingLabel="Salvando produto...">{submitLabel}</AdminSubmitButton>
          </div>
        </fieldset>
      </form>

      <dialog aria-labelledby="new-inline-brand-title" className={styles.inlineDialog} ref={dialogRef}>
        <form action={submitBrand} className={styles.inlineDialogCard}>
          <div className={styles.panelHeading}>
            <div><p className={styles.eyebrow}>Marca</p><h2 id="new-inline-brand-title">Criar nova marca</h2><p>Informe somente o nome. A nova marca será selecionada automaticamente.</p></div>
            <button aria-label="Fechar criação de marca" className={styles.textButton} onClick={() => dialogRef.current?.close()} type="button">Fechar</button>
          </div>
          <label className={styles.field}><span>Nome da marca</span><input autoFocus maxLength={120} name="name" onChange={(event) => setBrandName(event.target.value)} required value={brandName} /></label>
          {brandState.status === "duplicate" ? <div className={styles.inlineSuggestion}><p>{brandState.message} Use o cadastro existente para evitar duplicidade.</p><button className={styles.secondaryButton} onClick={useExistingBrand} type="button">Usar marca existente</button></div> : null}
          {brandState.status === "error" ? <p className={styles.formError}>{brandState.message}</p> : null}
          <div className={styles.formActions}>
            <button className={styles.secondaryButton} onClick={() => dialogRef.current?.close()} type="button">Cancelar</button>
            <button className={styles.primaryButton} disabled={brandPending || !brandName.trim()} type="submit">{brandPending ? "Criando marca..." : "Criar marca"}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
