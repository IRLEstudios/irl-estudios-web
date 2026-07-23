// Carga el contenido editable de esta página desde /api/content
// y rellena cualquier elemento marcado con data-key / data-key-html / data-key-src.
// Si la llamada falla (por ejemplo, en local sin backend), la página
// se queda tal cual con el texto que ya tiene escrito en el HTML.
(function () {
  var page = document.body.getAttribute('data-page');
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
      // Avisa (éxito o fallo) de que ya se terminó de intentar aplicar el
      // contenido remoto. Lo usa el editor visual del admin para saber
      // cuándo es seguro empezar a habilitar la edición en vivo.
      document.__irlContentReady = true;
      document.dispatchEvent(new CustomEvent('irl:content-ready'));
    });
})();
