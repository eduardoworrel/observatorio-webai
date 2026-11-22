// Fixture do contrato 2 dos datasets (so para teste da interface): ~7.000 datasets, escopo br | mundo e colunas pt e pt_br. Determinista.
(function () {
  var sd = 20261121, rr = function () { sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0; return sd / 4294967296; };
  var cols = ['id', 'publicador', 'nome', 'descricao', 'idiomas', 'pt_br', 'tarefas', 'licenca', 'tamanho_bytes', 'faixa', 'linhas_faixa', 'downloads', 'likes', 'atualizado', 'escopo', 'benchmarks', 'pt'];
  var LIC = ['cc-by-4.0', 'apache-2.0', 'mit', 'cc-by-nc-4.0', null, 'cc0-1.0'], TAR = ['text-generation', 'question-answering', 'text-classification', 'translation', 'summarization'], IDI = [['en'], ['pt'], ['pt-BR'], ['en', 'pt'], ['es'], ['fr'], ['de'], ['zh']];
  var FX = [[0, 100], [1e6, 1e8], [1e8, 1e9], [1e9, 1e10], [1e10, 5e10]];
  var linhas = [], N = 7000, NBR = 255;
  for (var i = 0; i < N; i++) {
    var br = i < NBR, pub = (br ? 'fx-br-' : 'fx-mundo-') + (br ? i % 40 : i % 900), idi = br ? (rr() < 0.7 ? ['pt-BR'] : ['pt']) : IDI[Math.floor(rr() * IDI.length)], pt = idi.some(function (x) { return /^pt/i.test(x); }), ptbr = idi.indexOf('pt-BR') >= 0;
    var f = FX[Math.floor(rr() * FX.length)], tam = Math.round(f[0] + rr() * (f[1] - f[0]));
    linhas.push(['fx/' + pub + '-ds-' + i, pub, 'ds-' + i, 'Dataset de exemplo ' + i, idi, ptbr, [TAR[Math.floor(rr() * TAR.length)]], LIC[Math.floor(rr() * LIC.length)], tam, tam < 1e6 ? '<1MB' : tam < 1e8 ? '1-100MB' : tam < 1e9 ? '100MB-1GB' : tam < 1e10 ? '1-10GB' : '>10GB', null, Math.round(Math.pow(rr(), 3) * 1e5), Math.round(rr() * 300), '2026-11-0' + (1 + (i % 9)), br ? 'br' : 'mundo', [], pt]);
  }
  window.MAPA_CAMADAS_FIXTURE = { datasets: { colunas: cols, linhas: linhas }, benchmarks: [], foto_camadas: null };
})();
