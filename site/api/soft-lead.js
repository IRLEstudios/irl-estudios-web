const { put } = require('@vercel/blob');

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

  if (!body.nombre || !String(body.nombre).trim()) {
    res.status(400).json({ error: 'Falta el nombre' });
    return;
  }
  if (!body.email || !isValidEmail(body.email)) {
    res.status(400).json({ error: 'Email no válido' });
    return;
  }
  if (!body.curso || !String(body.curso).trim()) {
    res.status(400).json({ error: 'Falta el curso' });
    return;
  }

  const lead = {
    tipo: 'lead_suave',
    nombre: String(body.nombre).trim(),
    email: String(body.email).trim(),
    whatsapp: body.whatsapp ? String(body.whatsapp).trim() : '',
    curso: String(body.curso).trim(),
    origen: body.origen ? String(body.origen).trim() : '',
    fecha: new Date().toISOString(),
  };

  const safeEmail = lead.email.replace(/[^a-zA-Z0-9]/g, '_');
  const key = `leads/${Date.now()}-soft-${safeEmail}.json`;

  try {
    await put(key, JSON.stringify(lead, null, 2), {
      access: 'public',
      contentType: 'application/json',
      allowOverwrite: false,
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({
      error: 'No se pudo guardar el contacto.',
      detail: err && err.message,
    });
  }
};
