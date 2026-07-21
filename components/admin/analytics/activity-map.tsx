"use client";

import { Maximize2, Minus, Plus } from "lucide-react";
import type {
  CSSProperties,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent,
} from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { WORLD_MAP_PATH } from "@/lib/analytics/data/world-map-path";
import { GEO_SOURCE_COVERAGE, type CityActivity } from "@/lib/analytics/geo-types";
import {
  defaultMapView,
  fitMapView,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  MAP_TILE_SIZE,
  mapScreenPoint,
  normalizeLongitude,
  projectCoordinates,
  type MapSize,
  type MapView,
  unprojectCoordinates,
} from "@/lib/analytics/map-projection";

import styles from "./analytics.module.css";

const CLUSTER_DISTANCE = 48;

type ScreenCity = { city: CityActivity; x: number; y: number };
type CityCluster = { cities: ScreenCity[]; key: string; x: number; y: number };
type PointerPosition = { x: number; y: number };

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function cleanLocation(value: string) {
  return value && value !== "(not set)" ? value : "Localização não disponível";
}

function cityKey(city: CityActivity) {
  return `${city.countryCode}:${city.cityId || city.city}`;
}

function plural(value: number, singular: string, pluralValue: string) {
  return `${value} ${value === 1 ? singular : pluralValue}`;
}

function createClusters(points: ScreenCity[]) {
  const clusters: CityCluster[] = [];
  [...points]
    .sort((a, b) => b.city.activeUsers - a.city.activeUsers)
    .forEach((point) => {
      const cluster = clusters.find((candidate) => Math.hypot(candidate.x - point.x, candidate.y - point.y) < CLUSTER_DISTANCE);
      if (!cluster) {
        clusters.push({ cities: [point], key: cityKey(point.city), x: point.x, y: point.y });
        return;
      }
      cluster.cities.push(point);
      cluster.x = cluster.cities.reduce((sum, item) => sum + item.x, 0) / cluster.cities.length;
      cluster.y = cluster.cities.reduce((sum, item) => sum + item.y, 0) / cluster.cities.length;
      cluster.key = cluster.cities.map((item) => cityKey(item.city)).sort().join("|");
    });
  return clusters;
}

