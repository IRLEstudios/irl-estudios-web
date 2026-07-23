const { put } = require('@vercel/blob');
const { requireAuth } = require('./_auth');

async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const filename = req.headers['x-filename'] || `imagen-${Date.now()}`;
  const contentType = req.headers['content-type'] || 'application/octet-stream';

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);

  const blob = await put(`images/${Date.now()}-${filename}`, buffer, {
    access: 'public',
    contentType,
    allowOverwrite: true,
  });

  res.status(200).json({ url: blob.url });
}

// Desactivamos el bodyParser por defecto de Vercel porque
// recibimos el archivo como stream binario "en crudo".
handler.config = {
  api: { bodyParser: false },
};

module.exports = handler;
