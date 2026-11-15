'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildClassification } from '@/lib/derive';
import { computeTrackState, isFeedWorthy } from '@/lib/trackStatus';
import { useQualyData, useRaceData } from '@/lib/useDeltaData';
import { BoxesPanel } from './boxes/BoxesPanel';
import { CalendarioPanel } from './calendario/CalendarioPanel';
import { CarreraPanel } from './carrera/CarreraPanel';
import { ControlPanel } from './control/ControlPanel';
import { DriversProvider } from './DriversContext';
import { Footer } from './Footer';
import { Header, type LiveStatus } from './Header';
import { QualyPanel } from './qualy/QualyPanel';
import { isTabId, type TabId } from './Tabs';

export function Dashboard() {
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    setDemo(new URLSearchParams(window.location.search).get('demo') === '1');
  }, []);
  const data = useRaceData(demo);
  const qualy = useQualyData(data.now, data.session?.session_key);
  const [tab, setTab] = useState<TabId>('carrera');

  // Pestaña sincronizada con el hash (#control, #boxes…) para poder linkear.
  useEffect(() => {
    const read = () => {
      const h = window.location.hash.slice(1);
      if (isTabId(h)) setTab(h);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  const onTab = useCallback((t: TabId) => {
    setTab(t);
    history.replaceState(null, '', `#${t}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const events = useMemo(() => {
    const all = data.raceControl ?? [];
    // Demo: solo lo ocurrido hasta el instante que se está repitiendo.
    return data.demoAt != null ? all.filter((e) => !e.date || Date.parse(e.date) <= (data.demoAt as number)) : all;
  }, [data.raceControl, data.demoAt]);
  const track = useMemo(() => computeTrackState(events), [events]);
  const lastEvent = useMemo(() => [...events].reverse().find(isFeedWorthy) ?? null, [events]);

  const rows = useMemo(
    () => buildClassification(data.results, data.positions, data.intervals, data.live),
    [data.results, data.positions, data.intervals, data.live],
  );

  const s = data.session;
  const status: LiveStatus = data.loading
    ? 'loading'
    : !s
      ? 'error'
      : data.live && track !== 'CHEQUERED'
        ? 'live'
        : 'final';

  const lap = useMemo(() => {
    const maxResultLaps = Math.max(0, ...rows.map((r) => r.laps || 0));
    if (status === 'live') {
      const leader = rows.find((r) => r.pos === 1)?.n;
      const cur = (leader != null ? data.laps?.drivers[leader]?.lastLap : undefined) ?? data.laps?.maxLap ?? null;
      return { current: cur || null, total: null };
    }
    const total = maxResultLaps || data.laps?.maxLap || null;
    return { current: total, total };
  }, [rows, data.laps, status]);

  const rain = data.weather?.[data.weather.length - 1]?.rainfall;
  const location = s ? `${s.country_name} · ${s.session_name}${rain ? ' · 🌧 LLUVIA' : ''}` : data.loading ? 'cargando…' : 'sin conexión con OpenF1';

  const source =
    status === 'live'
      ? `FUENTE · OPENF1 EN VIVO${data.updatedAt ? ` · ${new Date(data.updatedAt).toLocaleTimeString('es-AR')}` : ''}`
      : status === 'final'
        ? 'FUENTE · OPENF1 · ÚLTIMA SESIÓN (FINAL)'
        : status === 'error'
          ? 'OPENF1 NO RESPONDE · REINTENTANDO'
          : 'CONECTANDO CON OPENF1…';

  return (
    <DriversProvider drivers={data.drivers}>
      <div className="mx-auto w-full max-w-app md:max-w-app-md lg:max-w-app-lg">
      <Header
        status={status}
        circuit={s?.circuit_short_name || s?.location || ''}
        location={location}
        lap={lap}
        track={track}
        lastEvent={lastEvent}
        tab={tab}
        onTab={onTab}
      />
      <main>
        {data.demo && (
          <div role="status" className="mx-3.5 mt-3 rounded border border-telemetry/40 bg-telemetry/10 px-3 py-2.5 font-mono text-[10px] leading-[1.6] text-telemetry">
            <b className="tracking-[1px]">MODO DEMO.</b> Repetición de la última sesión como si fuera en vivo (mismo
            circuito de datos que una carrera real){data.demoAt ? ` · ${new Date(data.demoAt).toLocaleTimeString('es-AR')}` : ''}.{' '}
            <a href="/" className="underline">Salir</a>
          </div>
        )}
        {data.liveLocked && (
          <div role="status" className="mx-3.5 mt-3 rounded border border-amber/40 bg-amber/10 px-3 py-2.5 font-mono text-[10px] leading-[1.6] text-amber">
            <b className="tracking-[1px]">SESIÓN EN VIVO SIN ACCESO A TIEMPO REAL.</b> OpenF1 reserva los datos en vivo a
            suscriptores; sin suscripción se ven completos desde 30 min después de que termina la sesión.
          </div>
        )}
        <section key={tab} className="animate-fade-up" role="tabpanel" aria-label={tab}>
          {tab === 'carrera' && <CarreraPanel data={data} rows={rows} />}
          {tab === 'qualy' && <QualyPanel q={qualy} />}
          {tab === 'control' && <ControlPanel events={events} />}
          {tab === 'boxes' && <BoxesPanel rows={rows} pits={data.pits} stints={data.stints} />}
          {tab === 'calendario' && <CalendarioPanel now={data.now} />}
        </section>
        <Footer source={source} />
      </main>
      </div>
    </DriversProvider>
  );
}
