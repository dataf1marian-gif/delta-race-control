import { compass } from '@/lib/format';
import type { Weather } from '@/lib/openf1/types';

export function weatherState(w: Weather | undefined): string {
  if (!w) return '—';
  if (w.rainfall) return '🌧 LLUVIA';
  return (w.humidity ?? 0) >= 88 ? 'HÚMEDO' : 'SECO';
}

/** Condiciones actuales (último registro de /weather). */
export function WeatherGrid({ w }: { w: Weather | undefined }) {
  const cells: [string, React.ReactNode][] = [
    ['TEMP AIRE', w?.air_temperature != null ? <>{w.air_temperature.toFixed(1)}<Unit>°C</Unit></> : '–'],
    ['TEMP PISTA', w?.track_temperature != null ? <>{w.track_temperature.toFixed(1)}<Unit>°C</Unit></> : '–'],
    ['HUMEDAD', w?.humidity != null ? <>{Math.round(w.humidity)}<Unit>%</Unit></> : '–'],
    ['VIENTO', w?.wind_speed != null ? <>{w.wind_speed.toFixed(1)}<Unit> {compass(w.wind_direction)}</Unit></> : '–'],
    ['PRESIÓN', w?.pressure != null ? <>{Math.round(w.pressure)}<Unit> hPa</Unit></> : '–'],
    ['LLUVIA', w ? (w.rainfall ? <span className="text-wet">SÍ</span> : 'NO') : '–'],
  ];
  return (
    <div className="mx-3.5 grid grid-cols-3 gap-px overflow-hidden rounded border border-line bg-line">
      {cells.map(([label, value]) => (
        <div key={label} className="bg-panel px-2 py-3 text-center">
          <div className="font-mono text-[8px] tracking-[1.5px] text-ink-faint">{label}</div>
          <div className="mt-[5px] font-mono text-[17px] font-extrabold">{value}</div>
        </div>
      ))}
    </div>
  );
}

function Unit({ children }: { children: React.ReactNode }) {
  return <small className="text-[10px] font-medium text-ink-dim">{children}</small>;
}
