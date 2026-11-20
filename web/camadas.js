// Camada de adaptacao dos dados de datasets e benchmarks (unico ponto que conhece o contrato de campos).
// Entrada: window.MAPA_DADOS.datasets / .benchmarks; sem essas chaves, as abas Datasets e Benchmarks ficam ocultas.
// Para exercitar a interface com dados de teste sinteticos: abrir a pagina com ?fixture=1.
// Dataset:   {id, publicador, nome, url, descricao, idiomas[], pt_br, tarefas[], licenca, tamanho_bytes, downloads, likes, atualizado, escopo, benchmarks[]}
// Benchmark: {id, nome, sigla, descricao{pt,en}, dominio[], idiomas[], tarefas[], tipo, datasets[], criador, ano, links{}}
(function () {
  var D = window.MAPA_DADOS || {}, fx = /[?&]fixture=/.test(location.search) && window.MAPA_FIXTURE_CAMADAS;
  var src = { datasets: D.datasets, benchmarks: D.benchmarks };
  if (!(src.datasets && src.datasets.length) && !(src.benchmarks && src.benchmarks.length) && fx) src = fx;
  var arr = function (x) { return Array.isArray(x) ? x : (x == null || x === '' ? [] : [x]); };
  var num = function (x) { var n = Number(x); return isFinite(n) && x !== null && x !== '' ? n : null; };
  var str = function (x) { return x == null ? '' : String(x); };
  function dataset(d) {
    return { id: str(d.id), publicador: str(d.publicador), nome: str(d.nome || d.id), url: str(d.url), descricao: str(d.descricao), idiomas: arr(d.idiomas).map(str),
      pt_br: !!d.pt_br, tarefas: arr(d.tarefas).map(str), licenca: d.licenca ? str(d.licenca) : null, tamanho_bytes: num(d.tamanho_bytes), downloads: num(d.downloads) || 0,
      likes: num(d.likes) || 0, atualizado: str(d.atualizado).slice(0, 10), escopo: str(d.escopo), benchmarks: arr(d.benchmarks).map(str) };
  }
  function benchmark(b) {
    var ds = b.descricao; if (typeof ds === 'string') ds = { pt: ds, en: ds };
    return { id: str(b.id), nome: str(b.nome || b.sigla || b.id), sigla: str(b.sigla), descricao: { pt: str(ds && ds.pt), en: str(ds && ds.en) }, dominio: arr(b.dominio).map(str),
      idiomas: arr(b.idiomas).map(str), tarefas: arr(b.tarefas).map(str), tipo: str(b.tipo), datasets: arr(b.datasets).map(str), criador: str(b.criador), ano: num(b.ano), links: b.links && typeof b.links === 'object' ? b.links : {} };
  }
  var ds = arr(src.datasets).filter(function (d) { return d && d.id; }).map(dataset), bm = arr(src.benchmarks).filter(function (b) { return b && b.id; }).map(benchmark);
  window.MAPA_CAMADAS = { datasets: ds, benchmarks: bm, fixture: src === fx };
})();
