import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActivityMap } from "@/components/admin/analytics/activity-map";
import type { CityActivity, GeoCoordinates } from "@/lib/analytics/geo-types";

import styles from "./preview.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Preview do mapa administrativo | Ótica Vision",
};

type PreviewState = "cluster" | "empty" | "single" | "unmapped" | "world";

function coordinates(latitude: number, longitude: number, region: string, resolvedName: string): GeoCoordinates {
  return { latitude, longitude, region, resolvedName, source: "google-geotargets-geonames" };
}

const fixtures: Record<Exclude<PreviewState, "empty">, CityActivity[]> = {
  single: [
    { activeUsers: 8, city: "Araguaina", cityId: "1001780", coordinates: coordinates(-7.19111, -48.20722, "Tocantins", "Araguaina"), country: "Brazil", countryCode: "BR", eventCount: 43 },
  ],
  cluster: [
    { activeUsers: 8, city: "Araguaina", cityId: "1001780", coordinates: coordinates(-7.19111, -48.20722, "Tocantins", "Araguaina"), country: "Brazil", countryCode: "BR", eventCount: 43 },
    { activeUsers: 5, city: "Palmas", cityId: "1031867", coordinates: coordinates(-10.16745, -48.32766, "Tocantins", "Palmas"), country: "Brazil", countryCode: "BR", eventCount: 21 },
    { activeUsers: 3, city: "Gurupi", cityId: "1031673", coordinates: coordinates(-11.72917, -49.06861, "Tocantins", "Gurupi"), country: "Brazil", countryCode: "BR", eventCount: 12 },
    { activeUsers: 2, city: "Porto Nacional", cityId: "1031940", coordinates: coordinates(-10.70806, -48.41722, "Tocantins", "Porto Nacional"), country: "Brazil", countryCode: "BR", eventCount: 7 },
  ],
  unmapped: [
    { activeUsers: 4, city: "(not set)", cityId: "(not set)", coordinates: null, country: "Brazil", countryCode: "BR", eventCount: 10 },
    { activeUsers: 2, city: "Cidade sem correspondência", cityId: "999999999", coordinates: null, country: "Brazil", countryCode: "BR", eventCount: 3 },
  ],
  world: [
    { activeUsers: 8, city: "Araguaina", cityId: "1001780", coordinates: coordinates(-7.19111, -48.20722, "Tocantins", "Araguaina"), country: "Brazil", countryCode: "BR", eventCount: 43 },
    { activeUsers: 5, city: "Palmas", cityId: "1031867", coordinates: coordinates(-10.16745, -48.32766, "Tocantins", "Palmas"), country: "Brazil", countryCode: "BR", eventCount: 21 },
    { activeUsers: 4, city: "Lisbon", cityId: "1011742", coordinates: coordinates(38.72509, -9.1498, "Lisbon", "Lisbon"), country: "Portugal", countryCode: "PT", eventCount: 18 },
    { activeUsers: 3, city: "New York", cityId: "1023191", coordinates: coordinates(40.71427, -74.00597, "New York", "New York"), country: "United States", countryCode: "US", eventCount: 14 },
    { activeUsers: 2, city: "Tokyo", cityId: "1009317", coordinates: coordinates(35.6895, 139.69171, "Tokyo", "Tokyo"), country: "Japan", countryCode: "JP", eventCount: 9 },
    { activeUsers: 2, city: "Cidade sem correspondência", cityId: "999999999", coordinates: null, country: "Brazil", countryCode: "BR", eventCount: 3 },
    { activeUsers: 1, city: "(not set)", cityId: "(not set)", coordinates: null, country: "(not set)", countryCode: "(not set)", eventCount: 2 },
  ],
};

const states: Array<{ key: PreviewState; label: string }> = [
  { key: "world", label: "Múltiplos países" },
  { key: "cluster", label: "Cidades próximas" },
  { key: "single", label: "Cidade única" },
  { key: "unmapped", label: "Não mapeadas" },
  { key: "empty", label: "Sem atividade" },
];

export default async function AnalyticsMapPreview({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const requested = (await searchParams).estado as PreviewState | undefined;
  const state = states.some((item) => item.key === requested) ? requested ?? "world" : "world";
  const cities = state === "empty" ? [] : fixtures[state];

  return <main className={styles.page} id="main-content">
    <header className={styles.header}>
      <div><span>Analytics administrativo · QA</span><h1>Mapa de atividade</h1><p>Fixtures agregadas, sem visitantes reais. Preview não promovido.</p></div>
      <nav aria-label="Estados do mapa">{states.map((item) => <Link aria-current={state === item.key ? "page" : undefined} href={`/preview/analytics?estado=${item.key}`} key={item.key}>{item.label}</Link>)}</nav>
    </header>
    <div className={styles.mapShell}><ActivityMap cities={cities} /></div>
  </main>;
}
