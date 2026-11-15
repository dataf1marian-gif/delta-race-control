'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { TowerRow } from '@/lib/derive';
import type { LocationSeries, TrackShape } from '@/lib/openf1/types';
import { makeProjection, VB_H, VB_W } from '@/lib/trackGeo';
import { useDrivers } from '../DriversContext';
import { DriverChip } from '../ui';

/** Trazado esquemático de respaldo (del prototipo) si todavía no hay GPS del circuito. */
const SCHEMATIC =
  'M64,168 C44,150 40,120 58,104 C74,90 96,100 104,84 C112,69 98,52 118,44 C142,34 168,52 192,50 C224,47 258,62 254,96 C251,122 220,122 206,138 C193,152 198,174 166,178 C128,182 92,190 64,168 Z';

/** Retardo de reproducción del GPS en vivo: margen para que siempre haya muestras por delante. */
const PLAYBACK_BUFFER_MS = 9_000;

interface Props {
  rows: TowerRow[];
  /** Vuelta de referencia (s) para convertir gap → fracción de vuelta. */
  lapRef: number | null;
  track: TrackShape | null;
  /** GPS en vivo (solo durante la sesión). */
  locations: LocationSeries[] | undefined;
}

type Mode = 'gps' | 'gaps' | 'schematic';

