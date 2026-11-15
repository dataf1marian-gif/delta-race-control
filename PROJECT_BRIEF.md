# DELTA · Race Control — Brief de construcción

Documento maestro para construir el proyecto en **Vercel**. Pensado para que Claude Code lo lea y lo implemente de punta a punta.
Junto a este archivo está `index.reference.html`: el **prototipo funcional** (vanilla HTML/JS) con la UI, la lógica y datos reales embebidos del GP de Brasil 2026. Es la referencia visual y de comportamiento — hay que portarlo al stack de abajo y reemplazar los datos embebidos por datos en vivo vía backend propio.

---

## 1. Qué es

Dashboard web mobile-first de **control de carrera de F1 en tiempo real**, estilo transmisión/HUD. Toma datos de la API pública **OpenF1**. Secciones: Carrera (mapa + clasificación + clima + precipitación), Qualy (posiciones Q1/Q2/Q3 + sectores/microsectores), Control de carrera (banderas, SC/VSC, penalizaciones), Boxes (pit stops + neumáticos), Calendario (2026 real + 2027 oficial). Barra de estado de pista fija arriba (banderas/SC/VSC/roja en vivo).

Nombre y branding propios: **DELTA** (renombrado desde APEX). Ver sección 3 (legal) — es obligatorio.

---

## 2. Objetivo de esta construcción

Pasar el prototipo (un solo HTML con snapshot embebido + fallback) a un proyecto desplegable en Vercel que consuma **datos en vivo** sin romper los límites de OpenF1 ni chocar con CORS. La clave es meter un **backend serverless propio** entre el browser y OpenF1.

---

## 3. Restricciones legales y de atribución (NO NEGOCIABLE)

- **Marcas:** prohibido usar "F1", "FORMULA 1", "GRAND PRIX", logos, o logos/nombres de equipos como *branding*. Son marcas de Formula One Licensing BV. Usar colores de equipo solo como indicador de dato está bien; branding propio "DELTA".
- **Atribución:** mostrar siempre "Datos vía OpenF1 (openf1.org) · proyecto no oficial, sin afiliación a la Fórmula 1".
- **Datos de fondo:** el timing/telemetría son propiedad de F1/FOM (distribuidor oficial Sportradar). OpenF1 ser gratis NO otorga derechos comerciales. Para uso personal/portfolio: OK. Para comercializar: sacar toda marca, mover el histórico a una fuente con licencia (p. ej. Jolpica tier comercial, F1DB CC-BY, RaceData CC0) y para dato en vivo evaluar licencia oficial. Consultar abogado antes de monetizar.
- Mantener un disclaimer visible en el footer.

---

## 4. Stack recomendado

**Primario: Next.js 14 (App Router) + TypeScript + Tailwind CSS**, desplegado en Vercel.
- Razón: es lo más Vercel-native, las API routes serverless y el caché de CDN salen gratis, y Claude Code lo construye fluido.
- **Alternativa (si preferís Vue, que es tu stack):** Vite + Vue 3 + funciones serverless en `/api` sobre Vercel. La arquitectura y la capa de datos son idénticas; solo cambia el framework de UI.

Librerías del prototipo a conservar: **GSAP** (animaciones de entrada/transición). Tipografías **Chakra Petch** (display/HUD) + **JetBrains Mono** (datos). Canvas 2D para la traza de precipitación y el mapa esquemático.

---

## 5. Arquitectura

```
Browser (Next.js app, polling cada 2–5s)
        │   fetch a TU propio origen (/api/*)
        ▼
Vercel Serverless/Edge Functions  (/api/openf1/*)
        │   - fetch a OpenF1
        │   - normaliza la respuesta
        │   - setea Cache-Control: s-maxage  →  el CDN de Vercel colapsa
        │     TODO el polling de todos los clientes en ~1 request por ventana
        ▼
OpenF1 REST API (api.openf1.org/v1)
```

