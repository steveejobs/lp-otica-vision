import { createCollectionAction } from "@/app/admin/(protected)/colecoes/actions";

import { AdminSubmitButton } from "./admin-form-controls";
import styles from "./admin.module.css";

export function CollectionCreateForm() {
  return (
    <section className={styles.formPanel} aria-labelledby="new-collection-title">
      <div className={styles.panelHeading}>
        <div>
          <h2 id="new-collection-title">Coleção personalizada</h2>
          <p>Use quando a curadoria não se encaixar nos modelos prontos.</p>
        </div>
      </div>
      <form action={createCollectionAction} className={styles.adminForm}>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>Nome</span>
            <input maxLength={160} name="name" required />
          </label>
          <label className={styles.field}>
            <span>Slug</span>
            <input maxLength={120} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span>Descrição</span>
            <textarea maxLength={1000} name="description" />
          </label>
          <label className={styles.field}>
            <span>Início opcional</span>
            <input name="starts_at" type="datetime-local" />
          </label>
          <label className={styles.field}>
            <span>Fim opcional</span>
            <input name="ends_at" type="datetime-local" />
          </label>
          <label className={styles.field}>
            <span>Ordem</span>
            <input defaultValue="0" min="0" name="display_order" required type="number" />
          </label>
        </div>
        <AdminSubmitButton pendingLabel="Criando coleção...">Criar rascunho</AdminSubmitButton>
      </form>
    </section>
  );
}
