/** Helpers de formato portados del prototipo. */
import type { Compound, Gap } from './openf1/types';

/** 72.689 → "1:12.689" */
export function lapTime(s: number | null | undefined): string {
  if (s == null || !Number.isFinite(s)) return '—';
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(3).padStart(6, '0')}`;
}

/** Gap a líder: número → "+14.602", 0 → "LÍDER", "+1 LAP" → "+1 V", null → "". */
export function fmtGap(x: Gap | undefined): string {
  if (x == null) return '';
  if (x === 0) return 'LÍDER';
  if (typeof x === 'string') return x.replace('LAPS', 'V').replace('LAP', 'V');
  return `+${Number(x).toFixed(3)}`;
}

/** Grados → punto cardinal (en español). */
export function compass(deg: number | null | undefined): string {
  if (deg == null) return 'm/s';
  const d = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  return d[Math.round(deg / 45) % 8];
}

/** Código de microsector OpenF1 → color. */
export function segColor(code: number): string {
  if (code === 2051) return 'var(--violet)'; // mejor de todos
  if (code === 2049 || code === 2050) return 'var(--green)'; // mejor personal
  if (code === 2048) return 'var(--medium)'; // más lento
  if (code === 2064) return '#3b4250'; // pit lane
  return '#1a202a'; // sin dato
}

export const TYRE: Record<Compound, { c: string; l: string; name: string }> = {
  SOFT: { c: 'var(--soft)', l: 'S', name: 'Blando' },
  MEDIUM: { c: 'var(--medium)', l: 'M', name: 'Medio' },
  HARD: { c: 'var(--hard)', l: 'H', name: 'Duro' },
  INTERMEDIATE: { c: 'var(--inter)', l: 'I', name: 'Intermedio' },
  WET: { c: 'var(--wet)', l: 'W', name: 'Lluvia' },
  UNKNOWN: { c: 'var(--ink-faint)', l: '?', name: 'Desconocido' },
};

/** Asignación estándar del finde (la real de la FIA no la expone OpenF1). */
export const TYRE_ALLOCATION = { slick: 13, inter: 4, wet: 3 } as const;

/** "-03:00:00" → -180 (minutos). */
export function parseGmtOffset(off: string | null | undefined): number | null {
  if (!off) return null;
  const m = /^([+-])?(\d{1,2}):(\d{2})/.exec(off);
  if (!m) return null;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3]));
}

/** HH:MM en hora local del circuito. */
export function hhmmLocal(ms: number, offsetMin: number | null): string {
  if (offsetMin == null) {
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return new Date(ms + offsetMin * 60000).toISOString().slice(11, 16);
}

/** 165 → "2:45" */
export function countdown(sec: number): string {
  if (sec <= 0) return '0:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}