**Por qué el backend propio es obligatorio:**
1. **CORS/sandbox:** desde un origen propio no hay drama (el prototipo en el sandbox de artifacts no podía hacer fetch externo; tu dominio sí).
2. **Rate limit:** OpenF1 pide ser razonable (~3 req/s, ~30/min, back-off en HTTP 429). Si 100 usuarios pollean directo, te funden. Con `Cache-Control: public, s-maxage=3, stale-while-revalidate=10` en tus API routes, el **CDN de Vercel sirve a todos desde caché y pega a OpenF1 ~1 vez cada 3s por endpoint**, sin importar cuántos clientes haya. Esto resuelve el rate limit de raíz.
3. **Normalización:** mapeás los campos una sola vez (gaps, compuestos, códigos de bandera) y el front queda limpio.

**Patrón `session_key=latest`:** casi todos los endpoints aceptan `session_key=latest`, que apunta solo a la sesión activa o última. Usalo para que el dashboard siga la sesión en curso sin hardcodear.

---

## 6. Capa de datos — OpenF1 (`https://api.openf1.org/v1`)

Sin auth para histórico y REST en vivo (el streaming MQTT en tiempo real sí requiere cuenta paga; no lo necesitás). Endpoints usados y TTL de caché sugerido:

| Endpoint | Para qué | Campos clave | `s-maxage` |
|---|---|---|---|
| `/sessions?session_key=latest` | Meta de sesión | `session_name, session_type, circuit_short_name, country_name, date_start, date_end, meeting_key` | 30s |
| `/drivers?session_key=latest` | Pilotos | `driver_number, name_acronym, full_name, team_name, team_colour` (hex sin #) | 60s |
| `/session_result?session_key=latest` | Clasificación | `position, driver_number, gap_to_leader` (número, `0`, o string `"+1 LAP"`, o null), `dnf, dsq, dns, number_of_laps, points`. **En quali:** `duration` es un array `[Q1,Q2,Q3]` | 3s en vivo |
| `/position?session_key=latest` | Orden en vivo | `date, driver_number, position` (último por piloto) | 2s |
| `/intervals?session_key=latest` | Gaps en vivo | `gap_to_leader, interval` | 2s |
| `/laps?session_key=latest` | Vueltas, sectores, speed trap | `lap_duration, duration_sector_1/2/3, i1_speed, i2_speed, st_speed, segments_sector_1/2/3, lap_number, is_pit_out_lap` | 3s |
| `/stints?session_key=latest` | Neumáticos | `compound, stint_number, tyre_age_at_start, lap_start, lap_end` | 10s |
| `/pit?session_key=latest` | Pit stops | `pit_duration` (= **tiempo total en pit lane**, no el estacionario), `lap_number` | 10s |
| `/race_control?session_key=latest` | Banderas/penas | `category` (Flag/SessionStatus/Other/Drs...), `flag` (GREEN/YELLOW/DOUBLE YELLOW/RED/CHEQUERED/BLUE/BLACK AND WHITE), `scope, sector, message, driver_number, lap_number` | 3s |
| `/weather?session_key=latest` | Clima | `air_temperature, track_temperature, humidity, wind_speed, wind_direction, pressure, rainfall` (0/1) | 10s |
| `/meetings?year=2026` | Calendario | `meeting_official_name, country_name, location, circuit_short_name, date_start, meeting_key` | 1h |
| `/car_data?...` | Telemetría (DRS, velocidad) | `rpm, speed, n_gear, throttle, brake, drs`, ~3.7Hz/auto | — (pesado, ver roadmap) |

### Notas de datos importantes (ya verificadas — no re-descubrir)

- **Vuelta rápida / speed trap:** calcular client/backend desde `/laps` (min `lap_duration` / max `st_speed`). OpenF1 **ignora filtros numéricos** tipo `lap_duration<74` (devuelve todo); hay que traer todas las vueltas y agregar.
- **Microsectores (colores en vivo):** `segments_sector_1/2/3` son arrays de códigos. Mapa de color:
  - `2051` = púrpura (mejor de todos)
  - `2049` / `2050` = verde (mejor personal)
  - `2048` = amarillo (normal/más lento)
  - `2064` = pit lane
  - `0` / otros = sin dato
- **Coloreo de tiempos (púrpura/verde/amarillo):** púrpura = mejor tiempo de la sesión en ese sector/vuelta; verde = mejor personal del piloto; amarillo = más lento que su personal.
- **Pit stops:** `pit_duration` es el **tiempo en pit lane** (entrada→salida, ~20-25s), NO los ~2-3s estacionado cambiando gomas. El tiempo estacionario lo publican FIA/Formula1.com aparte por carrera; si se quiere, hay que sumar esa fuente (no está en OpenF1).
- **Juegos de neumáticos "restantes":** OpenF1 no expone la asignación FIA. Lo real derivable es **juegos nuevos usados** = contar stints con `tyre_age_at_start === 0` por compuesto. "Restante" solo se puede estimar sobre la asignación estándar (13 slick + 4 inter + 3 wet).
- **Quali — tiempo restante por segmento (Q1/Q2/Q3):** OpenF1 **no** expone el reloj por segmento. Se puede mostrar el countdown de la sesión completa (`date_end - now`) y el segmento activo según los tiempos que entran, pero no "faltan 2:45 para Q2".
- **Zonas de eliminación en quali:** Q3 = top 10 (tienen q3), Q2 = 11-15 (q2 pero no q3), Q1 = 16-22 (solo q1). La pole se define por el tiempo de Q3, no por el mejor de la sesión.
- **gap_to_leader** puede venir como número, `0` (líder), string `"+1 LAP"`/`"+2 LAPS"` (doblados) o null (DNF/DNS). Manejar los tres casos.

---

## 7. Estrategia de polling y caché

- El front pollea tus `/api/*` cada 2–5s (más rápido para posiciones/control, más lento para clima/stints).
- Cada API route setea `Cache-Control: public, s-maxage=<TTL>, stale-while-revalidate=<TTL*3>`.
- El CDN de Vercel coalesce: 1 request real a OpenF1 por ventana por endpoint, sin importar la cantidad de usuarios.
- Back-off ante 429 en el fetch a OpenF1 (reintento con jitter) y servir `stale-while-revalidate`.
- Fuera de sesión en vivo, `latest` devuelve la última sesión terminada (estado FINAL): el dashboard funciona igual mostrando lo último.

Ejemplo de route handler (Next.js App Router, `app/api/openf1/[...path]/route.ts`), proxy genérico con caché:

```ts
export const runtime = 'edge';

const BASE = 'https://api.openf1.org/v1';
// TTL por endpoint (segundos)
const TTL: Record<string, number> = {
  position: 2, intervals: 2, laps: 3, session_result: 3, race_control: 3,
  sessions: 30, drivers: 60, stints: 10, pit: 10, weather: 10, meetings: 3600,
};

export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  const endpoint = params.path[0];
  const qs = new URL(req.url).search;
  const upstream = `${BASE}/${params.path.join('/')}${qs}`;
  const res = await fetch(upstream, { headers: { accept: 'application/json' } });
  if (!res.ok) return new Response(JSON.stringify({ error: res.status }), { status: res.status });
  const data = await res.text();
  const ttl = TTL[endpoint] ?? 5;
  return new Response(data, {
    headers: {
      'content-type': 'application/json',
      'cache-control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 3}`,
    },
  });
}
```

El front llama `/api/openf1/session_result?session_key=latest`, etc. (mismo path que OpenF1, mismo query).

---

## 8. Funcionalidades a portar (del prototipo)

Barra de estado de pista **fija arriba** (siempre visible): PISTA LIBRE / BANDERA AMARILLA / DOBLE AMARILLA / SAFETY CAR / VSC / BANDERA ROJA / A CUADROS, con color y parpadeo según `race_control`. Muestra el último evento; tocándola va a Control.

Menú de pestañas **sticky** (dentro del header fijo):

1. **CARRERA** — tiles de vuelta rápida + speed trap (de carrera); mapa esquemático del circuito con autos espaciados por gaps reales (en vivo: GPS real del endpoint `location`); clasificación (torre con posición, color de equipo, neumático final, gap, puntos, ★ vuelta rápida); condiciones (temp aire, temp pista, humedad, viento+dirección, presión, lluvia); **gráfico de precipitación** (serie real de clima: temp pista + humedad + bandas de lluvia, eje X en hora local, referencias de rango y valores).
2. **QUALY** — barra con pole; posiciones con Q1/Q2/Q3 y borde por zona de eliminación (verde Q3 / ámbar Q2 / rojo Q1); tabla de sectores + microsectores con coloreo púrpura/verde/amarillo.
3. **CONTROL** — feed de control de carrera con color por tipo (penalización, investigación, bandera, SC/VSC/roja, sesión); penas cumplidas en verde; más nuevo arriba.
4. **BOXES** — pit stops (cantidad + tiempo en pit lane por parada, lentas en rojo); neumáticos (juegos nuevos usados por compuesto + estimación de restantes).
5. **CALENDARIO** — subtoggle 2026 (real OpenF1, con la carrera actual marcada) / 2027 (oficial, con badges de sprint).

Paleta/estética: carbón oscuro, rojo "broadcast" (#ff1e3c), cian telemetría (#13f1cf), violeta vuelta rápida (#b14bff); overlay de scanlines sutil; colores de compuesto (soft rojo, medium amarillo, hard blanco, inter verde, wet azul). Respetar `prefers-reduced-motion`. Mobile-first (max-width ~520px centrado).

---

## 9. Estructura sugerida (Next.js)

```
/app
  /api/openf1/[...path]/route.ts   # proxy + caché
  /page.tsx                        # shell del dashboard
  /components/                     # Header, TrackStatus, Tabs, Carrera, Qualy, Control, Boxes, Calendario
  /lib/openf1.ts                   # cliente fetch a /api/openf1 + normalizadores
  /lib/format.ts                   # lapTime, fmtGap, compass, segColor, compound colors
  /lib/calendar.ts                 # CAL2026 / CAL2027 (datos estáticos)
