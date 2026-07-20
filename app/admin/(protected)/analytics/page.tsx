import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-ui";
import { Funnel, MetricCard, ReportNotice, SourceBadge, Timeline } from "@/components/admin/analytics/analytics-ui";
import styles from "@/components/admin/analytics/analytics.module.css";
import { OverviewRealtime } from "@/components/admin/analytics/overview-realtime";
import { analyticsDays, PeriodControls } from "@/components/admin/analytics/period-controls";
import { ProductInterest } from "@/components/admin/analytics/product-interest";
import { RefreshReportButton } from "@/components/admin/analytics/refresh-button";
import { getAcquisitionReport, getOverviewReport, getRealtimeReport } from "@/lib/analytics/google-data";
import { getAnalyticsProductCovers, getInternalAnalyticsReport } from "@/lib/analytics/internal-reports";

function total(rows: Array<{ activeUsers: number; sessions: number; views: number }>, key: "activeUsers" | "sessions" | "views") {
  return rows.reduce((sum, row) => sum + row[key], 0);
}

function comparison(current: number, previous: number) {
  if (!previous) return "Sem base anterior";
  const value = Math.round((current - previous) / previous * 100);
  return `${value >= 0 ? "+" : ""}${value}% vs. período anterior`;
}

export default async function AnalyticsOverview({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const days = analyticsDays((await searchParams).dias);
  const [google, googleLong, acquisition, realtime, internal] = await Promise.all([
    getOverviewReport(days),
    getOverviewReport(Math.min(days * 2, 365)),
    getAcquisitionReport(days),
    getRealtimeReport(),
    getInternalAnalyticsReport(days),
  ]);
  const covers = await getAnalyticsProductCovers(internal.data.topProducts.slice(0, 5).map((product) => product.id));
  const gaRows = google.data ?? [];
  const longRows = googleLong.data ?? [];
  const previousRows = longRows.slice(0, Math.max(0, longRows.length - gaRows.length));
  const users = total(gaRows, "activeUsers");
  const sessions = total(gaRows, "sessions");
  const views = total(gaRows, "views");
  const hasNewInternalReport = Object.keys(internal.data.counts).length > 0;
  const productOpens = hasNewInternalReport ? internal.data.counts.product_opened?.events ?? 0 : internal.data.topProducts.reduce((sum, row) => sum + row.views, 0);
  const productWhatsapp = hasNewInternalReport ? internal.data.counts.product_whatsapp_clicked?.events ?? 0 : internal.data.topProducts.reduce((sum, row) => sum + row.whatsapp, 0);
  const generalWhatsapp = internal.data.counts.general_whatsapp_clicked?.events ?? 0;
  const whatsapp = productWhatsapp + generalWhatsapp;
  const conversion = productOpens ? `${(productWhatsapp / productOpens * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—";
  const topSource = [...(acquisition.data?.sources ?? [])].sort((a, b) => b.sessions - a.sessions)[0];
  const topStyle = internal.data.topStyles[0];

  return <div className={styles.stack}>
    <AdminPageHeader eyebrow="Analytics" title="Visão geral" description="O que trouxe visitantes, quais armações despertaram interesse e onde o contato aconteceu." />
    <div className={styles.toolbar}><PeriodControls basePath="/admin/analytics" days={days} /><RefreshReportButton area="overview" /></div>
    {google.error ? <ReportNotice source="Google Analytics">{google.error}. Os dados internos continuam disponíveis.</ReportNotice> : null}
    {internal.error ? <ReportNotice source="Dados internos">{internal.error}</ReportNotice> : null}

    <OverviewRealtime report={realtime} />

    <section className={styles.overviewPulse} aria-labelledby="overview-pulse-title">
      <div className={styles.overviewSectionHeading}><div><span>Leitura do período</span><h2 id="overview-pulse-title">Pulso comercial</h2><p>Quatro indicadores para entender alcance, interesse e contato.</p></div></div>
      <div className={styles.overviewMetrics}>
        <MetricCard detail={comparison(users, total(previousRows, "activeUsers"))} label="Visitantes" source="Google Analytics" value={google.data ? users : "—"} />
        <MetricCard detail={`${sessions || 0} sessões no período`} label="Páginas visualizadas" source="Google Analytics" value={google.data ? views : "—"} />
        <MetricCard detail="Aberturas da página do produto" label="Interesse em armações" source="Dados internos" value={productOpens} />
        <MetricCard detail={conversion === "—" ? "Sem base de produtos abertos" : `${conversion} dos produtos abertos`} label="Cliques no WhatsApp" source="Dados internos" value={whatsapp} />
      </div>
      <div className={styles.decisionStrip}>
        <div><SourceBadge>Google Analytics</SourceBadge><span>Principal origem</span><strong>{topSource?.sourceMedium || "Sem dados suficientes"}</strong><small>{topSource ? `${topSource.sessions} sessões` : "Abra Aquisição para conferir a conexão"}</small></div>
        <div><SourceBadge>Dados internos</SourceBadge><span>Estilo mais escolhido</span><strong>{topStyle?.slug || "Sem seleção ainda"}</strong><small>{topStyle ? `${topStyle.uses} seleções` : "Aparece depois da primeira escolha de estilo"}</small></div>
        <div><SourceBadge>Dados internos</SourceBadge><span>Armação mais vista</span><strong>{internal.data.topProducts[0]?.name || "Sem abertura ainda"}</strong><small>{internal.data.topProducts[0] ? `${internal.data.topProducts[0].views} aberturas` : "Aparece depois da primeira visita a um produto"}</small></div>
      </div>
    </section>

    <ProductInterest covers={covers} products={internal.data.topProducts} />

    <div className={styles.split}>
      <section className={styles.section}><div className={styles.sectionHeader}><div><SourceBadge>Google Analytics</SourceBadge><h2>Evolução de visualizações</h2><p>Leitura temporal sem somar fontes incompatíveis.</p></div></div><Timeline rows={gaRows.map((row) => ({ date: row.date, value: row.views }))} /></section>
      <section className={styles.section}><div className={styles.sectionHeader}><div><SourceBadge>Dados internos</SourceBadge><h2>Caminho até o contato</h2><p>O clique no WhatsApp não significa venda concluída.</p></div><Link className={styles.textAction} href="/admin/analytics/conversoes">Ver conversões</Link></div><Funnel rows={internal.data.funnel} /></section>
    </div>
  </div>;
}
