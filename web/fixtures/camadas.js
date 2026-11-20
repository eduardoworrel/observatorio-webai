// FIXTURE DE TESTE, SINTETICA: nomes, numeros e relacoes sao inventados e existem so para exercitar a interface
// (abra a pagina com ?fixture=1). Nada aqui descreve datasets ou benchmarks reais. Campos do contrato de camadas.
(function () {
  var sd = 7301, rnd = function () { sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0; return sd / 4294967296; };
  var pick = function (a) { return a[Math.floor(rnd() * a.length)]; };
  var pubs = ['exemplo-lab-a', 'exemplo-lab-b', 'exemplo-grupo-c', 'exemplo-univ-d', 'exemplo-empresa-e', 'exemplo-pessoa-f', 'exemplo-coletivo-g', 'exemplo-instituto-h'];
  var tarefas = ['question-answering', 'text-classification', 'summarization', 'translation', 'text-generation', 'token-classification', 'natural-language-inference'];
  var licencas = ['cc-by-4.0', 'cc-by-sa-4.0', 'apache-2.0', 'mit', 'cc-by-nc-4.0', 'cc0-1.0', 'other', null];
  var langs = [['pt-BR'], ['pt-BR'], ['pt-BR', 'en'], ['pt'], ['en'], ['en', 'es', 'pt'], ['es'], ['fr', 'de']];
  var ds = [];
  for (var i = 1; i <= 40; i++) {
    var l = pick(langs), ptbr = l.indexOf('pt-BR') >= 0, mb = Math.pow(10, 0.3 + rnd() * 4.5);
    ds.push({
      id: 'exemplo/dataset-' + (i < 10 ? '0' + i : i), publicador: pick(pubs), nome: 'Exemplo de dataset ' + i,
      url: 'https://exemplo.invalid/datasets/' + i, descricao: 'Dataset sintetico de teste numero ' + i + '.',
      idiomas: l, pt_br: ptbr, tarefas: [pick(tarefas)].concat(rnd() > 0.7 ? [pick(tarefas)] : []), licenca: pick(licencas),
      tamanho_bytes: rnd() > 0.1 ? Math.round(mb * 1e6) : null, downloads: Math.round(Math.pow(10, 1 + rnd() * 4.5)), likes: Math.round(rnd() * 400),
      atualizado: '2026-0' + (1 + Math.floor(rnd() * 9)) + '-' + (10 + Math.floor(rnd() * 18)), escopo: ptbr ? 'br' : (l.indexOf('pt') >= 0 ? 'pt' : 'mundo'), benchmarks: []
    });
  }
  var dominios = ['conhecimento', 'raciocinio', 'codigo', 'seguranca', 'direito', 'saude', 'instrucoes', 'multimodal'];
  var tipos = ['multipla-escolha', 'geracao-aberta', 'julgamento-por-modelo', 'tarefa-de-agente'];
  var criadores = ['Grupo Exemplo A', 'Grupo Exemplo B', 'Instituto Exemplo C', 'Universidade Exemplo D'];
  var bm = [];
  for (var j = 1; j <= 12; j++) {
    var dom = [dominios[(j - 1) % dominios.length]].concat(rnd() > 0.75 ? [pick(dominios)] : []), bl = pick(langs);
    var alvo = [], n = 1 + Math.floor(rnd() * 5), bid = 'exemplo/benchmark-' + (j < 10 ? '0' + j : j);
    for (var k = 0; k < n; k++) { var d = pick(ds); if (alvo.indexOf(d.id) < 0) alvo.push(d.id); }
    ds.forEach(function (d) { if (alvo.indexOf(d.id) >= 0) d.benchmarks.push(bid); });
    bm.push({
      id: bid, nome: 'Benchmark de exemplo ' + j, sigla: 'BE' + j,
      descricao: { pt: 'Benchmark sintetico de teste numero ' + j + '.', en: 'Synthetic test benchmark number ' + j + '.' },
      dominio: dom, idiomas: bl, tarefas: [pick(tarefas)], tipo: pick(tipos), datasets: alvo, criador: pick(criadores), ano: 2022 + Math.floor(rnd() * 5),
      links: { artigo: 'https://exemplo.invalid/artigo/' + j, repositorio: 'https://exemplo.invalid/repo/' + j }
    });
  }
  window.MAPA_FIXTURE_CAMADAS = { datasets: ds, benchmarks: bm };
})();
