'use client';

import { createContext, useContext, useMemo } from 'react';
import type { Driver } from '@/lib/openf1/types';

interface DriverLookup {
  /** Sigla (VER) o "#n" si no hay dato. */
  ac: (n: number | null | undefined) => string;
  /** Color de equipo (como indicador de dato, no branding). */
  tc: (n: number | null | undefined) => string;
  team: (n: number | null | undefined) => string;
  get: (n: number | null | undefined) => Driver | undefined;
}

const Ctx = createContext<DriverLookup | null>(null);

export function DriversProvider({ drivers, children }: { drivers: Driver[] | undefined; children: React.ReactNode }) {
  const value = useMemo<DriverLookup>(() => {
    const map = new Map((drivers || []).map((d) => [d.driver_number, d]));
    const get = (n: number | null | undefined) => (n == null ? undefined : map.get(n));
    return {
      get,
      ac: (n) => get(n)?.name_acronym ?? (n == null ? '—' : `#${n}`),
      tc: (n) => get(n)?.team_colour ?? '#99aaaa',
      team: (n) => get(n)?.team_name ?? '',
    };
  }, [drivers]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDrivers(): DriverLookup {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDrivers fuera de DriversProvider');
  return v;
}
