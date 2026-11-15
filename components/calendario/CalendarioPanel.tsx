'use client';

import { useMemo, useState } from 'react';
import {
  CAL2026,
  CAL2027,
  CAL_NOTES,
  daysUntil,
  isCurrentSeason,
  seasonView,
  type CalRound,
} from '@/lib/calendar';
import { Note } from '../ui';

type Year = '2026' | '2027';
const CALS: Record<Year, CalRound[]> = { '2026': CAL2026, '2027': CAL2027 };

export function CalendarioPanel({ now }: { now: number }) {
  // Arranca en el año en curso (o 2026 si ninguno lo es).
  const [year, setYear] = useState<Year>(() => (isCurrentSeason(CAL2027, now) ? '2027' : '2026'));

  return (
    <>
      {/* Mobile/tablet: toggle por año */}
      <div className="lg:hidden">
        <YearToggle year={year} setYear={setYear} />
        <Season year={year} now={now} />
      </div>
      {/* Desktop: ambos años lado a lado */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-2">
        {(['2026', '2027'] as const).map((y) => (
          <div key={y}>
            <div className="mx-3.5 mb-3 mt-1 rounded-[3px] border border-line p-2.5 text-center font-mono text-[13px] font-extrabold tracking-[2px] text-ink">
              {y}
            </div>
            <Season year={y} now={now} />
          </div>
        ))}
      </div>
    </>
  );
}

/** Temporada en curso: destacada / próxima / resto / ya disputadas. Otra temporada: lista simple. */
function Season({ year, now }: { year: Year; now: number }) {
  const cal = CALS[year];
  const current = isCurrentSeason(cal, now);
  const v = useMemo(() => seasonView(cal, now), [cal, now]);

  if (!current) {
    const allDone = v.next == null;
    return (
      <>
        {allDone && <GroupTitle>TEMPORADA FINALIZADA</GroupTitle>}
        <ol>
          {cal.map((r) => (
            <CalRow key={r.round} r={r} dim={allDone} />
          ))}
        </ol>
        <Note>{CAL_NOTES[year]}</Note>
      </>
    );
  }

  return (
    <>
      {v.current && (
        <>
          <GroupTitle accent>EN CURSO</GroupTitle>
          <ol>
            <CalRow r={v.current} highlight badge={<Badge cls="bg-telemetry text-[#042]">EN CURSO</Badge>} />
          </ol>
        </>
      )}
      {v.last && (
        <>
          <GroupTitle>ÚLTIMA CARRERA</GroupTitle>
          <ol>
            <CalRow r={v.last} badge={<Badge cls="bg-ink-faint/25 text-ink-dim">FINALIZADA</Badge>} />
          </ol>
        </>
      )}
      {v.next && (
        <>
          <GroupTitle>PRÓXIMA</GroupTitle>
          <ol>
            <CalRow
              r={v.next}
              highlight
              badge={<Badge cls="bg-signal/15 text-signal">{daysUntil(v.next, now).toUpperCase()}</Badge>}
            />
          </ol>
        </>
      )}
      {v.upcoming.length > 0 && (
        <>
          <GroupTitle>RESTO DE LA TEMPORADA</GroupTitle>
          <ol>
            {v.upcoming.map((r) => (
              <CalRow key={r.round} r={r} />
            ))}
          </ol>
        </>
      )}
      {v.past.length > 0 && (
        <>
          <GroupTitle extra={`${v.past.length + (v.last ? 1 : 0)} DE ${cal.length}`}>YA DISPUTADAS</GroupTitle>
          <ol>
            {v.past.map((r) => (
              <CalRow key={r.round} r={r} dim />
            ))}
          </ol>
        </>
      )}
      <Note>{CAL_NOTES[year]}</Note>
    </>
  );
}

function GroupTitle({ children, extra, accent }: { children: React.ReactNode; extra?: string; accent?: boolean }) {
  return (
    <div
      className={`mx-3.5 mb-1 mt-4 flex items-center gap-2.5 font-mono text-[9px] font-bold tracking-[2px] ${
        accent ? 'text-telemetry' : 'text-ink-dim'
      }`}
    >
      <span>{children}</span>
      <span className="h-px flex-1 bg-line" />
      {extra && <span className="font-medium text-ink-faint">{extra}</span>}
    </div>
  );
}

function YearToggle({ year, setYear }: { year: Year; setYear: (y: Year) => void }) {
  return (
    <div className="mx-3.5 mb-1 flex gap-1.5" role="tablist">
      {(['2026', '2027'] as const).map((y) => (
        <button
          key={y}
          role="tab"
          aria-selected={year === y}
          onClick={() => setYear(y)}
          className={`flex-1 rounded-[3px] border p-2.5 text-center font-mono text-[13px] font-extrabold tracking-[2px] transition-colors ${
            year === y ? 'border-signal bg-signal text-white' : 'border-line text-ink-faint'
          }`}
        >
          {y}
        </button>
      ))}
    </div>
  );
}

interface RowProps {
  r: CalRound;
  dim?: boolean;
  highlight?: boolean;
  badge?: React.ReactNode;
}

function CalRow({ r, dim, highlight, badge }: RowProps) {
  const rowCls = dim
    ? 'opacity-[.42]'
    : highlight
      ? 'border-l-[3px] border-l-telemetry bg-gradient-to-r from-telemetry/10 to-transparent'
      : '';
  return (
    <li
      className={`grid grid-cols-[30px_22px_1fr_auto] items-center gap-[9px] border-b border-b-line-soft px-3.5 py-[9px] ${rowCls}`}
    >
      <div className="text-center font-mono text-[11px] font-extrabold text-ink-faint">R{r.round}</div>
      <div className={`text-center text-base ${dim ? 'grayscale-[.6]' : ''}`}>{r.flag}</div>
      <div className="min-w-0">
        <div className={`truncate text-[13.5px] font-bold ${highlight ? 'text-telemetry' : ''}`}>{r.name}</div>
        <div className="mt-px truncate font-mono text-[9px] uppercase tracking-[.5px] text-ink-dim">{r.location}</div>
      </div>
      <div className="text-right">
        <div className="whitespace-nowrap font-mono text-[11px] font-bold">{r.label}</div>
        {(badge || r.sprint) && (
          <div className="mt-[3px] flex justify-end gap-1">
            {badge}
            {r.sprint && <Badge cls="bg-signal/15 text-signal">SPRINT</Badge>}
          </div>
        )}
      </div>
    </li>
  );
}

function Badge({ cls, children }: { cls: string; children: React.ReactNode }) {
  return (
    <span className={`whitespace-nowrap rounded-sm px-[5px] py-px font-mono text-[7.5px] font-extrabold tracking-[.5px] ${cls}`}>
      {children}
    </span>
  );
}
