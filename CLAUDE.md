# CLAUDE.md — DELTA (Race Control)

Dashboard mobile-first de control de carrera de F1 en tiempo real, datos de **OpenF1**, desplegable en **Vercel**.

**Antes de construir, leé `PROJECT_BRIEF.md`** (spec completo) y `index.reference.html` (prototipo funcional = fuente de verdad de UI/lógica).

## Reglas duras
- **Stack:** Next.js 14 (App Router) + TypeScript + Tailwind. (Alt: Vite + Vue 3 si el usuario prefiere.) Conservar GSAP, fuentes Chakra Petch + JetBrains Mono.
- **Arquitectura obligatoria:** el browser NO pega directo a OpenF1. Va a API routes propias (`/api/openf1/*`) que proxean + normalizan + cachean con `Cache-Control: public, s-maxage=<TTL>, stale-while-revalidate`. El CDN de Vercel colapsa el polling de todos los clientes en ~1 request por ventana → resuelve CORS y el rate limit de OpenF1 (~3 req/s, back-off en 429).
- **Legal:** branding propio "DELTA" (antes "APEX"). PROHIBIDO usar marcas/logos de F1 o equipos como branding. Atribución a OpenF1 + disclaimer "no oficial" siempre visible.
- Usar `session_key=latest` para seguir la sesión en curso. Fuera de sesión muestra la última (estado FINAL).

## Features (ver brief para detalle)
Barra de estado de pista fija (banderas/SC/VSC/roja) + menú sticky con: **Carrera** (mapa, clasificación, clima, precipitación), **Qualy** (Q1/Q2/Q3 + sectores/microsectores púrpura-verde-amarillo), **Control** (feed de race_control), **Boxes** (pits + neumáticos), **Calendario** (2026 real + 2027 oficial).

## Gotchas de datos (ya resueltos, ver brief sección 6)
- Vuelta rápida / speed trap se calculan agregando `/laps` (OpenF1 ignora filtros numéricos).
- Microsectores: códigos `segments_sector_X` → 2051 púrpura, 2049/2050 verde, 2048 amarillo, 2064 pit.
- `pit_duration` = tiempo en pit lane, NO el estacionario (~2-3s no está en OpenF1).
- Juegos de neumáticos "restantes" no existe en OpenF1 → derivar "nuevos usados" (`tyre_age_at_start===0`).
- `gap_to_leader` puede ser número, 0, string "+1 LAP", o null → manejar los 3 casos.
- Quali: sin reloj por segmento Q1/Q2/Q3 en la API; zonas: Q3=top10, Q2=11-15, Q1=16-22.
