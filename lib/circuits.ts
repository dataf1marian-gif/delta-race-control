/**
 * Vueltas programadas de carrera por circuito (OpenF1 no expone el total).
 * Clave = `circuit_short_name` de OpenF1. Si un circuito no está, se muestra
 * solo la vuelta actual (y al terminar, el total real del ganador).
 */
const RACE_LAPS: Record<string, number> = {
  Melbourne: 58,
  Shanghai: 56,
  Suzuka: 53,
  Sakhir: 57,
  Jeddah: 50,
  Miami: 57,
  Montreal: 70,
  'Monte Carlo': 78,
  Catalunya: 66,
  Spielberg: 71,
  Silverstone: 52,
  'Spa-Francorchamps': 44,
  Hungaroring: 70,
  Zandvoort: 72,
  Monza: 53,
  Baku: 51,
  Singapore: 62,
  Austin: 56,
  'Mexico City': 71,
  Interlagos: 71,
  'Las Vegas': 50,
  Lusail: 57,
  'Yas Marina Circuit': 58,
};

export function scheduledRaceLaps(circuitShortName: string | undefined): number | null {
  if (!circuitShortName) return null;
  return RACE_LAPS[circuitShortName] ?? null;
}

/** Carrera principal (no sprint, no práctica/qualy). */
export const isMainRace = (s: { session_type: string; session_name: string } | undefined) =>
  !!s && s.session_type === 'Race' && s.session_name === 'Race';
