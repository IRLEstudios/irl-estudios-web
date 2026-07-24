// Carga el contenido editable de esta página desde /api/content
// y rellena cualquier elemento marcado con data-key / data-key-html / data-key-src.
// Si la llamada falla (por ejemplo, en local sin backend), la página
// se queda tal cual con el texto que ya tiene escrito en el HTML.
(function () {
  // Fundido suave para todas las imágenes de la página: evitan el
  // "pop-in" brusco al terminar de cargar (independiente de si la
  // página tiene o no contenido editable).
  var fadeStyle = document.createElement('style');
  fadeStyle.textContent = 'img:not(.irl-img-loaded){opacity:0;} img.irl-img-loaded{opacity:1; transition:opacity .35s ease;}';
  document.head.appendChild(fadeStyle);
  document.querySelectorAll('img').forEach(function (img) {
    function markLoaded() { img.classList.add('irl-img-loaded'); }
    if (img.complete && img.naturalWidth > 0) markLoaded();
    else img.addEventListener('load', markLoaded, { once: true });
  });

  var page = document.body.getAttribute('data-page');

  // Banner de consentimiento de cookies (Google Consent Mode v2).
  // El script inline en <head> ya fija el estado por defecto en "denied"
  // antes de que cargue GTM; aquí solo mostramos el banner y actualizamos
  // ese consentimiento si el usuario decide.
  function updateConsent(granted) {
    var state = granted ? 'granted' : 'denied';
    if (window.gtag) {
      window.gtag('consent', 'update', {
        ad_storage: state,
        ad_user_data: state,
        ad_personalization: state,
        analytics_storage: state,
      });
    }
    try { localStorage.setItem('irl_consent', state); } catch (e) {}
    if (granted) {
      // Disparador explícito y propio (no dependemos del bloqueo por
      // consentimiento interno de GTM para etiquetas no nativas de Google,
      // que no es fiable en HTML personalizado como el píxel de Meta):
      // la etiqueta del píxel solo está enganchada a este evento.
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'marketing_consent_granted' });
    }
  }

  function showCookieBanner() {
    if (document.getElementById('irl-cookie-banner')) return;
    var banner = document.createElement('div');
    banner.id = 'irl-cookie-banner';
    banner.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;' +
      'background:transparent;color:#fff;' +
      'padding:16px 20px;display:flex;flex-wrap:wrap;gap:14px;align-items:center;' +
      'justify-content:space-between;font-family:ui-monospace,"SF Mono","JetBrains Mono",Menlo,monospace;' +
      'font-size:12.5px;line-height:1.5;text-shadow:0 1px 4px rgba(0,0,0,0.6);' +
      'overflow-x:auto;';
    banner.innerHTML =
      '<span style="white-space:nowrap;">Usamos cookies para saber cómo nos encontráis y mejorar la web.</span>' +
      '<span style="display:flex;gap:16px;align-items:center;flex-shrink:0;">' +
        '<button id="irl-cookie-reject" style="font-family:inherit;font-size:10px;font-weight:400;letter-spacing:0.03em;text-transform:uppercase;background:transparent;color:#fff;border:none;padding:0;text-decoration:underline;text-underline-offset:2px;cursor:pointer;text-shadow:inherit;">Rechazar</button>' +
        '<button id="irl-cookie-accept" style="font-family:inherit;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;background:#fff;color:#232323;border:none;border-radius:9.6px;padding:9px 16px;cursor:pointer;text-shadow:none;">Aceptar</button>' +
      '</span>';
    document.body.appendChild(banner);

    document.getElementById('irl-cookie-accept').addEventListener('click', function () {
      updateConsent(true);
      banner.remove();
    });
    document.getElementById('irl-cookie-reject').addEventListener('click', function () {
      updateConsent(false);
      banner.remove();
    });
  }

  try {
    var storedConsent = localStorage.getItem('irl_consent');
    if (!storedConsent) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showCookieBanner);
      } else {
        showCookieBanner();
      }
    } else if (storedConsent === 'granted') {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'marketing_consent_granted' });
    }
  } catch (e) {}

  // Eventos de conversión enviados al dataLayer de GTM.
  window.dataLayer = window.dataLayer || [];

  var CURSO_PAGE_NAMES = {
    'produccion-musical-avanzada': 'Producción Musical Avanzada',
    'produccion-musical-iniciacion': 'Producción Musical Iniciación',
    'diseno-sonoro-audiovisual': 'Diseño Sonoro para audiovisual',
    'directo-en-ableton': 'Directo en Ableton',
  };
  if (page && CURSO_PAGE_NAMES[page]) {
    window.dataLayer.push({ event: 'ver_curso', curso_nombre: CURSO_PAGE_NAMES[page] });
    insertSoftLeadForm(CURSO_PAGE_NAMES[page]);
  }

  // Formulario de captación de lead suave (nombre + email), insertado
  // debajo del CTA de inscripción en cada página de curso, con menos
  // peso visual para no competir con la inscripción real.
  function insertSoftLeadForm(cursoNombre) {
    var ctaRow = document.querySelector('.cta-row');
    if (!ctaRow || document.getElementById('irl-soft-lead')) return;

    var inputStyle = 'font-family:inherit;font-size:12.5px;padding:6px 9px;' +
      'border:1.3px solid rgba(0,0,0,0.15);border-radius:6px;background:#fff;color:inherit;flex:1;min-width:110px;';

    var wrap = document.createElement('div');
    wrap.id = 'irl-soft-lead';
    wrap.style.cssText = 'margin-top:14px;padding-top:14px;margin-bottom:24px;' +
      'border-top:1px solid rgba(0,0,0,0.15);font-family:inherit;';
    wrap.innerHTML =
      '<p data-key-html="soft_lead_heading" style="font-size:12.5px;font-weight:700;margin-bottom:4px;">¿No lo tienes claro todavía?</p>' +
      '<p data-key-html="soft_lead_text" style="font-size:12.5px;color:rgba(0,0,0,0.6);margin-bottom:10px;">Déjanos tu nombre y email para avisarte antes de que no queden plazas y enviarte nuestra newsletter con tips de producción y novedades.</p>' +
      '<form id="irl-soft-lead-form" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">' +
        '<input type="text" name="nombre" placeholder="Nombre" required style="' + inputStyle + '">' +
        '<input type="email" name="email" placeholder="Email" required style="' + inputStyle + '">' +
        '<button type="submit" data-key="soft_lead_button_label" style="font-family:inherit;font-weight:700;font-size:10px;letter-spacing:0.04em;' +
          'text-transform:uppercase;background:transparent;color:inherit;border:1.3px solid rgba(0,0,0,0.3);' +
          'border-radius:7px;padding:7px 12px;cursor:pointer;flex-shrink:0;">Avisadme</button>' +
      '</form>' +
      '<span class="irl-soft-lead-error" style="color:#b3261e;font-size:11px;display:none;margin-top:6px;"></span>';
    ctaRow.parentNode.insertBefore(wrap, ctaRow.nextSibling);

    // Los data-key insertados dinámicamente llegan a tiempo para el fetch
    // de /api/content que se lanza más abajo en este mismo script, así que
    // el editor de /admin puede editar este texto igual que el resto.

    wrap.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var form = e.target;
      var errorEl = wrap.querySelector('.irl-soft-lead-error');
      errorEl.style.display = 'none';
      var btn = form.querySelector('button');
      var originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Enviando...';

      fetch('/api/soft-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre.value,
          email: form.email.value,
          curso: cursoNombre,
          origen: location.href,
        }),
      })
        .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
        .then(function (result) {
          if (!result.ok) throw new Error((result.data && result.data.error) || 'Error al enviar');
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({ event: 'lead_suave_completado', curso_nombre: cursoNombre });
          wrap.innerHTML = '<p style="font-size:11px;color:rgba(0,0,0,0.6);">¡Gracias! Te avisaremos antes de que se llenen las plazas.</p>';
        })
        .catch(function () {
          errorEl.textContent = 'No se pudo enviar. Inténtalo de nuevo.';
          errorEl.style.display = 'block';
          btn.disabled = false;
          btn.textContent = originalText;
        });
    });
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href*="inscripcion.html"]');
    if (link) {
      window.dataLayer.push({
        event: 'click_inscripciones',
        link_text: link.textContent.trim(),
        origen_pagina: page || '',
      });
    }
  });

  if (!page) return;

  fetch('/api/content?page=' + encodeURIComponent(page), { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data) return;

      document.querySelectorAll('[data-key]').forEach(function (el) {
        var key = el.getAttribute('data-key');
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          el.textContent = data[key];
        }
      });

      document.querySelectorAll('[data-key-html]').forEach(function (el) {
        var key = el.getAttribute('data-key-html');
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          el.innerHTML = data[key];
        }
      });

      document.querySelectorAll('[data-key-src]').forEach(function (el) {
        var key = el.getAttribute('data-key-src');
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          el.setAttribute('src', data[key]);
        }
      });

      document.querySelectorAll('[data-key-href]').forEach(function (el) {
        var key = el.getAttribute('data-key-href');
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          el.setAttribute('href', data[key]);
        }
      });

      document.querySelectorAll('[data-key-visible]').forEach(function (el) {
        var key = el.getAttribute('data-key-visible');
        if (Object.prototype.hasOwnProperty.call(data, key) && data[key] === false) {
          el.style.display = 'none';
        }
      });

      // Posición y tamaño de elementos que se pueden mover/redimensionar
      // en el editor (p. ej. el logo animado de la home). El valor
      // guardado ya incluye la unidad ("2%", "320px"...).
      ['left', 'top', 'width'].forEach(function (prop) {
        document.querySelectorAll('[data-key-' + prop + ']').forEach(function (el) {
          var key = el.getAttribute('data-key-' + prop);
          if (Object.prototype.hasOwnProperty.call(data, key) && data[key]) {
            el.style[prop] = data[key];
          }
        });
      });
    })
    .catch(function () {
      // Sin conexión al backend: se queda el contenido estático del HTML.
    })
    .then(function () {
      // Los elementos reposicionables (p. ej. el logo) empiezan ocultos
      // por CSS para no "saltar" desde su posición por defecto hasta la
      // guardada; se revelan aquí, ya con la posición correcta aplicada
      // (o, si el fetch falló, con la posición por defecto del HTML).
      document.querySelectorAll('[data-key-left]').forEach(function (el) {
        el.style.opacity = '1';
      });

      // Avisa (éxito o fallo) de que ya se terminó de intentar aplicar el
      // contenido remoto. Lo usa el editor visual del admin para saber
      // cuándo es seguro empezar a habilitar la edición en vivo.
      document.__irlContentReady = true;
      document.dispatchEvent(new CustomEvent('irl:content-ready'));
    });
})();
