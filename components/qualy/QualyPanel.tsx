'use client';

import { activeQualySegment, qualySegment } from '@/lib/derive';
import { countdown, lapTime } from '@/lib/format';
import { useNow } from '@/lib/usePoll';
import type { QualyData } from '@/lib/useDeltaData';
import { useDrivers } from '../DriversContext';
import { DriverChip, EmptyState, SectionHeader, TeamBar } from '../ui';
import { SectorTable, sectorDriverCount } from './SectorTable';

const ZONE = {
  q3: 'border-l-green/55',
  q2: 'border-l-amber/55',
  q1: 'border-l-signal/45',
} as const;

export function QualyPanel({ q }: { q: QualyData }) {
  const { ac } = useDrivers();
  const now = useNow(q.live ? 1000 : 30_000);
  const results = (q.results ?? []).filter((r) => r.position != null).sort((a, b) => (a.position as number) - (b.position as number));
  const pole = results.find((r) => r.position === 1);
  const poleTime = pole?.q?.[2] ?? pole?.q?.[1] ?? pole?.q?.[0] ?? null;

  let state = '—';
  if (q.loading) state = 'CARGANDO…';
  else if (!q.session) state = 'SIN QUALY EN ESTE FIN DE SEMANA';
  else if (q.live) {
    const left = (Date.parse(q.session.date_end) - now) / 1000;
    state = `${activeQualySegment(results)} · EN VIVO${left > 0 ? ` · ${countdown(left)}` : ''}`;
  } else if (Date.parse(q.session.date_start) > now) state = 'CLASIFICACIÓN · PRÓXIMAMENTE';
  else state = 'CLASIFICACIÓN · FINAL';

  const qc = (v: number | null | undefined) => (v != null ? lapTime(v) : '—');

  return (
    <>
      <div className="panel-surface mx-3.5 mb-3 flex items-center justify-between gap-2.5 px-[13px] py-[11px]">
        <span className={`font-mono text-xs font-extrabold tracking-[1.5px] ${q.live ? 'text-signal' : 'text-telemetry'}`}>
          {state}
        </span>
        {pole && (
          <span className="flex items-center gap-1.5 whitespace-nowrap font-mono text-[11px] text-ink-dim">
            POLE · <DriverChip n={pole.driver_number} /> {lapTime(poleTime)}
          </span>
        )}
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-2">
      <div>
      <SectionHeader title="POSICIONES" extra="Q1 · Q2 · Q3" />
      <div className="mx-4 mb-2 flex flex-wrap gap-x-3.5 gap-y-1 font-mono text-[8.5px] tracking-[1px] text-ink-dim">
        <LegendDot c="var(--green)">PASÓ A Q3</LegendDot>
        <LegendDot c="var(--amber)">AFUERA EN Q2</LegendDot>
        <LegendDot c="var(--signal)">AFUERA EN Q1</LegendDot>
      </div>
      {results.length ? (
        <ol>
          {results.map((r) => {
            const seg = qualySegment(r.q);
            const best = r.q?.[2] ?? r.q?.[1] ?? r.q?.[0] ?? null;
            return (
              <li
                key={r.driver_number}
                className={`grid grid-cols-[24px_3px_1fr_auto] items-center gap-[9px] border-b border-l-[3px] border-b-line-soft px-3 py-[9px] ${ZONE[seg]}`}
              >
                <div className="text-center font-mono text-[15px] font-extrabold">{r.position}</div>
                <TeamBar n={r.driver_number} h={26} />
                <div className="min-w-0">
                  <div className="flex items-center gap-[7px] text-sm font-bold">
                    {ac(r.driver_number)}
                    {r.position === 1 && (
                      <span className="rounded-sm bg-telemetry px-[5px] py-px font-mono text-[7.5px] font-extrabold tracking-[.5px] text-[#042]">
                        POLE
                      </span>
                    )}
                    {(r.dnf || r.dns || r.dsq) && (
                      <span className="font-mono text-[8px] text-ink-faint">{r.dsq ? 'DSQ' : r.dns ? 'DNS' : 'DNF'}</span>
                    )}
                  </div>
                  <div className="mt-[3px] flex flex-wrap gap-x-2.5 font-mono text-[9px] text-ink-dim">
                    <span>Q1 {qc(r.q?.[0])}</span>
                    <span>Q2 {qc(r.q?.[1])}</span>
                    <span className="text-ink">Q3 {qc(r.q?.[2])}</span>
                  </div>
                </div>
                <div className="font-mono text-[13px] font-extrabold">{lapTime(best)}</div>
              </li>
            );
          })}
        </ol>
      ) : (
        <EmptyState>{q.session ? 'SIN TIEMPOS TODAVÍA' : 'LA QUALY DE ESTE FIN DE SEMANA AÚN NO ESTÁ DISPONIBLE'}</EmptyState>
      )}
      </div>

      <div>
      <SectionHeader title="SECTORES" extra={`${sectorDriverCount(q.laps)} PILOTOS`} />
      <div className="mx-4 mb-2.5 flex flex-wrap gap-3.5 font-mono text-[8.5px] tracking-[1px] text-ink-dim">
        <LegendDot c="var(--violet)">MEJOR DE TODOS</LegendDot>
        <LegendDot c="var(--green)">MEJOR PERSONAL</LegendDot>
        <LegendDot c="var(--medium)">MÁS LENTO</LegendDot>
      </div>
      <SectorTable laps={q.laps} live={q.live} />
      </div>
      </div>
    </>
  );
}

function LegendDot({ c, children }: { c: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-[5px]">
      <i className="h-2 w-2 rounded-sm" style={{ background: c }} />
      {children}
    </span>
  );
}
