# DELTA · Race Control

Dashboard mobile-first **no oficial** de control de carrera en tiempo real. Datos vía [OpenF1](https://openf1.org).
Proyecto sin afiliación a la Fórmula 1 — ver `PROJECT_BRIEF.md` §3 (legal).

Next.js 14 (App Router) + TypeScript + Tailwind · GSAP · Chakra Petch + JetBrains Mono.

## Correr local

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # build de producción
npm run typecheck
```

## Deploy en Vercel

```bash
vercel login       # una vez
vercel             # preview
vercel --prod      # producción
```

Deploy automático: cada push a `main` del repo publica en producción.

### Datos en vivo (importante)

OpenF1 considera "en vivo" desde 30 min antes hasta 30 min después de cada sesión y **reserva esos
datos a la suscripción Sponsor**. Sin suscripción la app funciona con el histórico y, durante la sesión,
muestra un aviso. Para tiempo real: cargar `OPENF1_USERNAME` y `OPENF1_PASSWORD` en Vercel
(ver `.env.example`); el proxy canjea el token y lo renueva solo.

No hace falta base de datos ni crons: el CDN de Vercel es la capa de caché.

### Modo demo

`/?demo=1` repite la última sesión como si fuera en vivo (desde 20 min después de la largada),
usando el mismo camino de datos que una sesión real: GPS por ventanas, orden e intervalos en vivo.

## Arquitectura

```
Browser (polling 2–5s en vivo, 60–120s fuera de sesión)
   │  fetch /api/openf1/*   (mismo origen → sin CORS)
   ▼
app/api/openf1/[...path]/route.ts   (edge)
   │  whitelist de endpoints/params · normaliza · s-maxage por endpoint
   │  caché en memoria + coalescing · back-off con jitter en 429/5xx · stale-on-error
   ▼
api.openf1.org/v1
```

El CDN de Vercel colapsa el polling de todos los clientes en ~1 request a OpenF1 por ventana de TTL y endpoint.

| Ruta | TTL (s-maxage) | Normalización |
|---|---|---|
| `sessions`, `drivers` | 60 / 600 | campos recortados, `team_colour` con `#` |
| `session_result` | 10 | `gap_to_leader` tipado (número / `"+1 LAP"` / null), quali → `q: [Q1,Q2,Q3]` |
| `position` | 10 | **último registro por piloto** (historial completo, es chico) |
| `intervals` | 5 | último por piloto, ventana de 5 min |
| `location` | 6 | GPS de los últimos 15 s por auto `[t, x, y]` |
| `track` | 6 h | trazado real: GPS de la vuelta más rápida del meeting |
| `laps` · `laps/summary` | 15 | summary = vuelta rápida, speed trap, mejores sectores, microsectores por piloto |
| `race_control` | 6 | `type` (PENALTY/INVESTIGATION/FLAG/SC/VSC/RED/SESSION/INFO) + `served` |
| `stints`, `pit`, `weather` | 60 | compuestos tipados, `stop_duration` si existe, `rainfall` boolean |
| `meetings` | 3600 | — |

Los TTL están calculados para no pasar de ~52 req/min a OpenF1 en vivo (límite con suscripción: 60/min).

Todas usan `session_key=latest` (la sesión en curso o la última terminada → estado FINAL).
La pestaña Qualy busca la sesión `Qualifying` del meeting `latest` (`sessions?meeting_key=latest`).

## Estructura

```
app/
  api/openf1/[...path]/route.ts   proxy + caché
  layout.tsx, page.tsx, globals.css
components/
  Dashboard.tsx  Header.tsx  Tabs.tsx  Footer.tsx  DriversContext.tsx
  carrera/  qualy/  control/  boxes/  calendario/  ui/
lib/
  openf1/  types.ts  normalize.ts  endpoints.ts  upstream.ts (auth + reintentos)  track.ts (trazado GPS)
  trackGeo.ts     proyección GPS → SVG
  format.ts       lapTime, fmtGap, compass, segColor, TYRE…
  trackStatus.ts  clasificación de race_control + estado de pista
  derive.ts       clasificación en vivo, neumáticos, serie de clima
  calendar.ts     CAL2026 / CAL2027
  usePoll.ts  useDeltaData.ts
  theme.ts        paleta (fuente única para Tailwind y variables CSS)
```

`index.reference.html` es el prototipo original (referencia de UI/lógica).
