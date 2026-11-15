/**
 * Paleta DELTA — fuente única. Tailwind la usa como colores (`bg-signal/15`)
 * y además la inyecta como variables CSS en :root (`var(--signal)`) para
 * canvas, SVG y estilos inline con colores de dato.
 */
export const palette = {
  carbon: '#07080b',
  panel: '#0f1218',
  'panel-2': '#151a22',
  line: '#232a36',
  'line-soft': '#1a202a',
  ink: '#eef2f8',
  'ink-dim': '#8a93a6',
  'ink-faint': '#5a6476',
  signal: '#ff1e3c', // rojo broadcast
  telemetry: '#13f1cf', // cian telemetría
  violet: '#b14bff', // vuelta rápida / mejor de todos
  amber: '#ffb224',
  green: '#2fd45e',
  // compuestos
  soft: '#ff2d3a',
  medium: '#ffd12e',
  hard: '#f2f2f2',
  inter: '#44c23a',
  wet: '#2b7bff',
} as const;

export type PaletteKey = keyof typeof palette;
