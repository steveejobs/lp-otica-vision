import Link from "next/link";

import type { GoogleAnalyticsResult } from "@/lib/analytics/google-data";

import { ActivityMap } from "./activity-map";
import { SourceBadge } from "./analytics-ui";
import styles from "./analytics.module.css";

type RealtimeData = {
  cities: Array<{ activeUsers: number; city: string; country: string; countryCode: string; eventCount: number }>;
  events: Array<{ activeUsers: number; eventCount: number; eventName: string }>;
  overview: { activeUsers: number; eventCount: number; pageViews: number };
  pages: Array<{ activeUsers: number; page: string; views: number }>;
};

function countEvents(data: RealtimeData | null, names: string[]) {
  return (data?.events ?? []).filter((event) => names.includes(event.eventName)).reduce((sum, event) => sum + event.eventCount, 0);
}

export function OverviewRealtime({ report }: { report: GoogleAnalyticsResult<RealtimeData> }) {
  const data = report.data;
  const products = countEvents(data, ["view_item", "product_opened"]);
  const whatsapp = countEvents(data, ["product_whatsapp_clicked", "general_whatsapp_clicked"]);
  return <section className={styles.overviewRealtime} aria-label="Atividade recente no site">
    <div className={styles.overviewRealtimeBar}>
      <div><SourceBadge>Google Analytics</SourceBadge><span>Atividade recente · localização agregada</span></div>
      <Link className={styles.textAction} href="/admin/analytics/tempo-real">Abrir tempo real</Link>
    </div>
    <div className={styles.overviewRealtimeLayout}>
      <ActivityMap cities={data?.cities ?? []} />
      <aside className={styles.overviewRealtimeSummary} aria-label="Resumo em tempo real">
        <dl>
          <div><dt>Visitantes ativos</dt><dd>{data ? data.overview.activeUsers : "—"}</dd></div>
          <div><dt>Cidades ativas</dt><dd>{data ? data.cities.filter((city) => city.activeUsers > 0).length : "—"}</dd></div>
          <div><dt>Páginas ativas</dt><dd>{data ? data.pages.length : "—"}</dd></div>
          <div><dt>Produtos vistos</dt><dd>{data ? products : "—"}</dd></div>
          <div><dt>WhatsApp</dt><dd>{data ? whatsapp : "—"}</dd></div>
        </dl>
        {report.error ? <p>{report.error}. O mapa permanece vazio até a conexão ser concluída.</p> : <p>Atualizado {report.updatedAt ? new Date(report.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "agora"}.</p>}
      </aside>
    </div>
  </section>;
}
