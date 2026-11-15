'use client';

import { useMemo } from 'react';
import { isSessionLive } from './derive';
import type {
  Driver,
  Interval,
  LapSummary,
  LivePosition,
  Pit,
  RaceControlEvent,
  Session,
  SessionResult,
  Stint,
  Weather,
} from './openf1/types';
import { useNow, usePoll } from './usePoll';

const LATEST = 'session_key=latest';

/** En vivo pollea rápido (2–5s); fuera de sesión (FINAL) baja el ritmo. */
const pace = (live: boolean, liveMs: number, idleMs: number) => (live ? liveMs : idleMs);

/** Todo lo de la sesión `latest` (la que está corriendo o la última terminada). */
export function useRaceData() {
  const now = useNow(5000);
  const sessions = usePoll<Session[]>(`sessions?${LATEST}`, { interval: 30_000 });
  const session = sessions.data?.[0];
  const live = isSessionLive(session, now);

  const drivers = usePoll<Driver[]>(`drivers?${LATEST}`, { interval: 60_000 });
  const results = usePoll<SessionResult[]>(`session_result?${LATEST}`, { interval: pace(live, 5_000, 60_000) });
  const positions = usePoll<LivePosition[]>(`position?${LATEST}`, { interval: 2_000, enabled: live, keepNonEmpty: true });
  const intervals = usePoll<Interval[]>(`intervals?${LATEST}`, { interval: 2_000, enabled: live, keepNonEmpty: true });
  const laps = usePoll<LapSummary>(`laps/summary?${LATEST}`, { interval: pace(live, 4_000, 60_000) });
  const raceControl = usePoll<RaceControlEvent[]>(`race_control?${LATEST}`, { interval: pace(live, 3_000, 60_000) });
  const stints = usePoll<Stint[]>(`stints?${LATEST}`, { interval: pace(live, 10_000, 120_000) });
  const pits = usePoll<Pit[]>(`pit?${LATEST}`, { interval: pace(live, 10_000, 120_000) });
  const weather = usePoll<Weather[]>(`weather?${LATEST}`, { interval: pace(live, 10_000, 120_000) });

  return {
    now,
    live,
    session,
    sessionError: sessions.error,
    loading: sessions.loading,
    drivers: drivers.data,
    results: results.data,
    positions: live ? positions.data : undefined,
    intervals: live ? intervals.data : undefined,
    laps: laps.data,
    raceControl: raceControl.data,
    stints: stints.data,
    pits: pits.data,
    weather: weather.data,
    updatedAt: Math.max(results.updatedAt ?? 0, positions.updatedAt ?? 0, raceControl.updatedAt ?? 0) || null,
  };
}

export type RaceData = ReturnType<typeof useRaceData>;

const isMainQualy = (s: Session) =>
  /qualifying/i.test(s.session_type) && !/sprint|shootout/i.test(s.session_name) && /qualifying/i.test(s.session_name);

/**
 * Qualy del meeting en curso: busca la sesión "Qualifying" del meeting `latest`
 * y engancha su session_result + laps (en vivo si está corriendo).
 */
export function useQualyData(now: number) {
  const meetingSessions = usePoll<Session[]>('sessions?meeting_key=latest', { interval: 60_000 });
  const qs = useMemo(() => (meetingSessions.data || []).find(isMainQualy), [meetingSessions.data]);
  const live = isSessionLive(qs, now);
  const key = qs?.session_key;

  const results = usePoll<SessionResult[]>(key ? `session_result?session_key=${key}` : null, {
    interval: live ? 3_000 : 120_000,
  });
  const laps = usePoll<LapSummary>(key ? `laps/summary?session_key=${key}` : null, {
    interval: live ? 4_000 : 120_000,
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
