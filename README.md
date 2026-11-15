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

O conectar el repo de GitHub a Vercel (preset Next.js, automático). **No hay variables de entorno obligatorias.**
Opcional: `OPENF1_TOKEN` (ver `.env.example`) por si OpenF1 llegara a exigir auth para datos en vivo.

No hace falta base de datos ni crons: el CDN de Vercel es la capa de caché.

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
| `sessions`, `drivers` | 30 / 60 | campos recortados, `team_colour` con `#` |
| `session_result` | 3 | `gap_to_leader` tipado (número / `"+1 LAP"` / null), quali → `q: [Q1,Q2,Q3]` |
| `position`, `intervals` | 2 | **último registro por piloto**, ventana de 5 min |
| `laps` · `laps/summary` | 3 | summary = vuelta rápida, speed trap, mejores sectores, microsectores por piloto |
| `race_control` | 3 | `type` (PENALTY/INVESTIGATION/FLAG/SC/VSC/RED/SESSION) + `served` |
| `stints`, `pit`, `weather` | 10 | compuestos tipados, `stop_duration` si existe, `rainfall` boolean |
| `meetings` | 3600 | — |

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
  openf1/  types.ts  normalize.ts  endpoints.ts
  format.ts       lapTime, fmtGap, compass, segColor, TYRE…
  trackStatus.ts  clasificación de race_control + estado de pista
  derive.ts       clasificación en vivo, neumáticos, serie de clima
  calendar.ts     CAL2026 / CAL2027
  usePoll.ts  useDeltaData.ts
  theme.ts        paleta (fuente única para Tailwind y variables CSS)
```

`index.reference.html` es el prototipo original (referencia de UI/lógica).
