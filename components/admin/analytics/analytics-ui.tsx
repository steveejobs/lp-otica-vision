import Link from "next/link";

import styles from "./analytics.module.css";

export function SourceBadge({ children }: { children: React.ReactNode }) { return <span className={styles.source} data-source={children === "Google Analytics" ? "google" : "internal"}>{children}</span>; }
export function MetricCard({ detail, label, source, value }: { detail?: string; label: string; source: "Dados internos" | "Google Analytics"; value: string | number }) {
  return <article className={styles.metric}><div><span>{label}</span><SourceBadge>{source}</SourceBadge></div><strong>{value}</strong>{detail ? <small>{detail}</small> : null}</article>;
}
export function ReportNotice({ children, source }: { children: React.ReactNode; source: "Dados internos" | "Google Analytics" }) { return <div className={styles.notice}><SourceBadge>{source}</SourceBadge><p>{children}</p></div>; }
export function ReportTable({ children, label }: { children: React.ReactNode; label: string }) { return <div className={styles.tableWrap}><table aria-label={label}>{children}</table></div>; }
export function AnalyticsAreaCards() {
  const areas = [
    ["Aquisição", "Origem, campanhas, landing pages e dispositivos.", "/admin/analytics/aquisicao"],
    ["Comportamento", "Páginas, eventos, filtros e links externos.", "/admin/analytics/comportamento"],
    ["Conversões", "Funil até o clique qualificado no WhatsApp.", "/admin/analytics/conversoes"],
    ["Catálogo e curadoria", "Produtos, estilos, categorias e resultados vazios.", "/admin/analytics/catalogo"],
    ["Tempo real", "Atividade agregada, sem identificar pessoas.", "/admin/analytics/tempo-real"],
    ["Configuração", "Conexões, privacidade, eventos e retenção.", "/admin/analytics/configuracao"],
  ] as const;
  return <div className={styles.areaCards}>{areas.map(([title, description, href]) => <Link href={href} key={href}><strong>{title}</strong><span>{description}</span><b>Abrir área</b></Link>)}</div>;
}
export function Timeline({ rows }: { rows: Array<{ date: string; value: number }> }) {
  const width = 640, height = 180, max = Math.max(...rows.map((row) => row.value), 1);
  const points = rows.map((row, index) => `${rows.length <= 1 ? 0 : index * width / (rows.length - 1)},${height - row.value / max * (height - 16)}`).join(" ");
  return <div className={styles.chart}><svg aria-label="Evolução temporal" role="img" viewBox={`0 0 ${width} ${height}`}><polyline fill="none" points={points} stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" /></svg><div className={styles.chartTable}>{rows.slice(-7).map((row) => <span key={row.date}><time>{row.date}</time><b>{row.value}</b></span>)}</div></div>;
}
export function Funnel({ rows }: { rows: Array<{ label: string; sessions: number }> }) {
  const first = Math.max(rows[0]?.sessions ?? 0, 1);
  return <ol className={styles.funnel}>{rows.map((row, index) => { const previous = index ? rows[index - 1]?.sessions ?? 0 : row.sessions; return <li key={row.label} style={{ "--funnel-width": `${Math.max(18, row.sessions / first * 100)}%` } as React.CSSProperties}><span>{row.label}</span><strong>{row.sessions}</strong><small>{index === 0 || !previous ? "Base" : `${Math.round(row.sessions / previous * 100)}% da etapa anterior`}</small></li>; })}</ol>;
}

export function ScrollDepth({ rows }: { rows: Array<{ events: number; percent: number; sessions: number }> }) {
  const base = Math.max(rows.find((row) => row.percent === 25)?.sessions ?? 0, 1);
  return (
    <ol className={styles.scrollDepth}>
      {rows.map((row) => {
        const reach = Math.round((row.sessions / base) * 100);
        return (
          <li key={row.percent}>
            <div className={styles.scrollDepthLabel}>
              <span>{row.percent}% da página</span>
              <strong>{row.sessions} {row.sessions === 1 ? "sessão" : "sessões"}</strong>
            </div>
            <div aria-hidden="true" className={styles.scrollDepthTrack}>
              <i style={{ "--scroll-reach": `${Math.min(100, reach)}%` } as React.CSSProperties} />
            </div>
            <small>{row.events} {row.events === 1 ? "registro" : "registros"} · {row.percent === 25 ? "base de leitura" : `${reach}% da base chegou até aqui`}</small>
          </li>
        );
      })}
    </ol>
  );
}