export function CircuitMap({ rows, lapRef, track, locations }: Props) {
  const { ac, tc } = useDrivers();
  const pathRef = useRef<SVGPathElement>(null);
  const dots = useRef(new Map<number, SVGGElement>());

  const proj = useMemo(() => (track ? makeProjection(track) : null), [track]);
  const hasGps = !!proj && !!locations?.some((l) => l.pts.length > 0);
  const mode: Mode = hasGps ? 'gps' : proj ? 'gaps' : 'schematic';
  const d = proj?.d ?? SCHEMATIC;
  const start = proj?.start ?? [64, 168];

  const classified = rows.filter((r) => r.pos != null);

  /* ---------- modo GPS: buffer de muestras + reproducción interpolada ---------- */
  const buffer = useRef(new Map<number, [number, number, number][]>());
  const lag = useRef<number | null>(null);

  useEffect(() => {
    if (!locations?.length) return;
    let maxT = 0;
    for (const { driver_number, pts } of locations) {
      const prev = buffer.current.get(driver_number) ?? [];
      const lastT = prev.length ? prev[prev.length - 1][0] : 0;
      const merged = prev.concat(pts.filter((p) => p[0] > lastT));
      const newest = merged.length ? merged[merged.length - 1][0] : 0;
      buffer.current.set(driver_number, merged.filter((p) => p[0] > newest - 40_000));
      if (newest > maxT) maxT = newest;
    }
    if (maxT) {
      const target = Date.now() - maxT + PLAYBACK_BUFFER_MS;
      lag.current = lag.current == null ? target : lag.current * 0.8 + target * 0.2;
    }
  }, [locations]);

  /* ---------- modo gaps: fracción de vuelta por piloto ---------- */
  const lapT = lapRef && lapRef > 30 ? lapRef : 88;
  const fracKey = classified
    .map((r, i) => `${r.n}:${(typeof r.gap === 'number' ? (r.gap / lapT) % 1 : (i * 0.055) % 1).toFixed(4)}`)
    .join(',');

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const len = path.getTotalLength();
    const fracs = fracKey ? fracKey.split(',').map((s) => s.split(':').map(Number) as [number, number]) : [];
    let base = 0;
    const t0 = performance.now();
    let raf = 0;

    const placeGaps = () => {
      for (const [n, f] of fracs) {
        const g = dots.current.get(n);
        if (!g) continue;
        const at = (((base - f) % 1) + 1) % 1;
        const p = path.getPointAtLength(at * len);
        g.setAttribute('transform', `translate(${p.x},${p.y})`);
        g.style.opacity = '1';
      }
    };

    const placeGps = () => {
      if (!proj || lag.current == null) return;
      const t = Date.now() - lag.current;
      dots.current.forEach((g, n) => {
        const s = buffer.current.get(n);
        if (!s?.length) {
          g.style.opacity = '0';
          return;
        }
        let x: number, y: number;
        if (t <= s[0][0]) [, x, y] = s[0];
        else if (t >= s[s.length - 1][0]) [, x, y] = s[s.length - 1];
        else {
          let i = s.length - 1;
          while (i > 0 && s[i - 1][0] > t) i--;
          const [t0, x0, y0] = s[i - 1];
          const [t1, x1, y1] = s[i];
          const k = (t - t0) / (t1 - t0 || 1);
          x = x0 + (x1 - x0) * k;
          y = y0 + (y1 - y0) * k;
        }
        const [px, py] = proj.project(x, y);
        g.setAttribute('transform', `translate(${px},${py})`);
        // Sin muestras recientes (en boxes / abandonó): atenuado.
        g.style.opacity = t - s[s.length - 1][0] > 20_000 ? '0.35' : '1';
      });
    };

    const loop = () => {
      if (mode === 'gps') placeGps();
      else {
        // Ritmo real: una vuelta por cada vuelta media de la sesión (medido en tiempo, no en cuadros).
        base = ((performance.now() - t0) / 1000 / lapT) % 1;
        placeGaps();
      }
      raf = requestAnimationFrame(loop);
    };
    if (reduce && mode !== 'gps') placeGaps();
    else loop();
    return () => cancelAnimationFrame(raf);
  }, [fracKey, mode, proj, d, lapT]);

  const label =
    mode === 'gps' ? 'GPS EN VIVO' : mode === 'gaps' ? 'TRAZADO REAL · POR GAPS' : 'TRAZADO ESQUEMÁTICO';

  return (
    <div className="panel-surface relative mx-3.5 p-2.5">
      <div className="absolute left-3.5 top-3 flex items-center gap-1.5 font-mono text-[9px] tracking-[1px] text-ink-faint">
        {mode === 'gps' && <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-signal" />}
        {label}
      </div>
      {classified[0] && (
        <div className="absolute right-3.5 top-3 flex items-center gap-1 font-mono text-[10px] font-bold">
          <DriverChip n={classified[0].n} /> LÍDER
        </div>
      )}
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="block h-auto w-full touch-none"
        role="img"
        aria-label="Mapa del circuito con la posición de cada auto"
      >
        <path d={d} fill="none" stroke="#2b3442" strokeWidth={10} strokeLinejoin="round" />
        <path d={d} fill="none" stroke="#0c0f14" strokeWidth={5} strokeLinejoin="round" />
        <path ref={pathRef} d={d} fill="none" stroke="var(--telemetry)" strokeWidth={1.4} opacity={0.55} strokeLinejoin="round" />
        <circle cx={start[0]} cy={start[1]} r={3.2} fill="#fff" />
        {/* Orden inverso: el líder queda dibujado arriba de todo. */}
        {[...classified].reverse().map((r) => (
          <g
            key={r.n}
            ref={(el) => {
              if (el) dots.current.set(r.n, el);
              else dots.current.delete(r.n);
            }}
            transform={`translate(${start[0]},${start[1]})`}
            style={{ opacity: 0 }}
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

export function mapNote(hasTrack: boolean, gpsLive: boolean): string {
  if (gpsLive) return 'Posición real de cada auto con el GPS de OpenF1 (~3.7 muestras/s), reproducida con unos segundos de demora para que el movimiento sea continuo.';
  if (hasTrack)
    return 'Trazado real del circuito dibujado con el GPS de la vuelta más rápida. Fuera de sesión, los autos se ubican según los gaps finales; en vivo se mueven con su GPS.';
  return 'Trazado esquemático hasta que haya GPS del circuito (aparece apenas termina la primera práctica del fin de semana). Autos espaciados por los gaps reales.';
}
