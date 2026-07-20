import Link from "next/link";

import { formatAdminDate } from "@/lib/admin/format";
import { COLLECTION_HOME_VARIANT_LABELS, type CollectionHomeVariant } from "@/lib/content-placements";

import styles from "./admin.module.css";
import { AdminEmptyState, AdminStatus, AdminTable } from "./admin-ui";

type CollectionRecord = {
  display_order: number;
  ends_at: string | null;
  featured: boolean;
  home_enabled: boolean;
  home_placement_key: string | null;
  home_variant: string | null;
  id: string;
  name: string;
  published: boolean;
  slug: string;
  starts_at: string | null;
};

export function CollectionRecordsTable({ collections }: { collections: CollectionRecord[] }) {
  return (
    <>
      <div className={styles.sectionBar}>
        <h2>Suas coleções</h2>
        <span className={styles.phaseBadge}>{collections.length} registros</span>
      </div>
      {collections.length === 0 ? (
        <AdminEmptyState>Nenhuma coleção cadastrada.</AdminEmptyState>
      ) : (
        <>
        <div className={styles.mobileRecordList}>
          {collections.map((collection) => (
            <article className={styles.mobileRecordCard} key={collection.id}>
              <div><strong>{collection.name}</strong><AdminStatus active={collection.published} trueLabel={collection.featured ? "Catálogo · destaque" : "No catálogo"} falseLabel="Rascunho" /></div>
              <p>{collection.home_enabled ? `Página inicial · ${COLLECTION_HOME_VARIANT_LABELS[collection.home_variant as CollectionHomeVariant] ?? "configuração pendente"}` : "Não aparece na página inicial"}</p>
              <Link className={styles.buttonLink} href={`/admin/colecoes/${collection.id}`} prefetch={false}>Abrir coleção</Link>
            </article>
          ))}
        </div>
        <div className={styles.desktopRecordTable}>
        <AdminTable label="Coleções cadastradas">
          <thead>
            <tr>
              <th>Coleção</th>
              <th>Publicação</th>
              <th>Página inicial</th>
              <th>Período opcional</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {collections.map((collection) => (
              <tr key={collection.id}>
                <td>{collection.name}</td>
                <td>
                  <AdminStatus
                    active={collection.published}
                    trueLabel={collection.featured ? "Publicada · destaque" : "Publicada"}
                    falseLabel="Rascunho"
                  />
                </td>
                <td>{collection.home_enabled ? COLLECTION_HOME_VARIANT_LABELS[collection.home_variant as CollectionHomeVariant] ?? "Configuração pendente" : "Não exibida"}</td>
                <td>{collection.starts_at || collection.ends_at ? `${formatAdminDate(collection.starts_at)} — ${formatAdminDate(collection.ends_at)}` : "Sem agenda"}</td>
                <td>
                  <Link className={styles.textButton} href={`/admin/colecoes/${collection.id}`} prefetch={false}>
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable></div></>
      )}
    </>
  );
}
