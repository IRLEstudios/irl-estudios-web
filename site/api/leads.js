const { list } = require('@vercel/blob');
const { requireAuth } = require('./_auth');

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const { blobs } = await list({ prefix: 'leads/' });

  const leads = await Promise.all(
    blobs.map(async (b) => {
      const response = await fetch(b.url);
      return response.json();
    })
  );

  leads.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  res.status(200).json({ leads });
};
