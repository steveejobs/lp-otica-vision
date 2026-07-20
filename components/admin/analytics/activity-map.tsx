import type { CSSProperties } from "react";

import { buildActivityMapModel, type CityActivity } from "@/lib/analytics/geo-centroids";

import styles from "./analytics.module.css";

function cleanLocation(value: string) {
  return value && value !== "(not set)" ? value : "Localização não disponível";
}

export function ActivityMap({ cities }: { cities: CityActivity[] }) {
  const { mapped, unavailableUsers } = buildActivityMapModel(cities);
  return <section className={styles.mapSection} aria-labelledby="activity-map-title">
    <div className={styles.sectionHeader}><div><h2 id="activity-map-title">Mapa de atividade</h2><p>Localização agregada por cidade informada pelo Google Analytics.</p></div></div>
    <div className={styles.mapFrame} data-empty={!mapped.length || undefined}>
      <svg aria-hidden="true" className={styles.worldMap} viewBox="0 0 1000 520">
        <path d="M70 92 146 46l100 14 70 64-26 60-63 25-42 82-74-30-18-75-42-38Z" />
        <path d="m260 274 75 18 47 72-24 112-42-18-26-91-45-47Z" />
        <path d="m440 108 57-36 96 19 55-20 129 31 123 92-27 55-98-8-58 51-101-22-55-81-83 9-57-36Z" />
        <path d="m505 231 78 3 60 74-27 126-69-13-39-86-30-54Z" />
        <path d="m789 356 77-36 85 46-22 73-97 7-45-44Z" />
      </svg>
      {mapped.map((city) => {
        const point = city.point;
        const size = Math.min(34, Math.max(14, 10 + Math.sqrt(Math.max(city.activeUsers, 1)) * 5));
        const label = `${cleanLocation(city.city)}, ${cleanLocation(city.country)}: ${city.activeUsers} ${city.activeUsers === 1 ? "visitante ativo" : "visitantes ativos"}`;
        return <button aria-label={label} className={styles.mapBubble} key={`${city.countryCode}-${city.city}`} style={{ "--bubble-size": `${size}px`, left: `${point.x}%`, top: `${point.y}%` } as CSSProperties} type="button"><span role="tooltip"><strong>{cleanLocation(city.city)}</strong><small>{cleanLocation(city.country)}</small><b>{city.activeUsers} {city.activeUsers === 1 ? "ativo" : "ativos"}</b></span></button>;
      })}
      {!mapped.length ? <div className={styles.mapEmpty}><strong>Sem atividade geográfica no momento</strong><p>O mapa exibe somente cidades informadas pelo Google Analytics.</p></div> : null}
    </div>
    <div className={styles.cityAlternative}>
      <h3>Cidades ativas</h3>
      {cities.length ? <ul>{cities.map((city) => <li key={`${city.countryCode}-${city.city}`}><span><strong>{cleanLocation(city.city)}</strong><small>{cleanLocation(city.country)}</small></span><b>{city.activeUsers}</b></li>)}</ul> : <p>Nenhuma cidade disponível no período recente.</p>}
      {unavailableUsers ? <p>{unavailableUsers} {unavailableUsers === 1 ? "visitante permanece" : "visitantes permanecem"} em “Localização não disponível”.</p> : null}
    </div>
  </section>;
}
