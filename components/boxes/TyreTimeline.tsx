'use client';

import { TYRE } from '@/lib/format';
import type { Compound, Stint } from '@/lib/openf1/types';
import { useDrivers } from '../DriversContext';
import { EmptyState, TeamBar } from '../ui';

interface Props {
  order: number[];
  stintBy: Record<number, Stint[]>;
  /** Vuelta actual (para el stint en curso, que todavía no tiene lap_end). */
  currentLap: number | null;
  /** Largo total de la escala (vueltas programadas o la última registrada). */
  scaleLaps: number | null;
}

const NAME: Record<Compound, string> = {
  SOFT: 'BLANDO',
  MEDIUM: 'MEDIO',
  HARD: 'DURO',
  INTERMEDIATE: 'INTER',
  WET: 'LLUVIA',
  UNKNOWN: '?',
};

/** Texto oscuro sobre compuestos claros (medio/duro), blanco sobre el resto. */
const INK: Record<Compound, string> = {
  SOFT: '#fff',
  MEDIUM: '#07080b',
  HARD: '#07080b',
  INTERMEDIATE: '#07080b',
  WET: '#fff',
  UNKNOWN: '#fff',
};

/**
 * Línea de tiempo de neumáticos por piloto: cada juego es un tramo del color del
 * compuesto, del largo de las vueltas que hizo con él. Rayado = juego ya usado
 * (tyre_age_at_start > 0); liso = nuevo.
 */
export function TyreTimeline({ order, stintBy, currentLap, scaleLaps }: Props) {
  const { ac } = useDrivers();
  const rows = order.filter((n) => stintBy[n]?.length);
  if (!rows.length) return <EmptyState>SIN DATOS DE NEUMÁTICOS</EmptyState>;

  const endOf = (s: Stint) => s.lap_end ?? currentLap ?? s.lap_start ?? 0;
  const maxEnd = Math.max(1, ...rows.flatMap((n) => stintBy[n].map(endOf)));
  const scale = Math.max(maxEnd, scaleLaps ?? 0);

  return (
    <div>
      <div className="mx-4 mb-2 flex flex-wrap gap-x-3.5 gap-y-1.5 font-mono text-[8.5px] tracking-[1px] text-ink-dim">
        {(['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET'] as const).map((c) => (
          <span key={c} className="flex items-center gap-[5px]">
            <i className="h-2 w-2 rounded-sm" style={{ background: TYRE[c].c }} />
            {NAME[c]}
          </span>
        ))}
        <span className="flex items-center gap-[5px]">
          <i className="tyre-used h-2 w-3.5 rounded-sm" style={{ background: 'var(--ink-dim)' }} />
          JUEGO USADO
        </span>
      </div>

      {rows.map((n) => {
        const stints = stintBy[n];
        const fresh = stints.filter((s) => s.tyre_age_at_start === 0).length;
        return (
          <div key={n} className="grid grid-cols-[44px_1fr_auto] items-center gap-2.5 border-b border-line-soft px-2.5 py-2">
            <div className="flex items-center gap-[7px] text-sm font-bold">
              <TeamBar n={n} h={16} />
              {ac(n)}
            </div>

            <div className="relative h-[18px] overflow-hidden rounded-sm bg-line-soft">
              {stints.map((s) => {
                const from = (s.lap_start ?? 1) - 1;
                const to = endOf(s);
                const laps = Math.max(1, to - from);
                const used = (s.tyre_age_at_start ?? 0) > 0;
                const open = s.lap_end == null;
                const title = `${NAME[s.compound]} ${used ? `usado (${s.tyre_age_at_start} v. previas)` : 'nuevo'} · vueltas ${s.lap_start ?? '?'}–${s.lap_end ?? 'en curso'} (${laps} v.)`;
                return (
                  <span
                    key={s.stint_number}
                    title={title}
                    aria-label={title}
                    className={`absolute inset-y-0 flex items-center justify-center overflow-hidden border-r-2 border-carbon font-mono text-[9px] font-extrabold ${used ? 'tyre-used' : ''}`}
                    style={{
                      left: `${(from / scale) * 100}%`,
                      width: `${(laps / scale) * 100}%`,
                      background: TYRE[s.compound].c,
                      color: INK[s.compound],
                      opacity: open ? 0.85 : 1,
                    }}
                  >
                    {laps / scale > 0.07 ? `${TYRE[s.compound].l}${laps / scale > 0.16 ? ` ${laps}` : ''}` : ''}
                  </span>
                );
              })}
            </div>

            <div className="text-right font-mono text-[10px] leading-tight text-ink-faint">
              <b className="block text-[13px] font-extrabold text-ink">
                {stints.length} {stints.length === 1 ? 'juego' : 'juegos'}
              </b>
              {fresh} {fresh === 1 ? 'nuevo' : 'nuevos'}
              {stints.length - fresh > 0 ? ` · ${stints.length - fresh} usado${stints.length - fresh > 1 ? 's' : ''}` : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}
