'use client';

import type { TrackState } from '@/lib/trackStatus';
import { TRACK_LABEL } from '@/lib/trackStatus';
import type { RaceControlEvent } from '@/lib/openf1/types';
import { useDrivers } from './DriversContext';
import { TABS, type TabId } from './Tabs';

export type LiveStatus = 'loading' | 'live' | 'final' | 'error';

interface Props {
  status: LiveStatus;
  circuit: string;
  location: string;
  lap: { current: number | null; total: number | null };
  track: TrackState;
  lastEvent: RaceControlEvent | null;
  tab: TabId;
  onTab: (t: TabId) => void;
}

const STATUS_TXT: Record<LiveStatus, string> = { loading: 'CARGANDO', live: 'EN VIVO', final: 'FINAL', error: 'SIN DATOS' };

export function Header({ status, circuit, location, lap, track, lastEvent, tab, onTab }: Props) {
  const { ac } = useDrivers();
  return (
    <header
      className="sticky top-0 z-30 border-b border-line backdrop-blur-[14px]"
      style={{
        background: 'linear-gradient(180deg,rgba(7,8,11,.94),rgba(7,8,11,.72))',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div className="px-4 pb-2.5 pt-[13px]">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-baseline gap-[9px]">
            <div className="text-xl font-bold tracking-[4px] lg:text-2xl">
              DEL<b className="text-signal">T</b>A
            </div>
            <div className="hidden font-mono text-[9px] tracking-[3px] text-ink-faint min-[360px]:block">RACE&nbsp;CONTROL</div>
          </div>
          <StatusPill status={status} />
        </div>
        <div className="mt-2.5 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-bold leading-none tracking-[.3px] lg:text-[28px]">{circuit || '—'}</h1>
            <div className="mt-[5px] truncate font-mono text-[10px] uppercase tracking-[1px] text-ink-dim">{location}</div>
          </div>
          <div className="flex-none text-right font-mono">
            <div className="text-[9px] tracking-[2px] text-ink-faint">VUELTAS</div>
            <div className="text-lg font-extrabold">
              {lap.current ?? '–'}
              <span className="font-medium text-ink-faint">/{lap.total ?? '–'}</span>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onTab('control')}
        aria-live="polite"
        aria-label={`Estado de pista: ${TRACK_LABEL[track]}. Ver control de carrera`}
        className={`ts-${track} flex w-full items-center gap-2 border-t border-line px-4 py-[9px] text-left font-mono text-[11px] font-extrabold tracking-[1px] transition-colors`}
      >
        <span className="tsdot h-2 w-2 flex-none rounded-full" />
        <span className="flex-none whitespace-nowrap">
          {track === 'CHEQUERED' ? '🏁 ' : ''}
          {TRACK_LABEL[track]}
        </span>
        <span className="min-w-0 flex-1 truncate text-right text-[9px] font-medium tracking-[.2px] opacity-80">
          {lastEvent ? `${lastEvent.driver_number ? `${ac(lastEvent.driver_number)} · ` : ''}${lastEvent.message}` : ''}
        </span>
      </button>

      <nav
        role="tablist"
        className="no-scrollbar mx-3.5 mb-[11px] mt-2.5 flex gap-[3px] overflow-x-auto rounded border border-line p-1"
        style={{ background: 'rgba(15,18,24,.9)' }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => onTab(t.id)}
            className={`flex-auto whitespace-nowrap rounded-sm px-[11px] py-[9px] text-center font-mono text-[9px] font-bold md:text-[10px] lg:text-[11px] tracking-[.5px] transition-colors ${
              tab === t.id ? 'bg-signal text-white' : 'text-ink-faint hover:text-ink-dim'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

function StatusPill({ status }: { status: LiveStatus }) {
  const cls =
    status === 'live'
      ? 'text-signal border-signal/40'
      : status === 'final'
        ? 'text-telemetry border-telemetry/30'
        : status === 'error'
          ? 'text-amber border-amber/30'
          : 'text-ink-dim border-line';
  const dot =
    status === 'live'
      ? 'bg-signal animate-pulse-dot'
      : status === 'final'
        ? 'bg-telemetry'
        : status === 'error'
          ? 'bg-amber'
          : 'bg-ink-faint';
  return (
    <div className={`flex items-center gap-[7px] rounded-sm border px-2.5 py-[5px] font-mono text-[11px] font-bold tracking-[1.5px] ${cls}`}>
      <span className={`h-[7px] w-[7px] rounded-full ${dot}`} />
      <span>{STATUS_TXT[status]}</span>
    </div>
  );
}
