import styles from "@/components/admin/admin.module.css";

export default function AdminLoading() {
  return (
    <div aria-label="Carregando conteúdo administrativo" aria-live="polite" className={styles.routeSkeleton} role="status">
      <span className={styles.skeletonEyebrow} />
      <span className={styles.skeletonTitle} />
      <span className={styles.skeletonLine} />
      <div className={styles.skeletonGrid}><span /><span /><span /></div>
      <span className="sr-only">Carregando conteúdo administrativo.</span>
    </div>
  );
}
