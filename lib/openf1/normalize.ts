/**
 * Normalizadores server-side: OpenF1 crudo → tipos de ./types.ts.
 * Se ejecutan en la API route (edge), una sola vez por ventana de caché.
 */
import { classifyRC } from '../trackStatus';
import type {
  Compound,
  Driver,
  Gap,
  Interval,
  Lap,
  LapSummary,
  LivePosition,
  LocationSeries,
  Meeting,
  Pit,
  RaceControlEvent,
  Session,
  SessionResult,
  Stint,
  Weather,
  DriverLapStats,
  Segments,
} from './types';

type Raw = Record<string, unknown>;

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));
const bool = (v: unknown): boolean => v === true || v === 1;
const numArr = (v: unknown): number[] | null =>
  Array.isArray(v) ? v.map((x) => (typeof x === 'number' ? x : 0)) : null;

/** gap_to_leader puede venir número, 0, "+1 LAP" o null. En quali viene array [Q1,Q2,Q3]. */
export function normGap(v: unknown): Gap {
  if (Array.isArray(v)) {
    for (let i = v.length - 1; i >= 0; i--) {
      const g = normGap(v[i]);
      if (g != null) return g;
    }
    return null;
  }
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return null;
    const n = Number(t.replace(/^\+/, ''));
    return Number.isFinite(n) ? n : t.toUpperCase();
  }
  return null;
}

export function normCompound(v: unknown): Compound {
  const c = str(v).toUpperCase();
  if (c === 'SOFT' || c === 'MEDIUM' || c === 'HARD' || c === 'INTERMEDIATE' || c === 'WET') return c;
  return 'UNKNOWN';
}

const hex = (v: unknown) => {
  const h = str(v).replace('#', '').trim();
  return /^[0-9a-f]{6}$/i.test(h) ? `#${h}` : '#99aaaa';
};

/** Último registro por piloto según `date`. */
function latestByDriver<T extends { driver_number: number; date: string }>(rows: T[]): T[] {
  const m = new Map<number, T>();
  for (const r of rows) {
    const prev = m.get(r.driver_number);
    if (!prev || r.date >= prev.date) m.set(r.driver_number, r);
  }
  return [...m.values()];
}

const byDate = (a: { date: string | null }, b: { date: string | null }) =>
  (a.date || '').localeCompare(b.date || '');

