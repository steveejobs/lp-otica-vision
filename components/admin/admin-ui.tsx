import styles from "./admin.module.css";

export function AdminPageHeader({
  description,
  eyebrow = "Ótica Vision",
  title,
}: {
  description: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <header className={styles.pageHeader}>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <p>{description}</p>
    </header>
  );
}

export function AdminEmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.emptyState}>
      <span aria-hidden="true">V</span>
      <div>
        <strong>Nenhum registro por enquanto.</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}

export function AdminStatus({ active, falseLabel = "Inativo", trueLabel = "Ativo" }: {
  active: boolean;
  falseLabel?: string;
  trueLabel?: string;
}) {
  return (
    <span className={active ? styles.statusPositive : styles.statusNeutral}>
      {active ? trueLabel : falseLabel}
    </span>
  );
}

export function AdminTable({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className={styles.tableFrame} role="region" aria-label={label} tabIndex={0}>
      <table className={styles.table}>{children}</table>
    </div>
  );
}
