'use client';

import { fmtGap } from '@/lib/format';
import type { TowerRow } from '@/lib/derive';
import type { Compound } from '@/lib/openf1/types';
import { useDrivers } from '../DriversContext';
import { EmptyState, TeamBar, TyreChip } from '../ui';

interface Props {
  rows: TowerRow[];
  tyres: Record<number, Compound>;
  fastestDriver: number | null;
}

/** Torre de clasificación. */
export function Tower({ rows, tyres, fastestDriver }: Props) {
  const { ac, team } = useDrivers();
  if (!rows.length) return <EmptyState>SIN CLASIFICACIÓN TODAVÍA</EmptyState>;

  return (
    <ol className="px-2.5">
      {rows.map((r) => (
        <li
          key={r.n}
          className="relative grid grid-cols-[26px_3px_1fr_auto] items-center gap-2.5 border-b border-line-soft p-2.5"
        >
          <div className="text-center font-mono text-base font-extrabold">{r.pos ?? '–'}</div>
          <TeamBar n={r.n} />
          <div className="min-w-0">
            <div className="flex items-center gap-[7px] text-sm font-bold tracking-[.5px]">
              {ac(r.n)} <TyreChip c={tyres[r.n]} />
              {r.n === fastestDriver && (
                <span className="text-[11px] text-violet" title="Vuelta rápida">
                  ★
                </span>
              )}
            </div>
            <div className="mt-0.5 truncate font-mono text-[9px] uppercase tracking-[.5px] text-ink-dim">{team(r.n)}</div>
          </div>
          <div className="flex-none text-right font-mono">
            <Gap row={r} />
            {r.pts > 0 && <div className="mt-[3px] text-[9px] text-telemetry">+{r.pts} PTS</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Gap({ row: r }: { row: TowerRow }) {
  const out = r.dsq ? 'DSQ' : r.dns ? 'DNS' : r.dnf ? 'DNF' : null;
  if (out) return <span className="text-[13px] font-bold text-ink-faint">{out}</span>;
  if (r.gap === 0 || r.pos === 1) return <span className="text-[13px] font-bold text-signal">LÍDER</span>;
  return <span className="text-[13px] font-bold">{fmtGap(r.gap)}</span>;
}
