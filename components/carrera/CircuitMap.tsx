'use client';

import { useEffect, useRef } from 'react';
import type { TowerRow } from '@/lib/derive';
import { useDrivers } from '../DriversContext';
import { DriverChip } from '../ui';

/** Trazado esquemático (portado del prototipo). Roadmap: trazado real con /location. */
const TRACK =
  'M64,168 C44,150 40,120 58,104 C74,90 96,100 104,84 C112,69 98,52 118,44 C142,34 168,52 192,50 C224,47 258,62 254,96 C251,122 220,122 206,138 C193,152 198,174 166,178 C128,182 92,190 64,168 Z';

interface Props {
  rows: TowerRow[];
  /** Vuelta de referencia (s) para convertir gap → fracción de vuelta. */
  lapRef: number | null;
}

/** Autos espaciados sobre el trazado según sus gaps reales. */
export function CircuitMap({ rows, lapRef }: Props) {
  const { ac, tc } = useDrivers();
  const pathRef = useRef<SVGPathElement>(null);
  const dotsRef = useRef<(SVGGElement | null)[]>([]);

  const classified = rows.filter((r) => r.pos != null);
  const lapT = lapRef && lapRef > 30 ? lapRef : 88;
  const fracs = classified.map((r, i) => (typeof r.gap === 'number' ? (r.gap / lapT) % 1 : (i * 0.055) % 1));
  const fracKey = fracs.map((f) => f.toFixed(4)).join(',');

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const len = path.getTotalLength();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fr = fracKey ? fracKey.split(',').map(Number) : [];
    let base = 0;
    let raf = 0;
    const place = () => {
      fr.forEach((f, i) => {
        const g = dotsRef.current[i];
        if (!g) return;
        const at = (((base - f) % 1) + 1) % 1;
        const p = path.getPointAtLength(at * len);
        g.setAttribute('transform', `translate(${p.x},${p.y})`);
      });
    };
    const loop = () => {
      base = (base + 0.0008) % 1;
      place();
      raf = requestAnimationFrame(loop);
    };
    if (reduce) place();
    else loop();
    return () => cancelAnimationFrame(raf);
  }, [fracKey]);

  return (
    <div className="panel-surface relative mx-3.5 p-2.5">
      <div className="absolute left-3.5 top-3 font-mono text-[9px] tracking-[1px] text-ink-faint">TRAZADO ESQUEMÁTICO</div>
      {classified[0] && (
        <div className="absolute right-3.5 top-3 flex items-center gap-1 font-mono text-[10px] font-bold">
          <DriverChip n={classified[0].n} /> LÍDER
        </div>
      )}
      <svg viewBox="0 0 300 210" className="block h-auto w-full touch-none" role="img" aria-label="Mapa esquemático del circuito">
        <path d={TRACK} fill="none" stroke="#2b3442" strokeWidth={10} strokeLinejoin="round" />
        <path d={TRACK} fill="none" stroke="#0c0f14" strokeWidth={5} strokeLinejoin="round" />
        <path ref={pathRef} d={TRACK} fill="none" stroke="var(--telemetry)" strokeWidth={1.4} opacity={0.55} />
        <circle cx={64} cy={168} r={3.2} fill="#fff" />
        {classified.map((r, i) => (
          <g
            key={r.n}
            ref={(el) => {
              dotsRef.current[i] = el;
            }}
            transform="translate(64,168)"
          >
            <circle r={4.4} fill={tc(r.n)} stroke="#07080b" strokeWidth={1.4} />
            <text y={-7} fontSize={7} fontFamily="var(--font-mono)" fontWeight={800} fill="#fff" textAnchor="middle">
              {ac(r.n)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
