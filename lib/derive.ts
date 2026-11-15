/** Derivaciones client-side sobre los datos normalizados. */
import type { Compound, Gap, Interval, LivePosition, Pit, Session, SessionResult, Stint, Weather } from './openf1/types';

export interface TowerRow {
  n: number;
  pos: number | null;
  gap: Gap;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
  pts: number;
  laps: number;
}

/** Sesión "en vivo": dentro de la ventana programada (+ margen por demoras/banderas rojas). */
export function isSessionLive(s: Session | undefined, now: number): boolean {
  if (!s) return false;
  const st = Date.parse(s.date_start);
  const en = Date.parse(s.date_end);
  if (!Number.isFinite(st) || !Number.isFinite(en)) return false;
  return now >= st - 5 * 60_000 && now <= en + 30 * 60_000;
}

/**
 * Clasificación: en vivo manda el stream (position + intervals);
 * terminada (o sin stream) manda session_result.
 */
export function buildClassification(
  results: SessionResult[] | undefined,
  positions: LivePosition[] | undefined,
  intervals: Interval[] | undefined,
  preferLive: boolean,
): TowerRow[] {
  const res = (results || []).filter((r) => r.position != null || r.dnf || r.dns || r.dsq);
  const resBy = new Map(res.map((r) => [r.driver_number, r]));
  const pos = positions || [];

  let rows: TowerRow[];
  if ((preferLive || !res.length) && pos.length) {
    const gapBy = new Map((intervals || []).map((i) => [i.driver_number, i.gap_to_leader]));
    rows = pos.map((p) => {
      const r = resBy.get(p.driver_number);
      return {
        n: p.driver_number,
        pos: r && (r.dnf || r.dns || r.dsq) ? null : p.position,
        gap: p.position === 1 ? 0 : (gapBy.get(p.driver_number) ?? r?.gap_to_leader ?? null),
        dnf: r?.dnf ?? false,
        dns: r?.dns ?? false,
        dsq: r?.dsq ?? false,
        pts: r?.points ?? 0,
        laps: r?.number_of_laps ?? 0,
      };
    });
    for (const r of res) if (!rows.some((x) => x.n === r.driver_number)) rows.push(fromResult(r));
  } else {
    rows = res.map(fromResult);
  }
  return rows.sort((a, b) => (a.pos ?? 99) - (b.pos ?? 99));
}

const fromResult = (r: SessionResult): TowerRow => ({
  n: r.driver_number,
  pos: r.position,
  gap: r.gap_to_leader,
  dnf: r.dnf,
  dns: r.dns,
  dsq: r.dsq,
  pts: r.points,
  laps: r.number_of_laps,
});

export function groupBy<T extends { driver_number: number }>(rows: T[] | undefined): Record<number, T[]> {
  const out: Record<number, T[]> = {};
  for (const r of rows || []) (out[r.driver_number] ||= []).push(r);
  return out;
}

export function finalCompounds(stints: Stint[] | undefined): Record<number, Compound> {
  const out: Record<number, Compound> = {};
  for (const [n, arr] of Object.entries(groupBy(stints))) out[Number(n)] = arr[arr.length - 1].compound;
  return out;
}

export interface TyreUsage {
  /** Juegos nuevos calados (tyre_age_at_start === 0), en orden de uso. */
  newSets: Compound[];
  slick: number;
  inter: number;
  wet: number;
}

/** OpenF1 no expone la asignación FIA: lo real es "juegos nuevos usados". */
export function tyreUsage(stints: Stint[]): TyreUsage {
  const newSets = stints.filter((s) => s.tyre_age_at_start === 0).map((s) => s.compound);
  return {
    newSets,
    wet: newSets.filter((c) => c === 'WET').length,
    inter: newSets.filter((c) => c === 'INTERMEDIATE').length,
    slick: newSets.filter((c) => c !== 'WET' && c !== 'INTERMEDIATE').length,
  };
}

export function pitsByDriver(pits: Pit[] | undefined): Record<number, Pit[]> {
  return groupBy(pits);
}

/** [aire, pista, humedad, lluvia, epochMs] */
export type WeatherPoint = { air: number; track: number; hum: number; rain: boolean; t: number };

/** Serie de clima reducida a ~maxPoints puntos (conserva cualquier marca de lluvia del tramo). */
export function weatherSeries(rows: Weather[] | undefined, maxPoints = 32): WeatherPoint[] {
  const valid = (rows || []).filter((r) => r.track_temperature != null && r.humidity != null);
  if (!valid.length) return [];
  const step = Math.max(1, Math.ceil(valid.length / maxPoints));
  const out: WeatherPoint[] = [];
  for (let i = 0; i < valid.length; i += step) {
    const chunk = valid.slice(i, i + step);
    const r = chunk[chunk.length - 1];
    // Mediana del tramo: el sensor de pista es ruidoso (salta ±10 °C entre lecturas).
    const med = (xs: number[]) => {
      const v = [...xs].sort((a, b) => a - b);
      return v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
    };
    out.push({
      air: med(chunk.map((c) => c.air_temperature ?? 0)),
      track: med(chunk.map((c) => c.track_temperature as number)),
      hum: med(chunk.map((c) => c.humidity as number)),
      rain: chunk.some((c) => c.rainfall),
      t: Date.parse(r.date),
    });
  }
  return out;
}

/** Qualy: zona por segmento alcanzado. Q3 = top10, Q2 = 11-15, Q1 = 16-22. */
export function qualySegment(q: SessionResult['q']): 'q1' | 'q2' | 'q3' {
  if (q?.[2] != null) return 'q3';
  if (q?.[1] != null) return 'q2';
  return 'q1';
}

/** Segmento activo en vivo: el más alto con tiempos. */
export function activeQualySegment(results: SessionResult[]): 'Q1' | 'Q2' | 'Q3' {
  if (results.some((r) => r.q?.[2] != null)) return 'Q3';
  if (results.some((r) => r.q?.[1] != null)) return 'Q2';
  return 'Q1';
}
