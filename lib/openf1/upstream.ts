/**
 * Cliente server-side de OpenF1: auth (opcional), timeout, reintentos con back-off.
 *
 * Datos EN VIVO (de 30 min antes a 30 min después de una sesión) requieren la
 * suscripción "Sponsor" de OpenF1. Configurar en Vercel → Environment Variables:
 *   OPENF1_USERNAME + OPENF1_PASSWORD   → se canjean por un token (dura 1h) y se renueva solo
 *   o OPENF1_TOKEN                      → token fijo (útil para pruebas)
 * Sin credenciales funciona igual con el histórico (gratis).
 */
import { OPENF1_TOKEN_URL } from './endpoints';

export class UpstreamError extends Error {
  constructor(public status: number) {
    super(`OpenF1 HTTP ${status}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let tokenCache: { token: string; expires: number } | null = null;
let tokenInflight: Promise<string | null> | null = null;

export const hasLiveCredentials = () =>
  !!process.env.OPENF1_TOKEN || !!(process.env.OPENF1_USERNAME && process.env.OPENF1_PASSWORD);

async function getToken(force = false): Promise<string | null> {
  if (process.env.OPENF1_TOKEN) return process.env.OPENF1_TOKEN;
  const user = process.env.OPENF1_USERNAME;
  const pass = process.env.OPENF1_PASSWORD;
  if (!user || !pass) return null;
  if (!force && tokenCache && tokenCache.expires > Date.now()) return tokenCache.token;
  if (tokenInflight) return tokenInflight;

  tokenInflight = (async () => {
    try {
      const res = await fetch(OPENF1_TOKEN_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: user, password: pass }).toString(),
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const j = (await res.json()) as { access_token?: string; expires_in?: string | number };
      if (!j.access_token) return null;
      const ttl = Number(j.expires_in) || 3600;
      // Renovar 5 min antes de que venza.
      tokenCache = { token: j.access_token, expires: Date.now() + Math.max(60, ttl - 300) * 1000 };
      return j.access_token;
    } catch {
      return null;
    } finally {
      tokenInflight = null;
    }
  })();
  return tokenInflight;
}

/** fetch a OpenF1 con timeout y reintentos (429/5xx) con back-off exponencial + jitter. */
export async function fetchUpstream(url: string): Promise<unknown[]> {
  let lastStatus = 502;
  let refreshed = false;

  for (let attempt = 0; attempt < 3; attempt++) {
    const headers: Record<string, string> = { accept: 'application/json' };
    const token = await getToken();
    if (token) headers.authorization = `Bearer ${token}`;

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
      if ((res.status === 401 || res.status === 403) && token && !refreshed && !process.env.OPENF1_TOKEN) {
        refreshed = true;
        await getToken(true);
        continue;
      }
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
