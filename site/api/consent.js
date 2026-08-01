const { put, list } = require('@vercel/blob');
const { requireAuth } = require('./_auth');

// Registro propio de elecciones de cookies (aceptar/rechazar), guardado
// como un blob por elección bajo consent/. No sustituye a Google
// Analytics: es solo un contador sencillo para ver en /admin cuánta
// gente acepta frente a rechaza, ya que no tenemos acceso a GA4.
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};

    const choice = body.choice === 'granted' ? 'granted' : (body.choice === 'denied' ? 'denied' : null);
    if (!choice) {
      res.status(400).json({ error: 'Falta "choice" (granted/denied)' });
      return;
    }

    const record = {
      choice,
      pagina: body.pagina ? String(body.pagina).slice(0, 80) : '',
      fecha: new Date().toISOString(),
    };
    const key = `consent/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;

    try {
      await put(key, JSON.stringify(record), {
        access: 'public',
        contentType: 'application/json',
        allowOverwrite: false,
      });
      res.status(200).json({ ok: true });
    } catch (err) {
      // No queremos que un fallo aquí sea visible ni moleste al visitante.
      res.status(200).json({ ok: false });
    }
    return;
  }

  if (req.method === 'GET') {
    if (!requireAuth(req, res)) return;

    try {
      const { blobs } = await list({ prefix: 'consent/' });
      const records = await Promise.all(
        blobs.map(async (b) => {
          const response = await fetch(b.url);
          return response.json();
        })
      );

      const granted = records.filter((r) => r.choice === 'granted').length;
      const denied = records.filter((r) => r.choice === 'denied').length;
      const total = granted + denied;

      res.status(200).json({
        total,
        granted,
        denied,
        granted_pct: total ? Math.round((granted / total) * 1000) / 10 : 0,
        denied_pct: total ? Math.round((denied / total) * 1000) / 10 : 0,
      });
    } catch (err) {
      res.status(500).json({ error: 'No se pudo leer el registro de cookies.', detail: err && err.message });
    }
    return;
  }

  res.status(405).json({ error: 'Método no permitido' });
};
