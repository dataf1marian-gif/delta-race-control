import type { NormalizedEndpoint } from './normalize';

export const OPENF1_BASE = 'https://api.openf1.org/v1';

/** TTL de CDN por endpoint (segundos) — ver brief §6/§7. */
export const TTL: Record<NormalizedEndpoint, number> = {
  position: 2,
  intervals: 2,
  laps: 3,
  session_result: 3,
  race_control: 3,
  sessions: 30,
  drivers: 60,
  stints: 10,
  pit: 10,
  weather: 10,
  meetings: 3600,
};

/** Vistas derivadas: /api/openf1/<endpoint>/<view>. */
export const VIEWS: Partial<Record<NormalizedEndpoint, readonly string[]>> = {
  laps: ['summary'],
};

/**
 * Solo estos query params llegan a OpenF1 (y en orden canónico). Evita que
 * params basura revienten el caché y nos hagan pegarle de más a OpenF1.
 */
export const ALLOWED_PARAMS = [
  'session_key',
  'meeting_key',
  'driver_number',
  'year',
  'session_name',
  'session_type',
  'country_name',
] as const;

/**
 * position/intervals: el histórico completo de una carrera son miles de filas.
 * Pedimos solo la ventana reciente; el normalizador igual colapsa a "último por piloto".
 */
export const LIVE_WINDOW_S: Partial<Record<NormalizedEndpoint, number>> = {
  position: 300,
  intervals: 300,
};

export const isEndpoint = (s: string): s is NormalizedEndpoint => Object.prototype.hasOwnProperty.call(TTL, s);
