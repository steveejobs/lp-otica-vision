"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCallback, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";

import { GEO_SOURCE_COVERAGE, type CityActivity } from "@/lib/analytics/geo-types";
import styles from "./analytics.module.css";

const CLUSTER_DISTANCE = 48;

type ScreenCity = { city: CityActivity; x: number; y: number };
type CityCluster = { cities: ScreenCity[]; key: string; lat: number; lng: number };

function cleanLocation(value: string) {
  return value && value !== "(not set)" ? value : "Localização não disponível";
}

function cityKey(city: CityActivity) {
  return `${city.countryCode}:${city.cityId || city.city}`;
}

function plural(value: number, singular: string, pluralValue: string) {
  return `${value} ${value === 1 ? singular : pluralValue}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function ClusterMarkers({
  cities,
  selectedKey,
  onSelect,
}: {
  cities: CityActivity[];
  onSelect: (city: CityActivity) => void;
  selectedKey: string | null;
}) {
  const map = useMap();
  const [tick, setTick] = useState(0);

  useMapEvents({
    moveend: () => setTick((t) => t + 1),
    zoomend: () => setTick((t) => t + 1),
  });

  const { clusters, zoom } = useMemo(() => {
    // We reference tick to re-run this when map moves
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    tick;

    const screenPoints = cities.map((city) => {
      const point = map.latLngToContainerPoint([city.coordinates!.latitude, city.coordinates!.longitude]);
      return { city, x: point.x, y: point.y };
    });

    const newClusters: CityCluster[] = [];
    [...screenPoints]
      .sort((a, b) => b.city.activeUsers - a.city.activeUsers)
      .forEach((point) => {
        const cluster = newClusters.find((candidate) => {
          const candidatePoint = map.latLngToContainerPoint([candidate.lat, candidate.lng]);
          return Math.hypot(candidatePoint.x - point.x, candidatePoint.y - point.y) < CLUSTER_DISTANCE;
        });
        if (!cluster) {
          newClusters.push({
            cities: [point],
            key: cityKey(point.city),
            lat: point.city.coordinates!.latitude,
            lng: point.city.coordinates!.longitude,
          });
          return;
        }
        cluster.cities.push(point);
        // Average coordinates for the cluster
        cluster.lat = cluster.cities.reduce((sum, item) => sum + item.city.coordinates!.latitude, 0) / cluster.cities.length;
        cluster.lng = cluster.cities.reduce((sum, item) => sum + item.city.coordinates!.longitude, 0) / cluster.cities.length;
        cluster.key = cluster.cities.map((item) => cityKey(item.city)).sort().join("|");
      });

    return { clusters: newClusters, zoom: map.getZoom() };
  }, [cities, map, tick]);

  const handleClusterClick = (cluster: CityCluster) => {
    if (cluster.cities.length === 1) {
      onSelect(cluster.cities[0].city);
      map.flyTo([cluster.lat, cluster.lng], Math.max(map.getZoom(), 8), { duration: 0.8 });
    } else {
      map.flyTo([cluster.lat, cluster.lng], map.getZoom() + 2, { duration: 0.8 });
    }
  };

  return (
    <>
      {clusters.map((cluster) => {
        const activeUsers = cluster.cities.reduce((sum, item) => sum + item.city.activeUsers, 0);
        const eventCount = cluster.cities.reduce((sum, item) => sum + item.city.eventCount, 0);
        const onlyCity = cluster.cities.length === 1 ? cluster.cities[0].city : null;
        const selected = Boolean(onlyCity && cityKey(onlyCity) === selectedKey);
        const markerSize = clamp(30 + Math.sqrt(Math.max(activeUsers, 1)) * 3, 34, 46);

        const html = `
          <div class="${styles.mapMarker}" data-cluster="${cluster.cities.length > 1}" data-selected="${selected}" style="width: ${markerSize}px; height: ${markerSize}px;">
            <div class="${styles.mapRadar}"></div>
            <b>${cluster.cities.length > 1 ? cluster.cities.length : activeUsers}</b>
          </div>
        `;

        const icon = L.divIcon({
          className: "",
          html,
          iconAnchor: [markerSize / 2, markerSize / 2],
          iconSize: [markerSize, markerSize],
        });

        const label = onlyCity
          ? `${cleanLocation(onlyCity.city)}, ${cleanLocation(onlyCity.country)}`
          : `${plural(cluster.cities.length, "cidade próxima", "cidades próximas")}`;
        const subLabel = onlyCity ? [onlyCity.coordinates?.region, cleanLocation(onlyCity.country)].filter(Boolean).join(" · ") : "Toque para aproximar";

        return (
          <Marker
            eventHandlers={{
              click: () => handleClusterClick(cluster),
            }}
            icon={icon}
            key={`${cluster.key}-${zoom}`}
            position={[cluster.lat, cluster.lng]}
          >
            <Tooltip className={styles.mapTooltip} direction="top" offset={[0, -(markerSize / 2)]}>
              <div className={styles.mapTooltipInner}>
                <strong>{label}</strong>
                <small>{subLabel}</small>
                <b>{plural(activeUsers, "visitante ativo", "visitantes ativos")} · {plural(eventCount, "evento", "eventos")}</b>
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
}

export default function ActivityMapLeaflet({ cities }: { cities: CityActivity[] }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const mapped = useMemo(() => cities.filter((city) => city.coordinates !== null), [cities]);
  const unavailableUsers = useMemo(
    () => cities.filter((city) => city.coordinates === null).reduce((sum, city) => sum + city.activeUsers, 0),
    [cities],
  );
  const selectedCity = useMemo(
    () => cities.find((city) => cityKey(city) === selectedKey) ?? null,
    [cities, selectedKey],
  );

  const selectCity = useCallback((city: CityActivity) => {
    setSelectedKey(cityKey(city));
  }, []);

  return (
    <section aria-labelledby="activity-map-title" className={styles.mapSection}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 id="activity-map-title">Mapa de atividade</h2>
          <p>Localização agregada por cidade no OpenStreetMap.</p>
        </div>
        <span className={styles.mapCoverage}>{mapped.length} de {cities.length} {cities.length === 1 ? "cidade posicionada" : "cidades posicionadas"}</span>
      </div>

      <div className={styles.mapWorkspace}>
        <div className={styles.mapFrameWrapper}>
          <MapContainer
            bounds={mapped.length > 0 ? mapped.map((c) => [c.coordinates!.latitude, c.coordinates!.longitude]) : [[-33, -73], [4, -34]]}
            className={styles.mapFrame}
            maxBounds={[[-90, -180], [90, 180]]}
            maxZoom={11}
            minZoom={2}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mapped.length > 0 && <ClusterMarkers cities={mapped} onSelect={selectCity} selectedKey={selectedKey} />}
          </MapContainer>
        </div>

        <aside aria-live="polite" className={styles.mapSelection} id="selected-city-detail">
          {selectedCity ? <>
            <div className={styles.mapSelectionHeading}>
              <span>Cidade selecionada</span>
              <button aria-label="Fechar detalhes da cidade" onClick={() => setSelectedKey(null)} type="button">Fechar</button>
            </div>
            <strong>{cleanLocation(selectedCity.city)}</strong>
            <p>{[selectedCity.coordinates?.region, cleanLocation(selectedCity.country)].filter(Boolean).join(" · ")}</p>
            <dl>
              <div><dt>Visitantes ativos</dt><dd>{selectedCity.activeUsers}</dd></div>
              <div><dt>Eventos</dt><dd>{selectedCity.eventCount}</dd></div>
            </dl>
            <small>{selectedCity.coordinates ? "Ponto no centro da cidade segundo GeoNames; não representa GPS." : "Sem coordenada confiável; a cidade não foi colocada no mapa."}</small>
          </> : null}
        </aside>
      </div>

      <div className={styles.cityAlternative}>
        <div className={styles.cityAlternativeHeading}>
          <div><h3>Cidades ativas</h3><p>A lista é a referência completa, mesmo sem coordenada.</p></div>
          {unavailableUsers ? <strong>{plural(unavailableUsers, "visitante não posicionado", "visitantes não posicionados")}</strong> : null}
        </div>
        {cities.length ? <ul>{cities.map((city) => {
          const selected = cityKey(city) === selectedKey;
          return <li key={cityKey(city)}>
            <button aria-controls="selected-city-detail" aria-pressed={selected} onClick={() => selectCity(city)} type="button">
              <span>
                <strong>{cleanLocation(city.city)}</strong>
                <small>{[city.coordinates?.region, cleanLocation(city.country)].filter(Boolean).join(" · ")}</small>
                <em data-mapped={city.coordinates ? "true" : "false"}>{city.coordinates ? "Posicionada no mapa" : "Sem coordenada confiável"}</em>
              </span>
              <span className={styles.cityCounts}><b>{city.activeUsers}</b><small>{plural(city.eventCount, "evento", "eventos")}</small></span>
            </button>
          </li>;
        })}</ul> : <p>Nenhuma cidade disponível na atividade recente.</p>}
        <p className={styles.mapSourceNote}>Cobertura da fonte: {GEO_SOURCE_COVERAGE.mappedCities.toLocaleString("pt-BR")} de {GEO_SOURCE_COVERAGE.googleActiveCities.toLocaleString("pt-BR")} IDs de cidade ativos ({GEO_SOURCE_COVERAGE.percentage.toLocaleString("pt-BR")}%). O extrato GeoNames inclui cidades acima de 5.000 habitantes e sedes administrativas; ausências nunca são estimadas.</p>
      </div>
    </section>
  );
}
