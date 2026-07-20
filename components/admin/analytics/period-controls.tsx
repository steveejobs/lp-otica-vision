import Link from "next/link";

import styles from "./analytics.module.css";

export function PeriodControls({ basePath, days, custom }: { basePath: string; days: number; custom?: { end?: string; start?: string } }) {
  return <div className={styles.periodWrap}><div className={styles.period} aria-label="Período do relatório">{[7,30,90].map((value) => <Link aria-current={!custom?.start && days === value ? "true" : undefined} href={`${basePath}?dias=${value}`} key={value}>{value} dias</Link>)}</div>{custom ? <details className={styles.customPeriod}><summary>Personalizado</summary><form action={basePath}><label>Início<input defaultValue={custom.start} max={new Date().toISOString().slice(0,10)} name="inicio" required type="date" /></label><label>Fim<input defaultValue={custom.end} max={new Date().toISOString().slice(0,10)} name="fim" required type="date" /></label><button type="submit">Aplicar período</button></form></details> : null}</div>;
}

export function analyticsDays(value?: string) { const days = Number(value ?? "30"); return [7,30,90].includes(days) ? days : 30; }

export function customAnalyticsPeriod(start?: string, end?: string) {
  if (!start || !end || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return null;
  const startTime = Date.parse(`${start}T00:00:00Z`), endTime = Date.parse(`${end}T00:00:00Z`), today = Date.now();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || startTime > endTime || endTime > today || endTime - startTime > 365 * 86_400_000) return null;
  return { endDate: end, startDate: start };
}
