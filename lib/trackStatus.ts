import type { RaceControlEvent, RCType } from './openf1/types';

/** Clasifica un mensaje crudo de /race_control (portado del prototipo, + campo `category`/`flag`). */
export function classifyRC(e: { message?: string | null; category?: string | null; flag?: string | null }): RCType | null {
  const m = (e.message || '').toUpperCase();
  const cat = e.category || '';
  const isVirtual = m.includes('VIRTUAL') || /\bVSC\b/.test(m);
  // La categoría manda: "OVERTAKING UNDER SAFETY CAR — PENALTY" es una pena, no un SC.
  if (cat === 'SafetyCar') return isVirtual ? 'VSC' : 'SC';
  if (e.flag === 'RED' || /\bRED FLAG\b/.test(m)) return 'RED';
  if (m.includes('PENALTY')) return 'PENALTY';
  if (m.includes('INVESTIGAT') || m.includes('NOTED')) return 'INVESTIGATION';
  if (cat === 'Flag') return 'FLAG';
  if (cat === 'SessionStatus' || /^RACE START/.test(m)) return 'SESSION';
  if (/RISK OF RAIN|OVERTAKE (EN|DIS)ABLED|DRS (EN|DIS)ABLED|PIT EXIT CLOSED|GRIP CONDITIONS|SLIPPERY/.test(m)) return 'INFO';
  // Sin categoría reconocible: caer al texto (como el prototipo).
  if (m.includes('SAFETY CAR') || /\bVSC\b/.test(m)) return isVirtual ? 'VSC' : 'SC';
  return null;
}

/**
 * ¿Se muestra en el feed? Fuera: banderas azules, "CLEAR" de sector (la barra de
 * estado los usa igual), vueltas borradas por track limits y avisos administrativos.
 */
export function isFeedWorthy(e: RaceControlEvent): boolean {
  if (e.type == null) return false;
  if (e.type === 'FLAG') {
    if (e.flag === 'BLUE') return false;
    if (e.flag === 'CLEAR' && e.scope === 'Sector') return false;
  }
  return true;
}

export type TrackState = 'GREEN' | 'YELLOW' | 'DBLYELLOW' | 'SC' | 'VSC' | 'RED' | 'CHEQUERED';

export const TRACK_LABEL: Record<TrackState, string> = {
  GREEN: 'PISTA LIBRE',
  YELLOW: 'BANDERA AMARILLA',
  DBLYELLOW: 'DOBLE AMARILLA',
  SC: 'SAFETY CAR',
  VSC: 'VIRTUAL SAFETY CAR',
  RED: 'BANDERA ROJA · SESIÓN DETENIDA',
  CHEQUERED: 'BANDERA A CUADROS',
};

/** Una amarilla de sector sin "CLEAR" se descarta pasado este tiempo (el feed a veces pierde el CLEAR). */
const YELLOW_STALE_MS = 10 * 60_000;

/**
 * Estado de pista a partir del feed (orden cronológico).
 * Máquina de estados: estado base de sesión (verde/SC/VSC/roja/cuadros) +
 * amarillas por sector, para que un "CLEAR IN TRACK SECTOR 4" no apague
 * una amarilla vigente en otro sector.
 */
export function computeTrackState(events: RaceControlEvent[]): TrackState {
  let base: 'GREEN' | 'SC' | 'VSC' | 'RED' | 'CHEQUERED' = 'GREEN';
  const yellows = new Map<string, { kind: 'YELLOW' | 'DBLYELLOW'; at: number }>();
  let lastAt = 0;

  for (const e of events) {
    const m = e.message.toUpperCase();
    const flag = (e.flag || '').toUpperCase();
    const sectorKey = e.scope === 'Sector' && e.sector != null ? `s${e.sector}` : 'track';
    const at = e.date ? Date.parse(e.date) : NaN;
    if (Number.isFinite(at)) lastAt = Math.max(lastAt, at);
    const stamp = Number.isFinite(at) ? at : lastAt;

    if (e.type === 'RED' || flag === 'RED') {
      base = 'RED';
      continue;
    }
    if (e.type === 'VSC') {
      if (!/ENDING/.test(m)) base = 'VSC';
      continue;
    }
    if (e.type === 'SC') {
      // "SAFETY CAR IN THIS LAP" = termina; sigue SC hasta la verde.
      base = 'SC';
      continue;
    }
    if (flag === 'CHEQUERED' || /CHEQUERED|CUADROS|FINALIZ|SESSION FINISHED/.test(m)) {
      base = 'CHEQUERED';
      yellows.clear();
      continue;
    }
    if (e.type === 'SESSION') {
      if (/INICIA|START|RESUME/.test(m)) {
        base = 'GREEN';
        yellows.clear();
      }
      continue;
    }
    if (e.type === 'FLAG') {
      if (flag === 'DOUBLE YELLOW' || /DOBLE|DOUBLE YELLOW/.test(m)) yellows.set(sectorKey, { kind: 'DBLYELLOW', at: stamp });
      else if (flag === 'YELLOW' || (/AMARILLA|YELLOW/.test(m) && !/BLANCA|WHITE/.test(m))) yellows.set(sectorKey, { kind: 'YELLOW', at: stamp });
      else if (flag === 'GREEN' || flag === 'CLEAR' || /VERDE|GREEN|CLEAR|DESPEJADO/.test(m)) {
        if (sectorKey === 'track') {
          yellows.clear();
          if (base !== 'CHEQUERED') base = 'GREEN';
        } else {
          yellows.delete(sectorKey);
        }
      }
    }
  }

  if (base !== 'GREEN') return base;
  const ys = [...yellows.values()].filter((y) => !lastAt || lastAt - y.at < YELLOW_STALE_MS).map((y) => y.kind);
  if (ys.includes('DBLYELLOW')) return 'DBLYELLOW';
  if (ys.includes('YELLOW')) return 'YELLOW';
  return 'GREEN';
}
