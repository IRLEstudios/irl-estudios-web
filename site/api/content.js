const { put, head } = require('@vercel/blob');
const { requireAuth } = require('./_auth');

// Nombre del "archivo" dentro de Vercel Blob para cada página.
function blobKeyFor(page) {
  return `content/${page}.json`;
}

// Contenido "de fábrica": si todavía no se ha guardado nada en Blob
// para una página, se sirve el JSON que viene con el propio proyecto
// (carpeta /content) como primer valor por defecto.
// Se usa require() (en vez de fs.readFileSync) porque el empaquetador
// de funciones de Vercel solo incluye en el bundle los archivos a los
// que se llega por require/import estático; con fs.readFileSync sobre
// una ruta dinámica el JSON no se empaquetaba y siempre daba 404.
function readDefaultContent(page) {
  try {
    return require(`../content/${page}.json`);
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  const page = (req.query && req.query.page) || '';
  if (!page || !/^[a-z0-9-]+$/.test(page)) {
    res.status(400).json({ error: 'Parámetro "page" inválido' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const info = await head(blobKeyFor(page)).catch(() => null);
      if (info && info.url) {
        const response = await fetch(info.url);
        const data = await response.json();
        res.status(200).json(data);
        return;
      }
    } catch (err) {
      // Si Blob falla por lo que sea, caemos al contenido por defecto.
    }

    const fallback = readDefaultContent(page);
    if (!fallback) {
      res.status(404).json({ error: 'No existe contenido para esta página' });
      return;
    }
    res.status(200).json(fallback);
    return;
  }

  if (req.method === 'PUT') {
    if (!requireAuth(req, res)) return;

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = null; }
    }
    if (!body || typeof body !== 'object') {
      res.status(400).json({ error: 'Cuerpo JSON inválido' });
      return;
    }

    await put(blobKeyFor(page), JSON.stringify(body, null, 2), {
      access: 'public',
      contentType: 'application/json',
      allowOverwrite: true,
    });

    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Método no permitido' });
};
