import crypto from 'node:crypto';

const COOKIE = 'cana_admin_session';
const MAX_AGE = 12 * 60 * 60;

function secret() {
  return process.env.SESSION_SECRET || '';
}

function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

function parseCookies(request) {
  const header = request.headers.get('cookie') || '';
  return Object.fromEntries(header.split(';').map(part => part.trim()).filter(Boolean).map(part => {
    const i = part.indexOf('=');
    return i < 0 ? [part, ''] : [part.slice(0, i), decodeURIComponent(part.slice(i + 1))];
  }));
}

export function credentialsConfigured() {
  return Boolean(process.env.ADMIN_PHONE && process.env.ADMIN_PASSWORD && secret());
}

export function credentialsMatch(phone, password) {
  if (!credentialsConfigured()) return false;
  return String(phone || '').trim() === String(process.env.ADMIN_PHONE).trim() &&
    String(password || '') === String(process.env.ADMIN_PASSWORD);
}

export function createSessionCookie() {
  const issued = String(Date.now());
  const token = issued + '.' + sign(issued);
  return COOKIE + '=' + encodeURIComponent(token) + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + MAX_AGE;
}

export function clearSessionCookie() {
  return COOKIE + '=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
}

export function isAuthenticated(request) {
  if (!secret()) return false;
  const value = parseCookies(request)[COOKIE];
  if (!value) return false;
  const [issued, signature] = value.split('.');
  if (!issued || !signature || !/^\d+$/.test(issued)) return false;
  const age = Date.now() - Number(issued);
  if (age < 0 || age > MAX_AGE * 1000) return false;
  const expected = sign(issued);
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function requireAuth(request) {
  if (!isAuthenticated(request)) {
    return new Response(JSON.stringify({ error: 'Accès administrateur requis.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
  return null;
}
