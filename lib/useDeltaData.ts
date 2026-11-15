'use client';

import { useMemo, useState } from 'react';
import { isSessionLive } from './derive';
import type {
  Driver,
  Interval,
  LapSummary,
  LivePosition,
  LocationSeries,
  Pit,
  RaceControlEvent,
  Session,
  SessionResult,
  Stint,
  TrackShape,
  Weather,
} from './openf1/types';
import { useNow, usePoll } from './usePoll';

const LATEST = 'session_key=latest';

/**
 * En vivo pollea al ritmo del TTL de cada endpoint (ver lib/openf1/endpoints.ts:
 * pollear más rápido que el caché no trae datos más frescos). Fuera de sesión baja el ritmo.
 */
const pace = (live: boolean, liveMs: number, idleMs: number) => (live ? liveMs : idleMs);

/** Todo lo de la sesión `latest` (la que está corriendo o la última terminada). */
export function useRaceData(demo = false) {
  const now = useNow(5000);
  const sessions = usePoll<Session[]>(`sessions?${LATEST}`, { interval: 60_000 });
  const session = sessions.data?.[0];

  // Demo: repite la última sesión "como en vivo" desde 20 min después de su largada.
  const [t0] = useState(() => Date.now());
  const demoAt =
    demo && session ? Math.floor((Date.parse(session.date_start) + 20 * 60_000 + (now - t0)) / 5000) * 5000 : null;
  const live = demo ? !!session : isSessionLive(session, now);
  const at = demoAt != null ? `&at=${new Date(demoAt).toISOString()}` : '';

  const drivers = usePoll<Driver[]>(`drivers?${LATEST}`, { interval: 600_000 });
  const results = usePoll<SessionResult[]>(`session_result?${LATEST}`, { interval: pace(live, 10_000, 60_000) });
  const positions = usePoll<LivePosition[]>(`position?${LATEST}${at}`, { interval: 10_000, enabled: live, keepNonEmpty: true });
  const intervals = usePoll<Interval[]>(`intervals?${LATEST}${at}`, { interval: 5_000, enabled: live, keepNonEmpty: true });
  const location = usePoll<LocationSeries[]>(`location?${LATEST}${at}`, { interval: 6_000, enabled: live });
  const laps = usePoll<LapSummary>(`laps/summary?${LATEST}`, { interval: pace(live, 15_000, 60_000) });
  const raceControl = usePoll<RaceControlEvent[]>(`race_control?${LATEST}`, { interval: pace(live, 6_000, 60_000) });
  const stints = usePoll<Stint[]>(`stints?${LATEST}`, { interval: pace(live, 60_000, 120_000) });
  const pits = usePoll<Pit[]>(`pit?${LATEST}`, { interval: pace(live, 60_000, 120_000) });
  const weather = usePoll<Weather[]>(`weather?${LATEST}`, { interval: pace(live, 60_000, 120_000) });
  const track = usePoll<TrackShape | null>(session ? `track?meeting_key=${session.meeting_key}` : null, {
    interval: 600_000,
  });

  // OpenF1 restringe los datos en vivo a suscriptores: el proxy responde 401.
  const liveLocked =
    live && [results.error, raceControl.error, intervals.error].some((e) => e === 'HTTP 401');

  return {
    now,
    live,
    demo,
    demoAt,
    liveLocked,
    session,
    sessionError: sessions.error,
    loading: sessions.loading,
    drivers: drivers.data,
    results: results.data,
    positions: live ? positions.data : undefined,
    intervals: live ? intervals.data : undefined,
    location: live ? location.data : undefined,
    track: track.data ?? null,
    laps: laps.data,
    raceControl: raceControl.data,
    stints: stints.data,
    pits: pits.data,
    weather: weather.data,
    updatedAt: Math.max(results.updatedAt ?? 0, intervals.updatedAt ?? 0, raceControl.updatedAt ?? 0) || null,
  };
}

export type RaceData = ReturnType<typeof useRaceData>;

const isMainQualy = (s: Session) =>
  /qualifying/i.test(s.session_type) && !/sprint|shootout/i.test(s.session_name) && /qualifying/i.test(s.session_name);

/**
 * Qualy del meeting en curso: busca la sesión "Qualifying" del meeting `latest`
 * y engancha su session_result + laps (en vivo si está corriendo).
 */
export function useQualyData(now: number, latestSessionKey?: number) {
  const meetingSessions = usePoll<Session[]>('sessions?meeting_key=latest', { interval: 60_000 });
  const qs = useMemo(() => (meetingSessions.data || []).find(isMainQualy), [meetingSessions.data]);
  const live = isSessionLive(qs, now);
  // Si la qualy ES la sesión latest, usar las mismas URLs: comparten caché de CDN (y cuota de OpenF1).
  const key = qs ? (qs.session_key === latestSessionKey ? 'latest' : qs.session_key) : undefined;

  const results = usePoll<SessionResult[]>(key ? `session_result?session_key=${key}` : null, {
    interval: live ? 10_000 : 120_000,
  });
  const laps = usePoll<LapSummary>(key ? `laps/summary?session_key=${key}` : null, {
    interval: live ? 15_000 : 120_000,
  });

  return {
    session: qs,
    resolved: !meetingSessions.loading,
    live,
    results: results.data,
    laps: laps.data,
    loading: meetingSessions.loading || (!!key && results.loading),
  };
}

export type QualyData = ReturnType<typeof useQualyData>;
