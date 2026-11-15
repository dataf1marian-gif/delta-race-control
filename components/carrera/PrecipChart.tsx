'use client';

import { useEffect, useRef } from 'react';
import { hhmmLocal } from '@/lib/format';
import type { WeatherPoint } from '@/lib/derive';

interface Props {
  series: WeatherPoint[];
  start: string | undefined;
  end: string | undefined;
  /** Offset del circuito en minutos (eje X en hora local). */
  offsetMin: number | null;
}

/** Evolución de pista: temp de pista + humedad + bandas de lluvia (canvas 2D, portado del prototipo). */
export function PrecipChart({ series, start, end, offsetMin }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const draw = () => drawChart(cv, series, start, end, offsetMin);
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(cv);
    return () => ro.disconnect();
  }, [series, start, end, offsetMin]);

  return (
    <div className="panel-surface mx-3.5 p-2.5">
      <canvas ref={ref} className="block h-[126px] w-full" aria-label="Gráfico de evolución de pista" />
      <div className="mt-2 flex justify-center gap-3.5 font-mono text-[8.5px] tracking-[1px] text-ink-dim">
        <Legend c="var(--medium)">TEMP PISTA</Legend>
        <Legend c="var(--telemetry)">HUMEDAD</Legend>
        <Legend c="var(--wet)">LLUVIA</Legend>
      </div>
    </div>
  );
}

function Legend({ c, children }: { c: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-[5px]">
      <i className="h-[3px] w-2.5 rounded-sm" style={{ background: c }} />
      {children}
    </span>
  );
}

function drawChart(
  cv: HTMLCanvasElement,
  series: WeatherPoint[],
  startISO?: string,
  endISO?: string,
  offsetMin: number | null = null,
) {
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  cv.width = cv.clientWidth * DPR;
  cv.height = cv.clientHeight * DPR;
  const w = cv.width;
  const h = cv.height;
  ctx.clearRect(0, 0, w, h);
  const cs = getComputedStyle(document.documentElement);
  const family = cs.getPropertyValue('--font-mono').trim() || 'monospace';
  const mono = `${8 * DPR}px ${family}, monospace`;

  if (series.length < 2) {
    ctx.fillStyle = 'rgba(138,147,166,.9)';
    ctx.font = mono;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SIN SERIE DE CLIMA TODAVÍA', w / 2, h / 2);
    return;
  }

  const n = series.length;
  const padL = 8 * DPR;
  const padR = 44 * DPR;
  const padT = 16 * DPR;
  const padB = 15 * DPR;
  const plotT = padT;
  const plotB = h - padB;
  const plotH = plotB - plotT;
  // Eje X por hora real (si hay inicio/fin de sesión); si no, por orden.
  const tStart = startISO ? Date.parse(startISO) : NaN;
  const tEnd = endISO ? Date.parse(endISO) : NaN;
  const byTime = Number.isFinite(tStart) && Number.isFinite(tEnd) && tEnd > tStart;
  const X = (i: number) => {
    const f = byTime ? Math.min(1, Math.max(0, (series[i].t - tStart) / (tEnd - tStart))) : i / (n - 1);
    return padL + f * (w - padL - padR);
  };
  const bw = (w - padL - padR) / (n - 1);

  // bandas de lluvia
  series.forEach((s, i) => {
    if (s.rain) {
      ctx.fillStyle = 'rgba(43,123,255,.28)';
      ctx.fillRect(X(i) - bw / 2, plotT, bw, plotH);
    }
  });

  // grilla
  ctx.strokeStyle = 'rgba(255,255,255,.06)';
  ctx.lineWidth = DPR;
  for (let g = 0; g <= 2; g++) {
    const y = plotT + (g / 2) * plotH;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.stroke();
  }

  const line = (arr: number[], color: string, fmt: (v: number) => string) => {
    const mn = Math.min(...arr);
    const mx = Math.max(...arr);
    const rg = mx - mn || 1;
    const Y = (v: number) => plotB - ((v - mn) / rg) * plotH;
    ctx.beginPath();
    arr.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 * DPR;
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 5 * DPR;
    ctx.stroke();
    ctx.shadowBlur = 0;
    const lx = X(n - 1);
    const ly = Y(arr[n - 1]);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(lx, ly, 2.6 * DPR, 0, 7);
    ctx.fill();
    ctx.font = mono;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(fmt(arr[n - 1]), lx + 5 * DPR, ly);
    return { mn, mx };
  };

  const cTrack = cs.getPropertyValue('--medium').trim();
  const cHum = cs.getPropertyValue('--telemetry').trim();
  const t = line(series.map((s) => s.track), cTrack, (v) => `${Math.round(v)}°`);
  const hu = line(series.map((s) => s.hum), cHum, (v) => `${Math.round(v)}%`);

  // referencias de rango
  ctx.font = mono;
  ctx.textBaseline = 'top';
  ctx.fillStyle = cTrack;
  ctx.textAlign = 'left';
  ctx.fillText(`PISTA ${Math.round(t.mn)}–${Math.round(t.mx)}°C`, padL, 2 * DPR);
  ctx.fillStyle = cHum;
  ctx.textAlign = 'right';
  ctx.fillText(`HUM ${Math.round(hu.mn)}–${Math.round(hu.mx)}%`, w - padR, 2 * DPR);

  // eje X en hora local del circuito
  const st = startISO ? Date.parse(startISO) : series[0].t;
  const en = endISO ? Date.parse(endISO) : series[n - 1].t;
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(138,147,166,.9)';
  if (Number.isFinite(st) && Number.isFinite(en) && en > st) {
    [0, 0.25, 0.5, 0.75, 1].forEach((f) => {
      const x = padL + f * (w - padL - padR);
      ctx.strokeStyle = 'rgba(255,255,255,.12)';
      ctx.beginPath();
      ctx.moveTo(x, plotB);
      ctx.lineTo(x, plotB + 3 * DPR);
      ctx.stroke();
      ctx.textAlign = f === 0 ? 'left' : f === 1 ? 'right' : 'center';
      ctx.fillText(hhmmLocal(st + f * (en - st), offsetMin), x, h - DPR);
    });
  } else {
    ctx.textAlign = 'left';
    ctx.fillText('INICIO', padL, h - 2 * DPR);
    ctx.textAlign = 'right';
    ctx.fillText('FIN', w - padR, h - 2 * DPR);
  }
}
