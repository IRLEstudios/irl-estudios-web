// Helper compartido de autenticación.
// No usa ninguna librería de terceros: firma la cookie de sesión
// a mano con HMAC-SHA256 usando el módulo "crypto" incluido en Node.

const crypto = require('crypto');

const SESSION_DAYS = 7; // "recuérdame" — la sesión dura 7 días
const COOKIE_NAME = 'irl_admin_session';

function getSecret() {
  // Se usa la propia contraseña de admin como clave de firma.
  // Así no hace falta configurar una variable de entorno extra.
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error('Falta configurar la variable de entorno ADMIN_PASSWORD en Vercel.');
  }
  return secret;
}

function sign(value) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
}

// Crea el valor de la cookie de sesión: "expiryTimestamp.firma"
function createSessionCookieValue() {
  const expiry = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = String(expiry);
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function isSessionValid(cookieValue) {
  if (!cookieValue) return false;
  const [payload, signature] = cookieValue.split('.');
  if (!payload || !signature) return false;

  const expected = sign(payload);
  const validSignature =
    expected.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));

  if (!validSignature) return false;

  const expiry = Number(payload);
  return Number.isFinite(expiry) && Date.now() < expiry;
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    out[key] = decodeURIComponent(val);
  });
  return out;
}

function requireAuth(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const session = cookies[COOKIE_NAME];
  if (!isSessionValid(session)) {
    res.status(401).json({ error: 'No autenticado' });
    return false;
  }
  return true;
}

function setSessionCookie(res) {
  const value = createSessionCookieValue();
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
  );
}

module.exports = {
  COOKIE_NAME,
  requireAuth,
  setSessionCookie,
  clearSessionCookie,
  parseCookies,
  isSessionValid,
};
