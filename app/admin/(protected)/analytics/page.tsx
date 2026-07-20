import { AnalyticsAreaCards, Funnel, MetricCard, ReportNotice, Timeline } from "@/components/admin/analytics/analytics-ui";
import { analyticsDays, PeriodControls } from "@/components/admin/analytics/period-controls";
import { RefreshReportButton } from "@/components/admin/analytics/refresh-button";
import styles from "@/components/admin/analytics/analytics.module.css";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { getOverviewReport } from "@/lib/analytics/google-data";
import { getInternalAnalyticsReport } from "@/lib/analytics/internal-reports";

function total(rows: Array<{ activeUsers: number; sessions: number; views: number }>, key: "activeUsers" | "sessions" | "views") { return rows.reduce((sum, row) => sum + row[key], 0); }
function comparison(current: number, previous: number) { if (!previous) return "Sem base anterior"; const value = Math.round((current - previous) / previous * 100); return `${value >= 0 ? "+" : ""}${value}% vs. período anterior`; }

export default async function AnalyticsOverview({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const days = analyticsDays((await searchParams).dias);
  const [google, googleLong, internal] = await Promise.all([getOverviewReport(days), getOverviewReport(Math.min(days * 2, 365)), getInternalAnalyticsReport(days)]);
  const gaRows = google.data ?? [];
  const longRows = googleLong.data ?? [];
  const previousRows = longRows.slice(0, Math.max(0, longRows.length - gaRows.length));
  const users = total(gaRows, "activeUsers"), sessions = total(gaRows, "sessions"), views = total(gaRows, "views");
  const whatsapp = (internal.data.counts.product_whatsapp_clicked?.events ?? 0) + (internal.data.counts.general_whatsapp_clicked?.events ?? 0) + internal.data.topProducts.reduce((sum, row) => sum + row.whatsapp, 0);
  const products = internal.data.counts.product_opened?.sessions ?? internal.data.topProducts.reduce((sum, row) => sum + row.views, 0);
  const conversion = products ? `${(whatsapp / products * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—";
  return <div className={styles.stack}>
    <AdminPageHeader eyebrow="Analytics" title="Visão geral" description="Leitura comercial enxuta, com cada indicador identificado por sua fonte." />
    <div className={styles.toolbar}><PeriodControls basePath="/admin/analytics" days={days} /><RefreshReportButton area="overview" /></div>
    {google.error ? <ReportNotice source="Google Analytics">{google.error}. Os dados internos continuam disponíveis.</ReportNotice> : null}
    {internal.error ? <ReportNotice source="Dados internos">{internal.error}</ReportNotice> : null}
    <div className={styles.metrics}>
      <MetricCard detail={comparison(users, total(previousRows, "activeUsers"))} label="Usuários" source="Google Analytics" value={google.data ? users : "—"} />
      <MetricCard detail={comparison(sessions, total(previousRows, "sessions"))} label="Sessões" source="Google Analytics" value={google.data ? sessions : "—"} />
      <MetricCard detail={comparison(views, total(previousRows, "views"))} label="Visualizações" source="Google Analytics" value={google.data ? views : "—"} />
      <MetricCard label="Cliques no WhatsApp" source="Dados internos" value={whatsapp} />
      <MetricCard detail="Produto aberto → WhatsApp" label="Conversão para WhatsApp" source="Dados internos" value={conversion} />
      <MetricCard label="Produtos abertos" source="Dados internos" value={products} />
      <MetricCard label="Origem principal" source="Google Analytics" value="Ver aquisição" />
      <MetricCard label="Estilo mais selecionado" source="Dados internos" value={internal.data.topStyles[0]?.slug ?? "—"} />
    </div>
    <div className={styles.split}>
      <section className={styles.section}><div className={styles.sectionHeader}><div><h2>Evolução de visualizações</h2><p>Sem soma com os dados internos.</p></div></div><Timeline rows={gaRows.map((row) => ({ date: row.date, value: row.views }))} /></section>
      <section className={styles.section}><div className={styles.sectionHeader}><div><h2>Funil resumido</h2><p>Clique não significa venda concluída.</p></div></div><Funnel rows={internal.data.funnel} /></section>
    </div>
    <section className={styles.section}><div className={styles.sectionHeader}><div><h2>Explorar Analytics</h2><p>As áreas são subfluxos; a sidebar permanece limpa.</p></div></div><AnalyticsAreaCards /></section>
  </div>;
}
