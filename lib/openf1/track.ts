/**
 * Trazado REAL del circuito a partir del GPS de OpenF1 (/location):
 * se toma la vuelta más rápida y limpia de alguna sesión del meeting y se
 * dibuja el recorrido de ese auto. Una vuelta ≈ 300 puntos a 3.7 Hz.
 */
import { OPENF1_BASE } from './endpoints';
import type { TrackShape } from './types';
import { fetchUpstream } from './upstream';

type Raw = Record<string, unknown>;
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Recorta a ~max puntos manteniendo forma (submuestreo uniforme). */
function downsample<T>(pts: T[], max: number): T[] {
  if (pts.length <= max) return pts;
  const step = pts.length / max;
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(pts[Math.floor(i * step)]);
  return out;
}

async function trackFromSession(meetingKey: number, sessionKey: number): Promise<TrackShape | null> {
  const laps = (await fetchUpstream(`${OPENF1_BASE}/laps?session_key=${sessionKey}`)) as Raw[];
  const clean = laps
    .filter((l) => num(l.lap_duration) != null && !l.is_pit_out_lap && typeof l.date_start === 'string')
    .sort((a, b) => (num(a.lap_duration) as number) - (num(b.lap_duration) as number));

  // Probamos las 3 más rápidas por si a alguna le falta GPS.
  for (const lap of clean.slice(0, 3)) {
    const n = num(lap.driver_number) as number;
    const start = Date.parse(lap.date_start as string);
    const end = start + (num(lap.lap_duration) as number) * 1000;
    const from = new Date(start - 1000).toISOString().slice(0, 23);
    const to = new Date(end + 1000).toISOString().slice(0, 23);
    const rows = (await fetchUpstream(
      `${OPENF1_BASE}/location?session_key=${sessionKey}&driver_number=${n}&date>=${from}&date<=${to}`,
    )) as Raw[];
    const pts = rows
      .map((r) => ({ t: Date.parse(String(r.date)), x: num(r.x), y: num(r.y) }))
      .filter((p) => p.x != null && p.y != null && p.t >= start && p.t <= end && !(p.x === 0 && p.y === 0))
      .sort((a, b) => a.t - b.t)
      .map((p) => [p.x, p.y] as [number, number]);
    if (pts.length >= 120) {
      return {
        meeting_key: meetingKey,
        session_key: sessionKey,
        driver_number: n,
        lap: num(lap.lap_number) ?? 0,
        points: downsample(pts, 320),
      };
    }
  }
  return null;
}

/**
 * Busca el trazado en las sesiones del meeting, de la más reciente a la más vieja.
 * Las sesiones ya terminadas son histórico (gratis), así que esto funciona aun
 * sin suscripción mientras haya al menos una práctica corrida.
 */
export async function buildTrack(meetingKey: string): Promise<TrackShape | null> {
  const sessions = (await fetchUpstream(`${OPENF1_BASE}/sessions?meeting_key=${encodeURIComponent(meetingKey)}`)) as Raw[];
  const now = Date.now();
  const candidates = sessions
    .filter((s) => Date.parse(String(s.date_start)) < now)
    .sort((a, b) => String(b.date_start).localeCompare(String(a.date_start)));

  for (const s of candidates.slice(0, 4)) {
    const sk = num(s.session_key);
    const mk = num(s.meeting_key);
    if (sk == null || mk == null) continue;
    try {
      const t = await trackFromSession(mk, sk);
      if (t) return t;
    } catch {
      // sesión en vivo sin suscripción (401) u otro error: probar la anterior
    }
  }
  return null;
}
