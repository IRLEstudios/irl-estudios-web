const crypto = require('crypto');
const { setSessionCookie } = require('./_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    res.status(500).json({ error: 'ADMIN_PASSWORD no está configurada en Vercel.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const { password } = body || {};

  const provided = Buffer.from(String(password || ''));
  const expected = Buffer.from(adminPassword);

  const valid =
    provided.length === expected.length &&
    crypto.timingSafeEqual(provided, expected);

  if (!valid) {
    res.status(401).json({ error: 'Contraseña incorrecta' });
    return;
  }

  setSessionCookie(res);
  res.status(200).json({ ok: true });
};