export const normalizers = {
  sessions: (rows: Raw[]): Session[] =>
    rows.map((r) => ({
      session_key: num(r.session_key) ?? 0,
      meeting_key: num(r.meeting_key) ?? 0,
      session_name: str(r.session_name),
      session_type: str(r.session_type),
      circuit_short_name: str(r.circuit_short_name),
      country_name: str(r.country_name),
      location: str(r.location),
      date_start: str(r.date_start),
      date_end: str(r.date_end),
      gmt_offset: r.gmt_offset ? str(r.gmt_offset) : null,
      year: num(r.year),
    })),

  drivers: (rows: Raw[]): Driver[] => {
    // OpenF1 a veces repite pilotos; nos quedamos con el primero.
    const seen = new Set<number>();
    const out: Driver[] = [];
    for (const r of rows) {
      const n = num(r.driver_number);
      if (n == null || seen.has(n)) continue;
      seen.add(n);
      out.push({
        driver_number: n,
        name_acronym: str(r.name_acronym) || `#${n}`,
        full_name: str(r.full_name),
        team_name: str(r.team_name),
        team_colour: hex(r.team_colour),
      });
    }
    return out;
  },

  session_result: (rows: Raw[]): SessionResult[] =>
    rows
      .map((r) => {
        const dur = r.duration;
        const isQ = Array.isArray(dur);
        const q = isQ
          ? ([0, 1, 2].map((i) => num((dur as unknown[])[i])) as [number | null, number | null, number | null])
          : null;
        return {
          position: num(r.position),
          driver_number: num(r.driver_number) ?? 0,
          gap_to_leader: normGap(r.gap_to_leader),
          duration: isQ ? null : num(dur),
          q,
          dnf: bool(r.dnf),
          dns: bool(r.dns),
          dsq: bool(r.dsq),
          number_of_laps: num(r.number_of_laps) ?? 0,
          points: num(r.points) ?? 0,
        };
      })
      .sort((a, b) => (a.position ?? 99) - (b.position ?? 99)),

  position: (rows: Raw[]): LivePosition[] =>
    latestByDriver(
      rows
        .map((r) => ({ driver_number: num(r.driver_number) ?? 0, position: num(r.position) ?? 99, date: str(r.date) }))
        .filter((r) => r.driver_number > 0),
    ).sort((a, b) => a.position - b.position),

  intervals: (rows: Raw[]): Interval[] =>
    latestByDriver(
      rows
        .map((r) => ({
          driver_number: num(r.driver_number) ?? 0,
          gap_to_leader: normGap(r.gap_to_leader),
          interval: normGap(r.interval),
          date: str(r.date),
        }))
        .filter((r) => r.driver_number > 0),
    ),

  laps: (rows: Raw[]): Lap[] =>
    rows
      .map((r) => ({
        driver_number: num(r.driver_number) ?? 0,
        lap_number: num(r.lap_number) ?? 0,
        date_start: r.date_start ? str(r.date_start) : null,
        lap_duration: num(r.lap_duration),
        s1: num(r.duration_sector_1),
        s2: num(r.duration_sector_2),
        s3: num(r.duration_sector_3),
        i1_speed: num(r.i1_speed),
        i2_speed: num(r.i2_speed),
        st_speed: num(r.st_speed),
        seg1: numArr(r.segments_sector_1),
        seg2: numArr(r.segments_sector_2),
        seg3: numArr(r.segments_sector_3),
        is_pit_out_lap: bool(r.is_pit_out_lap),
      }))
      .sort((a, b) => a.driver_number - b.driver_number || a.lap_number - b.lap_number),

  stints: (rows: Raw[]): Stint[] =>
    rows
      .map((r) => ({
        driver_number: num(r.driver_number) ?? 0,
        stint_number: num(r.stint_number) ?? 0,
        compound: normCompound(r.compound),
        tyre_age_at_start: num(r.tyre_age_at_start),
        lap_start: num(r.lap_start),
        lap_end: num(r.lap_end),
      }))
      .sort((a, b) => a.driver_number - b.driver_number || a.stint_number - b.stint_number),

  pit: (rows: Raw[]): Pit[] =>
    rows
      .map((r) => ({
        driver_number: num(r.driver_number) ?? 0,
        lap_number: num(r.lap_number),
        pit_duration: num(r.pit_duration) ?? num(r.lane_duration),
        stop_duration: num(r.stop_duration),
        date: r.date ? str(r.date) : null,
      }))
      .sort(byDate),

  race_control: (rows: Raw[]): RaceControlEvent[] =>
    rows
      .map((r) => {
        const message = str(r.message);
        const base = {
          date: r.date ? str(r.date) : null,
          lap_number: num(r.lap_number),
          category: str(r.category),
          flag: r.flag ? str(r.flag).toUpperCase() : null,
          scope: r.scope ? str(r.scope) : null,
          sector: num(r.sector),
          driver_number: num(r.driver_number),
          message,
        };
        return { ...base, type: classifyRC(base), served: /SERVED|CUMPLIDA/i.test(message) };
      })
      .sort(byDate),

  weather: (rows: Raw[]): Weather[] =>
    despike(
      rows
      .map((r) => ({
        date: str(r.date),
        air_temperature: num(r.air_temperature),
        track_temperature: num(r.track_temperature),
        humidity: num(r.humidity),
        wind_speed: num(r.wind_speed),
        wind_direction: num(r.wind_direction),
        pressure: num(r.pressure),
        rainfall: bool(r.rainfall) || (num(r.rainfall) ?? 0) > 0,
      }))
      .sort(byDate),
    ),

  /** GPS: agrupado por auto, solo los últimos 15s, como [epochMs, x, y]. */
  location: (rows: Raw[]): LocationSeries[] => {
    const by = new Map<number, [number, number, number][]>();
    let maxT = 0;
    for (const r of rows) {
      const n = num(r.driver_number);
      const t = Date.parse(str(r.date));
      const x = num(r.x);
      const y = num(r.y);
      if (n == null || !Number.isFinite(t) || x == null || y == null) continue;
      if (t > maxT) maxT = t;
      let arr = by.get(n);
      if (!arr) by.set(n, (arr = []));
      arr.push([t, x, y]);
    }
    return [...by.entries()].map(([driver_number, pts]) => ({
      driver_number,
      pts: pts.filter((p) => p[0] >= maxT - 15_000).sort((a, b) => a[0] - b[0]),
    }));
  },

  meetings: (rows: Raw[]): Meeting[] =>
    rows
      .map((r) => ({
        meeting_key: num(r.meeting_key) ?? 0,
        meeting_name: str(r.meeting_name),
        country_name: str(r.country_name),
        location: str(r.location),
        circuit_short_name: str(r.circuit_short_name),
        date_start: str(r.date_start),
      }))
      .sort((a, b) => a.date_start.localeCompare(b.date_start)),
} as const;