export function ActivityMap({ cities }: { cities: CityActivity[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView>(defaultMapView());
  const pointersRef = useRef(new Map<number, PointerPosition>());
  const panStartRef = useRef<{ center: ReturnType<typeof projectCoordinates>; pointer: PointerPosition; zoom: number } | null>(null);
  const pinchStartRef = useRef<{ distance: number; view: MapView } | null>(null);
  const wheelAtRef = useRef(0);
  const initializedRef = useRef(false);
  const [size, setSize] = useState<MapSize>({ height: 0, width: 0 });
  const [view, setViewState] = useState<MapView>(() => defaultMapView());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  const mapped = useMemo(() => cities.filter((city) => city.coordinates !== null), [cities]);
  const unavailableUsers = useMemo(
    () => cities.filter((city) => city.coordinates === null).reduce((sum, city) => sum + city.activeUsers, 0),
    [cities],
  );
  const selectedCity = useMemo(
    () => cities.find((city) => cityKey(city) === selectedKey) ?? null,
    [cities, selectedKey],
  );

  const setView = useCallback((next: MapView | ((current: MapView) => MapView)) => {
    setViewState((current) => {
      const candidate = typeof next === "function" ? next(current) : next;
      const safe = {
        latitude: clamp(candidate.latitude, -85, 85),
        longitude: normalizeLongitude(candidate.longitude),
        zoom: Math.round(clamp(candidate.zoom, MAP_MIN_ZOOM, MAP_MAX_ZOOM) * 100) / 100,
      };
      viewRef.current = safe;
      return safe;
    });
  }, []);

  useEffect(() => {
    const element = mapRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const nextSize = { height: entry.contentRect.height, width: entry.contentRect.width };
      setSize(nextSize);
      if (!initializedRef.current && nextSize.width > 0 && nextSize.height > 0) {
        initializedRef.current = true;
        setView(fitMapView(cities, nextSize));
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [cities, setView]);

  const mapCopies = useMemo(() => {
    const center = projectCoordinates(view.latitude, view.longitude, view.zoom);
    const scale = 2 ** view.zoom;
    const worldSize = MAP_TILE_SIZE * scale;
    const originX = center.x - size.width / 2;
    const originY = center.y - size.height / 2;
    return [-2, -1, 0, 1, 2].map((copy) => ({
      key: copy,
      transform: `translate(${-originX + copy * worldSize} ${-originY}) scale(${scale})`,
    }));
  }, [size, view]);
  const screenCities = useMemo(
    () => mapped.flatMap((city) => {
      const point = mapScreenPoint(city, view, size);
      if (!point || point.x < -60 || point.y < -60 || point.x > size.width + 60 || point.y > size.height + 60) return [];
      return [{ city, ...point }];
    }),
    [mapped, size, view],
  );
  const clusters = useMemo(() => createClusters(screenCities), [screenCities]);

  const resetView = useCallback(() => {
    setView(fitMapView(cities, size));
  }, [cities, setView, size]);

  const zoomBy = useCallback((step: number, anchor?: PointerPosition) => {
    setView((current) => {
      const zoom = clamp(current.zoom + step, MAP_MIN_ZOOM, MAP_MAX_ZOOM);
      const element = mapRef.current;
      if (!anchor || !element || zoom === current.zoom) return { ...current, zoom };
      const rect = element.getBoundingClientRect();
      const local = { x: anchor.x - rect.left, y: anchor.y - rect.top };
      const center = projectCoordinates(current.latitude, current.longitude, current.zoom);
      const anchoredLocation = unprojectCoordinates(
        center.x + local.x - size.width / 2,
        center.y + local.y - size.height / 2,
        current.zoom,
      );
      const nextAnchor = projectCoordinates(anchoredLocation.latitude, anchoredLocation.longitude, zoom);
      const nextCenter = unprojectCoordinates(
        nextAnchor.x - local.x + size.width / 2,
        nextAnchor.y - local.y + size.height / 2,
        zoom,
      );
      return { ...nextCenter, zoom };
    });
  }, [setView, size]);

  const panBy = useCallback((x: number, y: number) => {
    setView((current) => {
      const center = projectCoordinates(current.latitude, current.longitude, current.zoom);
      return { ...unprojectCoordinates(center.x + x, center.y + y, current.zoom), zoom: current.zoom };
    });
  }, [setView]);

  const selectCity = useCallback((city: CityActivity) => {
    setSelectedKey(cityKey(city));
    if (city.coordinates) {
      setView((current) => ({
        latitude: city.coordinates?.latitude ?? current.latitude,
        longitude: city.coordinates?.longitude ?? current.longitude,
        zoom: Math.max(current.zoom, 5),
      }));
    }
  }, [setView]);

  const handleCluster = useCallback((cluster: CityCluster) => {
    if (cluster.cities.length === 1) {
      selectCity(cluster.cities[0].city);
      return;
    }
    const latitude = cluster.cities.reduce((sum, item) => sum + (item.city.coordinates?.latitude ?? 0), 0) / cluster.cities.length;
    const longitude = cluster.cities.reduce((sum, item) => sum + (item.city.coordinates?.longitude ?? 0), 0) / cluster.cities.length;
    setView((current) => ({ latitude, longitude, zoom: current.zoom + 2 }));
  }, [selectCity, setView]);

  const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const now = performance.now();
    if (now - wheelAtRef.current < 110) return;
    wheelAtRef.current = now;
    zoomBy(event.deltaY < 0 ? 1 : -1, { x: event.clientX, y: event.clientY });
  }, [zoomBy]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomBy(1);
    } else if (event.key === "-") {
      event.preventDefault();
      zoomBy(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      resetView();
    } else if (event.key === "Escape") {
      setSelectedKey(null);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      panBy(-80, 0);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      panBy(80, 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      panBy(0, -80);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      panBy(0, 80);
    }
  }, [panBy, resetView, zoomBy]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, a")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 1) {
      panStartRef.current = {
        center: projectCoordinates(viewRef.current.latitude, viewRef.current.longitude, viewRef.current.zoom),
        pointer: { x: event.clientX, y: event.clientY },
        zoom: viewRef.current.zoom,
      };
      setIsPanning(true);
    } else if (pointersRef.current.size === 2) {
      const [first, second] = [...pointersRef.current.values()];
      pinchStartRef.current = { distance: Math.hypot(second.x - first.x, second.y - first.y), view: viewRef.current };
      panStartRef.current = null;
    }
  }, []);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2 && pinchStartRef.current) {
      const [first, second] = [...pointersRef.current.values()];
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      const zoom = pinchStartRef.current.view.zoom + Math.log2(Math.max(distance, 1) / Math.max(pinchStartRef.current.distance, 1));
      setView({ ...pinchStartRef.current.view, zoom });
      return;
    }
    if (pointersRef.current.size === 1 && panStartRef.current) {
      const start = panStartRef.current;
      const center = unprojectCoordinates(
        start.center.x - (event.clientX - start.pointer.x),
        start.center.y - (event.clientY - start.pointer.y),
        start.zoom,
      );
      setView({ ...center, zoom: start.zoom });
    }
  }, [setView]);

  const handlePointerEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchStartRef.current = null;
    if (pointersRef.current.size === 1) {
      const pointer = [...pointersRef.current.values()][0];
      panStartRef.current = {
        center: projectCoordinates(viewRef.current.latitude, viewRef.current.longitude, viewRef.current.zoom),
        pointer,
        zoom: viewRef.current.zoom,
      };
    } else if (!pointersRef.current.size) {
      panStartRef.current = null;
      setIsPanning(false);
    }
  }, []);

  return <section className={styles.mapSection} aria-labelledby="activity-map-title">
    <div className={styles.sectionHeader}>
      <div>
        <h2 id="activity-map-title">Mapa de atividade</h2>
        <p>Localização agregada por cidade. Não representa endereço nem posição GPS do visitante.</p>
      </div>
      <span className={styles.mapCoverage}>{mapped.length} de {cities.length} {cities.length === 1 ? "cidade posicionada" : "cidades posicionadas"}</span>
    </div>

    <div className={styles.mapWorkspace}>
      <div
        aria-describedby="activity-map-help"
        aria-label="Mapa interativo de cidades ativas"
        className={styles.mapFrame}
        data-panning={isPanning || undefined}
        onDoubleClick={(event) => zoomBy(1, { x: event.clientX, y: event.clientY })}
        onKeyDown={handleKeyDown}
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onWheel={handleWheel}
        ref={mapRef}
        role="region"
        tabIndex={0}
      >
        <p className={styles.srOnly} id="activity-map-help">Use as setas para mover, mais e menos para aproximar ou afastar, Home para restaurar e Escape para fechar a seleção.</p>
        <svg
          aria-hidden="true"
          className={styles.mapBase}
          preserveAspectRatio="none"
          viewBox={`0 0 ${Math.max(size.width, 1)} ${Math.max(size.height, 1)}`}
        >
          <defs>
            <path id="world-map-path" d={WORLD_MAP_PATH} fillRule="evenodd" />
          </defs>
          {mapCopies.map((copy) => <g key={copy.key} transform={copy.transform}>
            <use href="#world-map-path" className={styles.mapLand} />
          </g>)}
        </svg>

        <div className={styles.mapControls} aria-label="Controles do mapa">
          <button aria-label="Aproximar mapa" disabled={view.zoom >= MAP_MAX_ZOOM} onClick={() => zoomBy(1)} type="button"><Plus aria-hidden size={17} /></button>
          <button aria-label="Afastar mapa" disabled={view.zoom <= MAP_MIN_ZOOM} onClick={() => zoomBy(-1)} type="button"><Minus aria-hidden size={17} /></button>
          <button aria-label="Restaurar enquadramento das cidades" onClick={resetView} type="button"><Maximize2 aria-hidden size={16} /></button>
        </div>
        <span className={styles.mapZoom} aria-live="polite">Zoom {view.zoom}</span>

        {clusters.map((cluster) => {
          const activeUsers = cluster.cities.reduce((sum, item) => sum + item.city.activeUsers, 0);
          const eventCount = cluster.cities.reduce((sum, item) => sum + item.city.eventCount, 0);
          const onlyCity = cluster.cities.length === 1 ? cluster.cities[0].city : null;
          const selected = Boolean(onlyCity && cityKey(onlyCity) === selectedKey);
          const markerSize = clamp(30 + Math.sqrt(Math.max(activeUsers, 1)) * 3, 34, 46);
          const nearTop = cluster.y < 110;
          const shift = clamp(size.width / 2 - cluster.x, -90, 90);
          const label = onlyCity
            ? `${cleanLocation(onlyCity.city)}, ${cleanLocation(onlyCity.country)}: ${plural(activeUsers, "visitante ativo", "visitantes ativos")} e ${plural(eventCount, "evento", "eventos")}`
            : `${plural(cluster.cities.length, "cidade próxima", "cidades próximas")}, ${plural(activeUsers, "visitante ativo", "visitantes ativos")}`;
          return <button
            aria-controls={onlyCity ? "selected-city-detail" : undefined}
            aria-label={label}
            aria-pressed={selected || undefined}
            className={styles.mapMarker}
            data-cluster={cluster.cities.length > 1 || undefined}
            data-selected={selected || undefined}
            key={cluster.key}
            onClick={() => handleCluster(cluster)}
            style={{
              "--marker-size": `${markerSize}px`,
              "--marker-x": `${cluster.x}px`,
              "--marker-y": `${cluster.y}px`,
              "--tooltip-shift": `${shift}px`,
            } as CSSProperties}
            type="button"
          >
            <b aria-hidden>{cluster.cities.length > 1 ? cluster.cities.length : activeUsers}</b>
            <span className={styles.mapTooltip} data-side={nearTop ? "below" : "above"} role="tooltip">
              <strong>{onlyCity ? cleanLocation(onlyCity.city) : plural(cluster.cities.length, "cidade próxima", "cidades próximas")}</strong>
              <small>{onlyCity ? [onlyCity.coordinates?.region, cleanLocation(onlyCity.country)].filter(Boolean).join(" · ") : "Toque para aproximar"}</small>
              <b>{plural(activeUsers, "visitante ativo", "visitantes ativos")} · {plural(eventCount, "evento", "eventos")}</b>
            </span>
          </button>;
        })}

        {!mapped.length ? <div className={styles.mapEmpty}>
          <strong>Sem cidades posicionadas agora</strong>
          <p>A lista abaixo continua disponível, inclusive quando o Google não informa uma localização reconhecível.</p>
        </div> : null}

        <span className={styles.mapAttribution}>
          Base <a href="https://www.naturalearthdata.com/" rel="noreferrer" target="_blank">Natural Earth</a>
          {" · "}cidades <a href="https://www.geonames.org/" rel="noreferrer" target="_blank">GeoNames</a>
        </span>
      </div>

      <aside className={styles.mapSelection} id="selected-city-detail" aria-live="polite">
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
        </> : <>
          <span>Leitura do mapa</span>
          <strong>Selecione uma cidade</strong>
          <p>Use um marcador ou a lista para manter os detalhes visíveis.</p>
          <small>Base Natural Earth. Coordenadas de centro de cidade via GeoNames, vinculadas pelo cityId do Google.</small>
        </>}
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
  </section>;
}
