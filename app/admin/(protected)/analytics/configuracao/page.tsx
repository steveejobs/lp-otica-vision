import { ConfigurationActions } from "@/components/admin/analytics/configuration-actions";
import { ReportNotice, ReportTable, SourceBadge } from "@/components/admin/analytics/analytics-ui";
import styles from "@/components/admin/analytics/analytics.module.css";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { ANALYTICS_CONSENT_VERSION } from "@/lib/analytics/consent";
import { analyticsEventNames, googleRecommendedEventMap, principalAnalyticsEvents } from "@/lib/analytics/events";
import { getGoogleAnalyticsIntegrationStatus } from "@/lib/analytics/google-config";
import { getGoogleAnalyticsPropertyAudit } from "@/lib/analytics/google-data";
import { getInternalAnalyticsReport } from "@/lib/analytics/internal-reports";

export default async function AnalyticsConfigurationPage() {
  const status = getGoogleAnalyticsIntegrationStatus();
  const [internal, propertyAudit] = await Promise.all([
    getInternalAnalyticsReport(30),
    getGoogleAnalyticsPropertyAudit(),
  ]);
  const retention = internal.data.retention;
  const primaryStream = propertyAudit.data?.streams.find((stream) => stream.isConfiguredStream) ?? propertyAudit.data?.streams[0];
  return <div className={styles.stack}>
    <AdminPageHeader eyebrow="Analytics" title="Configuração" description="Estado das conexões, eventos, consentimento e retenção, sem revelar credenciais." />
    <ConfigurationActions />
    {!status.complete ? <ReportNotice source="Google Analytics">Integração incompleta. O site e os dados internos continuam funcionando normalmente.</ReportNotice> : null}
    {propertyAudit.error ? <ReportNotice source="Google Analytics">{propertyAudit.error}. A configuração local permanece visível, mas propriedade, stream e fuso não puderam ser reconfirmados agora.</ReportNotice> : null}
    {propertyAudit.data?.propertyTimeZone && propertyAudit.data.propertyTimeZone !== "America/Araguaina" ? <ReportNotice source="Google Analytics">A propriedade usa {propertyAudit.data.propertyTimeZone}, não o fuso de Araguaína. Com a configuração atual, “hoje” e séries diárias viram duas horas depois da meia-noite local. Recomendação: alterar para America/Araguaina no GA4 somente após autorização.</ReportNotice> : null}
    <div className={styles.compactGrid}>
      <section className={styles.section}><SourceBadge>Google Analytics</SourceBadge><h2>Conexão</h2><ReportTable label="Configuração Google"><tbody><tr><th>Measurement ID</th><td>{status.measurementId}</td></tr><tr><th>Property ID</th><td>{status.propertyId}</td></tr><tr><th>Stream web</th><td>{primaryStream?.defaultUri || "Não confirmado"}</td></tr><tr><th>Measurement ID do stream</th><td>{propertyAudit.data ? (propertyAudit.data.streamMatchesMeasurementId ? "Confere com o navegador" : "Divergente") : "Não confirmado"}</td></tr><tr><th>Fuso da propriedade</th><td>{propertyAudit.data?.propertyTimeZone || "Não confirmado"}</td></tr><tr><th>Conta de serviço</th><td>{status.serviceAccountConfigured ? `Configurada · ${status.serviceAccountEmail}` : "Não configurada"}</td></tr><tr><th>Data API</th><td>{status.dataApiConfigured ? "Configurada" : "Incompleta"}</td></tr><tr><th>Measurement Protocol</th><td>{status.measurementProtocolConfigured ? "Credenciais disponíveis; sem evento server-only elegível" : "Incompleto"}</td></tr></tbody></ReportTable></section>
      <section className={styles.section}><SourceBadge>Dados internos</SourceBadge><h2>Privacidade e retenção</h2><ReportTable label="Privacidade e retenção"><tbody><tr><th>Consentimento</th><td>Versão {ANALYTICS_CONSENT_VERSION}</td></tr><tr><th>Scroll depth interno</th><td>{internal.scrollDepthAvailable ? "Disponível" : "Migrations pendentes"}</td></tr><tr><th>Eventos brutos</th><td>{retention ? `${retention.rawDays} dias propostos` : "Migração pendente"}</td></tr><tr><th>Agregações</th><td>{retention ? `${retention.aggregateDays} dias propostos` : "Migração pendente"}</td></tr><tr><th>Exclusão</th><td>Não automatizada; exige revisão administrativa</td></tr><tr><th>PII</th><td>Nome, telefone, e-mail, IP bruto e texto livre bloqueados</td></tr></tbody></ReportTable></section>
    </div>
    <section className={styles.section}><h2>Registro central de eventos</h2><ReportTable label="Eventos registrados"><thead><tr><th>Evento interno</th><th>Envio ao GA4</th></tr></thead><tbody>{analyticsEventNames.map((name) => <tr key={name}><td>{name}</td><td>{googleRecommendedEventMap[name] ?? name}</td></tr>)}</tbody></ReportTable></section>
    <ReportNotice source="Google Analytics">Eventos recomendados como principais: {principalAnalyticsEvents.join(" e ")}. A Data API usa somente leitura e não possui permissão para marcá-los automaticamente; configure-os como eventos principais no GA4 após validá-los no DebugView.</ReportNotice>
    <ReportNotice source="Dados internos">Measurement Protocol não é usado para cliques ou page views. Ele permanece reservado a eventos confirmados exclusivamente no servidor, evitando duplicidade com o gtag.</ReportNotice>
  </div>;
}
