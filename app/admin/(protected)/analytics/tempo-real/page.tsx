import { ActivityMap } from "@/components/admin/analytics/activity-map";
import { ReportNotice, ReportTable, SourceBadge } from "@/components/admin/analytics/analytics-ui";
import { RealtimeControls } from "@/components/admin/analytics/realtime-controls";
import styles from "@/components/admin/analytics/analytics.module.css";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { getRealtimeReport } from "@/lib/analytics/google-data";
import { getInternalAnalyticsReport } from "@/lib/analytics/internal-reports";

function eventCount(events: Array<{ eventCount: number; eventName: string }>, names: string[]) {
  return events.filter((event) => names.includes(event.eventName)).reduce((sum, event) => sum + event.eventCount, 0);
}

export default async function RealtimePage() {
  const [google, internal] = await Promise.all([getRealtimeReport(), getInternalAnalyticsReport(1)]);
  const data = google.data;
  const activeCities = data?.cities.filter((city) => city.activeUsers > 0).length ?? 0;
  const productsViewed = eventCount(data?.events ?? [], ["view_item", "product_opened"]);
  const whatsappClicks = eventCount(data?.events ?? [], ["product_whatsapp_clicked", "general_whatsapp_clicked"]);
  const internalWhatsapp = (internal.data.counts.product_whatsapp_clicked?.events ?? 0) + (internal.data.counts.general_whatsapp_clicked?.events ?? 0);
  const internalProducts = internal.data.counts.product_opened?.events ?? internal.data.topProducts.reduce((sum, product) => sum + product.views, 0);
  return <div className={styles.stack}>
    <AdminPageHeader eyebrow="Analytics" title="Tempo real" description="Atividade recente e agregada. O mapa não representa GPS nem identifica visitantes." />
    <RealtimeControls error={google.error} updatedAt={google.updatedAt} />
    {google.error ? <ReportNotice source="Google Analytics">{google.error}. Nenhuma posição foi estimada e os dados internos continuam abaixo.</ReportNotice> : null}
    <div className={styles.realtimeLayout}>
      <ActivityMap cities={data?.cities ?? []} />
      <aside className={styles.realtimeSummary} aria-label="Resumo da atividade recente">
        <div><SourceBadge>Google Analytics</SourceBadge><h2>Agora</h2><p>Janela recente do Realtime Data API.</p></div>
        <dl>
          <div><dt>Visitantes ativos</dt><dd>{data ? data.overview.activeUsers : "—"}</dd></div>
          <div><dt>Cidades ativas</dt><dd>{data ? activeCities : "—"}</dd></div>
          <div><dt>Páginas abertas</dt><dd>{data ? data.pages.length : "—"}</dd></div>
          <div><dt>Produtos visualizados</dt><dd>{data ? productsViewed : "—"}</dd></div>
          <div><dt>Eventos recentes</dt><dd>{data ? data.overview.eventCount : "—"}</dd></div>
          <div><dt>WhatsApp recente</dt><dd>{data ? whatsappClicks : "—"}</dd></div>
        </dl>
      </aside>
    </div>
    <section className={styles.section} aria-labelledby="commercial-context-title">
      <div className={styles.sectionHeader}><div><SourceBadge>Dados internos</SourceBadge><h2 id="commercial-context-title">Contexto comercial agregado</h2><p>Sem associação entre eventos internos e bolhas geográficas.</p></div></div>
      <div className={styles.realtimeInternalMetrics}>
        <div><span>Produtos abertos</span><strong>{internalProducts}</strong></div>
        <div><span>Estilos selecionados</span><strong>{internal.data.counts.style_selected?.events ?? 0}</strong></div>
        <div><span>Catálogo aberto</span><strong>{internal.data.counts.catalog_opened?.events ?? 0}</strong></div>
        <div><span>WhatsApp clicado</span><strong>{internalWhatsapp}</strong></div>
      </div>
    </section>
    <div className={styles.compactGrid}>
      <section className={styles.section}><SourceBadge>Google Analytics</SourceBadge><h2>Páginas ativas</h2><ReportTable label="Páginas ativas"><thead><tr><th>Página</th><th>Ativos</th><th>Views</th></tr></thead><tbody>{(data?.pages ?? []).map((page) => <tr key={page.page}><td>{page.page || "Página não disponível"}</td><td>{page.activeUsers}</td><td>{page.views}</td></tr>)}</tbody></ReportTable></section>
      <section className={styles.section}><SourceBadge>Google Analytics</SourceBadge><h2>Eventos recentes</h2><ReportTable label="Eventos recentes"><thead><tr><th>Evento</th><th>Usuários</th><th>Ocorrências</th></tr></thead><tbody>{(data?.events ?? []).map((event) => <tr key={event.eventName}><td>{event.eventName}</td><td>{event.activeUsers}</td><td>{event.eventCount}</td></tr>)}</tbody></ReportTable></section>
    </div>
  </div>;
}
