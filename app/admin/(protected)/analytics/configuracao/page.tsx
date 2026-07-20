import { ConfigurationActions } from "@/components/admin/analytics/configuration-actions";
import { ReportNotice, ReportTable, SourceBadge } from "@/components/admin/analytics/analytics-ui";
import styles from "@/components/admin/analytics/analytics.module.css";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { ANALYTICS_CONSENT_VERSION } from "@/lib/analytics/consent";
import { analyticsEventNames, googleRecommendedEventMap, principalAnalyticsEvents } from "@/lib/analytics/events";
import { getGoogleAnalyticsIntegrationStatus } from "@/lib/analytics/google-config";
import { getInternalAnalyticsReport } from "@/lib/analytics/internal-reports";

export default async function AnalyticsConfigurationPage() {
  const status = getGoogleAnalyticsIntegrationStatus();
  const internal = await getInternalAnalyticsReport(30);
  const retention = internal.data.retention;
  return <div className={styles.stack}>
    <AdminPageHeader eyebrow="Analytics" title="Configuração" description="Estado das conexões, eventos, consentimento e retenção, sem revelar credenciais." />
    <ConfigurationActions />
    {!status.complete ? <ReportNotice source="Google Analytics">Integração incompleta. O site e os dados internos continuam funcionando normalmente.</ReportNotice> : null}
    <div className={styles.compactGrid}>
      <section className={styles.section}><SourceBadge>Google Analytics</SourceBadge><h2>Conexão</h2><ReportTable label="Configuração Google"><tbody><tr><th>Measurement ID</th><td>{status.measurementId}</td></tr><tr><th>Property ID</th><td>{status.propertyId}</td></tr><tr><th>Conta de serviço</th><td>{status.serviceAccountConfigured ? `Configurada · ${status.serviceAccountEmail}` : "Não configurada"}</td></tr><tr><th>Data API</th><td>{status.dataApiConfigured ? "Configurada" : "Incompleta"}</td></tr><tr><th>Measurement Protocol</th><td>{status.measurementProtocolConfigured ? "Credenciais disponíveis; sem evento server-only elegível" : "Incompleto"}</td></tr></tbody></ReportTable></section>
      <section className={styles.section}><SourceBadge>Dados internos</SourceBadge><h2>Privacidade e retenção</h2><ReportTable label="Privacidade e retenção"><tbody><tr><th>Consentimento</th><td>Versão {ANALYTICS_CONSENT_VERSION}</td></tr><tr><th>Eventos brutos</th><td>{retention ? `${retention.rawDays} dias propostos` : "Migração pendente"}</td></tr><tr><th>Agregações</th><td>{retention ? `${retention.aggregateDays} dias propostos` : "Migração pendente"}</td></tr><tr><th>Exclusão</th><td>Não automatizada; exige revisão administrativa</td></tr><tr><th>PII</th><td>Nome, telefone, e-mail, IP bruto e texto livre bloqueados</td></tr></tbody></ReportTable></section>
    </div>
    <section className={styles.section}><h2>Registro central de eventos</h2><ReportTable label="Eventos registrados"><thead><tr><th>Evento interno</th><th>Envio ao GA4</th></tr></thead><tbody>{analyticsEventNames.map((name) => <tr key={name}><td>{name}</td><td>{googleRecommendedEventMap[name] ?? name}</td></tr>)}</tbody></ReportTable></section>
    <ReportNotice source="Google Analytics">Eventos recomendados como principais: {principalAnalyticsEvents.join(" e ")}. A Data API usa somente leitura e não possui permissão para marcá-los automaticamente; configure-os como eventos principais no GA4 após validá-los no DebugView.</ReportNotice>
    <ReportNotice source="Dados internos">Measurement Protocol não é usado para cliques ou page views. Ele permanece reservado a eventos confirmados exclusivamente no servidor, evitando duplicidade com o gtag.</ReportNotice>
  </div>;
}
