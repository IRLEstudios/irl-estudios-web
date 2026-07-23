// Carga el contenido editable de esta página desde /api/content
// y rellena cualquier elemento marcado con data-key / data-key-html / data-key-src.
// Si la llamada falla (por ejemplo, en local sin backend), la página
// se queda tal cual con el texto que ya tiene escrito en el HTML.
(function () {
  var page = document.body.getAttribute('data-page');
  if (!page) return;

  fetch('/api/content?page=' + encodeURIComponent(page))
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
    })
    .catch(function () {
      // Sin conexión al backend: se queda el contenido estático del HTML.
    });
})();
