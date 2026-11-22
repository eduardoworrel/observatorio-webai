// Camada de adaptacao dos dados de datasets e benchmarks: unico ponto que conhece o contrato (docs/CONTRATO_CAMADAS.md, versoes 1 e 2).
// Contrato 2 dos datasets: `escopo` = 'br' | 'mundo' (pelo pais do PUBLICADOR, como nos modelos) e `pt` (portugues entre os idiomas) alem de `pt_br`.
// Formato antigo: `escopo` 'br' | 'pt'; 'pt' vira escopo 'mundo' com pt = verdadeiro.
// Entrada: window.MAPA_DADOS.datasets ({colunas, linhas[]}) e .benchmarks (lista de objetos); sem essas chaves, as abas ficam ocultas.
// Com ?fixture=1 usa a fixture de teste (window.MAPA_CAMADAS_FIXTURE, dados de exemplo) no lugar dos dados.
(function () {
  var fx = /[?&]fixture=(1|camadas|camadas2)\b/.test(location.search) && window.MAPA_CAMADAS_FIXTURE;
  var arr = function (x) { return Array.isArray(x) ? x : (x == null || x === '' ? [] : [x]); };
  var num = function (x) { var n = Number(x); return x !== null && x !== '' && x !== undefined && isFinite(n) ? n : null; };
  var str = function (x) { return x == null ? '' : String(x); };
  function linhasDeDatasets(d) {   // formato compacto {colunas, linhas} (contrato 1) ou lista de objetos
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (!d.colunas || !d.linhas) return [];
    return d.linhas.map(function (l) { var o = {}; d.colunas.forEach(function (c, i) { o[c] = l[i]; }); return o; });
  }
  function escopoPt(d, idiomas) {   // compativel com o formato antigo (escopo 'pt') e com o contrato 2 (escopo br|mundo, coluna pt)
    var ant = d.escopo === 'pt', escopo = d.escopo === 'br' ? 'br' : 'mundo';
    var pt = d.pt != null ? !!d.pt : (ant || !!d.pt_br || idiomas.some(function (i) { return /^pt/i.test(i); }));
    return { escopo: escopo, pt: pt };
  }
  function dataset(d) {
    var idi = arr(d.idiomas).map(str), ep = escopoPt(d, idi);
    return { id: str(d.id), publicador: str(d.publicador), nome: str(d.nome || d.id), url: str(d.url) || (d.id ? 'https://huggingface.co/datasets/' + d.id : ''), descricao: str(d.descricao),
      idiomas: idi, pt: ep.pt, pt_br: !!d.pt_br, tarefas: arr(d.tarefas).map(str), licenca: d.licenca ? str(d.licenca) : null,
      tamanho_bytes: num(d.bytes != null ? d.bytes : d.tamanho_bytes), faixa: d.faixa ? str(d.faixa) : null, linhas_faixa: d.linhas_faixa ? str(d.linhas_faixa) : null,
      downloads: num(d.downloads) || 0, likes: num(d.likes) || 0, atualizado: str(d.atualizado).slice(0, 10), escopo: ep.escopo, benchmarks: arr(d.benchmarks).map(str) };
  }
  function benchmark(b) {
    var ds = b.descricao; if (typeof ds === 'string') ds = { pt: ds, en: ds };
    var cr = b.criador && typeof b.criador === 'object' ? (b.criador.nome || b.criador.publicador || '') : str(b.criador);
    return { id: str(b.id), nome: str(b.nome || b.sigla || b.id), sigla: str(b.sigla), descricao: { pt: str(ds && ds.pt), en: str(ds && ds.en) }, dominio: arr(b.dominio).map(str),
      idiomas: arr(b.idiomas).map(str), tarefas: arr(b.tarefas).map(str), tipo: str(b.tipo), datasets: arr(b.datasets).map(str), criador: str(cr), ano: num(b.ano),
      links: b.links && typeof b.links === 'object' ? b.links : {}, fontes: arr(b.fontes).filter(function (f) { return f && f.url; }), n_datasets: num(b.n_datasets), downloads_total: num(b.downloads_total) || 0 };
  }
  // Le (de novo) os dados da pagina: chamada na carga e depois que as partes sob demanda (data-datasets.js, data-benchmarks.js) chegam.
  function ler() {
    var D = window.MAPA_DADOS || {}, src = fx ? fx : { datasets: D.datasets, benchmarks: D.benchmarks, foto_camadas: D.foto_camadas };
    var ds = linhasDeDatasets(src.datasets).filter(function (d) { return d && d.id; }).map(dataset);
    var bm = arr(src.benchmarks).filter(function (b) { return b && b.id; }).map(benchmark);
    return { datasets: ds, benchmarks: bm, foto: src.foto_camadas || null, fixture: !!fx };
  }
  window.MAPA_CAMADAS_LER = ler;
  window.MAPA_CAMADAS = ler();
})();
