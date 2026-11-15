/**
 * Tipos NORMALIZADOS que devuelven nuestras rutas /api/openf1/*.
 * (No son la forma cruda de OpenF1: los normalizadores en ./normalize.ts
 * recortan campos, tipan gaps/compuestos y agregan donde conviene.)
 */

/** Gap a líder: número (s), 0 (líder), string "+1 LAP" (doblado) o null (DNF/DNS/sin dato). */
export type Gap = number | string | null;

export type Compound = 'SOFT' | 'MEDIUM' | 'HARD' | 'INTERMEDIATE' | 'WET' | 'UNKNOWN';

export interface Session {
  session_key: number;
  meeting_key: number;
  session_name: string;
  session_type: string;
  circuit_short_name: string;
  country_name: string;
  location: string;
  date_start: string;
  date_end: string;
  /** Ej. "-03:00:00" */
  gmt_offset: string | null;
  year: number | null;
}

export interface Driver {
  driver_number: number;
  name_acronym: string;
  full_name: string;
  team_name: string;
  /** Hex CON '#'. */
  team_colour: string;
}

export interface SessionResult {
  position: number | null;
  driver_number: number;
  gap_to_leader: Gap;
  /** Carrera: duración total (s). En quali es null (ver `q`). */
  duration: number | null;
  /** Quali: [Q1, Q2, Q3] en segundos; null fuera de quali. */
  q: [number | null, number | null, number | null] | null;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
  number_of_laps: number;
  points: number;
}

/** Último registro por piloto (el proxy colapsa el histórico). */
export interface LivePosition {
  driver_number: number;
  position: number;
  date: string;
}

/** Último registro por piloto. */
export interface Interval {
  driver_number: number;
  gap_to_leader: Gap;
  interval: Gap;
  date: string;
}

export interface Lap {
  driver_number: number;
  lap_number: number;
  date_start: string | null;
  lap_duration: number | null;
  s1: number | null;
  s2: number | null;
  s3: number | null;
  i1_speed: number | null;
  i2_speed: number | null;
  st_speed: number | null;
  seg1: number[] | null;
  seg2: number[] | null;
  seg3: number[] | null;
  is_pit_out_lap: boolean;
}

export interface Segments {
  lap: number;
  s1: number[] | null;
  s2: number[] | null;
  s3: number[] | null;
}

export interface DriverLapStats {
  /** Mejor vuelta (s). */
  best: number | null;
  bestLap: number | null;
  s1: number | null;
  s2: number | null;
  s3: number | null;
  /** Última vuelta registrada. */
  lastLap: number;
  /** Microsectores de la última vuelta con dato. */
  lastSegments: Segments | null;
  /** Microsectores de la mejor vuelta. */
  bestSegments: Segments | null;
}

/** Respuesta de /api/openf1/laps/summary — agregado server-side de /laps. */
export interface LapSummary {
  fastest: { driver_number: number; time: number; lap: number } | null;
  speedTrap: { driver_number: number; speed: number; lap: number } | null;
  medianLap: number | null;
  maxLap: number;
  drivers: Record<string, DriverLapStats>;
}

export interface Stint {
  driver_number: number;
  stint_number: number;
  compound: Compound;
  tyre_age_at_start: number | null;
  lap_start: number | null;
  lap_end: number | null;
}

export interface Pit {
  driver_number: number;
  lap_number: number | null;
  /** Tiempo TOTAL en pit lane (entrada→salida), NO el estacionario. */
  pit_duration: number | null;
  /** Estacionario, solo si OpenF1 llegara a exponerlo (hoy normalmente null). */
  stop_duration: number | null;
  date: string | null;
}

export type RCType = 'PENALTY' | 'INVESTIGATION' | 'FLAG' | 'SC' | 'VSC' | 'RED' | 'SESSION' | 'INFO';

export interface RaceControlEvent {
  date: string | null;
  lap_number: number | null;
  category: string;
  flag: string | null;
  scope: string | null;
  sector: number | null;
  driver_number: number | null;
  message: string;
  /** Clasificación DELTA; null = evento no mostrado en el feed (DRS, etc.). */
  type: RCType | null;
  /** Penalización cumplida. */
  served: boolean;
}

export interface Weather {
  date: string;
  air_temperature: number | null;
  track_temperature: number | null;
  humidity: number | null;
  wind_speed: number | null;
  wind_direction: number | null;
  pressure: number | null;
  rainfall: boolean;
}

/** Últimos segundos de GPS de un auto: [epochMs, x, y]. */
export interface LocationSeries {
  driver_number: number;
  pts: [number, number, number][];
}

/** Trazado real del circuito (una vuelta limpia de GPS). */
export interface TrackShape {
  meeting_key: number;
  session_key: number;
  driver_number: number;
  lap: number;
  /** Puntos [x, y] en coordenadas OpenF1, arrancando en la línea de llegada. */
  points: [number, number][];
}

export interface Meeting {
  meeting_key: number;
  meeting_name: string;
  country_name: string;
  location: string;
  circuit_short_name: string;
  date_start: string;
}
