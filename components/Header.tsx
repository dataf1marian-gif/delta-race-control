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
        aria-label="Secciones"
        className="no-scrollbar mx-3.5 mb-3 mt-3 grid grid-cols-5 gap-1 overflow-x-auto rounded-md border border-line/90 bg-panel-2 p-1 shadow-[0_6px_20px_rgba(0,0,0,.45)]"
      >
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={on}
              onClick={() => onTab(t.id)}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded px-1 py-2 font-mono text-[9.5px] font-extrabold tracking-[.6px] transition-all min-[400px]:text-[10.5px] md:flex-row md:gap-2 md:py-3 md:text-[12px] md:tracking-[1.5px] lg:text-[13px] ${
                on
                  ? 'bg-signal text-white shadow-[0_0_18px_rgba(255,30,60,.45)]'
                  : 'text-ink-dim hover:bg-white/[.05] hover:text-ink'
              }`}
            >
              <TabIcon id={t.id} />
              <span className="truncate">{t.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}

/** Íconos de línea simples (sin marcas), heredan el color del texto. */
function TabIcon({ id }: { id: TabId }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className: 'flex-none',
  };
  switch (id) {
    case 'carrera': // bandera
      return (
        <svg {...common}>
          <path d="M5 21V4" />
          <path d="M5 4h12l-2 4 2 4H5" />
        </svg>
      );
    case 'qualy': // cronómetro
      return (
        <svg {...common}>
          <circle cx="12" cy="14" r="7" />
          <path d="M12 14l3-3M10 3h4M12 3v4" />
        </svg>
      );
    case 'control': // radio / torre
      return (
        <svg {...common}>
          <path d="M12 12v9M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8" />
          <circle cx="12" cy="12" r="1.5" />
        </svg>
      );
    case 'boxes': // llave
      return (
        <svg {...common}>
          <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z" />
        </svg>
      );
    case 'calendario':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      );
  }
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
