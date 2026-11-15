/** Proyección de coordenadas GPS de OpenF1 al viewBox del mapa. */
import type { TrackShape } from './openf1/types';

export const VB_W = 300;
export const VB_H = 210;
const PAD = 14;

export interface Projection {
  /** [x, y] OpenF1 → [x, y] SVG. */
  project: (x: number, y: number) => [number, number];
  /** Path SVG cerrado del trazado. */
  d: string;
  /** Punto de largada/llegada (primer punto de la vuelta). */
  start: [number, number];
  /** Dirección de la pista en la línea de llegada (grados), para dibujar la línea a cuadros cruzada. */
  startAngle: number;
}

/**
 * Encaja el trazado en el viewBox: invierte Y (OpenF1 es cartesiano, SVG va
 * hacia abajo) y rota 90° si el circuito es más alto que ancho, para
 * aprovechar el mapa apaisado.
 */
export function makeProjection(track: TrackShape): Projection | null {
  const pts = track.points;
  if (pts.length < 10) return null;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const rotate = h > w * 1.15;

  // Coordenadas "de pantalla" antes de escalar (y invertida, rotación opcional).
  const raw = (x: number, y: number): [number, number] =>
    rotate ? [maxY - y, maxX - x] : [x - minX, maxY - y];
  const rw = rotate ? h : w;
  const rh = rotate ? w : h;
  const scale = Math.min((VB_W - 2 * PAD) / rw, (VB_H - 2 * PAD) / rh);
  const offX = (VB_W - rw * scale) / 2;
  const offY = (VB_H - rh * scale) / 2;

  const project = (x: number, y: number): [number, number] => {
    const [rx, ry] = raw(x, y);
    return [offX + rx * scale, offY + ry * scale];
  };

  const proj = pts.map(([x, y]) => project(x, y));
  const d = `M${proj.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L')} Z`;
  const [x0, y0] = proj[0];
  const [x1, y1] = proj[Math.min(3, proj.length - 1)];
  const startAngle = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
  return { project, d, start: proj[0], startAngle };
}
