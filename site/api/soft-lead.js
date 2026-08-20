const { put } = require('@vercel/blob');
const { sendLeadNotification } = require('./_notify');

const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'IRL Estudios <inscripciones@irlestudios.com>';
const RESEND_REPLY_TO = process.env.RESEND_REPLY_TO || 'irlestudiosmadrid@gmail.com';

// Lead del imán de PDF del blog (blog-detectar-tonalidad.html): ya desbloquea
// la descarga al instante, así que no recibe este email de bienvenida.
const CURSO_IMAN_BLOG = 'Imán PDF - Detectar Tonalidad';

const COURSE_INFO = {
  'Producción Musical Iniciación': { duracion: '8 sesiones a lo largo de 2 meses', esProduccion: true },
  'Producción Musical Avanzada': { duracion: '8 sesiones a lo largo de 2 meses', esProduccion: true },
  'Diseño Sonoro para audiovisual': { duracion: '8 sesiones a lo largo de 2 meses', esProduccion: false },
  'Directo en Ableton': { duracion: '4 sesiones a lo largo de 1 mes', esProduccion: false },
};

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendWelcomeEmail(lead) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { skipped: 'no RESEND_API_KEY configured' };

  const info = COURSE_INFO[lead.curso];
  if (!info) return { skipped: `curso no reconocido: ${lead.curso}` };

  const nombre = escapeHtml(lead.nombre);
  const curso = escapeHtml(lead.curso);
  const duracion = escapeHtml(info.duracion);

  const bullets = [
    'Nuestros cursos son 100% presenciales desde el estudio (puedes ver algunas imágenes aquí: https://irlestudios.com/estudio-a.html) para aplicar lo aprendido de forma práctica desde el primer día.',
    'Los grupos son reducidos, de 4 personas, para poder adaptarnos a las necesidades y objetivos de cada alumno.',
    `${info.duracion}.`,
  ];

  const extraText = info.esProduccion
    ? 'Te adjunto también la guía "Cómo detectar la tonalidad de una canción" (https://irlestudios.com/assets/blog/guia-detectar-tonalidad.pdf) — un adelanto de cómo trabajamos. Y te invito a echarle un vistazo a nuestro blog (https://irlestudios.com/blog.html), donde ya vamos dando algunas pinceladas de los temas que profundizamos en clase.\n\n'
    : 'Te invito también a echarle un vistazo a nuestro blog (https://irlestudios.com/blog.html), donde ya vamos dando algunas pinceladas de los temas que profundizamos en clase.\n\n';

  const text =
    `Hola ${lead.nombre},\n\n` +
    `Gracias por interesarte en ${lead.curso} en IRL Estudios. No hace falta que decidas nada todavía — te dejo por aquí lo esencial para que le eches un ojo con calma:\n\n` +
    bullets.map((b) => `- ${b}`).join('\n') + '\n\n' +
    extraText +
    `Si tienes cualquier duda —sobre el nivel que hace falta, horarios, o lo que sea— puedes responder directamente a este email, lo leo yo mismo.\n\n` +
    `Un abrazo,\nAlex — Turian Boy\nIRL Estudios`;

  const bodyFont = "font-family:-apple-system,Helvetica,Arial,sans-serif;";
  const monoFont = "font-family:ui-monospace,'SF Mono','JetBrains Mono',Menlo,monospace;";
  const linkStyle = 'color:#232323;text-decoration:underline;';

  const bulletsHtml = [
    `Nuestros cursos son 100% presenciales desde el estudio (puedes ver algunas imágenes <a href="https://irlestudios.com/estudio-a.html" style="${linkStyle}">aquí</a>) para aplicar lo aprendido de forma práctica desde el primer día.`,
    `Los grupos son reducidos, de 4 personas, para poder adaptarnos a las necesidades y objetivos de cada alumno.`,
    `${duracion}.`,
  ]
    .map(
      (b) =>
        `<tr><td valign="top" style="padding:0 8px 12px 0;${bodyFont}font-size:15px;line-height:1.6;color:#232323;">•</td>` +
        `<td style="padding:0 0 12px;${bodyFont}font-size:15px;line-height:1.6;color:#232323;">${b}</td></tr>`
    )
    .join('');

  const extraHtml = info.esProduccion
    ? `<p style="margin:0 0 20px;${bodyFont}font-size:15px;line-height:1.6;color:#232323;">Te adjunto también la guía` +
      ` <a href="https://irlestudios.com/assets/blog/guia-detectar-tonalidad.pdf" style="${linkStyle}">"Cómo detectar la tonalidad de una canción"</a>` +
      ` — un adelanto de cómo trabajamos. Y te invito a echarle un vistazo a nuestro <a href="https://irlestudios.com/blog.html" style="${linkStyle}">blog</a>,` +
      ` donde ya vamos dando algunas pinceladas de los temas que profundizamos en clase.</p>`
    : `<p style="margin:0 0 20px;${bodyFont}font-size:15px;line-height:1.6;color:#232323;">Te invito también a echarle un vistazo a nuestro` +
      ` <a href="https://irlestudios.com/blog.html" style="${linkStyle}">blog</a>, donde ya vamos dando algunas pinceladas de los temas que profundizamos en clase.</p>`;

  const html =
    `<div style="display:none;max-height:0;overflow:hidden;">Sin compromiso — solo para que le eches un vistazo con calma.</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:32px 16px;">` +
    `<tr><td align="center">` +
    `<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">` +

    `<tr><td align="center" style="padding-bottom:22px;">` +
    `<img src="https://irlestudios.com/assets/logo-tag.png" alt="IRL Estudios" width="140" style="display:block;width:140px;">` +
    `</td></tr>` +

    `<tr><td style="background:#eaeaea;border-radius:14px;padding:32px 30px;">` +
    `<p style="margin:0 0 16px;${bodyFont}font-size:15px;line-height:1.6;color:#232323;">Hola ${nombre},</p>` +
    `<p style="margin:0 0 20px;${bodyFont}font-size:15px;line-height:1.6;color:#232323;">Gracias por interesarte en` +
    ` <span style="display:inline-block;background:rgba(0,0,0,0.6);color:#eaeaea;${monoFont}font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;border-radius:6px;padding:4px 9px;">${curso}</span>` +
    ` en IRL Estudios. No hace falta que decidas nada todavía — te dejo por aquí lo esencial para que le eches un ojo con calma:</p>` +

    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">${bulletsHtml}</table>` +

    extraHtml +

    `<div style="border-top:1px solid rgba(0,0,0,0.15);margin:0 0 20px;"></div>` +

    `<p style="margin:0;${bodyFont}font-size:15px;line-height:1.6;color:#232323;">Si tienes cualquier duda —sobre el nivel que hace falta, horarios, o lo que sea— puedes responder directamente a este email, lo leo yo mismo.</p>` +
    `<p style="margin:20px 0 0;${bodyFont}font-size:15px;line-height:1.4;color:#232323;">Un abrazo,<br>Alex — Turian Boy<br>IRL Estudios</p>` +
    `</td></tr>` +

    `<tr><td align="center" style="padding-top:22px;">` +
    `<p style="margin:0;${monoFont}font-size:11px;color:rgba(255,255,255,0.4);">IRL Estudios · Calle Lenguas 14, 28021 Madrid</p>` +
    `</td></tr>` +

    `</table>` +
    `</td></tr>` +
    `</table>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [lead.email],
        reply_to: RESEND_REPLY_TO,
        subject: `Aquí tienes lo que buscabas sobre ${lead.curso} 🎧`,
        html,
        text,
      }),
    });
    const responseBody = await r.json().catch(() => null);
    if (!r.ok) console.error('Resend error response:', JSON.stringify(responseBody));
    return { status: r.status, body: responseBody };
  } catch (err) {
    console.error('Resend error:', err && err.message);
    return { error: err && err.message };
  }
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
    await sendLeadNotification(lead);
    if (lead.curso !== CURSO_IMAN_BLOG) {
      await sendWelcomeEmail(lead);
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({
      error: 'No se pudo guardar el contacto.',
      detail: err && err.message,
    });
  }
};
