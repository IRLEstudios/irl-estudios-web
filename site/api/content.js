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
    // DEBUG TEMPORAL: ?debug=1 añade información de diagnóstico sin
    // exponer nada sensible, para saber por qué no se lee de Blob.
    const debug = req.query && req.query.debug === '1';
    const debugInfo = { hasToken: !!process.env.BLOB_READ_WRITE_TOKEN };

    try {
      const info = await head(blobKeyFor(page));
      debugInfo.headOk = true;
      debugInfo.headUrl = info && info.url;
      debugInfo.uploadedAt = info && info.uploadedAt;

      if (info && info.url) {
        const bustedUrl = info.url + (info.url.includes('?') ? '&' : '?') + '_v=' + (info.uploadedAt ? new Date(info.uploadedAt).getTime() : Date.now());
        const response = await fetch(bustedUrl, { cache: 'no-store' });
        debugInfo.fetchStatus = response.status;
        const data = await response.json();
        if (debug) { res.status(200).json({ data, debugInfo }); return; }
        res.status(200).json(data);
        return;
      }
    } catch (err) {
      debugInfo.headOk = false;
      debugInfo.error = err && err.message;
    }

    const fallback = readDefaultContent(page);
    if (debug) { res.status(200).json({ data: fallback, debugInfo, usedFallback: true }); return; }
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
      const blob = await put(blobKeyFor(page), JSON.stringify(body, null, 2), {
        access: 'public',
        contentType: 'application/json',
        allowOverwrite: true,
      });
      // DEBUG TEMPORAL: para ver exactamente qué devuelve Blob al escribir.
      res.status(200).json({ ok: true, debugWrite: { pathname: blob.pathname, url: blob.url } });
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
