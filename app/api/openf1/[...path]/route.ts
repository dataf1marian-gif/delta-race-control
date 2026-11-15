/**
 * Proxy DELTA → OpenF1.
 *
 *   GET /api/openf1/<endpoint>[/<view>]?session_key=latest&...
 *   GET /api/openf1/track?meeting_key=<n>          (trazado real por GPS)
 *
 * - Mismo path/query que OpenF1 (whitelist de endpoints y params).
 * - Normaliza la respuesta (lib/openf1/normalize.ts).
 * - Cache-Control: public, s-maxage=<TTL>, stale-while-revalidate=<TTL*3>
 *   → el CDN de Vercel colapsa el polling de todos los clientes en ~1 request
 *   a OpenF1 por ventana y por endpoint.
 * - Caché en memoria por isolate + coalescing de requests en vuelo.
 * - Back-off con jitter ante 429/5xx y "stale-on-error".
 * - Auth opcional para datos en vivo (ver lib/openf1/upstream.ts).
 */
import { ALLOWED_PARAMS, LIVE_WINDOW_S, OPENF1_BASE, TRACK_TTL, TRACK_TTL_MISS, TTL, VIEWS, isEndpoint } from '@/lib/openf1/endpoints';
import { normalizers, summarizeLaps, type NormalizedEndpoint } from '@/lib/openf1/normalize';
import { buildTrack } from '@/lib/openf1/track';
import type { Lap } from '@/lib/openf1/types';
import { UpstreamError, fetchUpstream, hasLiveCredentials } from '@/lib/openf1/upstream';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

type Entry = { body: string; expires: number };
const memo = new Map<string, Entry>();
const inflight = new Map<string, Promise<{ body: string; ttl: number }>>();
const MEMO_MAX = 200;

/**
 * Modo demo (?demo=1 en la página): `at` = instante histórico que se trata como "ahora"
 * para las ventanas de los streams en vivo. Solo pasado (>1h) y cuantizado a 5s.
 */
function parseAt(params: URLSearchParams): number | null {
  const at = Date.parse(params.get('at') || '');
  if (!Number.isFinite(at) || at > Date.now() - 3_600_000) return null;
  return Math.floor(at / 5000) * 5000;
}

function buildUpstream(endpoint: NormalizedEndpoint, params: URLSearchParams, windowFrom?: string, windowTo?: string) {
  const q: string[] = [];
  for (const k of ALLOWED_PARAMS) {
    const v = params.get(k);
    if (v != null && v !== '') q.push(`${k}=${encodeURIComponent(v)}`);
  }
  if (windowFrom) q.push(`date>=${windowFrom}`);
  if (windowTo) q.push(`date<=${windowTo}`);
  return `${OPENF1_BASE}/${endpoint}${q.length ? `?${q.join('&')}` : ''}`;
}

async function produce(endpoint: NormalizedEndpoint, view: string | undefined, params: URLSearchParams) {
  const ttl = TTL[endpoint];
  const win = LIVE_WINDOW_S[endpoint];
  let raw: unknown[];

  if (win != null) {
    const at = parseAt(params);
    const nowMs = at ?? Date.now();
    const from = win ? new Date(nowMs - win * 1000).toISOString().slice(0, 19) : undefined;
    const to = at != null ? new Date(at).toISOString().slice(0, 19) : undefined;
    raw = await fetchUpstream(buildUpstream(endpoint, params, from, to));
    // Si OpenF1 ignoró el filtro, igual recortamos acá.
    const inWindow = (r: unknown) => {
      const d = String((r as { date?: string }).date || '');
      return (!from || d >= from) && (!to || d.slice(0, 19) <= to);
    };
    raw = raw.filter(inWindow);
  } else {
    raw = await fetchUpstream(buildUpstream(endpoint, params));
  }

  const normalize = normalizers[endpoint] as (rows: Record<string, unknown>[]) => unknown[];
  const data = normalize(raw as Record<string, unknown>[]);
  if (endpoint === 'laps' && view === 'summary') return { body: JSON.stringify(summarizeLaps(data as Lap[])), ttl };
  return { body: JSON.stringify(data), ttl };
}

async function produceTrack(params: URLSearchParams) {
  const mk = params.get('meeting_key') || 'latest';
  const track = await buildTrack(mk);
  return { body: JSON.stringify(track), ttl: track ? TRACK_TTL : TRACK_TTL_MISS };
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

const cacheControl = (ttl: number) => `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 3}`;

export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  const [endpoint, view, ...rest] = params.path;
  const isTrack = endpoint === 'track' && !view && !rest.length;
  if (!isTrack && (!endpoint || !isEndpoint(endpoint) || rest.length || (view && !VIEWS[endpoint]?.includes(view)))) {
    return json(JSON.stringify({ error: 'endpoint no soportado' }), 404, 'public, s-maxage=3600');
  }

  const search = new URL(req.url).searchParams;
  const at = !isTrack && LIVE_WINDOW_S[endpoint as NormalizedEndpoint] != null ? parseAt(search) : null;
  const key = `${endpoint}/${view ?? ''}?${ALLOWED_PARAMS.map((k) => `${k}=${search.get(k) ?? ''}`).join('&')}&at=${at ?? ''}`;
  const baseTtl = isTrack ? TRACK_TTL : TTL[endpoint as NormalizedEndpoint];

  const hit = memo.get(key);
  if (hit && hit.expires > Date.now()) return json(hit.body, 200, cacheControl(baseTtl), { 'x-delta-cache': 'memory' });

  try {
    let p = inflight.get(key);
    if (!p) {
      p = (isTrack ? produceTrack(search) : produce(endpoint as NormalizedEndpoint, view, search)).finally(() =>
        inflight.delete(key),
      );
      inflight.set(key, p);
    }
    const { body, ttl } = await p;
    if (memo.size >= MEMO_MAX) memo.delete(memo.keys().next().value as string);
    memo.set(key, { body, expires: Date.now() + ttl * 1000 });
    return json(body, 200, cacheControl(ttl));
  } catch (err) {
    const status = err instanceof UpstreamError ? err.status : 502;
    if (hit) {
      // stale-on-error: mejor un dato de hace unos segundos que nada.
      return json(hit.body, 200, `public, s-maxage=${Math.min(baseTtl, 5)}`, { 'x-delta-stale': '1' });
    }
    if (status === 401 || status === 403) {
      // OpenF1 restringe los datos en vivo a suscriptores.
      return json(
        JSON.stringify({ error: 'live-auth', configured: hasLiveCredentials() }),
        401,
        'public, s-maxage=15',
      );
    }
    return json(JSON.stringify({ error: `upstream ${status}` }), status === 429 ? 429 : 502, 'public, s-maxage=3', {
      'retry-after': '5',
    });
  }
}
