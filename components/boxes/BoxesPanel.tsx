'use client';

import { useMemo } from 'react';
import { groupBy, type TowerRow } from '@/lib/derive';
import { median } from '@/lib/format';
import type { Pit, Stint } from '@/lib/openf1/types';
import { useDrivers } from '../DriversContext';
import { EmptyState, SectionHeader, TeamBar } from '../ui';
import { TyreTimeline } from './TyreTimeline';

interface Props {
  rows: TowerRow[];
  pits: Pit[] | undefined;
  stints: Stint[] | undefined;
  currentLap: number | null;
  scaleLaps: number | null;
}

export function BoxesPanel({ rows, pits, stints, currentLap, scaleLaps }: Props) {
  const { ac } = useDrivers();
  const pitBy = useMemo(() => groupBy(pits), [pits]);
  const stintBy = useMemo(() => groupBy(stints), [stints]);
  // "Lenta" relativa al circuito: > mediana de la sesión +18% (el prototipo usaba >30s fijo).
  const slowOver = useMemo(() => {
    const m = median((pits || []).map((p) => p.pit_duration).filter((d): d is number => d != null));
    return m != null ? m * 1.18 : 30;
  }, [pits]);

  // Orden de clasificación, y al final quien no figure en la torre.
  const order = useMemo(() => {
    const ns = rows.map((r) => r.n);
    const extra = (src: Record<number, unknown>) => Object.keys(src).map(Number).filter((n) => !ns.includes(n));
    return { pits: [...ns, ...extra(pitBy)], tyres: [...ns, ...extra(stintBy)] };
  }, [rows, pitBy, stintBy]);

  const pitRows = order.pits.filter((n) => pitBy[n]?.length);

  return (
    <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-2">
      <div>
      <SectionHeader title="PIT STOPS" extra="POR PARADA" />
      <div className="mx-4 mb-2 flex flex-wrap gap-x-3.5 gap-y-1 font-mono text-[8.5px] tracking-[1px] text-ink-dim">
        <span><b className="text-ink">24.0s</b> EN PIT LANE</span>
        <span><b className="text-ink-faint">2.5s</b> DETENIDO</span>
        <span className="text-signal">ROJO = PARADA LENTA</span>
      </div>
      {pitRows.length ? (
        pitRows.map((n) => {
          const arr = pitBy[n];
          return (
            <div key={n} className="grid grid-cols-[40px_1fr_auto] items-center gap-2.5 border-b border-line-soft p-2.5">
              <div className="flex items-center gap-[7px] text-sm font-bold">
                <TeamBar n={n} h={16} />
                {ac(n)}
              </div>
              <div className="flex flex-wrap gap-[5px]">
                {arr.map((p, i) => {
                  const slow = p.pit_duration != null && p.pit_duration > slowOver;
                  return (
                    <span
                      key={i}
                      title={p.lap_number != null ? `Vuelta ${p.lap_number}` : undefined}
                      className={`rounded-sm border px-[7px] py-[3px] font-mono text-[10px] font-bold ${
                        slow ? 'border-signal/40 text-signal' : 'border-line text-ink-dim'
                      }`}
                    >
                      {p.pit_duration != null ? `${p.pit_duration.toFixed(1)}s` : '…'}
                      {p.stop_duration != null && <span className="text-ink-faint"> · {p.stop_duration.toFixed(1)}s</span>}
                    </span>
                  );
                })}
              </div>
              <div className="text-right font-mono text-[10px] text-ink-faint">
                <b className="block text-[17px] font-extrabold text-ink">{arr.length}</b>
                {arr.length === 1 ? 'PARADA' : 'PARADAS'}
              </div>
            </div>
          );
        })
      ) : (
        <EmptyState>SIN PIT STOPS REGISTRADOS</EmptyState>
      )}
      </div>

      <div>
      <SectionHeader title="NEUMÁTICOS" extra="JUEGOS POR VUELTA" />
      <TyreTimeline order={order.tyres} stintBy={stintBy} currentLap={currentLap} scaleLaps={scaleLaps} />
      </div>
    </div>
  );
}
