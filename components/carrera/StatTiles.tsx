'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { lapTime } from '@/lib/format';
import type { LapSummary } from '@/lib/openf1/types';
import { DriverChip } from '../ui';

export function StatTiles({ laps }: { laps: LapSummary | undefined }) {
  const ref = useRef<HTMLDivElement>(null);
  const ready = !!laps;

  useEffect(() => {
    if (!ready || !ref.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => gsap.from('[data-tile]', { y: 10, opacity: 0, duration: 0.4, stagger: 0.06 }), ref);
    return () => ctx.revert();
  }, [ready]);

  const fl = laps?.fastest;
  const st = laps?.speedTrap;
  return (
    <div ref={ref} className="mx-3.5 mb-1 mt-3.5 grid grid-cols-2 gap-2.5">
      <Tile
        label="VUELTA RÁPIDA"
        pin="var(--violet)"
        valueClass="text-violet"
        value={fl ? lapTime(fl.time) : '—'}
        sub={fl ? <><DriverChip n={fl.driver_number} /> VUELTA {fl.lap}</> : 'sin datos aún'}
      />
      <Tile
        label="SPEED TRAP"
        pin="var(--telemetry)"
        valueClass="text-telemetry"
        value={st ? <>{Math.round(st.speed)}<small className="text-xs text-ink-dim"> km/h</small></> : '—'}
        sub={st ? <><DriverChip n={st.driver_number} /> VUELTA {st.lap}</> : 'sin datos aún'}
      />
    </div>
  );
}

interface TileProps {
  label: string;
  pin: string;
  valueClass: string;
  value: React.ReactNode;
  sub: React.ReactNode;
}

function Tile({ label, pin, valueClass, value, sub }: TileProps) {
  return (
    <div data-tile className="panel-surface relative overflow-hidden px-3 py-[11px]">
      <div className="flex items-center gap-1.5 font-mono text-[8.5px] tracking-[2px] text-ink-faint">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: pin }} />
        {label}
      </div>
      <div className={`mt-[7px] font-mono text-[21px] font-extrabold leading-none min-[380px]:text-[25px] lg:text-[28px] ${valueClass}`}>{value}</div>
      <div className="mt-[5px] flex items-center gap-[7px] font-mono text-[10px] text-ink-dim">{sub}</div>
    </div>
  );
}
