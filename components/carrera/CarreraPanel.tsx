'use client';

import { useMemo } from 'react';
import { finalCompounds, weatherSeries, type TowerRow } from '@/lib/derive';
import { parseGmtOffset } from '@/lib/format';
import type { RaceData } from '@/lib/useDeltaData';
import { SectionHeader } from '../ui';
import { CircuitMap } from './CircuitMap';
import { PrecipChart } from './PrecipChart';
import { StatTiles } from './StatTiles';
import { Tower } from './Tower';
import { WeatherGrid, weatherState } from './WeatherGrid';

export function CarreraPanel({ data, rows, mapBadge }: { data: RaceData; rows: TowerRow[]; mapBadge?: string | null }) {
  const { session, laps, stints, weather, track, location } = data;
  const tyres = useMemo(() => finalCompounds(stints), [stints]);
  // Solo lecturas dentro de la sesión, así el eje de horas (inicio → fin) coincide con los datos.
  const series = useMemo(() => {
    const st = session ? Date.parse(session.date_start) : NaN;
    const en = session ? Date.parse(session.date_end) : NaN;
    const inSession =
      Number.isFinite(st) && Number.isFinite(en)
        ? weather?.filter((r) => {
            const t = Date.parse(r.date);
            return t >= st && t <= en;
          })
        : weather;
    return weatherSeries(inSession?.length ? inSession : weather);
  }, [weather, session]);
  // Último registro con lecturas válidas (el normalizador anula las lecturas basura).
  const lastWx = useMemo(
    () => (weather ? [...weather].reverse().find((r) => r.track_temperature != null && r.air_temperature != null) : undefined),
    [weather],
  );
  // Registro de ~15 min antes del último, para mostrar tendencias.
  const prevWx = useMemo(() => {
    if (!lastWx || !weather) return undefined;
    const target = Date.parse(lastWx.date) - 15 * 60_000;
    return [...weather].reverse().find((r) => Date.parse(r.date) <= target);
  }, [weather, lastWx]);

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-x-2">
      <div className="lg:col-start-1 lg:row-start-1">
      <StatTiles laps={laps} />

      <SectionHeader title="CIRCUITO" extra={(session?.circuit_short_name || '—').toUpperCase()} />
      <CircuitMap rows={rows} lapRef={laps?.medianLap ?? null} track={track} locations={location} badge={mapBadge} />
      </div>

      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
      <SectionHeader title="CLASIFICACIÓN" extra={`${rows.length} AUTOS`} />
      <Tower rows={rows} tyres={tyres} fastestDriver={laps?.fastest?.driver_number ?? null} />
      </div>

      <div className="lg:col-start-1 lg:row-start-2 lg:self-start">
      <SectionHeader title="CONDICIONES" extra={weatherState(lastWx)} />
      <WeatherGrid w={lastWx} prev={prevWx} />

      <SectionHeader title="PRECIPITACIÓN" extra="EVOLUCIÓN DE PISTA" />
      <PrecipChart
        series={series}
        start={session?.date_start}
        end={session?.date_end}
        offsetMin={parseGmtOffset(session?.gmt_offset)}
      />
      </div>
    </div>
  );
}
