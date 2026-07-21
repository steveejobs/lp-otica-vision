"use client";

import dynamic from "next/dynamic";
import type { CityActivity } from "@/lib/analytics/geo-types";
import styles from "./analytics.module.css";

const ActivityMapLeaflet = dynamic(() => import("./activity-map-leaflet"), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}><p>Carregando mapa de atividade...</p></div>
});

export function ActivityMap({ cities }: { cities: CityActivity[] }) {
  return <ActivityMapLeaflet cities={cities} />;
}
