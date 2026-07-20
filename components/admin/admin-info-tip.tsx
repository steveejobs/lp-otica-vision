import styles from "./admin.module.css";

export function AdminInfoTip({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <span className={styles.infoTip}>
      <button aria-label={label} type="button">i</button>
      <span role="tooltip">{children}</span>
    </span>
  );
}
