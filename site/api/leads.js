const { list, del } = require('@vercel/blob');
const { requireAuth } = require('./_auth');

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
