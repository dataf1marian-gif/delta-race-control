'use client';

import { useEffect, useRef, useState } from 'react';

export interface PollState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  updatedAt: number | null;
}

interface Options {
  /** ms entre polls; null = una sola vez. */
  interval: number | null;
  /** Si es false no pollea (p. ej. falta una dependencia). */
  enabled?: boolean;
  /** Conserva el último array no vacío si llega uno vacío (streams en vivo que se pausan). */
  keepNonEmpty?: boolean;
}

/**
 * Polling contra NUESTRAS rutas /api/openf1/* (nunca directo a OpenF1).
 * Se pausa con la pestaña oculta, aborta al desmontar y ante error conserva
 * el último dato bueno con back-off progresivo.
 */
export function usePoll<T>(path: string | null, { interval, enabled = true, keepNonEmpty = false }: Options): PollState<T> {
  const [state, setState] = useState<PollState<T>>({ data: undefined, error: null, loading: true, updatedAt: null });
  const fails = useRef(0);

  useEffect(() => {
    if (!path || !enabled) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let ctrl: AbortController | undefined;
    let busy = false;

    const schedule = () => {
      if (!alive || interval == null) return;
      const backoff = fails.current ? Math.min(30000, interval * 2 ** fails.current) : interval;
      timer = setTimeout(tick, backoff);
    };

    async function tick() {
      if (!alive) return;
      if (typeof document !== 'undefined' && document.hidden) return schedule();
      ctrl = new AbortController();
      busy = true;
      try {
        const res = await fetch(`/api/openf1/${path}`, { signal: ctrl.signal, headers: { accept: 'application/json' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as T;
        fails.current = 0;
        if (alive)
          setState((prev) => {
            const keep = keepNonEmpty && Array.isArray(json) && json.length === 0 && Array.isArray(prev.data) && prev.data.length > 0;
            return { data: keep ? prev.data : json, error: null, loading: false, updatedAt: Date.now() };
          });
      } catch (e) {
        if ((e as Error).name === 'AbortError') {
          busy = false;
          return;
        }
        fails.current++;
        if (alive) setState((prev) => ({ ...prev, error: (e as Error).message, loading: false }));
      } finally {
        busy = false;
      }
      schedule();
    }

    const onVisible = () => {
      if (!document.hidden && !busy) {
        clearTimeout(timer);
        tick();
      }
    };

    tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearTimeout(timer);
      ctrl?.abort();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [path, interval, enabled, keepNonEmpty]);

  return state;
}

/** Tick de reloj (para countdowns / estado en vivo). */
export function useNow(everyMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}
