// Avatar de quem portou/publicou: so o endereco vem dos dados; a imagem e carregada do Hugging Face quando o item aparece
// (sem enviar nada do visitante). Regra das iniciais: so existem no DOM sem URL, com a imagem quebrada ou depois de a carga falhar;
// enquanto a imagem carrega o circulo fica neutro e sem texto; com a imagem carregada as iniciais saem do DOM (nunca ficam atras de uma transparencia).
(function () {
  'use strict';
  var OK = /^https:\/\/(huggingface\.co\/avatars\/|cdn-avatars\.huggingface\.co\/)/, cfg = { carregar: null }, obs = null;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function iniciais(n) { var p = String(n || '?').split(/[-_. ]+/).filter(Boolean); return ((p.length > 1 ? p[0][0] + p[1][0] : String(n || '?').slice(0, 2)) || '?').toUpperCase(); }
  function url(nome) { var m = window.MAPA_AVATARES; var u = m && m[nome]; return u && OK.test(u) ? u : ''; }
  function comIniciais(el) { if (el.querySelector('.ini')) return; var s = document.createElement('span'); s.className = 'ini'; s.textContent = iniciais(el.dataset.autor); el.appendChild(s); el.dataset.estado = 'ini'; }
  function poe(el) {
    if (el.dataset.ok) return; el.dataset.ok = '1';
    var u = url(el.dataset.autor); if (!u) { comIniciais(el); return; }
    el.dataset.estado = 'carregando';
    var im = new Image(); im.alt = ''; im.decoding = 'async'; im.referrerPolicy = 'no-referrer';
    im.onload = function () { var i = el.querySelector('.ini'); if (i) i.remove(); el.classList.add('com-img'); el.dataset.estado = 'img'; };
    im.onerror = function () { im.remove(); comIniciais(el); };
    el.appendChild(im); im.loading = 'lazy'; im.src = u;   // no DOM (escondido ate carregar): imagem preguicosa so carrega ligada a pagina
  }
  // html: circulo sem texto; com o mapa de enderecos ja carregado e sem endereco para o nome, ja nasce com as iniciais
  function html(nome, classe) {
    var m = window.MAPA_AVATARES, sem = m && !url(nome);
    return '<span class="av' + (classe ? ' ' + classe : '') + '" data-autor="' + esc(nome) + '" aria-hidden="true"' + (sem ? ' data-ok="1" data-estado="ini"><span class="ini">' + esc(iniciais(nome)) + '</span>' : '>') + '</span>';
  }
  function hidratar(raiz) {
    var els = [].slice.call((raiz || document).querySelectorAll('.av[data-autor]:not([data-ok])')); if (!els.length) return;
    var pronto = function () {
      if (!('IntersectionObserver' in window)) { els.forEach(poe); return; }
      obs = obs || new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { obs.unobserve(e.target); poe(e.target); } }); }, { rootMargin: '120px' });
      els.forEach(function (el) { obs.observe(el); });
    };
    if (window.MAPA_AVATARES) pronto(); else if (cfg.carregar) cfg.carregar().then(pronto, function () { els.forEach(function (el) { if (!el.dataset.ok) { el.dataset.ok = '1'; comIniciais(el); } }); });
  }
  window.Avatar = { html: html, hidratar: hidratar, iniciais: iniciais, config: function (o) { for (var k in o) cfg[k] = o[k]; } };
})();
