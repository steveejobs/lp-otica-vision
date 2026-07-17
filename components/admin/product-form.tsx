import { AdminSubmitButton } from "./admin-form-controls";
import { ProductSkuField } from "./product-sku-field";
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

export function ProductForm({
  action,
  archived = false,
  brands,
  categories,
  defaults = {},
  editing = false,
}: {
  action: (formData: FormData) => Promise<void>;
  archived?: boolean;
  brands: { active: boolean; id: string; name: string }[];
  categories: { active: boolean; id: string; name: string }[];
  defaults?: ProductDefaults;
  editing?: boolean;
}) {
  return (
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
          <label className={styles.field}>
            <span>Marca</span>
            <select defaultValue={defaults.brand_id ?? ""} name="brand_id">
              <option value="">Sem marca vinculada</option>
              {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}{brand.active ? "" : " · inativa"}</option>)}
            </select>
          </label>
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
        </div>
        <div className={styles.formActions}>
          <AdminSubmitButton pendingLabel={editing ? "Salvando produto..." : "Criando rascunho..."}>
            {editing ? "Salvar produto" : "Criar rascunho"}
          </AdminSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
