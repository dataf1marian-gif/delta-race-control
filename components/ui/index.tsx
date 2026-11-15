'use client';

import type { Compound } from '@/lib/openf1/types';
import { TYRE } from '@/lib/format';
import { useDrivers } from '../DriversContext';

/** Encabezado de sección "TÍTULO ───── extra". */
export function SectionHeader({ title, extra }: { title: string; extra?: React.ReactNode }) {
  return (
    <div className="mx-4 mb-2.5 mt-4 flex items-center gap-2.5 font-mono text-[10px] tracking-[2.5px] text-ink-dim">
      <span>{title}</span>
      <span className="h-px flex-1 bg-line" />
      {extra != null && <span>{extra}</span>}
    </div>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return <p className="mx-4 mt-2.5 font-mono text-[9px] leading-[1.7] tracking-[.5px] text-ink-faint">{children}</p>;
}

/** Chip con la sigla del piloto sobre el color de su equipo. */
export function DriverChip({ n }: { n: number | null | undefined }) {
  const { ac, tc } = useDrivers();
  return (
    <span className="rounded-sm px-1.5 py-px text-[11px] font-bold text-ink" style={{ background: tc(n) }}>
      {ac(n)}
    </span>
  );
}

/** Barrita vertical con el color del equipo. */
export function TeamBar({ n, h = 28 }: { n: number; h?: number }) {
  const { tc } = useDrivers();
  return <span className="block w-[3px] flex-none rounded-sm" style={{ height: h, background: tc(n) }} />;
}

/** Círculo de neumático con la letra del compuesto. */
export function TyreChip({ c, size = 16 }: { c: Compound | undefined; size?: number }) {
  const t = TYRE[c ?? 'UNKNOWN'];
  return (
    <span
      title={t.name}
      className="inline-flex flex-none items-center justify-center rounded-full border-2 border-current font-mono font-extrabold"
      style={{ color: t.c, width: size, height: size, fontSize: size * 0.47 }}
    >
      <span className="leading-none">{t.l}</span>
    </span>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-3.5 rounded border border-dashed border-line px-4 py-6 text-center font-mono text-[10px] tracking-[1px] text-ink-faint">
      {children}
    </div>
  );
}
