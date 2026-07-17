import Link from "next/link";

import { createPresetCollectionAction } from "@/app/admin/(protected)/colecoes/actions";
import { COLLECTION_PRESETS } from "@/lib/admin/collection-presets";

import { AdminSubmitButton } from "./admin-form-controls";
import styles from "./admin.module.css";
import { AdminStatus } from "./admin-ui";

type CollectionPresetRecord = {
  featured: boolean;
  id: string;
  published: boolean;
  slug: string;
};

export function CollectionPresetGrid({ collections }: { collections: CollectionPresetRecord[] }) {
  const collectionsBySlug = new Map(collections.map((collection) => [collection.slug, collection]));

  return (
    <section className={styles.formPanel} aria-labelledby="collection-presets-title">
      <div className={styles.panelHeading}>
        <div>
          <h2 id="collection-presets-title">Modelos prontos</h2>
          <p>Destaques e estações já entram como rascunho, com texto seguro e ordem definida.</p>
        </div>
        <span className={styles.phaseBadge}>{COLLECTION_PRESETS.length} modelos</span>
      </div>
      <div className={styles.presetGrid}>
        {COLLECTION_PRESETS.map((preset) => {
          const collection = collectionsBySlug.get(preset.slug);
          return (
            <article className={styles.presetCard} key={preset.id}>
              <div className={styles.presetCardHeader}>
                <span>{preset.label}</span>
                {collection ? (
                  <AdminStatus
                    active={collection.published}
                    trueLabel={collection.featured ? "Destaque" : "Publicada"}
                    falseLabel="Rascunho"
                  />
                ) : (
                  <span className={styles.statusNeutral}>Modelo</span>
                )}
              </div>
              <div className={styles.presetCardBody}>
                <h3>{preset.name}</h3>
                <p>{preset.description}</p>
              </div>
              <p className={styles.presetGuide}>{preset.guide}</p>
              {collection ? (
                <Link className={styles.buttonLink} href={`/admin/colecoes/${collection.id}`}>
                  Editar coleção
                </Link>
              ) : (
                <form action={createPresetCollectionAction}>
                  <input name="preset_id" type="hidden" value={preset.id} />
                  <AdminSubmitButton pendingLabel="Criando rascunho..." variant="secondary">
                    Criar rascunho
                  </AdminSubmitButton>
                </form>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
