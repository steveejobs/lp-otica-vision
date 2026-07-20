"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import styles from "./analytics.module.css";

export const analyticsAreas = [
  { href: "/admin/analytics", label: "Visão geral" },
  { href: "/admin/analytics/aquisicao", label: "Aquisição" },
  { href: "/admin/analytics/comportamento", label: "Comportamento" },
  { href: "/admin/analytics/conversoes", label: "Conversões" },
  { href: "/admin/analytics/catalogo", label: "Catálogo e curadoria" },
  { href: "/admin/analytics/tempo-real", label: "Tempo real" },
  { href: "/admin/analytics/configuracao", label: "Configuração" },
] as const;

export function AnalyticsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const current = analyticsAreas.find((area) => area.href === pathname) ?? analyticsAreas[0];
  return (
    <div className={styles.shell}>
      <div className={styles.contextBar}>
        <p><Link href="/admin/analytics">Analytics</Link>{current.href !== "/admin/analytics" ? <> <span aria-hidden="true">›</span> {current.label}</> : null}</p>
        <label className={styles.areaSelect}><span>Área</span><select aria-label="Área de Analytics" onChange={(event) => router.push(event.currentTarget.value)} value={current.href}>{analyticsAreas.map((area) => <option key={area.href} value={area.href}>{area.label}</option>)}</select></label>
        <details className={styles.mobileAreas}><summary>Mudar área</summary><nav>{analyticsAreas.map((area) => <Link aria-current={area.href === current.href ? "page" : undefined} href={area.href} key={area.href}>{area.label}</Link>)}</nav></details>
      </div>
      {children}
    </div>
  );
}
