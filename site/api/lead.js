const { put } = require('@vercel/blob');
const crypto = require('crypto');

const REQUIRED_FIELDS = ['email', 'curso', 'nombre', 'dni', 'autonomo'];
const META_PIXEL_ID = '1683598329599658';

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function getCookie(cookieHeader, name) {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

async function sendMetaLeadEvent(req, lead, testEventCode) {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) return;

  const cookieHeader = req.headers.cookie;
  const userData = {
    em: [sha256(lead.email)],
    client_ip_address: (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || undefined,
    client_user_agent: req.headers['user-agent'],
    fbp: getCookie(cookieHeader, '_fbp'),
    fbc: getCookie(cookieHeader, '_fbc'),
  };

  const payload = {
    data: [{
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: req.headers.referer || 'https://irlestudios.com/inscripcion.html',
      user_data: userData,
      custom_data: { content_name: lead.curso },
    }],
    access_token: token,
  };
  if (testEventCode) payload.test_event_code = testEventCode;

  try {
    await fetch(`https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Meta CAPI error:', err && err.message);
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  for (const field of REQUIRED_FIELDS) {
    if (!body[field] || String(body[field]).trim() === '') {
      res.status(400).json({ error: `Falta el campo obligatorio: ${field}` });
      return;
    }
  }

  if (!isValidEmail(body.email)) {
    res.status(400).json({ error: 'Email no válido' });
    return;
  }

  const esAutonomo = String(body.autonomo).trim().toLowerCase() === 'si';
  if (esAutonomo && (!body.direccion_fiscal || String(body.direccion_fiscal).trim() === '')) {
    res.status(400).json({ error: 'Falta la dirección fiscal' });
    return;
  }

  const lead = {
    email: String(body.email).trim(),
    curso: String(body.curso).trim(),
    nombre: String(body.nombre).trim(),
    dni: String(body.dni).trim(),
    autonomo: String(body.autonomo).trim(),
    direccion_fiscal: esAutonomo ? String(body.direccion_fiscal).trim() : '',
    comentarios: body.comentarios ? String(body.comentarios).trim() : '',
    origen: body.origen ? String(body.origen).trim() : '',
    fecha: new Date().toISOString(),
  };

  const safeEmail = lead.email.replace(/[^a-zA-Z0-9]/g, '_');
  const key = `leads/${Date.now()}-${safeEmail}.json`;

  try {
    await put(key, JSON.stringify(lead, null, 2), {
      access: 'public',
      contentType: 'application/json',
      allowOverwrite: false,
    });
    await sendMetaLeadEvent(req, lead, body.test_event_code);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({
      error: 'No se pudo guardar la inscripción.',
      detail: err && err.message,
    });
  }
};