/public
/tailwind.config.ts
/package.json
```

Portar los datos estáticos del prototipo (calendarios 2026/2027) a `lib/calendar.ts`. Portar helpers (`lapTime`, `fmtGap`, `compass`, `segColor`, coloreo de sectores, estados de bandera) a `lib/format.ts`.

---

## 10. Deploy en Vercel

1. `vercel` (o conectar el repo de GitHub a Vercel). Sin variables de entorno obligatorias (OpenF1 es pública).
2. Framework preset: Next.js (auto).
3. Edge runtime en las API routes para menor latencia del caché.
4. (Opcional) Vercel KV / Edge Config si se quiere un caché compartido entre regiones además del CDN.

---

## 11. Correr local

```
npm install
npm run dev     # http://localhost:3000
```

---

## 12. Roadmap / próximos pasos (no bloqueantes)

- **Mapa con GPS real:** usar `/location` (x,y,z por auto) para dibujar el trazado real (una vuelta de un auto traza el circuito) y posiciones exactas. Es dato pesado → traer por backend con caché corto y downsampling.
- **DRS por auto:** `/car_data` campo `drs` (abierto/cerrado). Stream pesado (~3.7Hz/auto) → backend con caché y solo el/los autos visibles.
- **Quali en vivo:** enganchar la sesión de Qualifying del meeting actual (`/sessions?meeting_key=X` → encontrar `session_type` Qualifying → su `session_result` + `laps`).
- **Radar de precipitación espacial (mapa de nubes):** NO está en OpenF1 y necesita un servicio externo (RainViewer, Windy). Superponer tiles sobre el circuito desde el backend. Lo que ya hay es la evolución real medida en pista.
- **Tiempo estacionario de pit:** sumar la tabla de pit stops de FIA/Formula1.com (por carrera) si se quiere el ~2-3s real.

---

## 13. Referencia

`index.reference.html` — prototipo completo y funcional con la UI, la lógica (fetch en vivo con fallback a snapshot) y datos reales embebidos del GP de Brasil 2026 (Interlagos). Úsalo como fuente de verdad para la UI, los colores, el layout y la lógica de normalización. Al portar, reemplazar los objetos `EMBEDDED` / `QUALI` / series por llamadas a `/api/openf1/*`.
