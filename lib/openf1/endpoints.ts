import type { NormalizedEndpoint } from './normalize';

export const OPENF1_BASE = 'https://api.openf1.org/v1';
export const OPENF1_TOKEN_URL = 'https://api.openf1.org/token';

/**
 * TTL de CDN por endpoint (segundos).
 *
 * Presupuesto: OpenF1 permite 60 req/min con suscripción (30 sin). Durante una
 * sesión en vivo, con todos los clientes colapsados por el CDN, esto suma
 * ~52 req/min hacia OpenF1 (60/TTL por endpoint que se pollea en vivo):
 *   intervals 12 · location 10 · race_control 10 · position 6 · laps 4 ·
 *   session_result 6 · stints/pit/weather/sessions ~4
 * OpenF1 además publica con ~3s de demora, así que bajar más los TTL no
 * da datos más frescos: solo quema cuota.
 */
export const TTL: Record<NormalizedEndpoint, number> = {
  intervals: 5,
  location: 6,
  race_control: 6,
  position: 10,
  laps: 15,
  session_result: 10,
  stints: 60,
  pit: 60,
  weather: 60,
  sessions: 60,
  drivers: 600,
  meetings: 3600,
};

/** Trazado real: no cambia en todo el fin de semana. */
export const TRACK_TTL = 6 * 3600;
export const TRACK_TTL_MISS = 120;

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
 * Streams en vivo: intervals (~20k filas/carrera) y location (~500k) se piden
 * solo en su ventana reciente. position es chico (~600 filas/carrera) y solo
 * emite cuando alguien cambia de lugar, así que va completo (0 = sin ventana)
 * para tener siempre el orden de los 22.
 */
export const LIVE_WINDOW_S: Partial<Record<NormalizedEndpoint, number>> = {
  position: 0,
  intervals: 300,
  location: 15,
};

export const isEndpoint = (s: string): s is NormalizedEndpoint => Object.prototype.hasOwnProperty.call(TTL, s);
