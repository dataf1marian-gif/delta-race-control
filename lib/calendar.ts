/** Calendarios estáticos (portados del prototipo). Nombres por país/sede — sin marcas oficiales. */

export interface CalRound {
  round: number;
  flag: string;
  name: string;
  location: string;
  /** Viernes del fin de semana (YYYY-MM-DD). */
  start: string;
  /** Texto de fecha para mostrar. */
  label: string;
  sprint?: boolean;
}

/** Temporada 2026 (vía OpenF1). Bahréin y Arabia se cancelaron; Bahréin se corrió en Malasia. */
export const CAL2026: CalRound[] = [
  { round: 1, flag: '🇦🇺', name: 'Australia', location: 'Melbourne', start: '2026-03-06', label: '06 Mar' },
  { round: 2, flag: '🇨🇳', name: 'China', location: 'Shanghai', start: '2026-03-13', label: '13 Mar' },
  { round: 3, flag: '🇯🇵', name: 'Japón', location: 'Suzuka', start: '2026-03-27', label: '27 Mar' },
  { round: 4, flag: '🇺🇸', name: 'Miami', location: 'Miami', start: '2026-05-01', label: '01 May' },
  { round: 5, flag: '🇨🇦', name: 'Canadá', location: 'Montreal', start: '2026-05-22', label: '22 May' },
  { round: 6, flag: '🇲🇨', name: 'Mónaco', location: 'Montecarlo', start: '2026-06-05', label: '05 Jun' },
  { round: 7, flag: '🇪🇸', name: 'Barcelona', location: 'Catalunya', start: '2026-06-12', label: '12 Jun' },
  { round: 8, flag: '🇦🇹', name: 'Austria', location: 'Spielberg', start: '2026-06-26', label: '26 Jun' },
  { round: 9, flag: '🇬🇧', name: 'Gran Bretaña', location: 'Silverstone', start: '2026-07-03', label: '03 Jul' },
  { round: 10, flag: '🇧🇪', name: 'Bélgica', location: 'Spa', start: '2026-07-17', label: '17 Jul' },
  { round: 11, flag: '🇭🇺', name: 'Hungría', location: 'Hungaroring', start: '2026-07-24', label: '24 Jul' },
  { round: 12, flag: '🇳🇱', name: 'Países Bajos', location: 'Zandvoort', start: '2026-08-21', label: '21 Ago' },
  { round: 13, flag: '🇮🇹', name: 'Italia', location: 'Monza', start: '2026-09-04', label: '04 Sep' },
  { round: 14, flag: '🇪🇸', name: 'España', location: 'Madrid', start: '2026-09-11', label: '11 Sep' },
  { round: 15, flag: '🇦🇿', name: 'Azerbaiyán', location: 'Bakú', start: '2026-09-24', label: '24 Sep' },
  { round: 16, flag: '🇲🇾', name: 'Bahréin en Malasia', location: 'Kuala Lumpur', start: '2026-10-02', label: '02 Oct' },
  { round: 17, flag: '🇸🇬', name: 'Singapur', location: 'Marina Bay', start: '2026-10-09', label: '09 Oct' },
  { round: 18, flag: '🇺🇸', name: 'Estados Unidos', location: 'Austin', start: '2026-10-23', label: '23 Oct' },
  { round: 19, flag: '🇲🇽', name: 'México', location: 'Ciudad de México', start: '2026-10-30', label: '30 Oct' },
  { round: 20, flag: '🇧🇷', name: 'Brasil', location: 'Interlagos', start: '2026-11-06', label: '06 Nov' },
  { round: 21, flag: '🇺🇸', name: 'Las Vegas', location: 'Las Vegas', start: '2026-11-20', label: '20 Nov' },
  { round: 22, flag: '🇶🇦', name: 'Qatar', location: 'Lusail', start: '2026-11-27', label: '27 Nov' },
  { round: 23, flag: '🇦🇪', name: 'Abu Dhabi', location: 'Yas Marina', start: '2026-12-04', label: '04 Dic' },
];

