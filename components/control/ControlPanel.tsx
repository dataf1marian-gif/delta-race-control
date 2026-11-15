'use client';

import type { RaceControlEvent, RCType } from '@/lib/openf1/types';
import { useDrivers } from '../DriversContext';
import { EmptyState, SectionHeader } from '../ui';

const TL: Record<RCType, string> = {
  PENALTY: 'PENALIZACIÓN',
  INVESTIGATION: 'INVESTIGACIÓN',
  FLAG: 'BANDERA',
  SC: 'SAFETY CAR',
  VSC: 'VSC',
  RED: 'BANDERA ROJA',
  SESSION: 'SESIÓN',
};

/** Feed de control de carrera, más nuevo arriba. */
export function ControlPanel({ events }: { events: RaceControlEvent[] }) {
  const { ac } = useDrivers();
  const shown = events.filter((e): e is RaceControlEvent & { type: RCType } => e.type != null);

  return (
    <div className="lg:mx-auto lg:max-w-3xl">
      <SectionHeader title="CONTROL DE CARRERA" extra={`${shown.length} EVENTOS`} />
      {shown.length ? (
        <ol className="px-3.5">
          {[...shown].reverse().map((e, i) => (
            <li
              key={`${e.date}-${i}`}
              className="grid grid-cols-[38px_1fr] gap-[11px] border-b border-line-soft py-[11px]"
            >
              <div className="pt-0.5 text-center font-mono text-[10px] font-extrabold text-ink-dim">
                {e.lap_number ?? '–'}
                <b className="block text-[8px] font-medium text-ink-faint">VTA</b>
              </div>
              <div className="min-w-0">
                <span
                  className={`t-${e.type} mb-[5px] inline-flex items-center gap-1.5 rounded-sm px-[7px] py-0.5 font-mono text-[9px] font-extrabold tracking-[1px]`}
                >
                  {TL[e.type]}
                </span>
                <div className="break-words text-[13px] leading-[1.35]">
                  {e.driver_number != null && (
                    <>
                      <b className={e.served ? 'text-green' : 'text-ink'}>{ac(e.driver_number)}</b> ·{' '}
                    </>
                  )}
                  <span className={e.served ? 'text-green' : undefined}>{e.message}</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState>SIN EVENTOS DE CONTROL DE CARRERA</EmptyState>
      )}
    </div>
  );
}
