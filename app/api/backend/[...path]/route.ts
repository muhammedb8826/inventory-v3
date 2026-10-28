import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const accessName = 'inventory_access';
const refreshName = 'inventory_refresh';
const upstream = () => (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1').replace(/\/$/, '');

type Tokens = { accessToken?: string; refreshToken?: string; user?: unknown };
function setSession(response: NextResponse, tokens: Tokens) {
  const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/' };
  for (const [name, token] of ([[accessName, tokens.accessToken], [refreshName, tokens.refreshToken]] as const)) {
    if (!token) continue;
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) as { exp: number };
    response.cookies.set(name, token, { ...options, expires: new Date(payload.exp * 1000) });
  }
}
function clearSession(response: NextResponse) {
  response.cookies.delete(accessName);
  response.cookies.delete(refreshName);
}

// Single-flight within this server; refresh rotation itself is serialized by PostgreSQL.
const refreshing = new Map<string, Promise<Tokens | null>>();
async function refresh(token: string): Promise<Tokens | null> {
  let pending = refreshing.get(token);
  if (!pending) {
    pending = fetch(`${upstream()}/auth/refresh`, { method: 'POST', cache: 'no-store',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken: token }),
      signal: AbortSignal.timeout(15000) }).then(async r => r.ok ? await r.json() as Tokens : null);
    refreshing.set(token, pending);
    void pending.finally(() => { const timer = setTimeout(() => refreshing.delete(token), 5000); timer.unref(); }).catch(() => undefined);
  }
  return pending;
}

async function boundedBody(request: NextRequest): Promise<ArrayBuffer | null> {
  const max = 12 * 1024 * 1024;
  if (Number(request.headers.get('content-length') ?? 0) > max) return null;
  const reader = request.body?.getReader();
  if (!reader) return new ArrayBuffer(0);
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.length;
    if (size > max) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const body = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
  return body.buffer;
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (path.some(p => p === '.' || p === '..' || /[\\/?#]/.test(p))) return NextResponse.json({ message: 'Invalid path' }, { status: 400 });
  if (!['GET', 'HEAD'].includes(request.method)) {
    const origin = request.headers.get('origin');
    if (!origin || origin !== request.nextUrl.origin || request.headers.get('sec-fetch-site') === 'cross-site') {
      return NextResponse.json({ message: 'Invalid request origin' }, { status: 403 });
    }
  }
  const route = path.join('/');
  if (route === 'auth/refresh') return NextResponse.json({ message: 'Session refresh is managed by the server' }, { status: 404 });
  const headers = new Headers();
  for (const name of ['content-type', 'idempotency-key', 'accept', 'x-request-id']) {
    const value = request.headers.get(name); if (value) headers.set(name, value);
  }
  let access = request.cookies.get(accessName)?.value;
  const refreshToken = request.cookies.get(refreshName)?.value;
  let tokens: Tokens | null = null;
  const received = ['GET', 'HEAD'].includes(request.method) ? undefined : await boundedBody(request);
  if (received === null) return NextResponse.json({ message: 'Upload exceeds the 12 MB request limit' }, { status: 413 });
  let body: ArrayBuffer | string | undefined = received;
  if (route === 'auth/logout') { headers.set('content-type', 'application/json'); body = JSON.stringify({ refreshToken: refreshToken ?? '' }); }
  try {
    if (!access && refreshToken && route !== 'auth/logout') { tokens = await refresh(refreshToken); access = tokens?.accessToken; }
    const send = () => {
      if (access) headers.set('authorization', `Bearer ${access}`);
      return fetch(`${upstream()}/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`, {
        method: request.method, headers, body, cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(60000),
      });
    };
    let result = await send();
    if (result.status === 401 && refreshToken && !route.startsWith('auth/')) {
      tokens = await refresh(refreshToken);
      if (tokens?.accessToken) { access = tokens.accessToken; result = await send(); }
    }
    const responseHeaders = new Headers({ 'cache-control': 'no-store' });
    for (const name of ['content-type', 'content-disposition', 'x-request-id', 'retry-after']) {
      const value = result.headers.get(name); if (value) responseHeaders.set(name, value);
    }
    let response: NextResponse;
    if (route === 'auth/login' && result.ok) {
      tokens = await result.json() as Tokens;
      response = NextResponse.json({ user: tokens.user }, { status: result.status, headers: responseHeaders });
    } else {
      response = new NextResponse(result.status === 204 || request.method === 'HEAD' ? null : result.body, { status: result.status, headers: responseHeaders });
    }
    if (tokens) setSession(response, tokens);
    if (route === 'auth/logout' || result.status === 401) clearSession(response);
    return response;
  } catch {
    const response = NextResponse.json({ message: 'Service temporarily unavailable. Check the record before retrying a transaction.' }, { status: 502 });
    if (route === 'auth/logout') clearSession(response);
    return response;
  }
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as PUT, proxy as DELETE, proxy as HEAD };
