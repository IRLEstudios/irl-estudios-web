const { list, del, put } = require('@vercel/blob');
const { requireAuth } = require('./_auth');

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;

  if (req.method === 'GET') {
    const { blobs } = await list({ prefix: 'leads/' });

    const leads = await Promise.all(
      blobs.map(async (b) => {
        const response = await fetch(b.url);
        const data = await response.json();
        data._blobUrl = b.url;
        return data;
      })
    );

    leads.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    res.status(200).json({ leads });
    return;
  }

  if (req.method === 'PUT') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};

    if (!body.url || !String(body.url).startsWith('https://')) {
      res.status(400).json({ error: 'Falta la URL del lead a editar' });
      return;
    }
    if (!body.data || typeof body.data !== 'object') {
      res.status(400).json({ error: 'Faltan los datos a guardar' });
      return;
    }
    if (!body.data.email || !isValidEmail(body.data.email)) {
      res.status(400).json({ error: 'Email no válido' });
      return;
    }

    try {
      const pathname = new URL(body.url).pathname.replace(/^\//, '');
      await put(pathname, JSON.stringify(body.data, null, 2), {
        access: 'public',
        contentType: 'application/json',
        allowOverwrite: true,
      });
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'No se pudo actualizar el lead.', detail: err && err.message });
    }
    return;
  }

  if (req.method === 'DELETE') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};

    if (!body.url || !String(body.url).startsWith('https://')) {
      res.status(400).json({ error: 'Falta la URL del lead a borrar' });
      return;
    }

    try {
      await del(body.url);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'No se pudo borrar el lead.', detail: err && err.message });
    }
    return;
  }

  res.status(405).json({ error: 'Método no permitido' });
};
