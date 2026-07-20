import { ReportNotice, ReportTable, SourceBadge } from "@/components/admin/analytics/analytics-ui";
import { analyticsDays, customAnalyticsPeriod, PeriodControls } from "@/components/admin/analytics/period-controls";
import { RefreshReportButton } from "@/components/admin/analytics/refresh-button";
import styles from "@/components/admin/analytics/analytics.module.css";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { getAcquisitionReport } from "@/lib/analytics/google-data";

export default async function AcquisitionPage({ searchParams }: { searchParams: Promise<{ dias?: string; fim?: string; inicio?: string }> }) {
  const params = await searchParams;
  const days = analyticsDays(params.dias);
  const custom = customAnalyticsPeriod(params.inicio, params.fim);
  const report = await getAcquisitionReport(custom ?? days);
  const data = report.data;
  return <div className={styles.stack}>
    <AdminPageHeader eyebrow="Analytics" title="Aquisição" description="Origem, campanhas, páginas de entrada e contexto agregado dos acessos." />
    <div className={styles.toolbar}><PeriodControls basePath="/admin/analytics/aquisicao" custom={{ start: custom?.startDate, end: custom?.endDate }} days={days} /><RefreshReportButton area="acquisition" /></div>
    {report.error ? <ReportNotice source="Google Analytics">{report.error}. Nenhum valor foi estimado.</ReportNotice> : null}<SourceBadge>Google Analytics</SourceBadge>
    <div className={styles.compactGrid}>
      <section className={styles.section}><h2>Source / medium</h2><ReportTable label="Origem e mídia"><thead><tr><th>Origem / mídia</th><th>Sessões</th><th>Usuários</th></tr></thead><tbody>{(data?.sources ?? []).map((row) => <tr key={row.sourceMedium}><td>{row.sourceMedium}</td><td>{row.sessions}</td><td>{row.users}</td></tr>)}</tbody></ReportTable></section>
      <section className={styles.section}><h2>Landing pages</h2><ReportTable label="Páginas de entrada"><thead><tr><th>Página</th><th>Sessões</th><th>Usuários</th></tr></thead><tbody>{(data?.landingPages ?? []).map((row) => <tr key={row.landingPage}><td>{row.landingPage}</td><td>{row.sessions}</td><td>{row.users}</td></tr>)}</tbody></ReportTable></section>
    </div>
    <section className={styles.section}><h2>Campanhas</h2><ReportTable label="Campanhas"><thead><tr><th>Campanha</th><th>Source</th><th>Medium</th><th>Sessões</th></tr></thead><tbody>{(data?.campaigns ?? []).map((row, index) => <tr key={`${row.campaign}-${index}`}><td>{row.campaign}</td><td>{row.source}</td><td>{row.medium}</td><td>{row.sessions}</td></tr>)}</tbody></ReportTable></section>
    <section className={styles.section}><h2>Dispositivo, navegador e região agregada</h2><ReportTable label="Dispositivos"><thead><tr><th>Dispositivo</th><th>Navegador</th><th>Região agregada</th><th>Sessões</th></tr></thead><tbody>{(data?.devices ?? []).map((row, index) => <tr key={`${row.device}-${row.browser}-${index}`}><td>{row.device}</td><td>{row.browser}</td><td>{row.region}</td><td>{row.sessions}</td></tr>)}</tbody></ReportTable></section>
  </div>;
}
