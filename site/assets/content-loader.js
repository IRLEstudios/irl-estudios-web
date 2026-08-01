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
  function fadeInImages(root) {
    root.querySelectorAll('img').forEach(function (img) {
      function markLoaded() { img.classList.add('irl-img-loaded'); }
      if (img.complete && img.naturalWidth > 0) markLoaded();
      else img.addEventListener('load', markLoaded, { once: true });
    });
  }
  fadeInImages(document);

  // Acordeón de preguntas frecuentes (delegado en document, no en cada
  // elemento, porque content-loader.js reemplaza el innerHTML del bloque
  // faq_html en cuanto llega el contenido de Blob y destruiría cualquier
  // listener atado directamente a los botones originales).
  document.addEventListener('click', function (e) {
    var mainToggle = e.target.closest('.faq-main-toggle');
    if (mainToggle) {
      var wrap = mainToggle.closest('.faq-wrap');
      var isOpen = wrap.classList.toggle('open');
      mainToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      return;
    }
    var itemToggle = e.target.closest('.faq-item-toggle');
    if (itemToggle) {
      var item = itemToggle.closest('.faq-item');
      var isItemOpen = item.classList.toggle('open');
      itemToggle.setAttribute('aria-expanded', isItemOpen ? 'true' : 'false');
    }
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

  // Registro propio (best-effort, no bloquea la interacción) de cuántas
  // personas aceptan/rechazan las cookies, para poder verlo en /admin.
  function logConsentChoice(granted) {
    try {
      fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice: granted ? 'granted' : 'denied', pagina: (document.body.getAttribute('data-page') || '') }),
        keepalive: true,
      }).catch(function () {});
    } catch (e) {}
  }

  function showCookieBanner() {
    if (document.getElementById('irl-cookie-modal')) return;

    // Fondo sin oscurecer ni desenfocar la página (no bloquea la lectura
    // de lo que hay detrás): solo la tarjeta central es interactiva.
    var backdrop = document.createElement('div');
    backdrop.id = 'irl-cookie-modal';
    backdrop.style.cssText = 'position:fixed;inset:0;z-index:9999;' +
      'pointer-events:none;' +
      'display:flex;align-items:center;justify-content:center;padding:20px;';

    var modal = document.createElement('div');
    modal.style.cssText = 'width:min(400px, 100%);pointer-events:auto;' +
      'background:rgba(234,234,234,0.7);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#232323;' +
      'border:1.6px solid rgba(0,0,0,0.15);border-radius:12.8px;padding:24px;' +
      'font-family:ui-monospace,"SF Mono","JetBrains Mono",Menlo,monospace;' +
      'box-shadow:0 20px 60px rgba(0,0,0,0.35);';
    modal.innerHTML =
      '<p style="font-size:13.5px;font-weight:700;margin-bottom:8px;">🍪 Usamos cookies</p>' +
      '<p style="font-size:12.5px;line-height:1.6;color:rgba(0,0,0,0.75);margin-bottom:18px;">Las usamos para saber cómo nos encontráis y mejorar la web. Puedes aceptarlas o rechazarlas cuando quieras.</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
        '<button id="irl-cookie-accept" style="flex:1;min-width:120px;font-family:inherit;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;background:#232323;color:#eaeaea;border:1.6px solid #232323;border-radius:9.6px;padding:11px 16px;cursor:pointer;">Aceptar</button>' +
        '<button id="irl-cookie-reject" style="flex:1;min-width:120px;font-family:inherit;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;background:transparent;color:#232323;border:1.6px solid rgba(0,0,0,0.3);border-radius:9.6px;padding:11px 16px;cursor:pointer;">Rechazar</button>' +
      '</div>';
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    document.getElementById('irl-cookie-accept').addEventListener('click', function () {
      updateConsent(true);
      logConsentChoice(true);
      backdrop.remove();
    });
    document.getElementById('irl-cookie-reject').addEventListener('click', function () {
      updateConsent(false);
      logConsentChoice(false);
      backdrop.remove();
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
    wrap.style.cssText = 'margin-top:28px;padding-top:24px;margin-bottom:24px;' +
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
          wrap.innerHTML =
            '<p style="font-size:11px;color:rgba(0,0,0,0.6);margin-bottom:8px;">¡Gracias! Te avisaremos antes de que se llenen las plazas. Mientras tanto, aquí tienes un adelanto:</p>' +
            '<a href="assets/blog/guia-detectar-tonalidad.pdf" target="_blank" rel="noopener" style="display:inline-block;font-family:inherit;font-weight:700;font-size:10px;letter-spacing:0.04em;' +
              'text-transform:uppercase;background:transparent;color:inherit;border:1.3px solid rgba(0,0,0,0.3);' +
              'border-radius:7px;padding:7px 12px;text-decoration:none;">Descargar guía en PDF</a>';
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

  // La pregunta "¿Dónde se encuentra el estudio?" tiene que estar
  // siempre dentro de "Preguntas frecuentes" en las páginas de curso,
  // aunque el contenido de ese bloque venga ya guardado en Blob desde
  // antes de añadirla (en cuyo caso sobrescribiría el HTML nuevo). Si
  // no está, se añade aquí mismo tras cargar el contenido.
  function ensureLocationFaqItem() {
    document.querySelectorAll('.faq-wrap[data-key-html] .faq-main-body').forEach(function (body) {
      var already = Array.prototype.some.call(
        body.querySelectorAll('.faq-item-toggle span'),
        function (span) { return span.textContent.trim() === '¿Dónde se encuentra el estudio?'; }
      );
      if (already) return;

      var item = document.createElement('div');
      item.className = 'faq-item';
      item.innerHTML =
        '<button type="button" class="faq-item-toggle" aria-expanded="false"><span>¿Dónde se encuentra el estudio?</span><span class="faq-chevron">+</span></button>' +
        '<div class="faq-item-body"><p>El estudio está en Calle Lenguas 14, en el barrio de Villaverde Alto (Madrid).</p></div>';
      body.appendChild(item);
    });
  }

  if (!page) { ensureLocationFaqItem(); return; }

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
          // Las imágenes que vengan dentro de este bloque son nuevas para
          // el DOM: sin esto se quedarían con opacity:0 para siempre, ya
          // que el fundido inicial solo se aplicó a las imágenes que
          // existían en el HTML estático antes de este reemplazo.
          fadeInImages(el);
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

      ensureLocationFaqItem();

      // Avisa (éxito o fallo) de que ya se terminó de intentar aplicar el
      // contenido remoto. Lo usa el editor visual del admin para saber
      // cuándo es seguro empezar a habilitar la edición en vivo.
      document.__irlContentReady = true;
      document.dispatchEvent(new CustomEvent('irl:content-ready'));
    });
})();
