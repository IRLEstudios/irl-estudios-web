const { put } = require('@vercel/blob');

const REQUIRED_FIELDS = ['email', 'curso', 'nombre', 'dni', 'autonomo'];

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

  const lead = {
    email: String(body.email).trim(),
    curso: String(body.curso).trim(),
    nombre: String(body.nombre).trim(),
    dni: String(body.dni).trim(),
    autonomo: String(body.autonomo).trim(),
    comentarios: body.comentarios ? String(body.comentarios).trim() : '',
    origen: body.origen ? String(body.origen).trim() : '',
    fecha: new Date().toISOString(),
  };

  const safeEmail = lead.email.replace(/[^a-zA-Z0-9]/g, '_');
  const key = `leads/${Date.now()}-${safeEmail}.json`;

  await put(key, JSON.stringify(lead, null, 2), {
    access: 'public',
    contentType: 'application/json',
    allowOverwrite: false,
  });

  res.status(200).json({ ok: true });
};
