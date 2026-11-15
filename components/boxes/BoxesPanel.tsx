'use client';

import { useMemo } from 'react';
import { groupBy, tyreUsage, type TowerRow } from '@/lib/derive';
import { median, TYRE_ALLOCATION } from '@/lib/format';
import type { Pit, Stint } from '@/lib/openf1/types';
import { useDrivers } from '../DriversContext';
import { EmptyState, Note, SectionHeader, TeamBar, TyreChip } from '../ui';

interface Props {
  rows: TowerRow[];
  pits: Pit[] | undefined;
  stints: Stint[] | undefined;
}

export function BoxesPanel({ rows, pits, stints }: Props) {
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
  const tyreRows = order.tyres.filter((n) => stintBy[n]?.length);

  return (
    <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-2">
      <div>
      <SectionHeader title="PIT STOPS" extra="TIEMPO EN PIT LANE" />
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
      <Note>
        Primer valor: tiempo total en pit lane (entrada→salida, ~20-25s). Segundo (gris): tiempo estacionado cambiando
        gomas (<b>stop_duration</b>), cuando OpenF1 lo publica. En rojo, paradas más lentas que la mediana de la sesión.
      </Note>
      </div>

      <div>
      <SectionHeader title="NEUMÁTICOS" extra="JUEGOS NUEVOS" />
      {tyreRows.length ? (
        tyreRows.map((n) => {
          const u = tyreUsage(stintBy[n]);
          const remS = Math.max(0, TYRE_ALLOCATION.slick - u.slick);
          const remI = Math.max(0, TYRE_ALLOCATION.inter - u.inter);
          return (
            <div key={n} className="grid grid-cols-[40px_1fr_auto] items-center gap-2.5 border-b border-line-soft p-2.5">
              <div className="flex items-center gap-[7px] text-sm font-bold">
                <TeamBar n={n} h={16} />
                {ac(n)}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {u.newSets.length ? (
                  u.newSets.map((c, i) => <TyreChip key={i} c={c} size={15} />)
                ) : (
                  <span className="font-mono text-[9px] text-ink-faint">sin juegos nuevos</span>
                )}
              </div>
              <div className="text-right font-mono text-[10px] text-ink-faint">
                usó <b className="font-extrabold text-ink">{u.newSets.length}</b> · rest. ≈{remS}S/{remI}I
              </div>
            </div>
          );
        })
      ) : (
        <EmptyState>SIN DATOS DE NEUMÁTICOS</EmptyState>
      )}
      <Note>
        Juegos nuevos usados en esta sesión (stints con goma a estrenar, <b>tyre_age_at_start = 0</b>), dato real de
        OpenF1. El &quot;restante&quot; es estimado sobre la asignación estándar del finde ({TYRE_ALLOCATION.slick} slick +{' '}
        {TYRE_ALLOCATION.inter} inter + {TYRE_ALLOCATION.wet} wet) — la asignación real de la FIA no la expone la API.
      </Note>
      </div>
    </div>
  );
}
