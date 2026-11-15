'use client';

import { useMemo } from 'react';
import { finalCompounds, weatherSeries, type TowerRow } from '@/lib/derive';
import { parseGmtOffset } from '@/lib/format';
import type { RaceData } from '@/lib/useDeltaData';
import { Note, SectionHeader } from '../ui';
import { CircuitMap } from './CircuitMap';
import { PrecipChart } from './PrecipChart';
import { StatTiles } from './StatTiles';
import { Tower } from './Tower';
import { WeatherGrid, weatherState } from './WeatherGrid';

export function CarreraPanel({ data, rows }: { data: RaceData; rows: TowerRow[] }) {
  const { session, laps, stints, weather } = data;
  const tyres = useMemo(() => finalCompounds(stints), [stints]);
  const series = useMemo(() => weatherSeries(weather), [weather]);
  const lastWx = weather?.[weather.length - 1];

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-x-2">
      <div className="lg:col-start-1 lg:row-start-1">
      <StatTiles laps={laps} />

      <SectionHeader title="CIRCUITO" extra={(session?.circuit_short_name || '—').toUpperCase()} />
      <CircuitMap rows={rows} lapRef={laps?.medianLap ?? null} />
      <Note>
        Posiciones espaciadas por los gaps reales de carrera sobre un trazado esquemático. Próximo paso: posición exacta
        de cada auto con el GPS del endpoint <b>location</b> de OpenF1.
      </Note>
      </div>

      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
      <SectionHeader title="CLASIFICACIÓN" extra={`${rows.length} AUTOS`} />
      <Tower rows={rows} tyres={tyres} fastestDriver={laps?.fastest?.driver_number ?? null} />
      </div>

      <div className="lg:col-start-1 lg:row-start-2 lg:self-start">
      <SectionHeader title="CONDICIONES" extra={weatherState(lastWx)} />
      <WeatherGrid w={lastWx} />

      <SectionHeader title="PRECIPITACIÓN" extra="EVOLUCIÓN DE PISTA" />
      <PrecipChart
        series={series}
        start={session?.date_start}
        end={session?.date_end}
        offsetMin={parseGmtOffset(session?.gmt_offset)}
      />
      <Note>
        Serie real de clima de la sesión (OpenF1): temp de pista, humedad y marcas de lluvia; eje X en hora local del
        circuito. Un radar espacial (mapa de nubes) necesita un servicio externo (RainViewer, Windy) — esto es la
        evolución real medida en pista.
      </Note>
      </div>
    </div>
  );
}
