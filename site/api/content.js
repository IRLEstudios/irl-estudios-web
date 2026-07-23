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
        // La URL pública del blob se sirve detrás de una CDN que la
        // trata como inmutable; al sobrescribir el mismo pathname puede
        // seguir sirviendo la versión anterior en caché durante un
        // rato. Se rompe la caché añadiendo un parámetro único.
        const bustedUrl = info.url + (info.url.includes('?') ? '&' : '?') + '_v=' + (info.uploadedAt ? new Date(info.uploadedAt).getTime() : Date.now());
        const response = await fetch(bustedUrl, { cache: 'no-store' });
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

    try {
      await put(blobKeyFor(page), JSON.stringify(body, null, 2), {
        access: 'public',
        contentType: 'application/json',
        allowOverwrite: true,
        // Sin esto, Blob añade un sufijo aleatorio al nombre del archivo
        // pese a allowOverwrite, así que head(blobKeyFor(page)) nunca
        // encontraba lo guardado (siempre buscaba la ruta "limpia").
        addRandomSuffix: false,
      });
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({
        error: 'No se pudo guardar en Vercel Blob. ¿Está creado y conectado el Blob Store del proyecto?',
        detail: err && err.message,
      });
    }
    return;
  }

  res.status(405).json({ error: 'Método no permitido' });
};
