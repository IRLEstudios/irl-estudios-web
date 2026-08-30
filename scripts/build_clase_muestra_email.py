#!/usr/bin/env python3
"""Genera el HTML del email de "clase de muestra", con el mismo diseño que
sendWelcomeEmail (site/api/soft-lead.js): mismo layout de tabla, mismos
colores y fuentes, mismo pie de firma.

Uso: build_clase_muestra_email.py "Nombre del lead" > salida.html
"""
import sys
import html

VIDEO_URL = 'https://youtu.be/zmW5EDQQwds'
INSCRIPCION_URL = 'https://irlestudios.com/inscripcion.html?curso=Producci%C3%B3n%20musical%20Iniciaci%C3%B3n'

BODY_FONT = "font-family:-apple-system,Helvetica,Arial,sans-serif;"
MONO_FONT = "font-family:ui-monospace,'SF Mono','JetBrains Mono',Menlo,monospace;"


def build_html(nombre_raw):
    nombre = html.escape(nombre_raw)

    bullets = [
        '8 sesiones de 2h presenciales en el estudio, en grupos de máximo 4 personas.',
        'Sample pack exclusivo, curado y creado por mí con los sonidos que uso en mis propias producciones.',
        'Acceso a un campus virtual con materiales utilizados en clase, recursos extra, foro de dudas y calendario del curso.',
        'Horarios flexibles, adaptados a la disponibilidad del grupo una vez esté completo.',
    ]
    bullets_html = ''.join(
        f'<tr><td valign="top" style="padding:0 8px 12px 0;{BODY_FONT}font-size:15px;line-height:1.6;color:#232323;">&bull;</td>'
        f'<td style="padding:0 0 12px;{BODY_FONT}font-size:15px;line-height:1.6;color:#232323;">{b}</td></tr>'
        for b in bullets
    )

    return (
        '<div style="display:none;max-height:0;overflow:hidden;">Un vídeo mío contándote cómo son las clases, antes de que decidas.</div>'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:32px 16px;">'
        '<tr><td align="center">'
        '<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">'

        '<tr><td align="center" style="padding-bottom:22px;">'
        '<img src="https://irlestudios.com/assets/logo-tag.png" alt="IRL Estudios" width="140" style="display:block;width:140px;">'
        '</td></tr>'

        '<tr><td style="background:#eaeaea;border-radius:14px;padding:32px 30px;">'
        f'<p style="margin:0 0 16px;{BODY_FONT}font-size:15px;line-height:1.6;color:#232323;">Hola {nombre},</p>'
        f'<p style="margin:0 0 20px;{BODY_FONT}font-size:15px;line-height:1.6;color:#232323;">Hace un tiempo dejaste tu contacto porque te interesaba el curso'
        f' <span style="display:inline-block;background:rgba(0,0,0,0.6);color:#eaeaea;{MONO_FONT}font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;border-radius:6px;padding:4px 9px;">Producción Musical Iniciación</span>'
        '. Para que puedas hacerte una idea real de cómo son las clases grabé este vídeo para ti hablando sobre cómo entiendo la manera de enseñar y un pequeño adelanto haciendo un beat.</p>'

        '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">'
        '<tr><td style="background:#232323;border-radius:9px;">'
        f'<a href="{VIDEO_URL}" style="display:inline-block;padding:13px 22px;{BODY_FONT}font-size:14px;font-weight:700;letter-spacing:0.02em;color:#eaeaea;text-decoration:none;">Ver la clase de muestra</a>'
        '</td></tr></table>'

        f'<p style="margin:0 0 8px;{BODY_FONT}font-size:15px;line-height:1.6;color:#232323;"><b>Qué incluye el curso:</b></p>'
        f'<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">{bullets_html}</table>'

        f'<p style="margin:0 0 20px;{BODY_FONT}font-size:15px;line-height:1.6;color:#232323;">Si quieres apuntarte, aquí tienes el link directo de inscripción:</p>'

        '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">'
        '<tr><td style="border:1.6px solid rgba(0,0,0,0.6);border-radius:9px;">'
        f'<a href="{INSCRIPCION_URL}" style="display:inline-block;padding:13px 22px;{BODY_FONT}font-size:14px;font-weight:700;letter-spacing:0.02em;color:#232323;text-decoration:none;">Inscripciones oct/nov 2026</a>'
        '</td></tr></table>'

        '<div style="border-top:1px solid rgba(0,0,0,0.15);margin:0 0 20px;"></div>'

        f'<p style="margin:0;{BODY_FONT}font-size:15px;line-height:1.6;color:#232323;">Cualquier duda, puedes responder directamente a este email, lo leo yo mismo.</p>'
        f'<p style="margin:20px 0 0;{BODY_FONT}font-size:15px;line-height:1.4;color:#232323;">Un abrazo,<br>Alex — Turian Boy<br>IRL Estudios</p>'
        '</td></tr>'

        '<tr><td align="center" style="padding-top:22px;">'
        f'<p style="margin:0 0 6px;{MONO_FONT}font-size:11px;color:rgba(255,255,255,0.4);">IRL Estudios · Calle Lenguas 14, 28021 Madrid</p>'
        f'<p style="margin:0;{MONO_FONT}font-size:11px;color:rgba(255,255,255,0.4);">Si prefieres no recibir más información sobre este curso, responde a este email y te damos de baja.</p>'
        '</td></tr>'

        '</table>'
        '</td></tr>'
        '</table>'
    )


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('Uso: build_clase_muestra_email.py "Nombre del lead"', file=sys.stderr)
        sys.exit(1)
    sys.stdout.write(build_html(sys.argv[1]))
