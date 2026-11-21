// Exportacao no navegador: SVG, PNG e HTML autocontido do grafico e da tabela. Nada e enviado a servidor.
// Funcoes puras sobre "retratos" montados pelo app (itens ja filtrados); sem dependencias externas.
(function () {
  'use strict';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var FONTE = "'Atkinson Hyperlegible Next','Atkinson Hyperlegible',system-ui,-apple-system,'Segoe UI',sans-serif";
  var COR = { oficial: [255, 209, 102], comunidade: [111, 227, 238], gguf: [182, 156, 255], nenhum: [196, 204, 245] };
  var RAZAO = { oficial: 6, comunidade: 5, gguf: 3.6 }, ALFA = { oficial: 0.55, comunidade: 0.42, gguf: 0.3 };
  var rgb = function (c) { return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; };
  var n1 = function (x) { return Math.round(x * 10) / 10; };

  function losango(x, y, r, cor, op) { return '<path d="M' + n1(x) + ' ' + n1(y - r) + 'L' + n1(x + r) + ' ' + n1(y) + 'L' + n1(x) + ' ' + n1(y + r) + 'L' + n1(x - r) + ' ' + n1(y) + 'Z" fill="' + cor + '" opacity="' + op + '"/>'; }

  function defs(id) {
    var d = '<linearGradient id="' + id + 'bg" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#2c376d"/><stop offset="0.55" stop-color="#262f60"/><stop offset="1" stop-color="#1f2753"/></linearGradient>';
    ['oficial', 'comunidade', 'gguf'].forEach(function (v) {
      d += '<radialGradient id="' + id + v + '" r="0.5" cx="0.5" cy="0.5"><stop offset="' + (0.6 / RAZAO[v]).toFixed(3) + '" stop-color="' + rgb(COR[v]) + '" stop-opacity="1"/><stop offset="1" stop-color="' + rgb(COR[v]) + '" stop-opacity="0"/></radialGradient>';
    });
    return '<defs>' + d + '</defs>';
  }
  function fundoEstrelas(x0, y0, w, h) {
    var sd = 4417, rr = function () { sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0; return sd / 4294967296; }, s = '';
    for (var i = 0; i < 90; i++) { s += '<circle cx="' + n1(x0 + rr() * w) + '" cy="' + n1(y0 + rr() * h) + '" r="' + n1(0.5 + Math.pow(rr(), 3) * 1.3) + '" fill="#e6eaff" opacity="' + n1(0.2 + rr() * 0.5) + '"/>'; }
    return s;
  }

  // ---------- grafico ----------
  // snap: { titulo, filtros:[txt], w, h, estrelas:[{x,y,r,c,t}], rotulos:[{x,y,t}], legenda:[{c,t}], rodape:[linhas], lang }
  function svgGrafico(snap, opc) {
    opc = opc || {}; var id = opc.id || 'g', W = snap.w, H = snap.h, topo = 58, base = 96, TW = Math.max(W, 560), TH = H + topo + base;
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + TW + ' ' + TH + '" width="' + TW + '" height="' + TH + '" role="img" aria-label="' + esc(snap.titulo) + '" font-family="' + esc(FONTE) + '">' +
      '<title>' + esc(snap.titulo) + '</title>' + defs(id) + '<rect width="' + TW + '" height="' + TH + '" fill="url(#' + id + 'bg)"/>' + fundoEstrelas(0, 0, TW, TH);
    s += '<text x="20" y="28" fill="#f4f6ff" font-size="18" font-weight="600">' + esc(snap.titulo) + '</text>';
    s += '<text x="20" y="48" fill="#cdd3f5" font-size="12">' + esc(snap.filtros.join(' · ')) + '</text>';
    var ox = (TW - W) / 2;
    s += '<g transform="translate(' + n1(ox) + ',' + topo + ')">';
    snap.estrelas.forEach(function (e) {
      var v = e.c, c = COR[v] || COR.nenhum, t = '<title>' + esc(e.t) + '</title>';
      if (v !== 'nenhum') {
        var gr = e.r * RAZAO[v];
        s += '<g><circle cx="' + n1(e.x) + '" cy="' + n1(e.y) + '" r="' + n1(gr) + '" fill="url(#' + id + v + ')" opacity="' + ALFA[v] + '"/>' + (e.d ? losango(e.x, e.y, e.r * 1.2, rgb(c), 1) : '<circle cx="' + n1(e.x) + '" cy="' + n1(e.y) + '" r="' + n1(e.r) + '" fill="' + rgb(c) + '"/>') + t + '</g>';
      } else s += e.d ? '<g>' + losango(e.x, e.y, e.r * 0.96, rgb(c), 0.55) + t + '</g>' : '<circle cx="' + n1(e.x) + '" cy="' + n1(e.y) + '" r="' + n1(e.r * 0.8) + '" fill="' + rgb(c) + '" opacity="0.55">' + t + '</circle>';
    });
    (snap.ligacoes || []).forEach(function (l) { s += '<line x1="' + n1(l[0]) + '" y1="' + n1(l[1]) + '" x2="' + n1(l[2]) + '" y2="' + n1(l[3]) + '" stroke="#d7ddff" stroke-opacity="0.25" stroke-width="0.7"/>'; });
    snap.rotulos.forEach(function (r) { s += '<text x="' + n1(r.x) + '" y="' + n1(r.y) + '" text-anchor="middle" fill="#f4f6ff" font-size="11" stroke="#1f2753" stroke-width="3" paint-order="stroke" stroke-linejoin="round">' + esc(r.t) + '</text>'; });
    s += '</g>';
    var y = topo + H + 22, x = 20;
    snap.legenda.forEach(function (l) { var c = COR[l.c] || COR.nenhum; s += '<circle cx="' + (x + 5) + '" cy="' + (y - 4) + '" r="5" fill="' + (l.c === 'nenhum' ? 'none' : rgb(c)) + '"' + (l.c === 'nenhum' ? ' stroke="' + rgb(c) + '"' : '') + '/><text x="' + (x + 15) + '" y="' + y + '" fill="#e4e8ff" font-size="12">' + esc(l.t) + '</text>'; x += 30 + l.t.length * 6.4; });
    snap.rodape.forEach(function (ln, i) { s += '<text x="20" y="' + (y + 22 + i * 14) + '" fill="#b9c0ec" font-size="10.5">' + esc(ln) + '</text>'; });
    return s + '</svg>';
  }

  function baixar(nome, blob) {
    var a = document.createElement('a'), u = URL.createObjectURL(blob); a.href = u; a.download = nome; document.body.appendChild(a); a.click();
    setTimeout(function () { a.remove(); URL.revokeObjectURL(u); }, 1500);
  }
  function svgParaPng(svg, escala) {
    return new Promise(function (ok, erro) {
      var m = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(svg), w = Math.round(+m[1]), h = Math.round(+m[2]), k = escala || 2;
      var img = new Image(), u = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
      img.onload = function () {
        var c = document.createElement('canvas'); c.width = w * k; c.height = h * k; var x = c.getContext('2d'); x.scale(k, k); x.drawImage(img, 0, 0, w, h); URL.revokeObjectURL(u);
        c.toBlob(function (b) { b ? ok(b) : erro(new Error('png')); }, 'image/png');
      };
      img.onerror = function () { URL.revokeObjectURL(u); erro(new Error('svg')); }; img.src = u;
    });
  }

  var CSS_PAG = ':root{--bg:#f6f7fd;--card:#fff;--ink:#141942;--mut:#4c527c;--line:#d5d9ee;--acc:#2c33a0}' +
    '@media(prefers-color-scheme:dark){:root{--bg:#232a52;--card:#2f3969;--ink:#fafbff;--mut:#dde1f8;--line:#5d68ab;--acc:#c9ceff}}' +
    '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 ' + FONTE + ';padding:24px 16px}main{max-width:1100px;margin:0 auto}' +
    'h1{font-size:22px;margin:0 0 4px;font-weight:600}p.f{color:var(--mut);margin:0 0 14px;font-size:13px}figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:8px;overflow:auto}' +
    'svg{max-width:100%;height:auto;display:block}table{border-collapse:collapse;width:100%;font-size:13px;background:var(--card)}caption{text-align:left;font-weight:600;padding:8px 0}' +
    'th,td{border-bottom:1px solid var(--line);padding:7px 9px;text-align:left;vertical-align:top}th{color:var(--mut);font-weight:500;white-space:nowrap}th[aria-sort] button{background:none;border:0;font:inherit;color:inherit;cursor:pointer;padding:0}' +
    'th[aria-sort=ascending] button::after{content:" \\2191"}th[aria-sort=descending] button::after{content:" \\2193"}.tw{overflow:auto;border:1px solid var(--line);border-radius:12px}' +
    'details{margin-top:14px}summary{cursor:pointer;color:var(--acc)}footer{margin-top:18px;color:var(--mut);font-size:12px}a{color:var(--acc)}';
  function pagina(titulo, corpo, rodape, lang, extraScript) {
    return '<!doctype html><html lang="' + (lang === 'en' ? 'en' : 'pt-BR') + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(titulo) + '</title><style>' + CSS_PAG + '</style></head><body><main>' + corpo +
      '<footer>' + rodape.map(function (l) { return '<div>' + esc(l) + '</div>'; }).join('') + '</footer></main>' + (extraScript || '') + '</body></html>';
  }
  function tabelaHtmlInterna(t, ordenavel) {
    var h = '<div class="tw"><table' + (ordenavel ? ' id="t"' : '') + '><caption>' + esc(t.titulo) + ' (' + t.linhas.length + ')</caption><thead><tr>' +
      t.colunas.map(function (c, i) { return '<th scope="col"' + (ordenavel ? ' aria-sort="none"' : '') + '>' + (ordenavel ? '<button type="button" data-i="' + i + '">' + esc(c.rot) + '</button>' : esc(c.rot)) + '</th>'; }).join('') + '</tr></thead><tbody>';
    t.linhas.forEach(function (l) { h += '<tr>' + l.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; });
    return h + '</tbody></table></div>';
  }
  var SORT_JS = '<script>(function(){var t=document.getElementById("t");if(!t)return;t.tHead.addEventListener("click",function(e){var b=e.target.closest("button[data-i]");if(!b)return;var i=+b.dataset.i,th=b.parentNode,d=th.getAttribute("aria-sort")==="ascending"?-1:1;' +
    'Array.prototype.forEach.call(t.tHead.rows[0].cells,function(c){c.setAttribute("aria-sort","none")});th.setAttribute("aria-sort",d>0?"ascending":"descending");var rows=Array.prototype.slice.call(t.tBodies[0].rows);' +
    'rows.sort(function(a,b){var x=a.cells[i].textContent.trim(),y=b.cells[i].textContent.trim(),nx=parseFloat(x.replace(/\\./g,"").replace(",",".")),ny=parseFloat(y.replace(/\\./g,"").replace(",","."));' +
    'var r=(isFinite(nx)&&isFinite(ny)&&/^[-\\d.,\\s]/.test(x)&&/^[-\\d.,\\s]/.test(y))?nx-ny:x.localeCompare(y,undefined,{numeric:true});return r*d});rows.forEach(function(r){t.tBodies[0].appendChild(r)})})})();<\/script>';

  // HTML autocontido do grafico: SVG com titulos (dicas) + lista alternativa acessivel
  function htmlGrafico(snap) {
    var svg = svgGrafico(snap, { id: 'h' });
    var lista = '<details><summary>' + esc(snap.rotuloLista) + ' (' + snap.itens.length + ')</summary><div class="tw"><table><thead><tr>' + snap.colunasLista.map(function (c) { return '<th scope="col">' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      snap.itens.map(function (l) { return '<tr>' + l.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></details>';
    return pagina(snap.titulo, '<h1>' + esc(snap.titulo) + '</h1><p class="f">' + esc(snap.filtros.join(' · ')) + '</p><figure>' + svg + '</figure>' + lista, snap.rodape, snap.lang);
  }
  // t: { titulo, filtros, colunas:[{rot}], linhas:[[txt]], rodape, lang }
  function htmlTabela(t) { return pagina(t.titulo, '<h1>' + esc(t.titulo) + '</h1><p class="f">' + esc(t.filtros.join(' · ')) + '</p>' + tabelaHtmlInterna(t, true), t.rodape, t.lang, SORT_JS); }

  // tabela como SVG/PNG, em paginas de ate 'porPagina' linhas
  function svgsTabela(t, porPagina) {
    porPagina = porPagina || 100;
    var cols = t.colunas, larg = cols.map(function (c, i) { var m = c.rot.length; t.linhas.forEach(function (l) { m = Math.max(m, Math.min(34, String(l[i]).length)); }); return Math.max(54, Math.round(m * 6.9 + 18)); });
    var W = larg.reduce(function (a, b) { return a + b; }, 40), paginas = [], np = Math.max(1, Math.ceil(t.linhas.length / porPagina));
    for (var p = 0; p < np; p++) {
      var fatia = t.linhas.slice(p * porPagina, (p + 1) * porPagina), H = 92 + 26 + fatia.length * 24 + 24 + t.rodape.length * 14 + 12;
      var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(t.titulo) + '" font-family="' + esc(FONTE) + '"><title>' + esc(t.titulo) + '</title>' +
        '<rect width="' + W + '" height="' + H + '" fill="#ffffff"/><text x="20" y="30" fill="#141942" font-size="18" font-weight="600">' + esc(t.titulo) + (np > 1 ? ' (' + (p + 1) + '/' + np + ')' : '') + '</text>' +
        '<text x="20" y="52" fill="#4c527c" font-size="12">' + esc(t.filtros.join(' · ')) + ' · ' + t.linhas.length + '</text>';
      var y0 = 76, x = 20; s += '<rect x="10" y="' + y0 + '" width="' + (W - 20) + '" height="26" fill="#eff1fc"/>';
      cols.forEach(function (c, i) { s += '<text x="' + x + '" y="' + (y0 + 17) + '" fill="#4c527c" font-size="11" font-weight="600">' + esc(c.rot) + '</text>'; x += larg[i]; });
      fatia.forEach(function (l, r) { var y = y0 + 26 + r * 24; if (r % 2) s += '<rect x="10" y="' + y + '" width="' + (W - 20) + '" height="24" fill="#f7f8fd"/>'; var xx = 20;
        l.forEach(function (c, i) { var tx = String(c); if (tx.length > 34) tx = tx.slice(0, 33) + '…'; s += '<text x="' + xx + '" y="' + (y + 16) + '" fill="#141942" font-size="11.5">' + esc(tx) + '</text>'; xx += larg[i]; }); });
      var yf = y0 + 26 + fatia.length * 24 + 24; t.rodape.forEach(function (ln, i) { s += '<text x="20" y="' + (yf + i * 14) + '" fill="#4c527c" font-size="10.5">' + esc(ln) + '</text>'; });
      paginas.push(s + '</svg>');
    }
    return paginas;
  }

  window.MAPA_EXPORT = { svgGrafico: svgGrafico, htmlGrafico: htmlGrafico, htmlTabela: htmlTabela, svgsTabela: svgsTabela, svgParaPng: svgParaPng, baixar: baixar };
})();
