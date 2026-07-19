import Link from "next/link";

import { formatAdminDate } from "@/lib/admin/format";

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
        <h2>Curadorias cadastradas</h2>
        <span className={styles.phaseBadge}>{collections.length} registros</span>
      </div>
      {collections.length === 0 ? (
        <AdminEmptyState>Nenhuma coleção cadastrada.</AdminEmptyState>
      ) : (
        <AdminTable label="Coleções cadastradas">
          <thead>
            <tr>
              <th>Coleção</th>
              <th>Slug</th>
              <th>Ordem</th>
              <th>Publicação</th>
              <th>Home</th>
              <th>Início</th>
              <th>Fim</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {collections.map((collection) => (
              <tr key={collection.id}>
                <td>{collection.name}</td>
                <td>{collection.slug}</td>
                <td>{collection.display_order}</td>
                <td>
                  <AdminStatus
                    active={collection.published}
                    trueLabel={collection.featured ? "Publicada · destaque" : "Publicada"}
                    falseLabel="Rascunho"
                  />
                </td>
                <td>{collection.home_enabled ? `${collection.home_placement_key ?? "posição pendente"} · ${collection.home_variant ?? "variante pendente"}` : "Não exibida"}</td>
                <td>{formatAdminDate(collection.starts_at)}</td>
                <td>{formatAdminDate(collection.ends_at)}</td>
                <td>
                  <Link className={styles.textButton} href={`/admin/colecoes/${collection.id}`} prefetch={false}>
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </>
  );
}
