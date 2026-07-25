const { put } = require('@vercel/blob');
const crypto = require('crypto');

const REQUIRED_FIELDS = ['email', 'curso', 'horario', 'nombre', 'dni', 'autonomo'];
const META_PIXEL_ID = '1683598329599658';
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'IRL Estudios <inscripciones@irlestudios.com>';

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendConfirmationEmail(lead) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { skipped: 'no RESEND_API_KEY configured' };

  const nombre = escapeHtml(lead.nombre);
  const curso = escapeHtml(lead.curso);

  const text =
    `Hola ${lead.nombre},\n\n` +
    `La inscripción está completada, ¡nos vemos pronto en el curso ${lead.curso}!\n\n` +
    `Una vez cerremos los grupos te comunicaremos el horario que tendrá tu curso (siguiendo tus preferencias y ajustando lo que haga falta) y te daremos acceso al aula virtual de tu grupo.\n\n` +
    `Además te enviaremos la factura del curso y el pago podrás hacerlo mediante transferencia, bizum o pasarela de pago.\n\n` +
    `Muchas gracias,\n` +
    `cualquier duda seguimos en contacto a través de irlestudiosmadrid@gmail.com\n\n` +
    `Alex`;

  const html =
    `<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#232323;">` +
    `<p>Hola ${nombre},</p>` +
    `<p>La inscripción está completada, ¡nos vemos pronto en el curso <b>${curso}</b>!</p>` +
    `<p>Una vez cerremos los grupos te comunicaremos el horario que tendrá tu curso (siguiendo tus preferencias y ajustando lo que haga falta) y te daremos acceso al aula virtual de tu grupo.</p>` +
    `<p>Además te enviaremos la factura del curso y el pago podrás hacerlo mediante transferencia, bizum o pasarela de pago.</p>` +
    `<p>Muchas gracias,<br>cualquier duda seguimos en contacto a través de <a href="mailto:irlestudiosmadrid@gmail.com">irlestudiosmadrid@gmail.com</a></p>` +
    `<p>Alex</p>` +
    `</div>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [lead.email],
        subject: 'Inscripción confirmada — IRL Estudios',
        html,
        text,
      }),
    });
    const responseBody = await r.json().catch(() => null);
    if (!r.ok) console.error('Resend error response:', JSON.stringify(responseBody));
    return { status: r.status, body: responseBody };
  } catch (err) {
    console.error('Resend error:', err && err.message);
    return { error: err && err.message };
  }
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
  if (!token) return { skipped: 'no META_CAPI_TOKEN configured' };

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
    const r = await fetch(`https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const responseBody = await r.json().catch(() => null);
    if (!r.ok) console.error('Meta CAPI error response:', JSON.stringify(responseBody));
    return { status: r.status, body: responseBody };
  } catch (err) {
    console.error('Meta CAPI error:', err && err.message);
    return { error: err && err.message };
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
    tipo: 'lead_completo',
    email: String(body.email).trim(),
    curso: String(body.curso).trim(),
    horario: String(body.horario).trim(),
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
    const capiResult = body.marketing_consent
      ? await sendMetaLeadEvent(req, lead, body.test_event_code)
      : { skipped: 'no marketing consent' };
    const emailResult = await sendConfirmationEmail(lead);
    const response = { ok: true };
    if (body.test_event_code) {
      response.capi_debug = capiResult;
      response.email_debug = emailResult;
    }
    res.status(200).json(response);
  } catch (err) {
    res.status(500).json({
      error: 'No se pudo guardar la inscripción.',
      detail: err && err.message,
    });
  }
};
