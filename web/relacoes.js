// Camada de adaptacao das relacoes (instituicoes, laboratorios, vinculos, familia de tarefa).
// Unico ponto que conhece o contrato (docs/CONTRATO_RELACOES.md, versao 1). Sem as chaves nos dados, a interface esconde os
// recursos de instituicao; a familia de tarefa tem um padrao derivado da tarefa (mesma regra do contrato).
// Com ?fixture=relacoes usa a fixture de teste (dados de exemplo) sobre os publicadores reais do mapa, so para exercitar a interface.
(function () {
  var D = window.MAPA_DADOS || {}, fx = /[?&]fixture=relacoes/.test(location.search) && window.MAPA_RELACOES_FIXTURE;
  var GERADOR = { 'text-generation': 1, 'image-text-to-text': 1, 'any-to-any': 1, 'text2text-generation': 1 };
  var famDeTarefa = function (t) { return GERADOR[t] || !t ? 'gerador' : 'codificador'; };
  var arr = function (x) { return Array.isArray(x) ? x : []; };

  if (fx) {   // sobrepoe a fixture a publicadores e modelos reais, na ordem do tamanho, so para teste
    var pubs = {}; (D.modelos || []).forEach(function (m) { pubs[m.publicador] = (pubs[m.publicador] || 0) + 1; });
    var ordem = Object.keys(pubs).sort(function (a, b) { return pubs[b] - pubs[a]; }).filter(function (p) { return p !== 'g-assismoraes'; }), mapa = {};
    ['fixture-pub-1', 'fixture-pub-2', 'fixture-pub-3', 'fixture-pub-4', 'fixture-pub-5', 'fixture-pub-6', 'fixture-pessoa-7'].forEach(function (f, i) { mapa[f] = ordem[i + 2] || ordem[i]; });
    var pid = function (x) { return mapa[x] || x; }, pref = function (x) { var m = /^pub:(.*)$/.exec(x); return m ? 'pub:' + pid(m[1]) : x; };
    D.instituicoes = JSON.parse(JSON.stringify(fx.instituicoes)).map(function (i) { i.publicadores = i.publicadores.map(pid); return i; });
    D.laboratorios = JSON.parse(JSON.stringify(fx.laboratorios)).map(function (l) { l.publicadores = l.publicadores.map(pid); return l; });
    D.vinculos = { colunas: fx.vinculos.colunas, linhas: fx.vinculos.linhas.map(function (l) { return [pref(l[0]), pref(l[1]), l[2], l[3]]; }) };
    (D.publicadores || []).forEach(function (p) { p.instituicoes = []; p.labs = []; p.relacionados = []; });
    var pb = {}; (D.publicadores || []).forEach(function (p) { pb[p.id] = p; });
    D.vinculos.linhas.forEach(function (l) {
      var a = /^pub:(.*)$/.exec(l[0]), b = /^(inst|lab):(.*)$/.exec(l[1]), c = /^pub:(.*)$/.exec(l[1]);
      if (a && pb[a[1]] && b) { if (b[1] === 'inst') pb[a[1]].instituicoes.push(b[2]); else { pb[a[1]].labs.push(b[2]); var lb = D.laboratorios.filter(function (x) { return x.id === b[2]; })[0]; if (lb) pb[a[1]].instituicoes.push(lb.instituicao); } }
      if (a && c && l[2] === 'relacionado' && pb[a[1]] && pb[c[1]]) { pb[a[1]].relacionados.push(c[1]); pb[c[1]].relacionados.push(a[1]); }
    });
    (D.modelos || []).forEach(function (m, i) { if (i % 7 === 3 && pb[m.publicador] && pb[m.publicador].instituicoes.length) { m.familia_tarefa = 'codificador'; m.tarefa = 'fill-mask'; } });
    var ult = (D.modelos || []).filter(function (m) { return m.publicador === pid('fixture-pub-1'); })[0]; if (ult) ult.creditos = ['lab:fixture-lab-1', 'inst:fixture-empresa-b'];
  }

  var inst = arr(D.instituicoes), lab = arr(D.laboratorios), instBy = {}, labBy = {};
  inst.forEach(function (i) { instBy[i.id] = i; }); lab.forEach(function (l) { labBy[l.id] = l; });
  var vinc = [];
  if (D.vinculos && D.vinculos.colunas && D.vinculos.linhas) vinc = D.vinculos.linhas.map(function (l) { var o = {}; D.vinculos.colunas.forEach(function (c, i) { o[c] = l[i]; }); return o; });
  var disponivel = inst.length > 0;
  var raiz = function (id) { var n = 0; while (instBy[id] && instBy[id].parte_de && instBy[instBy[id].parte_de] && n++ < 10) id = instBy[id].parte_de; return id; };
  var rot = function (x) { return x ? (x.sigla || x.nome) : ''; };

  // por publicador: instituicoes e laboratorios (de publicadores[] ou, se faltar, dos vinculos)
  var porPub = {};
  var tem = function (p) { return porPub[p] || (porPub[p] = { inst: [], labs: [], rel: [], membro: [] }); };
  arr(D.publicadores).forEach(function (p) { var o = tem(p.id); o.inst = arr(p.instituicoes).slice(); o.labs = arr(p.labs).slice(); o.rel = arr(p.relacionados).slice(); o.membro = arr(p.membro_de).slice(); });
  vinc.forEach(function (v) {
    var a = /^pub:(.*)$/.exec(v.de), b = /^(inst|lab):(.*)$/.exec(v.para); if (!a || !b) return; var o = tem(a[1]);
    if (b[1] === 'inst' && o.inst.indexOf(b[2]) < 0) o.inst.push(b[2]);
    if (b[1] === 'lab') { if (o.labs.indexOf(b[2]) < 0) o.labs.push(b[2]); var l = labBy[b[2]]; if (l && o.inst.indexOf(l.instituicao) < 0) o.inst.push(l.instituicao); }
  });
  var pares = [], vistos = {};
  vinc.forEach(function (v) { var a = /^pub:(.*)$/.exec(v.de), b = /^pub:(.*)$/.exec(v.para); if (a && b && v.tipo === 'relacionado' && !vistos[a[1] + '|' + b[1]]) { vistos[a[1] + '|' + b[1]] = 1; pares.push([a[1], b[1]]); } });
  Object.keys(porPub).forEach(function (p) { porPub[p].rel.forEach(function (q) { if (!vistos[p + '|' + q] && !vistos[q + '|' + p]) { vistos[p + '|' + q] = 1; pares.push([p, q]); } }); });

  window.MAPA_REL = {
    disponivel: disponivel, fixture: !!fx, inst: inst, lab: lab, instBy: instBy, labBy: labBy, vinculos: vinc, pares: pares, porPub: porPub,
    famDeTarefa: famDeTarefa, raiz: raiz, rot: rot,
    instDoPub: function (p) { return (porPub[p] || { inst: [] }).inst; }, labsDoPub: function (p) { return (porPub[p] || { labs: [] }).labs; },
    raizDoPub: function (p) { var l = (porPub[p] || { inst: [] }).inst; return l.length ? raiz(l[0]) : null; },
    labDoPub: function (p) { var l = (porPub[p] || { labs: [] }).labs; return l.length ? l[0] : null; }
  };
})();
