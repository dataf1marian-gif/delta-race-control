import { compass } from '@/lib/format';
import type { Weather } from '@/lib/openf1/types';

export function weatherState(w: Weather | undefined): string {
  if (!w) return '—';
  if (w.rainfall) return 'LLUVIA';
  return (w.humidity ?? 0) >= 88 ? 'HÚMEDO' : 'SECO';
}

interface Props {
  /** Último registro. */
  w: Weather | undefined;
  /** Registro de ~15 min antes, para la tendencia. */
  prev?: Weather | undefined;
}

/** Condiciones actuales (último registro de /weather), con íconos y tendencias. */
export function WeatherGrid({ w, prev }: Props) {
  const d = (a: number | null | undefined, b: number | null | undefined) => (a != null && b != null ? a - b : null);
  const raining = !!w?.rainfall;

  return (
    <div className="mx-3.5 grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line min-[420px]:grid-cols-3">
      <Cell icon={<IconThermo />} accent="var(--amber)" label="TEMP AIRE" trend={d(w?.air_temperature, prev?.air_temperature)} unit="°">
        {w?.air_temperature != null ? <>{w.air_temperature.toFixed(1)}<Unit>°C</Unit></> : '–'}
      </Cell>

      <Cell icon={<IconTrack />} accent="var(--medium)" label="TEMP PISTA" trend={d(w?.track_temperature, prev?.track_temperature)} unit="°">
        {w?.track_temperature != null ? <>{w.track_temperature.toFixed(1)}<Unit>°C</Unit></> : '–'}
      </Cell>

      <Cell
        icon={<IconDrop />}
        accent="var(--telemetry)"
        label="HUMEDAD"
        extra={
          w?.humidity != null && (
            <span className="mt-2 block h-[3px] w-full overflow-hidden rounded-full bg-line">
              <span className="block h-full rounded-full bg-telemetry" style={{ width: `${Math.min(100, w.humidity)}%` }} />
            </span>
          )
        }
      >
        {w?.humidity != null ? <>{Math.round(w.humidity)}<Unit>%</Unit></> : '–'}
      </Cell>

      <Cell
        icon={<IconWind />}
        accent="#9fb4ff"
        label="VIENTO"
        extra={
          w?.wind_direction != null && (
            <span className="mt-1.5 flex items-center justify-center gap-1.5 font-mono text-[9px] text-ink-dim">
              {/* La dirección meteorológica es DE dónde viene: la flecha apunta hacia dónde va. */}
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden style={{ transform: `rotate(${(w.wind_direction + 180) % 360}deg)` }}>
                <path d="M12 3l5 9h-3.5v9h-3v-9H7z" fill="#9fb4ff" />
              </svg>
              DESDE EL {compass(w.wind_direction)}
            </span>
          )
        }
      >
        {w?.wind_speed != null ? <>{w.wind_speed.toFixed(1)}<Unit> m/s</Unit></> : '–'}
      </Cell>

      <Cell icon={<IconGauge />} accent="#c7a6ff" label="PRESIÓN">
        {w?.pressure != null ? <>{Math.round(w.pressure)}<Unit> hPa</Unit></> : '–'}
      </Cell>

      <Cell icon={raining ? <IconRain /> : <IconCloud />} accent={raining ? 'var(--wet)' : 'var(--ink-dim)'} label="LLUVIA" glow={raining}>
        {w ? raining ? <span className="text-wet">SÍ</span> : 'NO' : '–'}
      </Cell>
    </div>
  );
}

interface CellProps {
  icon: React.ReactNode;
  accent: string;
  label: string;
  children: React.ReactNode;
  trend?: number | null;
  unit?: string;
  extra?: React.ReactNode;
  glow?: boolean;
}

function Cell({ icon, accent, label, children, trend, unit = '', extra, glow }: CellProps) {
  return (
    <div
      className="relative bg-panel px-2.5 pb-3 pt-3 text-center"
      style={{
        backgroundImage: `radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, ${accent} ${glow ? 22 : 11}%, transparent), transparent 70%)`,
      }}
    >
      <div className="mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-full" style={{ color: accent, background: `color-mix(in srgb, ${accent} 14%, transparent)` }}>
        {icon}
      </div>
      <div className="font-mono text-[8px] tracking-[1.5px] text-ink-faint">{label}</div>
      <div className="mt-1 font-mono text-[18px] font-extrabold leading-tight">{children}</div>
      {trend != null && Math.abs(trend) >= 0.1 && (
        <div className={`mt-1 flex items-center justify-center gap-1 font-mono text-[9px] font-bold ${trend > 0 ? 'text-signal' : 'text-telemetry'}`}>
          <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden style={{ transform: trend > 0 ? undefined : 'rotate(180deg)' }}>
            <path d="M5 1l4 7H1z" fill="currentColor" />
          </svg>
          {Math.abs(trend).toFixed(1)}
          {unit} <span className="font-medium text-ink-faint">15 MIN</span>
        </div>
      )}
      {extra}
    </div>
  );
}

function Unit({ children }: { children: React.ReactNode }) {
  return <small className="text-[10px] font-medium text-ink-dim">{children}</small>;
}

/* ---------- íconos de línea (heredan currentColor) ---------- */

const svg = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function IconThermo() {
  return (
    <svg {...svg}>
      <path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z" />
      <path d="M12 9v7" />
    </svg>
  );
}

/** Asfalto con ondas de calor. */
function IconTrack() {
  return (
    <svg {...svg}>
      <path d="M3 20l4-9h10l4 9" />
      <path d="M12 13v2M12 18v2" />
      <path d="M8 3c1 1 1 2 0 3M12 3c1 1 1 2 0 3M16 3c1 1 1 2 0 3" />
    </svg>
  );
}

function IconDrop() {
  return (
    <svg {...svg}>
      <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />
    </svg>
  );
}

function IconWind() {
  return (
    <svg {...svg}>
      <path d="M3 8h11a3 3 0 1 0-3-3" />
      <path d="M3 12h16a3 3 0 1 1-3 3" />
      <path d="M3 16h7" />
    </svg>
  );
}

function IconGauge() {
  return (
    <svg {...svg}>
      <path d="M4 18a9 9 0 1 1 16 0" />
      <path d="M12 14l4-5" />
      <circle cx="12" cy="14" r="1.2" />
    </svg>
  );
}

function IconCloud() {
  return (
    <svg {...svg}>
      <path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.4 1.5A3.3 3.3 0 0 0 7 18z" />
    </svg>
  );
}

function IconRain() {
  return (
    <svg {...svg}>
      <path d="M7 15h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.4 1.5A3.3 3.3 0 0 0 7 15z" />
      <path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3" />
    </svg>
  );
}
