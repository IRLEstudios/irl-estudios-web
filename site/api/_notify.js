// Aviso por email a la propia escuela cuando entra un lead (completo o suave).
// Comparte cuenta y remitente de Resend con la confirmación que recibe el alumno.
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'IRL Estudios <inscripciones@irlestudios.com>';
const NOTIFY_EMAIL = process.env.RESEND_NOTIFY_EMAIL || 'irlestudiosmadrid@gmail.com';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendLeadNotification(lead) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { skipped: 'no RESEND_API_KEY configured' };

  const esCompleto = lead.tipo === 'lead_completo';
  const subject = esCompleto
    ? `Nueva inscripción: ${lead.nombre} — ${lead.curso}`
    : `Nuevo lead suave: ${lead.nombre} — ${lead.curso}`;

  const rows = [
    ['Tipo', esCompleto ? 'Inscripción completa' : 'Lead suave'],
    ['Nombre', lead.nombre],
    ['Email', lead.email],
    ['Curso', lead.curso],
  ];
  if (esCompleto) {
    rows.push(['DNI/NIE', lead.dni]);
    rows.push(['Horario', lead.horario]);
    rows.push(['Autónomo', lead.autonomo]);
    if (lead.direccion_fiscal) rows.push(['Dirección fiscal', lead.direccion_fiscal]);
    if (lead.comentarios) rows.push(['Comentarios', lead.comentarios]);
  }
  if (lead.origen) rows.push(['Origen', lead.origen]);

  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');

  const rowsHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="font-weight:700;vertical-align:top;padding:4px 10px 4px 0;white-space:nowrap;">${escapeHtml(k)}</td><td style="padding:4px 0;">${escapeHtml(v)}</td></tr>`
    )
    .join('');

  const html =
    `<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:14px;color:#232323;">` +
    `<p style="margin:0 0 14px;font-weight:700;font-size:17px;">${esCompleto ? '📋 Nueva inscripción' : '✉️ Nuevo lead suave'}</p>` +
    `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rowsHtml}</table>` +
    `</div>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [NOTIFY_EMAIL],
        subject,
        html,
        text,
      }),
    });
    const responseBody = await r.json().catch(() => null);
    if (!r.ok) console.error('Resend notify error response:', JSON.stringify(responseBody));
    return { status: r.status, body: responseBody };
  } catch (err) {
    console.error('Resend notify error:', err && err.message);
    return { error: err && err.message };
  }
}

module.exports = { sendLeadNotification };
