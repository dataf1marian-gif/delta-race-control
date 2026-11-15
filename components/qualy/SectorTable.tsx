'use client';

import { lapTime, segColor } from '@/lib/format';
import type { LapSummary, Segments } from '@/lib/openf1/types';
import { useDrivers } from '../DriversContext';
import { EmptyState, TeamBar } from '../ui';

interface Props {
  laps: LapSummary | undefined;
  /** En vivo: microsectores de la última vuelta; terminada: de la mejor vuelta. */
  live: boolean;
}

const eq = (a: number | null, b: number) => a != null && Math.abs(a - b) < 1e-6;

/** Mejores sectores por piloto (púrpura = mejor de todos, verde = mejor personal) + microsectores. */
export function SectorTable({ laps, live }: Props) {
  const { ac } = useDrivers();
  const drivers = laps?.drivers ?? {};
  const order = Object.keys(drivers)
    .map(Number)
    .filter((n) => drivers[n].best != null && drivers[n].s1 != null && drivers[n].s2 != null && drivers[n].s3 != null)
    .sort((a, b) => (drivers[a].best as number) - (drivers[b].best as number));

  if (!order.length) return <EmptyState>SIN TIEMPOS DE SECTOR</EmptyState>;

  let b1 = Infinity, b2 = Infinity, b3 = Infinity;
  for (const n of order) {
    const o = drivers[n];
    b1 = Math.min(b1, o.s1 as number);
    b2 = Math.min(b2, o.s2 as number);
    b3 = Math.min(b3, o.s3 as number);
  }

  return (
    <div>
      <div className="sr-only">{order.length} pilotos</div>
      {order.map((n) => {
        const o = drivers[n];
        const s1 = o.s1 as number, s2 = o.s2 as number, s3 = o.s3 as number;
        const px = [eq(s1, b1), eq(s2, b2), eq(s3, b3)];
        const seg: Segments | null = live ? (o.lastSegments ?? o.bestSegments) : (o.bestSegments ?? o.lastSegments);
        return (
          <div key={n} className="border-b border-line-soft px-3.5 py-[9px]">
            <div className="flex items-center gap-2">
              <TeamBar n={n} h={15} />
              <span className="text-sm font-bold tracking-[.5px]">{ac(n)}</span>
              <span className="ml-auto font-mono text-[13px] font-extrabold">{lapTime(o.best)}</span>
              <span className="ml-2 font-mono text-[9px] text-ink-faint">IDEAL {lapTime(s1 + s2 + s3)}</span>
            </div>
            <div className="mt-[7px] grid grid-cols-3 gap-1.5">
              {[s1, s2, s3].map((v, i) => (
                <span
                  key={i}
                  className={`flex justify-between gap-1 rounded-sm px-1.5 py-[3px] font-mono text-xs font-bold ${
                    px[i] ? 'bg-violet/[.12] text-violet' : 'bg-green/10 text-green'
                  }`}
                >
                  <b className="text-[9px] font-medium text-ink-faint">S{i + 1}</b>
                  {v.toFixed(3)}
                </span>
              ))}
            </div>
            <div className="mt-1.5 flex gap-[5px]">
              {[seg?.s1, seg?.s2, seg?.s3].map((arr, i) => (
                <MiniSectors key={i} codes={arr ?? null} purple={px[i]} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MiniSectors({ codes, purple }: { codes: number[] | null; purple: boolean }) {
  const has = !!codes && codes.some((c) => c > 0);
  return (
    <span className="flex flex-1 gap-[1.5px]">
      {has
        ? codes!.map((c, i) => <span key={i} className="h-[5px] flex-1 rounded-[1px]" style={{ background: segColor(c) }} />)
        : Array.from({ length: 5 }, (_, i) => (
            <span
              key={i}
              className="h-[5px] flex-1 rounded-[1px] opacity-45"
              style={{ background: purple ? 'var(--violet)' : 'var(--green)' }}
            />
          ))}
    </span>
  );
}

export function sectorDriverCount(laps: LapSummary | undefined): number {
  return Object.values(laps?.drivers ?? {}).filter((o) => o.best != null && o.s1 != null && o.s2 != null && o.s3 != null).length;
}
