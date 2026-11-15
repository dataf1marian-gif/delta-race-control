/**
 * Proxy DELTA → OpenF1.
 *
 *   GET /api/openf1/<endpoint>[/<view>]?session_key=latest&...
 *
 * - Mismo path/query que OpenF1 (whitelist de endpoints y params).
 * - Normaliza la respuesta (lib/openf1/normalize.ts).
 * - Cache-Control: public, s-maxage=<TTL>, stale-while-revalidate=<TTL*3>
 *   → el CDN de Vercel colapsa el polling de todos los clientes en ~1 request
 *   a OpenF1 por ventana y por endpoint.
 * - Caché en memoria por isolate + coalescing de requests en vuelo.
 * - Back-off con jitter ante 429/5xx y "stale-on-error".
 */
import { ALLOWED_PARAMS, LIVE_WINDOW_S, OPENF1_BASE, TTL, VIEWS, isEndpoint } from '@/lib/openf1/endpoints';
import { normalizers, summarizeLaps, type NormalizedEndpoint } from '@/lib/openf1/normalize';
import type { Lap } from '@/lib/openf1/types';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

type Entry = { body: string; expires: number };
const memo = new Map<string, Entry>();
const inflight = new Map<string, Promise<string>>();
const MEMO_MAX = 200;

class UpstreamError extends Error {
  constructor(public status: number) {
    super(`OpenF1 HTTP ${status}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch a OpenF1 con timeout y reintentos (429/5xx) con back-off exponencial + jitter. */
async function fetchUpstream(url: string): Promise<unknown[]> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (process.env.OPENF1_TOKEN) headers.authorization = `Bearer ${process.env.OPENF1_TOKEN}`;

  let lastStatus = 502;
  for (let attempt = 0; attempt < 3; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(url, { headers, signal: ctrl.signal, cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      }
      // OpenF1 responde 404 "No results found" cuando no hay filas.
      if (res.status === 404) return [];
      lastStatus = res.status;
      if (res.status !== 429 && res.status < 500) throw new UpstreamError(res.status);
      const retryAfter = Number(res.headers.get('retry-after'));
      const backoff = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 350 * 2 ** attempt;
      await sleep(Math.min(2500, backoff) + Math.random() * 250);
    } catch (err) {
      if (err instanceof UpstreamError) throw err;
      lastStatus = 504; // timeout / red
      await sleep(250 * 2 ** attempt + Math.random() * 200);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new UpstreamError(lastStatus);
}

function buildUpstream(endpoint: NormalizedEndpoint, params: URLSearchParams, windowFrom?: string) {
  const q: string[] = [];
  for (const k of ALLOWED_PARAMS) {
    const v = params.get(k);
    if (v != null && v !== '') q.push(`${k}=${encodeURIComponent(v)}`);
  }
  if (windowFrom) q.push(`date>=${windowFrom}`);
  return `${OPENF1_BASE}/${endpoint}${q.length ? `?${q.join('&')}` : ''}`;
}

async function produce(endpoint: NormalizedEndpoint, view: string | undefined, params: URLSearchParams): Promise<string> {
  const win = LIVE_WINDOW_S[endpoint];
  let raw: unknown[];

  if (win) {
    const from = new Date(Date.now() - win * 1000).toISOString().slice(0, 19);
    raw = await fetchUpstream(buildUpstream(endpoint, params, from));
    // Si OpenF1 ignoró el filtro, igual recortamos acá.
    raw = raw.filter((r) => String((r as { date?: string }).date || '') >= from);
    // position solo emite en cambios: sin cambios recientes, traer todo para tener el orden.
    if (!raw.length && endpoint === 'position') raw = await fetchUpstream(buildUpstream(endpoint, params));
  } else {
    raw = await fetchUpstream(buildUpstream(endpoint, params));
  }

  const normalize = normalizers[endpoint] as (rows: Record<string, unknown>[]) => unknown[];
  const data = normalize(raw as Record<string, unknown>[]);
  if (endpoint === 'laps' && view === 'summary') return JSON.stringify(summarizeLaps(data as Lap[]));
  return JSON.stringify(data);
}

function json(body: string, status: number, cacheControl: string, extra: Record<string, string> = {}) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheControl,
      'cdn-cache-control': cacheControl,
      'x-delta-source': 'openf1.org',
      ...extra,
    },
  });
}

export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  const [endpoint, view, ...rest] = params.path;
  if (!endpoint || !isEndpoint(endpoint) || rest.length || (view && !VIEWS[endpoint]?.includes(view))) {
    return json(JSON.stringify({ error: 'endpoint no soportado' }), 404, 'public, s-maxage=3600');
  }

  const search = new URL(req.url).searchParams;
  const ttl = TTL[endpoint];
  const cc = `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 3}`;
  const key = `${endpoint}/${view ?? ''}?${ALLOWED_PARAMS.map((k) => `${k}=${search.get(k) ?? ''}`).join('&')}`;

  const hit = memo.get(key);
  if (hit && hit.expires > Date.now()) return json(hit.body, 200, cc, { 'x-delta-cache': 'memory' });

  try {
    let p = inflight.get(key);
    if (!p) {
      p = produce(endpoint, view, search).finally(() => inflight.delete(key));
      inflight.set(key, p);
    }
    const body = await p;
    if (memo.size >= MEMO_MAX) memo.delete(memo.keys().next().value as string);
    memo.set(key, { body, expires: Date.now() + ttl * 1000 });
    return json(body, 200, cc);
  } catch (err) {
    const status = err instanceof UpstreamError ? err.status : 502;
    if (hit) {
      // stale-on-error: mejor un dato de hace unos segundos que nada.
      return json(hit.body, 200, `public, s-maxage=${Math.min(ttl, 2)}`, { 'x-delta-stale': '1' });
    }
    return json(JSON.stringify({ error: `upstream ${status}` }), status === 429 ? 429 : 502, 'public, s-maxage=2', {
      'retry-after': '3',
    });
  }
}