/** Calendario 2027 oficial FIA: 24 fechas, 10 sprints. */
export const CAL2027: CalRound[] = [
  { round: 1, flag: '🇧🇭', name: 'Bahréin', location: 'Sakhir', start: '2027-03-12', label: '12-14 Mar', sprint: true },
  { round: 2, flag: '🇸🇦', name: 'Arabia Saudita', location: 'Jeddah', start: '2027-03-19', label: '19-21 Mar' },
  { round: 3, flag: '🇦🇺', name: 'Australia', location: 'Melbourne', start: '2027-04-02', label: '02-04 Abr', sprint: true },
  { round: 4, flag: '🇯🇵', name: 'Japón', location: 'Suzuka', start: '2027-04-09', label: '09-11 Abr', sprint: true },
  { round: 5, flag: '🇨🇳', name: 'China', location: 'Shanghai', start: '2027-04-16', label: '16-18 Abr' },
  { round: 6, flag: '🇺🇸', name: 'Miami', location: 'Miami', start: '2027-04-30', label: '30 Abr-02 May' },
  { round: 7, flag: '🇨🇦', name: 'Canadá', location: 'Montreal', start: '2027-05-21', label: '21-23 May', sprint: true },
  { round: 8, flag: '🇲🇨', name: 'Mónaco', location: 'Montecarlo', start: '2027-06-04', label: '04-06 Jun', sprint: true },
  { round: 9, flag: '🇵🇹', name: 'Portugal', location: 'Portimão', start: '2027-06-18', label: '18-20 Jun' },
  { round: 10, flag: '🇬🇧', name: 'Gran Bretaña', location: 'Silverstone', start: '2027-07-02', label: '02-04 Jul', sprint: true },
  { round: 11, flag: '🇦🇹', name: 'Austria', location: 'Spielberg', start: '2027-07-09', label: '09-11 Jul' },
  { round: 12, flag: '🇧🇪', name: 'Bélgica', location: 'Spa', start: '2027-07-23', label: '23-25 Jul' },
  { round: 13, flag: '🇭🇺', name: 'Hungría', location: 'Budapest', start: '2027-07-30', label: '30 Jul-01 Ago' },
  { round: 14, flag: '🇮🇹', name: 'Italia', location: 'Monza', start: '2027-09-03', label: '03-05 Sep', sprint: true },
  { round: 15, flag: '🇪🇸', name: 'España', location: 'Madrid', start: '2027-09-10', label: '10-12 Sep' },
  { round: 16, flag: '🇦🇿', name: 'Azerbaiyán', location: 'Bakú', start: '2027-09-24', label: '24-26 Sep' },
  { round: 17, flag: '🇹🇷', name: 'Turquía', location: 'Estambul', start: '2027-10-01', label: '01-03 Oct' },
  { round: 18, flag: '🇸🇬', name: 'Singapur', location: 'Singapur', start: '2027-10-08', label: '08-10 Oct' },
  { round: 19, flag: '🇺🇸', name: 'Estados Unidos', location: 'Austin', start: '2027-10-22', label: '22-24 Oct' },
  { round: 20, flag: '🇲🇽', name: 'México', location: 'Ciudad de México', start: '2027-10-29', label: '29-31 Oct' },
  { round: 21, flag: '🇧🇷', name: 'Brasil', location: 'São Paulo', start: '2027-11-05', label: '05-07 Nov', sprint: true },
  { round: 22, flag: '🇺🇸', name: 'Las Vegas', location: 'Las Vegas', start: '2027-11-18', label: '18-20 Nov' },
  { round: 23, flag: '🇶🇦', name: 'Qatar', location: 'Lusail', start: '2027-12-03', label: '03-05 Dic', sprint: true },
  { round: 24, flag: '🇦🇪', name: 'Abu Dhabi', location: 'Yas Marina', start: '2027-12-10', label: '10-12 Dic', sprint: true },
];

export const CAL_NOTES: Record<'2026' | '2027', string> = {
  '2026':
    '23 carreras. Bahréin y Arabia Saudita se cancelaron; Bahréin se corrió en Malasia.',
  '2027':
    '24 fechas y 10 sprints. Vuelven Portugal (Portimão) y Turquía (Estambul); salen Barcelona y Países Bajos (Zandvoort).',
};

const DAY = 86_400_000;

/** Inicio del fin de semana (viernes 00:00 UTC). */
export const roundStart = (r: CalRound) => Date.parse(`${r.start}T00:00:00Z`);
/**
 * Fin del fin de semana: domingo completo + margen (las carreras nocturnas de
 * América/Las Vegas terminan ya entrado el lunes en UTC).
 */
export const roundEnd = (r: CalRound) => roundStart(r) + 3 * DAY + 12 * 3_600_000;

export interface SeasonView {
  /** GP cuyo fin de semana (vie→dom) está en curso ahora. */
  current: CalRound | null;
  /** Última carrera ya terminada (se muestra arriba solo si no hay una en curso). */
  last: CalRound | null;
  next: CalRound | null;
  /** Futuras después de `next`. */
  upcoming: CalRound[];
  /** Ya disputadas (sin la que se muestra arriba como `last`). */
  past: CalRound[];
}

export function seasonView(cal: CalRound[], now: number): SeasonView {
  const current = cal.find((r) => now >= roundStart(r) && now < roundEnd(r)) ?? null;
  const done = cal.filter((r) => roundEnd(r) <= now);
  const future = cal.filter((r) => roundStart(r) > now);
  const last = current ? null : (done[done.length - 1] ?? null);
  return {
    current,
    last,
    next: future[0] ?? null,
    upcoming: future.slice(1),
    past: last ? done.slice(0, -1) : done,
  };
}

/** Temporada en curso = la del año actual (UTC). */
export const isCurrentSeason = (cal: CalRound[], now: number) =>
  cal.length > 0 && cal[0].start.slice(0, 4) === String(new Date(now).getUTCFullYear());

/** "hoy", "mañana", "en 6 días". */
export function daysUntil(r: CalRound, now: number): string {
  const d = Math.ceil((roundStart(r) - now) / DAY);
  if (d <= 0) return 'hoy';
  if (d === 1) return 'mañana';
  return `en ${d} días`;
}