export type NormalizedEndpoint = keyof typeof normalizers;

/**
 * El sensor de clima de OpenF1 a veces manda lecturas basura (p. ej. pista = 0 °C
 * en medio de 25 °C). Se anulan los ceros y los picos que se alejan más de un 35%
 * (y más de 6 unidades) de la mediana de sus vecinos.
 */
function despike(rows: Weather[]): Weather[] {
  const fields = ['air_temperature', 'track_temperature', 'humidity'] as const;
  for (const f of fields) {
    for (const r of rows) if (r[f] === 0) r[f] = null;
    const vals = rows.map((r) => r[f]);
    rows.forEach((r, i) => {
      const v = vals[i];
      if (v == null) return;
      const nb = [vals[i - 2], vals[i - 1], vals[i + 1], vals[i + 2]].filter((x): x is number => x != null);
      if (nb.length < 2) return;
      nb.sort((a, b) => a - b);
      const med = (nb[Math.floor((nb.length - 1) / 2)] + nb[Math.ceil((nb.length - 1) / 2)]) / 2;
      if (Math.abs(v - med) > Math.max(6, med * 0.35)) r[f] = null;
    });
  }
  return rows;
}

/* ---------- /laps/summary ---------- */

const hasSeg = (s: number[] | null) => !!s && s.some((c) => c > 0);

/** Agrega /laps por piloto: mejor vuelta, mejores sectores, microsectores, vuelta rápida y speed trap. */
export function summarizeLaps(laps: Lap[]): LapSummary {
  // OpenF1 ignora filtros numéricos (lap_duration<x): hay que traer todo y agregar acá.
  let fastest: LapSummary['fastest'] = null;
  let speedTrap: LapSummary['speedTrap'] = null;
  let maxLap = 0;
  const durations: number[] = [];
  const drivers: Record<string, DriverLapStats> = {};

  for (const l of laps) {
    const n = l.driver_number;
    if (!n) continue;
    const o = (drivers[n] ||= {
      best: null,
      bestLap: null,
      s1: null,
      s2: null,
      s3: null,
      lastLap: 0,
      lastSegments: null,
      bestSegments: null,
    });
    const segs: Segments = { lap: l.lap_number, s1: l.seg1, s2: l.seg2, s3: l.seg3 };

    if (l.lap_duration != null) {
      durations.push(l.lap_duration);
      if (!fastest || l.lap_duration < fastest.time) fastest = { driver_number: n, time: l.lap_duration, lap: l.lap_number };
      if (o.best == null || l.lap_duration < o.best) {
        o.best = l.lap_duration;
        o.bestLap = l.lap_number;
        o.bestSegments = segs;
      }
    }
    if (l.st_speed != null && (!speedTrap || l.st_speed > speedTrap.speed))
      speedTrap = { driver_number: n, speed: l.st_speed, lap: l.lap_number };
    if (l.s1 != null && (o.s1 == null || l.s1 < o.s1)) o.s1 = l.s1;
    if (l.s2 != null && (o.s2 == null || l.s2 < o.s2)) o.s2 = l.s2;
    if (l.s3 != null && (o.s3 == null || l.s3 < o.s3)) o.s3 = l.s3;
    if (l.lap_number >= o.lastLap) {
      o.lastLap = l.lap_number;
      if (hasSeg(l.seg1) || hasSeg(l.seg2) || hasSeg(l.seg3)) o.lastSegments = segs;
    }
    if (l.lap_number > maxLap) maxLap = l.lap_number;
  }

  durations.sort((a, b) => a - b);
  const medianLap = durations.length ? durations[Math.floor(durations.length / 2)] : null;
  return { fastest, speedTrap, medianLap, maxLap, drivers };
}
