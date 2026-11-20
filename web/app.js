(function () {
  'use strict';
  var D = window.MAPA_DADOS;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var pubBy = {}, modBy = {};
  D.publicadores.forEach(function (p) { pubBy[p.id] = p; });
  D.modelos.forEach(function (m) { modBy[m.id] = m; });

  var T = {
    pt: {
      skip: 'Pular o mapa e ir para a tabela', brand_sub: 'de Web AI no Brasil e no mundo', nav_inicio: 'Início', nav_metodo: 'Como lemos os dados',
      eyebrow: 'Modelos no navegador e na borda', desc: 'Quem publica modelos de linguagem, no Brasil e no mundo, e quais deles já têm build para rodar no navegador.',
      act1: 'Explorar o mapa ↗', act2: 'Como lemos os dados →', res_label: 'Modelos', res_titulo: 'Quem já roda no navegador', res_link: 'Regras ↗',
      br: 'Brasil', mundo: 'Mundo', todos: 'Tudo', v_todos: 'Todos', v_nativo: 'Nativo', v_gguf: '+ GGUF', v_nenhum: 'Sem build', f_nat: 'Natureza do publicador', buscar: 'Buscar', buscar_ph: 'Buscar',
      porpub: 'Publicador', porfam: 'Família', recentrar: 'Recentrar ⌾', hint: 'Arraste ou aproxime para filtrar a tabela.', sky_nota: 'Posição é só organização por grupo; brilho e cor indicam o status do build; tamanho, o download.',
      p1_t: 'Quem já tem build?<br>Quem não tem?', p1_p: 'Tabela com status, tamanho e fontes de cada modelo.', p2_t: 'E o GGUF?<br>Roda no navegador?', p2_p: 'Via wllama, até um tamanho plausível. Contado à parte.',
      p3_t: 'O que é um modelo<br>brasileiro?', p3_p: 'Criado por brasileiros, com evidência pública por publicador.', m_t: 'Como lemos os dados',
      credito: 'Inspirado no Observatório da Maritaca ↗', privacidade: 'Privacidade', fonte_lic: 'Fonte Atkinson Hyperlegible, licença SIL OFL 1.1.',
      c_modelo: 'Modelo', c_status: 'Build', c_gb: 'GB (q4)', c_lic: 'Licença', c_upd: 'Atualizado',
      oficial: 'Nativo · publicador', comunidade: 'Nativo · comunidade', gguf: 'GGUF via wllama', nenhum: 'Sem build', gguf_grande: 'GGUF grande demais',
      n_todos: 'Todas as naturezas', independente: 'Independente', instituicao: 'Instituição', empresa: 'Empresa', nao_classificada: 'Natureza não classificada',
      cl_br_evidencia: 'Brasil (evidência)', cl_nao_classificado: 'Não classificado', cl_fora_br: 'Fora do Brasil',
      campo: 'modelos no mapa', sem_modelos: 'Nenhum modelo neste recorte.', mais: 'Mostrar mais',
      recorte: 'modelos no recorte', so_nativo: 'nativo', nativo_gguf: 'nativo + GGUF', semb: 'sem build',
      em_obs: 'Em observação', constelacao: 'Constelação', abrir_hf: 'Abrir no Hugging Face ↗', perfil_hf: 'Perfil no Hugging Face ↗', fontes: 'Fontes e evidências',
      publicador: 'Publicador', familia: 'Família', parametros: 'Parâmetros', atualizado: 'Atualizado em', download: 'Download', modelos: 'modelos', de: 'de',
      aviso: 'Existir um build não quer dizer que roda. GGUF conta se a menor variante Q4 couber em até 4 GB (wllama, WebAssembly). Amostra: todos os modelos de linguagem de até 12 B de cada publicador classificado.',
      inv_br: 'Brasil: build nativo', inv_mu: 'Mundo: build nativo', inv_pub: 'Publicadores brasileiros',
      inv_br_p: 'ONNX, MLC ou LiteRT. Com GGUF via wllama:', inv_pub_p: 'independentes, instituições e empresas, com evidência pública.', descartados: 'candidatos sem evidência ficaram de fora',
      leg_of: 'Nativo, do publicador', leg_co: 'Nativo, da comunidade', leg_gg: 'GGUF via wllama', leg_no: 'Sem build',
      m1_t: 'Status do build', m1_a: 'Nativo: arquivos em ONNX (Transformers.js), MLC (WebLLM) ou LiteRT, publicados pelo próprio publicador ou pela comunidade.', m1_b: 'GGUF via wllama: conta à parte, só se a menor variante Q4 tiver até 4 GB (limite do WebAssembly de 32 bits; arquivo de até 2 GB por parte).', m1_c: 'Existir não é rodar: o mapa não executa modelos.',
      m2_t: 'Modelo brasileiro', m2_a: 'Modelo criado por brasileiros (pessoa, grupo, empresa ou universidade do Brasil), inclusive ajuste fino sobre base estrangeira. Não é "em português feito por estrangeiros".', m2_b: 'Cada publicador só entra com evidência pública guardada com link e data: site .br no perfil, descrição do perfil, cartão do modelo ou página institucional. Sem evidência, fica fora do mapa.', m2_c: 'Classes: Brasil (evidência), Não classificado, Fora do Brasil.',
      m3_t: 'Independente, instituição, empresa', m3_a: 'Independente: pessoa ou grupo pequeno sem vínculo institucional declarado. Instituição: universidade ou instituto. Empresa: declarada no perfil ou em página institucional.', m3_b: 'A ausência de vínculo declarado não prova que não exista; a evidência fica registrada em cada publicador.', m3_c: 'Dados: API pública do Hugging Face, coletados por regra, sem modelo de linguagem decidindo.',
      rodape: 'Dados do Hugging Face de', modelo: 'Modelo', tarefa: 'Tarefa', evidencias: 'Evidências', ev_pais: 'País', ev_nat: 'Natureza', n_mod: 'modelos mapeados', gguf_nota: 'GGUF existe, mas passa de 4 GB.', fam_t: 'Família', src_perfil_oficial: 'perfil oficial', src_site_institucional: 'site institucional', src_pagina_pessoa: 'página da pessoa', src_artigo: 'artigo', src_repositorio: 'repositório', src_cartao_modelo: 'cartão do modelo', src_orgao_fomento: 'órgão de fomento', src_perfil: 'perfil', src_cartao: 'cartão do modelo', src_institucional: 'página institucional', src_curadoria: 'lista curada', src_perfil_cartao: 'perfil ou cartão'
    },
    en: {
      skip: 'Skip the map and go to the table', brand_sub: 'of Web AI in Brazil and the world', nav_inicio: 'Home', nav_metodo: 'How we read the data',
      eyebrow: 'Models in the browser and at the edge', desc: 'Who publishes language models, in Brazil and worldwide, and which of them already have a build that runs in the browser.',
      act1: 'Explore the map ↗', act2: 'How we read the data →', res_label: 'Models', res_titulo: 'Who already runs in the browser', res_link: 'Rules ↗',
      br: 'Brazil', mundo: 'World', todos: 'All', v_todos: 'All', v_nativo: 'Native', v_gguf: '+ GGUF', v_nenhum: 'No build', f_nat: 'Publisher type', buscar: 'Search', buscar_ph: 'Search',
      porpub: 'Publisher', porfam: 'Family', recentrar: 'Recenter ⌾', hint: 'Drag or zoom to filter the table.', sky_nota: 'Position is only grouping; brightness and color show build status; size shows the download.',
      p1_t: 'Who already has a build?<br>Who does not?', p1_p: 'A table with status, size and sources for each model.', p2_t: 'What about GGUF?<br>Does it run in the browser?', p2_p: 'Via wllama, up to a plausible size. Counted separately.',
      p3_t: 'What is a Brazilian<br>model?', p3_p: 'Created by Brazilians, with public evidence per publisher.', m_t: 'How we read the data',
      credito: 'Inspired by the Maritaca Observatory ↗', privacidade: 'Privacy', fonte_lic: 'Atkinson Hyperlegible font, SIL OFL 1.1 license.',
      c_modelo: 'Model', c_status: 'Build', c_gb: 'GB (q4)', c_lic: 'License', c_upd: 'Updated',
      oficial: 'Native · publisher', comunidade: 'Native · community', gguf: 'GGUF via wllama', nenhum: 'No build', gguf_grande: 'GGUF too large',
      n_todos: 'All types', independente: 'Independent', instituicao: 'Institution', empresa: 'Company', nao_classificada: 'Type not classified',
      cl_br_evidencia: 'Brazil (evidence)', cl_nao_classificado: 'Not classified', cl_fora_br: 'Outside Brazil',
      campo: 'models on the map', sem_modelos: 'No model in this selection.', mais: 'Show more',
      recorte: 'models in selection', so_nativo: 'native', nativo_gguf: 'native + GGUF', semb: 'no build',
      em_obs: 'In focus', constelacao: 'Constellation', abrir_hf: 'Open on Hugging Face ↗', perfil_hf: 'Hugging Face profile ↗', fontes: 'Sources and evidence',
      publicador: 'Publisher', familia: 'Family', parametros: 'Parameters', atualizado: 'Updated on', download: 'Download', modelos: 'models', de: 'of',
      aviso: 'A build existing does not mean it runs. GGUF counts if the smallest Q4 variant fits in 4 GB (wllama, WebAssembly). Sample: every language model up to 12 B from each classified publisher.',
      inv_br: 'Brazil: native build', inv_mu: 'World: native build', inv_pub: 'Brazilian publishers',
      inv_br_p: 'ONNX, MLC or LiteRT. With GGUF via wllama:', inv_pub_p: 'independents, institutions and companies, with public evidence.', descartados: 'candidates without evidence were left out',
      leg_of: 'Native, by the publisher', leg_co: 'Native, by the community', leg_gg: 'GGUF via wllama', leg_no: 'No build',
      m1_t: 'Build status', m1_a: 'Native: files in ONNX (Transformers.js), MLC (WebLLM) or LiteRT, published by the publisher itself or by the community.', m1_b: 'GGUF via wllama: counted separately, only if the smallest Q4 variant is up to 4 GB (32-bit WebAssembly limit; up to 2 GB per file part).', m1_c: 'Existing is not running: this map does not execute models.',
      m2_t: 'Brazilian model', m2_a: 'A model created by Brazilians (a person, group, company or university in Brazil), including fine-tunes on foreign bases. It is not "Portuguese made by foreigners".', m2_b: 'Each publisher only enters with public evidence stored with a link and date: a .br site on the profile, the profile description, the model card or an institutional page. Without evidence, it stays off the map.', m2_c: 'Classes: Brazil (evidence), Not classified, Outside Brazil.',
      m3_t: 'Independent, institution, company', m3_a: 'Independent: a person or small group with no declared institutional tie. Institution: university or institute. Company: declared on the profile or an institutional page.', m3_b: 'No declared tie does not prove there is none; the evidence is stored on each publisher.', m3_c: 'Data: public Hugging Face API, collected by rule, with no language model deciding.',
      rodape: 'Hugging Face data from', modelo: 'Model', tarefa: 'Task', evidencias: 'Evidence', ev_pais: 'Country', ev_nat: 'Type', n_mod: 'models mapped', gguf_nota: 'GGUF exists, but is over 4 GB.', fam_t: 'Family', src_perfil_oficial: 'official profile', src_site_institucional: 'institutional site', src_pagina_pessoa: 'personal page', src_artigo: 'paper', src_repositorio: 'repository', src_cartao_modelo: 'model card', src_orgao_fomento: 'funding agency', src_perfil: 'profile', src_cartao: 'model card', src_institucional: 'institutional page', src_curadoria: 'curated list', src_perfil_cartao: 'profile or card'
    }
  };
  var S = { lang: 'pt', escopo: 'todos', via: 'todos', nat: 'todas', busca: '', agrupar: 'publicador', sort: { k: 'via', d: 1 }, sel: null, paused: false, zoom: 1, panX: 0, panY: 0, limite: 150 };
  var qs = new URLSearchParams(location.search);
  try { var sl = localStorage.getItem('observatorio-lang'); if (sl) S.lang = sl; } catch (e) {}
  if (qs.get('lang')) S.lang = qs.get('lang') === 'en' ? 'en' : 'pt';
  if (qs.get('escopo')) S.escopo = qs.get('escopo');
  if (qs.get('via')) S.via = qs.get('via');
  if (qs.get('agrupar') === 'familia') S.agrupar = 'familia';
  if (qs.get('sky')) { var sv = qs.get('sky').split(',').map(Number); if (sv.length === 3 && sv.every(isFinite)) { S.zoom = sv[0]; S.panX = sv[1]; S.panY = sv[2]; } }
  var t = function (k) { return (T[S.lang] && T[S.lang][k]) || k; };
  var tipoFonte = function (x) { var v = T[S.lang] && T[S.lang]['src_' + String(x).replace(/\W+/g, '_')]; return v || String(x).replace(/_/g, ' '); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var nf = function (n, d) { return n == null ? '—' : n.toLocaleString(S.lang === 'pt' ? 'pt-BR' : 'en-US', { minimumFractionDigits: d == null ? 0 : d, maximumFractionDigits: d == null ? 2 : d }); };
  var mqDark = matchMedia('(prefers-color-scheme:dark)'), DK = false;
  function lerTema() { var th = document.documentElement.dataset.theme; return th ? th === 'dark' : mqDark.matches; }
  function isDark() { return DK; }
  DK = lerTema();
  var CORL = { oficial: [199, 125, 0], comunidade: [0, 137, 155], gguf: [111, 82, 216], nenhum: [74, 83, 150] };
  var pal = function () { return isDark() ? COR : CORL; };
  var COR = { oficial: [255, 209, 102], comunidade: [111, 227, 238], gguf: [182, 156, 255], nenhum: [196, 204, 245] };
  function viaOf(m) { return m.via === 'nativo' ? (m.status === 'oficial' ? 'oficial' : 'comunidade') : m.via === 'gguf' ? 'gguf' : 'nenhum'; }

  // ---------- filtros ----------
  function passa(m) {
    if (S.escopo !== 'todos' && m.escopo !== S.escopo) return false;
    if (S.via === 'nativo' && m.via !== 'nativo') return false;
    if (S.via === 'gguf' && m.via === 'nenhum') return false;
    if (S.via === 'nenhum' && m.via !== 'nenhum') return false;
    if (S.nat !== 'todas' && pubBy[m.publicador].natureza !== S.nat) return false;
    var q = S.busca.trim().toLowerCase();
    if (q && m.id.toLowerCase().indexOf(q) < 0 && pubBy[m.publicador].nome.toLowerCase().indexOf(q) < 0 && m.familia.toLowerCase().indexOf(q) < 0) return false;
    return true;
  }

  // ---------- grupos e layout (determinista) ----------
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
  var G = [], stars = [];
  function montar() {
    var base = D.modelos.filter(function (m) { return S.escopo === 'todos' || m.escopo === S.escopo; });
    var map = {};
    base.forEach(function (m) {
      var k = S.agrupar === 'publicador' ? m.publicador : m.familia.toLowerCase();
      var g = map[k] || (map[k] = { id: k, nome: S.agrupar === 'publicador' ? pubBy[m.publicador].nome : m.familia, ms: [], pub: S.agrupar === 'publicador' ? pubBy[m.publicador] : null });
      g.ms.push(m);
    });
    G = Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.ms.length - a.ms.length || (a.id < b.id ? -1 : 1); });
    var placed = [];
    G.forEach(function (g) {
      g.ms.sort(function (a, b) { return a.familia < b.familia ? -1 : a.familia > b.familia ? 1 : (b.downloads || 0) - (a.downloads || 0); });
      var R = 20 + 13 * Math.sqrt(g.ms.length); g.R = R;
      g.off = g.ms.map(function (m, i) { var a = i * 2.39996 + hash(g.id) * 6.28, r = 12 * Math.sqrt(i + 0.6); return [Math.cos(a) * r, Math.sin(a) * r]; });
      var ang = hash(g.id + 'a') * 6.28, rad = 0, ok = false, px = 0, py = 0, n = 0;
      while (!ok && n < 6000) {
        px = Math.cos(ang) * rad; py = Math.sin(ang) * rad;
        ok = placed.every(function (p) { return Math.hypot(p.x - px, p.y - py) > p.R + R + 8; });
        ang += 0.5; rad += 0.8; n++;
      }
      g.x = px; g.y = py; placed.push({ x: px, y: py, R: R });
    });
    var rmax = 1; G.forEach(function (g) { rmax = Math.max(rmax, Math.hypot(g.x, g.y) + g.R); });
    var k = 0.47 / rmax; stars = []; starOf = {}; grupoPorId = {};
    G.forEach(function (g) {
      g.u = 0.5 + g.x * k; g.v = 0.5 + g.y * k; g.k = k;
      g.ms.forEach(function (m, i) {
        var st = { m: m, g: g, u: 0.5 + (g.x + g.off[i][0]) * k, v: 0.5 + (g.y + g.off[i][1]) * k, r: 1.3 + Math.min(3, Math.sqrt(m.gb_navegador || m.gguf_gb || 0.4) * 1.25), xy: [0, 0], on: true, vis: false, dr: false };
        st.st = viaOf(m); st.idx = stars.length; st.ord = { oficial: 0, comunidade: 1, gguf: 2, nenhum: 3 }[st.st]; stars.push(st); starOf[m.id] = st; (g.stars = g.stars || []).push(st);
      });
    });
    var host = $('#sky-points'); host.innerHTML = '';
    G.forEach(function (g) {
      var b = document.createElement('button'); b.className = 'sky-model'; b.type = 'button'; b.dataset.g = g.id; b.setAttribute('aria-pressed', 'false');
      if (g.pub && g.pub.natureza === 'independente') b.classList.add('ind');
      b.innerHTML = '<span class="sky-name">' + esc(g.nome) + ' · ' + g.ms.length + '</span>';
      b.setAttribute('aria-label', g.nome + ', ' + g.ms.length + ' ' + t('modelos'));
      host.appendChild(b); g.el = b; g.nome_el = b.firstChild; grupoPorId[g.id] = g;
    });
    montarGrade(); medirRotulos(); filtroSuja = true; assinatura = null; estSuja = true; snap = null;
  }
  function medirRotulos() { G.forEach(function (g) { g.lw = g.nome_el.offsetWidth; g.lh = g.nome_el.offsetHeight; g.lx = g.ly = g.trAnt = null; g.hasAnt = undefined; g.insideAnt = undefined; }); }

  // ---------- camera e pintura ----------
  // Tecnicas de desempenho (nenhum elemento e removido; so muda como e desenhado):
  //  1 canvas unico por camada (nenhuma estrela ou ligacao e DOM); 2 sprites de brilho (sem gradiente por quadro);
  //  3 camada estatica em cache (ligacoes + estrelas sem build): transformada durante arrasto/zoom, redesenhada a cada 100 ms e ao parar;
  //  4 grade espacial: culling e hit-test so nas celulas visiveis; 5 agregacao visual: estrelas minusculas viram pontos;
  //  6 requestAnimationFrame com marcas de sujo; 7 cintilar em camada propria (canvas de brilho), 25 quadros/s, desligado com movimento reduzido;
  //  8 devicePixelRatio limitado a 2; 9 eventos passivos e hover em um quadro; 10 estrelas agrupadas por sprite para reduzir trocas de textura.
  var stage = $('#ceu'), canvas = $('#sky-canvas'), ctx = canvas.getContext('2d'), canvasB = $('#sky-canvas-brilho'), ctxB = canvasB.getContext('2d');
  var layer = document.createElement('canvas'), lctx = layer.getContext('2d');
  var W = 1, H = 1, RAD = 1, elapsed = 0, last = 0, drag = null, moved = 0, frame = 0, hoverStar = null, rectEst = null, visivel = true;
  var camSuja = true, pintSuja = true, estSuja = true, filtroSuja = true, assinatura = null, tabelaT = 0;
  var snap = null, ultRender = 0, ultInteracao = 0, interagindo = false, hoverPos = null;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function bounds() { S.zoom = Math.max(0.8, Math.min(8, S.zoom)); S.panX = Math.max(-0.7, Math.min(0.7, S.panX)); S.panY = Math.max(-0.7, Math.min(0.7, S.panY)); }
  var scale = function () { return 2 * RAD * 0.82 * S.zoom; };
  var STATS = { estrelas: 0, linhas: 0, desenhadasNaCamada: 0 };
  var arestas = { fam: [], outra: [] };
  var estrelasNenhum = [], estrelasBrilho = [], listaVis = [], visN = [], visB = [], grade = null;
  function agendar() { if (!frame) frame = requestAnimationFrame(loop); }
  function posicionar() { camSuja = true; pintSuja = true; agendar(); }
  function mexeu() { ultInteracao = performance.now(); interagindo = true; posicionar(); }
  function paint() { pintSuja = true; agendar(); }
  function filtrou() { filtroSuja = true; assinatura = null; camSuja = true; estSuja = true; pintSuja = true; agendar(); }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  // grade espacial em coordenadas do mapa (u, v)
  var CEL = 0.04, NC = Math.ceil(1 / CEL) + 1;
  function montarGrade() {
    grade = new Array(NC * NC);
    stars.forEach(function (s) { var i = Math.max(0, Math.min(NC - 1, Math.floor(s.v / CEL))) * NC + Math.max(0, Math.min(NC - 1, Math.floor(s.u / CEL))); (grade[i] = grade[i] || []).push(s); });
  }

  // sprites de brilho e nucleo, por status
  var RAZAO = { oficial: 6, comunidade: 5, gguf: 3.6 }, ALFA = { oficial: 0.55, comunidade: 0.42, gguf: 0.3 };
  var spr = {};
  function criarSprites() {
    var P = pal(); spr = {};
    ['oficial', 'comunidade', 'gguf', 'nenhum'].forEach(function (v) {
      var c = P[v], core = document.createElement('canvas'); core.width = core.height = 32;
      var cc = core.getContext('2d'); cc.fillStyle = rgba(c, 1); cc.beginPath(); cc.arc(16, 16, 16, 0, 6.2832); cc.fill();
      spr[v] = { core: core, cor: c };
      if (v !== 'nenhum') {
        var g = document.createElement('canvas'); g.width = g.height = 64; var gc = g.getContext('2d');
        var rg = gc.createRadialGradient(32, 32, 32 * 0.6 / RAZAO[v], 32, 32, 32);
        rg.addColorStop(0, rgba(c, 1)); rg.addColorStop(1, rgba(c, 0));
        gc.fillStyle = rg; gc.beginPath(); gc.arc(32, 32, 32, 0, 6.2832); gc.fill(); spr[v].glow = g;
      }
    });
  }
  function refreshTema() { DK = lerTema(); criarSprites(); estSuja = true; pintSuja = true; agendar(); }
  if (mqDark.addEventListener) mqDark.addEventListener('change', refreshTema);

  // pre-calculo por filtro: estrela ligada e arestas entre estrelas ligadas consecutivas de cada grupo
  function refiltrar() {
    filtroSuja = false; arestas = { fam: [], outra: [] };
    stars.forEach(function (s) { s.on = passa(s.m); });
    G.forEach(function (g) {
      var prev = null;
      g.stars.forEach(function (s) {
        if (!s.on) return;
        if (prev) (prev.m.familia === s.m.familia ? arestas.fam : arestas.outra).push([prev, s, g.ms.length < 4]);
        prev = s;
      });
    });
    var ord = { oficial: 0, comunidade: 1, gguf: 2 };
    estrelasNenhum = stars.filter(function (s) { return s.st === 'nenhum'; });
    estrelasBrilho = stars.filter(function (s) { return s.st !== 'nenhum'; }).sort(function (a, b) { return ord[a.st] - ord[b.st]; });
  }

  // culling pela grade: so as celulas dentro da janela; define vis (dentro) e dr (dentro com margem de 4 px)
  function projetar() {
    bounds();
    var sc = scale(), hx = W / 2 + (S.panX - 0.5) * sc, hy = H / 2 + (S.panY - 0.5) * sc, h = 17, n = 0, i;
    for (i = 0; i < listaVis.length; i++) { listaVis[i].vis = false; listaVis[i].dr = false; }
    listaVis.length = 0; visN.length = 0; visB.length = 0;
    var u0 = Math.max(0, Math.floor((-4 - hx) / sc / CEL)), u1 = Math.min(NC - 1, Math.floor((W + 4 - hx) / sc / CEL));
    var v0 = Math.max(0, Math.floor((-4 - hy) / sc / CEL)), v1 = Math.min(NC - 1, Math.floor((H + 4 - hy) / sc / CEL));
    for (var cy = v0; cy <= v1; cy++) for (var cx = u0; cx <= u1; cx++) {
      var cel = grade[cy * NC + cx]; if (!cel) continue;
      for (i = 0; i < cel.length; i++) {
        var s = cel[i], x = hx + s.u * sc, y = hy + s.v * sc;
        if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue;
        s.xy[0] = x; s.xy[1] = y; s.dr = true; s.vis = x >= 0 && x <= W && y >= 0 && y <= H; listaVis.push(s);
        (s.st === 'nenhum' ? visN : visB).push(s);
        if (s.vis && s.on) { h = (Math.imul(h, 31) + s.idx + 1) | 0; n++; }
      }
    }
    visB.sort(function (a, b) { return a.ord - b.ord || a.idx - b.idx; });
    return h ^ (n << 20);
  }

  // camada estatica: ligacoes e estrelas sem build, em bitmap proprio
  function renderEstatica() {
    var dk = DK, sc = Math.sqrt(S.zoom), l = lctx, dpr = canvas.width / W, esc2 = scale();
    var hx = W / 2 + (S.panX - 0.5) * esc2, hy = H / 2 + (S.panY - 0.5) * esc2;
    l.setTransform(1, 0, 0, 1, 0, 0); l.clearRect(0, 0, layer.width, layer.height); l.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = 0, R = 4;
    l.lineWidth = 0.7;
    [['fam', dk ? 'rgba(215,221,255,.42)' : 'rgba(50,60,150,.5)'], ['outra', dk ? 'rgba(215,221,255,.16)' : 'rgba(50,60,150,.18)']].forEach(function (t2) {
      var lista = arestas[t2[0]]; l.strokeStyle = t2[1];
      for (var i = 0; i < lista.length; i++) {
        var e = lista[i]; if (S.zoom < 1.15 && e[2]) continue;
        var ax = hx + e[0].u * esc2, ay = hy + e[0].v * esc2, bx = hx + e[1].u * esc2, by = hy + e[1].v * esc2;
        if (!((ax >= -R && ax <= W + R && ay >= -R && ay <= H + R) || (bx >= -R && bx <= W + R && by >= -R && by <= H + R))) continue;
        l.beginPath(); l.moveTo(ax, ay); l.lineTo(bx, by); l.stroke(); n++;   // um traco por ligacao (o alfa acumula nas ligacoes sobrepostas)
      }
    });
    STATS.linhas = n;
    var core = spr.nenhum.core, al = dk ? 0.5 : 0.6, peq = [[], []], c = spr.nenhum.cor;
    for (var j = 0; j < visN.length; j++) {
      var s = visN[j], r = s.r * (0.85 + 0.15 * sc) * 0.8;
      if (r < 1.5) { peq[s.on ? 1 : 0].push(s.xy[0] - r, s.xy[1] - r, 2 * r); continue; }   // agregacao visual: ponto
      l.globalAlpha = al * (s.on ? 1 : 0.1); l.drawImage(core, s.xy[0] - r, s.xy[1] - r, 2 * r, 2 * r);
    }
    [[0, al * 0.1], [1, al]].forEach(function (g) { var arr = peq[g[0]]; if (!arr.length) return; l.globalAlpha = 1; l.fillStyle = rgba(c, g[1]); for (var q = 0; q < arr.length; q += 3) l.fillRect(arr[q], arr[q + 1], arr[q + 2], arr[q + 2]); });
    l.globalAlpha = 1;
    snap = { px: S.panX, py: S.panY, z: S.zoom, sc: esc2 }; ultRender = performance.now(); estSuja = false;
  }
  // mostra a camada estatica, transformada se a camera mudou desde o ultimo render
  function blitEstatica() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    var dpr = canvas.width / W, k = scale() / snap.sc, tx = (S.panX - snap.px) * scale() + W / 2 - (W / 2) * k, ty = (S.panY - snap.py) * scale() + H / 2 - (H / 2) * k;
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * tx, dpr * ty); ctx.drawImage(layer, 0, 0, W, H); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // camada de brilho: estrelas com build (cintilar) e marcas por cima
  function desenharBrilho() {
    var dk = DK, sc = Math.sqrt(S.zoom), sel = S.sel, busca = S.busca.trim() !== '', c = ctxB, i, s;
    c.clearRect(0, 0, W, H);
    var calmo = reduced.matches || S.paused;
    STATS.estrelas = listaVis.length;
    for (i = 0; i < visB.length; i++) {
      s = visB[i];
      var v = s.st, x = s.xy[0], y = s.xy[1], a = s.on ? 1 : 0.1, r = s.r * (0.85 + 0.15 * sc);
      var tw = calmo ? 1 : 0.75 + 0.25 * Math.sin(elapsed * 0.0024 + s.u * 40), gr = r * RAZAO[v], sp = spr[v];
      c.globalAlpha = ALFA[v] * a * tw; c.drawImage(sp.glow, x - gr, y - gr, 2 * gr, 2 * gr);
      c.globalAlpha = a; c.drawImage(sp.core, x - r, y - r, 2 * r, 2 * r);
      if (v === 'oficial' && r > 2.6 && s.on) {
        c.globalAlpha = 1; c.strokeStyle = rgba(spr.oficial.cor, 0.6 * tw); c.lineWidth = 0.7; c.beginPath(); c.moveTo(x - r * 2.2, y); c.lineTo(x + r * 2.2, y); c.moveTo(x, y - r * 2.2); c.lineTo(x, y + r * 2.2); c.stroke();
      }
    }
    c.globalAlpha = 1;
    if (busca) { c.strokeStyle = 'rgba(255,111,168,.95)'; c.lineWidth = 1.5; c.beginPath(); for (i = 0; i < listaVis.length; i++) { s = listaVis[i]; if (s.on) { var rb = s.r * (0.85 + 0.15 * sc) + 4; c.moveTo(s.xy[0] + rb, s.xy[1]); c.arc(s.xy[0], s.xy[1], rb, 0, 6.2832); } } c.stroke(); }
    if (sel && sel.t === 'g') {
      var gg = grupoPorId[sel.id]; if (gg) { c.strokeStyle = dk ? 'rgba(255,246,207,.7)' : 'rgba(44,51,160,.7)'; c.lineWidth = 1; c.beginPath(); gg.stars.forEach(function (q) { if (q.dr && q.on) { var rs = q.r * (0.85 + 0.15 * sc) + 3; c.moveTo(q.xy[0] + rs, q.xy[1]); c.arc(q.xy[0], q.xy[1], rs, 0, 6.2832); } }); c.stroke(); }
    }
    [sel && sel.t === 'm' ? starOf[sel.id] : null, hoverStar].forEach(function (q) {
      if (!q || !q.dr) return; var rs = q.r * (0.85 + 0.15 * sc) + 5; c.strokeStyle = dk ? '#fff6cf' : '#2c33a0'; c.lineWidth = 1.5; c.beginPath(); c.arc(q.xy[0], q.xy[1], rs, 0, 6.2832); c.stroke();
    });
  }

  var lastCampo = '', lastZoom = '';
  function atualizarCamera() {
    var sig = projetar(), sc = scale();
    G.forEach(function (g) {
      var px = W / 2 + (g.u - 0.5 + S.panX) * sc, py = H / 2 + (g.v - 0.5 + S.panY) * sc, ext = g.R * g.k * sc * 0.5, top = py + Math.max(0, ext - 14);
      var inside = px >= 6 && px <= W - 6 && py >= 6 && py <= H - 6, el = g.el;
      g.px = px; g.py = top; g.inside = inside;
      if (inside !== g.insideAnt) { g.insideAnt = inside; el.classList.toggle('out-of-field', !inside); el.setAttribute('aria-hidden', String(!inside)); el.tabIndex = inside ? 0 : -1; }
    });
    var placed = [];   // rotulos sem colisao, dos maiores para os menores (tamanhos medidos uma vez)
    G.forEach(function (g) {
      var has = false, el = g.el;
      if (g.inside) {
        var w = g.lw, h = g.lh, x = g.px, y = g.py, ch = [[-w / 2, 12], [-w / 2, -h - 12], [14, -h / 2], [-w - 14, -h / 2]], ok = null;
        for (var i = 0; i < ch.length && !ok; i++) {
          var bx = x + ch[i][0], by = y + ch[i][1];
          var fits = bx > 3 && bx + w < W - 3 && by > 3 && by + h < H - 3 && !placed.some(function (q) { return bx < q.x + q.w + 3 && bx + w + 3 > q.x && by < q.y + q.h + 3 && by + h + 3 > q.y; });
          if (fits) ok = [ch[i], { x: bx, y: by, w: w, h: h }];
        }
        if (ok) { has = true; placed.push(ok[1]); var lx = (15 + ok[0][0]) + 'px', ly = (15 + ok[0][1]) + 'px'; if (g.lx !== lx) g.nome_el.style.left = g.lx = lx; if (g.ly !== ly) g.nome_el.style.top = g.ly = ly; }
      }
      if (has !== g.hasAnt) { g.hasAnt = has; el.classList.toggle('has-label', has); }
      var tr = 'translate(' + g.px + 'px,' + g.py + 'px) translate(-50%,-50%)';
      if (tr !== g.trAnt) { g.trAnt = tr; el.style.transform = tr; }
    });
    if (sig !== assinatura) {
      assinatura = sig; clearTimeout(tabelaT);
      tabelaT = setTimeout(function () { S.noCirculo = listaVis.filter(function (s) { return s.vis && s.on; }).map(function (s) { return s.m; }); S.limite = 150; renderTabela(); }, 120);
    }
    var cnt = 0; for (var k = 0; k < listaVis.length; k++) if (listaVis[k].vis && listaVis[k].on) cnt++;
    var campo = cnt + '|' + S.lang; if (campo !== lastCampo) { lastCampo = campo; $('#sky-field-count').textContent = nf(cnt) + ' ' + t('campo'); }
    var z = S.zoom.toFixed(2) + S.lang; if (z !== lastZoom) { lastZoom = z; $('#sky-zoom').textContent = nf(S.zoom, 1) + '×'; stage.dataset.zoom = S.zoom.toFixed(2); }
  }

  function atualizarHover() {
    var p = hoverPos; hoverPos = null; if (!p) return;
    var s = achar(p[0], p[1]), tip = $('#sky-tip'), b = rectEst || (rectEst = stage.getBoundingClientRect());
    if (s !== hoverStar) { hoverStar = s; pintSuja = true; }
    stage.style.cursor = s ? 'pointer' : '';
    if (s) {
      var m = s.m; tip.hidden = false;
      tip.innerHTML = '<b>' + esc(m.nome) + '</b><br>' + esc(pubBy[m.publicador].nome) + ' · ' + esc(t(viaOf(m))) + (m.gb_navegador ? ' · ' + nf(m.gb_navegador, 2) + ' GB' : '');
      tip.style.left = Math.min(p[0] + 14, b.width - 240) + 'px'; tip.style.top = Math.max(4, p[1] + 14) + 'px';
    } else tip.hidden = true;
  }

  function loop(now) {
    frame = 0;
    if (zAnim) passoZoom(now);
    var dt = Math.min(now - (last || now), 80);
    var anima = !document.hidden && visivel && !S.paused && !reduced.matches, desenhou = false;
    if (filtroSuja) refiltrar();
    if (camSuja) {
      atualizarCamera(); camSuja = false;
      if (interagindo) {   // durante arrasto/zoom: so transforma o bitmap; redesenha a cada 100 ms
        if (estSuja || !snap || now - ultRender >= 100) renderEstatica();
        blitEstatica();
      } else { renderEstatica(); blitEstatica(); }
      pintSuja = true;
    }
    if (interagindo && now - ultInteracao > 140) { interagindo = false; estSuja = true; camSuja = true; }
    if (estSuja && !interagindo && !camSuja) { renderEstatica(); blitEstatica(); }
    if (hoverPos) atualizarHover();
    if (pintSuja) { if (anima && now - last >= 40) { elapsed += dt; last = now; } else if (!last) last = now; desenharBrilho(); pintSuja = false; desenhou = true; }
    else if (anima && now - last >= 40) { elapsed += dt; last = now; desenharBrilho(); desenhou = true; }
    if (anima || camSuja || pintSuja || interagindo || estSuja) agendar();
  }
  function resize() {
    var b = stage.getBoundingClientRect(); rectEst = b; W = b.width || 1; H = b.height || 1; RAD = Math.min(W, H) / 2 - 8;
    var dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = canvasB.width = layer.width = Math.round(W * dpr); canvas.height = canvasB.height = layer.height = Math.round(H * dpr);
    [canvas, canvasB].forEach(function (c) { c.style.width = W + 'px'; c.style.height = H + 'px'; });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctxB.setTransform(dpr, 0, 0, dpr, 0, 0);
    criarSprites(); estSuja = true; snap = null; posicionar();
  }
  new ResizeObserver(resize).observe(stage);
  addEventListener('scroll', function () { rectEst = null; }, { passive: true });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visivel = e[0].isIntersecting; if (visivel) agendar(); }).observe(stage);
  var starOf = {}, grupoPorId = {};
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { medirRotulos(); posicionar(); });
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', function () { medirRotulos(); posicionar(); });

  var urlT;
  function salvaUrl() {
    clearTimeout(urlT); urlT = setTimeout(function () {
      var p = new URLSearchParams(location.search);
      if (S.zoom !== 1 || S.panX !== 0 || S.panY !== 0) p.set('sky', [S.zoom, S.panX, S.panY].map(function (n) { return +n.toFixed(4); }).join(',')); else p.delete('sky');
      ['escopo', 'via'].forEach(function (k) { if (S[k] !== 'todos') p.set(k, S[k]); else p.delete(k); });
      if (S.agrupar === 'familia') p.set('agrupar', 'familia'); else p.delete('agrupar');
      try { history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '') + location.hash); } catch (e) {}
    }, 200);
  }

  // ---------- eventos do ceu ----------
  function achar(x, y) {
    var sc = scale(), hx = W / 2 + (S.panX - 0.5) * sc, hy = H / 2 + (S.panY - 0.5) * sc, R = 11, melhor = null, d2 = R * R;
    var u0 = Math.max(0, Math.floor((x - R - hx) / sc / CEL)), u1 = Math.min(NC - 1, Math.floor((x + R - hx) / sc / CEL));
    var v0 = Math.max(0, Math.floor((y - R - hy) / sc / CEL)), v1 = Math.min(NC - 1, Math.floor((y + R - hy) / sc / CEL));
    for (var cy = v0; cy <= v1; cy++) for (var cx = u0; cx <= u1; cx++) {
      var cel = grade && grade[cy * NC + cx]; if (!cel) continue;
      for (var i = 0; i < cel.length; i++) { var s = cel[i]; if (!s.vis || !s.on) continue; var dx = s.xy[0] - x, dy = s.xy[1] - y, dd = dx * dx + dy * dy; if (dd < d2) { d2 = dd; melhor = s; } }
    }
    return melhor;
  }
  var rectCache = null;
  stage.addEventListener('pointerdown', function (e) {
    if (e.target.closest('button') && !e.target.closest('.sky-model')) return;
    if (e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY }; moved = 0; stage.setPointerCapture(e.pointerId); stage.classList.add('is-dragging');
  }, { passive: true });
  stage.addEventListener('pointermove', function (e) {
    var b = rectEst || (rectEst = stage.getBoundingClientRect());
    if (drag) {
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved += Math.abs(dx) + Math.abs(dy);
      S.panX += dx / scale(); S.panY += dy / scale(); drag = { x: e.clientX, y: e.clientY }; mexeu(); return;
    }
    hoverPos = [e.clientX - b.left, e.clientY - b.top]; agendar();   // hit-test no proximo quadro (um por quadro)
  }, { passive: true });
  function fim(e) {
    if (!drag) return;
    var clique = moved < 5; drag = null; stage.classList.remove('is-dragging'); salvaUrl();
    if (clique && e && e.type === 'pointerup') {
      var b = rectEst || (rectEst = stage.getBoundingClientRect()), s = achar(e.clientX - b.left, e.clientY - b.top);
      if (s) selecionar({ t: 'm', id: s.m.id }, stage);
    }
  }
  stage.addEventListener('pointerup', fim, { passive: true }); stage.addEventListener('pointercancel', fim, { passive: true });
  stage.addEventListener('pointerleave', function () { $('#sky-tip').hidden = true; hoverStar = null; hoverPos = null; paint(); }, { passive: true });
  // zoom por roda/trackpad/pinca: exponencial proporcional ao delta, acumulado e aplicado uma vez por quadro, com suavizacao curta
  var ZMIN = 0.8, ZMAX = 8, zoomAlvo = 1, zAnim = false, zAncora = [0, 0], zUlt = 0;
  var K_PINCA = 0.010, K_TOQUE = 0.0011, PASSO_RODA = Math.log(1.1);
  function fatorWheel(e) {
    var d = e.deltaY, discreto = e.deltaMode !== 0 || (!e.ctrlKey && d !== 0 && d % 100 === 0);
    if (e.deltaMode === 1) d *= 16; else if (e.deltaMode === 2) d *= H;       // linhas e paginas viram pixels
    if (discreto) return Math.exp(-Math.sign(d) * PASSO_RODA * Math.max(1, Math.min(3, Math.round(Math.abs(d) / 100))));   // ~10% por clique
    return Math.max(0.92, Math.min(1.08, Math.exp(-d * (e.ctrlKey ? K_PINCA : K_TOQUE))));                               // limite por evento
  }
  stage.addEventListener('wheel', function (e) {
    var f = fatorWheel(e), base = zAnim ? zoomAlvo : S.zoom, alvo = Math.max(ZMIN, Math.min(ZMAX, base * f));
    if (alvo === base) return;   // no limite: deixa a pagina rolar
    e.preventDefault();
    var b = rectEst || (rectEst = stage.getBoundingClientRect());
    zoomAlvo = alvo; zAncora = [e.clientX - b.left - W / 2, e.clientY - b.top - H / 2]; zAnim = true; zUlt = 0; mexeu();
  }, { passive: false });
  function passoZoom(now) {
    var dt = Math.min(now - (zUlt || now - 16), 50); zUlt = now;
    var antes = S.zoom, k = 1 - Math.exp(-dt / 55), prox = antes * Math.pow(zoomAlvo / antes, k);
    if (Math.abs(Math.log(zoomAlvo / prox)) < 0.003) { prox = zoomAlvo; zAnim = false; zUlt = 0; }
    var s0 = 2 * RAD * 0.82 * antes, s1 = 2 * RAD * 0.82 * prox;
    S.panX += zAncora[0] * (1 / s1 - 1 / s0); S.panY += zAncora[1] * (1 / s1 - 1 / s0);   // mantem o ponto sob o ponteiro
    S.zoom = prox; mexeu(); salvaUrl();
  }
  stage.addEventListener('keydown', function (e) {
    if (e.target !== stage) return;
    var dl = { ArrowLeft: [0.035, 0], ArrowRight: [-0.035, 0], ArrowUp: [0, 0.035], ArrowDown: [0, -0.035] }[e.key];
    if (dl) { e.preventDefault(); S.panX += dl[0]; S.panY += dl[1]; mexeu(); salvaUrl(); }
    if (['+', '=', '-'].indexOf(e.key) >= 0) { e.preventDefault(); zAnim = false; S.zoom *= e.key === '-' ? 1 / 1.2 : 1.2; mexeu(); salvaUrl(); }
  });
  document.addEventListener('click', function (e) {
    var c = e.target.closest('[data-sky-zoom],[data-sky-reset],[data-sky-motion],.sky-model');
    if (!c) return;
    if (c.classList.contains('sky-model')) { selecionar({ t: 'g', id: c.dataset.g }, c); return; }
    if (c.dataset.skyZoom) { zAnim = false; S.zoom *= c.dataset.skyZoom === 'in' ? 1.2 : 1 / 1.2; }
    if (c.hasAttribute('data-sky-reset')) { S.zoom = 1; S.panX = 0; S.panY = 0; }
    if (c.hasAttribute('data-sky-motion')) {
      S.paused = !S.paused; $('.sky-stage').classList.toggle('sky-paused', S.paused); c.setAttribute('aria-pressed', String(S.paused));
      c.setAttribute('aria-label', S.paused ? (S.lang === 'pt' ? 'Retomar animação' : 'Resume animation') : (S.lang === 'pt' ? 'Pausar animação' : 'Pause animation')); c.textContent = S.paused ? '▷' : 'Ⅱ';
    }
    mexeu(); salvaUrl();
  });

  // ---------- selecao ----------
  var drawer = $('#drawer'), scrim = $('#scrim'), opener = null;
  function selecionar(sel, from) {
    S.sel = sel; G.forEach(function (g) { g.el.setAttribute('aria-pressed', String(!!sel && sel.t === 'g' && sel.id === g.id)); });
    if (!drawer.classList.contains('on')) opener = from || document.activeElement;
    renderDrawer(); abrirDrawer(); renderTabelaSel(); paint();
  }
  function li(f) { return '<li><a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.rotulo) + '</a> · ' + esc(f.acessado) + (f.trecho ? '<br><em>' + esc(f.trecho) + '</em>' : '') + '</li>'; }
  function evidHtml(p) {
    var l = [];
    if (p.evidencia_pais) l.push({ rotulo: t('ev_pais') + ': ' + t('cl_' + p.classe_pais) + ' (' + tipoFonte(p.evidencia_pais.tipo) + ')', url: p.evidencia_pais.url, acessado: p.evidencia_pais.acessado, trecho: p.evidencia_pais.trecho });
    if (p.evidencia_natureza) l.push({ rotulo: t('ev_nat') + ': ' + t(p.natureza), url: p.evidencia_natureza.url, acessado: p.evidencia_natureza.acessado, trecho: p.evidencia_natureza.trecho });
    return l.length ? '<h3>' + t('evidencias') + '</h3><ul>' + l.map(li).join('') + '</ul>' : '';
  }
  function renderDrawer() {
    var el = $('#drawer-corpo'), s = S.sel; if (!s) return;
    if (s.t === 'm') {
      var m = modBy[s.id], p = pubBy[m.publicador], v = viaOf(m);
      var bl = m.builds.filter(function (b) { return b.destaque; }).map(function (b) { return { rotulo: b.formato.toUpperCase() + ' · ' + (b.oficial ? t('oficial') : t('comunidade')) + ' · ' + b.repo + (b.gb ? ' · ' + nf(b.gb, 2) + ' GB' : ''), url: b.url, acessado: D.meta.coletado_em }; });
      el.innerHTML = '<span class="dr-label">' + t('modelo') + '</span><h2 id="drawer-titulo">' + esc(m.nome) + '</h2><p class="dr-sub"><a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(p.nome) + '</a> · ' + t(p.natureza) + ' · ' + t('cl_' + p.classe_pais) + '</p>' +
        '<p><span class="badge ' + v + '">' + t(v) + '</span>' + (m.gguf_grande ? ' <span class="badge">' + t('gguf_nota') + '</span>' : '') + '</p>' +
        '<dl class="dr-grid"><dt>' + t('c_gb') + '</dt><dd>' + (m.gb_navegador ? nf(m.gb_navegador, 2) + ' GB' : '—') + '</dd><dt>' + t('c_lic') + '</dt><dd>' + esc(m.licenca || '—') + '</dd><dt>' + t('atualizado') + '</dt><dd>' + esc(m.atualizado || '—') + '</dd>' +
        '<dt>' + t('parametros') + '</dt><dd>' + (m.parametros_b ? nf(m.parametros_b, 2) + ' B' : '—') + '</dd><dt>' + t('familia') + '</dt><dd>' + esc(m.familia) + '</dd><dt>' + t('tarefa') + '</dt><dd>' + esc(m.tarefa || '—') + '</dd></dl>' +
        '<p><a href="' + esc(m.url) + '" target="_blank" rel="noopener">' + t('abrir_hf') + '</a></p>' + evidHtml(p) +
        '<h3>' + t('fontes') + ' (' + D.meta.coletado_em + ')</h3><ul>' + m.fontes.concat(bl).map(li).join('') + '</ul>';
    } else {
      var g = G.filter(function (x) { return x.id === s.id; })[0]; if (!g) return;
      var c = { of: 0, co: 0, gg: 0, no: 0 }; g.ms.forEach(function (m) { var v = viaOf(m); c[v === 'oficial' ? 'of' : v === 'comunidade' ? 'co' : v === 'gguf' ? 'gg' : 'no']++; });
      var p = g.pub;
      el.innerHTML = '<span class="dr-label">' + (p ? t('constelacao') : t('fam_t')) + '</span><h2 id="drawer-titulo">' + esc(g.nome) + '</h2>' + (p ? '<p class="dr-sub">' + t(p.natureza) + ' · ' + t('cl_' + p.classe_pais) + ' · <a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + t('perfil_hf') + '</a></p>' : '') +
        '<dl class="dr-grid"><dt>' + t('modelos') + '</dt><dd>' + g.ms.length + '</dd><dt>' + t('oficial') + '</dt><dd>' + c.of + '</dd><dt>' + t('comunidade') + '</dt><dd>' + c.co + '</dd><dt>' + t('gguf') + '</dt><dd>' + c.gg + '</dd><dt>' + t('nenhum') + '</dt><dd>' + c.no + '</dd></dl>' +
        (p ? evidHtml(p) + '<h3>' + t('fontes') + ' (' + D.meta.coletado_em + ')</h3><ul>' + p.fontes.map(li).join('') + '</ul>' : '') +
        '<h3>' + t('modelos') + '</h3><ul class="dr-lista">' + g.ms.slice(0, 60).map(function (m) { return '<li><button type="button" data-abrir="' + esc(m.id) + '">' + esc(m.nome) + '</button> · ' + t(viaOf(m)) + '</li>'; }).join('') + (g.ms.length > 60 ? '<li>… +' + (g.ms.length - 60) + '</li>' : '') + '</ul>';
    }
  }
  function abrirDrawer() {
    scrim.hidden = false; drawer.hidden = false;
    requestAnimationFrame(function () { scrim.classList.add('on'); drawer.classList.add('on'); });
    drawer.setAttribute('aria-labelledby', 'drawer-titulo'); drawer.scrollTop = 0;
    setTimeout(function () { $('#drawer-x').focus(); }, 30);
  }
  function fecharDrawer() {
    if (!drawer.classList.contains('on')) return;
    drawer.classList.remove('on'); scrim.classList.remove('on'); S.sel = null;
    G.forEach(function (g) { g.el.setAttribute('aria-pressed', 'false'); });
    var fim = function () { drawer.hidden = true; scrim.hidden = true; }; setTimeout(fim, reduced.matches ? 0 : 280);
    renderTabelaSel(); paint(); if (opener && opener.focus) try { opener.focus(); } catch (e) {}
  }
  $('#drawer-x').onclick = fecharDrawer; scrim.onclick = fecharDrawer;
  drawer.addEventListener('click', function (e) { var b = e.target.closest('[data-abrir]'); if (b) selecionar({ t: 'm', id: b.dataset.abrir }, opener); });
  document.addEventListener('keydown', function (e) {
    if (!drawer.classList.contains('on')) return;
    if (e.key === 'Escape') { e.preventDefault(); fecharDrawer(); return; }
    if (e.key === 'Tab') {
      var f = [].slice.call(drawer.querySelectorAll('a[href],button')).filter(function (x) { return !x.disabled; });
      if (!f.length) return; var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } else if (!drawer.contains(document.activeElement)) { e.preventDefault(); a.focus(); }
    }
  });

  // ---------- fundo: um unico ceu continuo, camada fixa da pagina inteira ----------
  // Duas camadas empilhadas: gradiente e nebulosas desenhados uma vez; estrelas (cintilar) em outra, a baixa frequencia.
  (function () {
    var cv = $('#fundo'), cx = cv.getContext('2d'), cv2 = document.createElement('canvas'), cx2 = cv2.getContext('2d');
    cv2.id = 'fundo-estrelas'; cv2.setAttribute('aria-hidden', 'true'); cv.parentNode.insertBefore(cv2, cv.nextSibling);
    var w = 1, h = 1, pts = [], sd = 4417, rr = function () { sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0; return sd / 4294967296; }, t0 = 0, tm = 0, tema = null;
    for (var i = 0; i < 300; i++) pts.push({ x: rr(), y: rr(), r: 0.6 + Math.pow(rr(), 3) * 1.7, a: 0.35 + rr() * 0.65, ph: rr() * 6.28, big: rr() > 0.94 });
    var nebula = []; for (var j = 0; j < 7; j++) nebula.push({ x: rr(), y: rr(), r: 0.18 + rr() * 0.22, a: 0.05 + rr() * 0.06 });
    function drawBg() {
      var d = isDark(), g = cx.createLinearGradient(0, 0, w * 0.4, h);
      if (d) { g.addColorStop(0, '#2c376d'); g.addColorStop(0.55, '#262f60'); g.addColorStop(1, '#1f2753'); } else { g.addColorStop(0, '#d6e1ff'); g.addColorStop(0.55, '#eee8ff'); g.addColorStop(1, '#fde8de'); }
      cx.fillStyle = g; cx.fillRect(0, 0, w, h);
      nebula.forEach(function (n) { var rg = cx.createRadialGradient(n.x * w, n.y * h, 0, n.x * w, n.y * h, n.r * Math.max(w, h)); rg.addColorStop(0, d ? 'rgba(150,160,255,' + n.a + ')' : 'rgba(255,255,255,' + n.a * 2.2 + ')'); rg.addColorStop(1, 'rgba(150,160,255,0)'); cx.fillStyle = rg; cx.fillRect(0, 0, w, h); });
      tema = d;
    }
    function drawStars(now) {
      var d = isDark(); cx2.clearRect(0, 0, w, h);
      var col = d ? '230,234,255' : '52,62,160';
      pts.forEach(function (p) {
        var tw = reduced.matches ? 1 : 0.7 + 0.3 * Math.sin(now * 0.0016 + p.ph), a = Math.min(1, p.a * tw * (d ? 0.9 : 0.85));
        cx2.fillStyle = 'rgba(' + col + ',' + a + ')'; cx2.beginPath(); cx2.arc(p.x * w, p.y * h, p.r, 0, 6.2832); cx2.fill();
        if (p.big) { cx2.strokeStyle = 'rgba(' + col + ',' + a * 0.8 + ')'; cx2.lineWidth = 0.8; cx2.beginPath(); cx2.moveTo(p.x * w - 6, p.y * h); cx2.lineTo(p.x * w + 6, p.y * h); cx2.moveTo(p.x * w, p.y * h - 6); cx2.lineTo(p.x * w, p.y * h + 6); cx2.stroke(); }
      });
    }
    function size() { var dpr = Math.min(devicePixelRatio || 1, 2); w = innerWidth; h = innerHeight; [cv, cv2].forEach(function (c) { c.width = w * dpr; c.height = h * dpr; }); cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx2.setTransform(dpr, 0, 0, dpr, 0, 0); drawBg(); drawStars(tm); }
    function tick(now) { tm = now; if (isDark() !== tema) { drawBg(); drawStars(now); t0 = now; } else if (now - t0 > 70 && !document.hidden && !reduced.matches) { t0 = now; drawStars(now); } requestAnimationFrame(tick); }
    addEventListener('resize', size); size(); requestAnimationFrame(tick);
  })();

  // ---------- tabela ----------
  var ORD = { oficial: 0, comunidade: 1, gguf: 2, nenhum: 3 };
  function val(m, k) { return k === 'nome' ? m.nome.toLowerCase() : k === 'via' ? ORD[viaOf(m)] : k === 'gb' ? (m.gb_navegador == null ? null : m.gb_navegador) : k === 'lic' ? (m.licenca || '') : (m.atualizado || ''); }
  function renderTabela() {
    var ms = (S.noCirculo || []).slice(), k = S.sort.k, d = S.sort.d;
    ms.sort(function (a, b) { var x = val(a, k), y = val(b, k); if (x == null && y == null) return (b.downloads || 0) - (a.downloads || 0); if (x == null) return 1; if (y == null) return -1; return (x < y ? -1 : x > y ? 1 : ((b.downloads || 0) - (a.downloads || 0))) * (x === y ? 1 : d); });
    var cols = [['nome', 'c_modelo'], ['via', 'c_status'], ['gb', 'c_gb'], ['lic', 'c_lic'], ['upd', 'c_upd']];
    $('#tb thead').innerHTML = '<tr>' + cols.map(function (c) { return '<th scope="col" aria-sort="' + (S.sort.k === c[0] ? (S.sort.d > 0 ? 'ascending' : 'descending') : 'none') + '"><button type="button" data-sort="' + c[0] + '">' + t(c[1]) + '</button></th>'; }).join('') + '</tr>';
    var mostrar = ms.slice(0, S.limite);
    $('#tb tbody').innerHTML = mostrar.length ? mostrar.map(function (m) {
      var p = pubBy[m.publicador], v = viaOf(m);
      return '<tr tabindex="0" data-id="' + esc(m.id) + '"' + (S.sel && S.sel.t === 'm' && S.sel.id === m.id ? ' class="is-sel"' : '') + '><td><span class="mname">' + esc(m.nome) + '</span><small>' + esc(p.nome) + ' · ' + t(p.natureza) + ' · ' + esc(m.familia) + '</small></td>' +
        '<td><span class="badge ' + v + '">' + t(v) + '</span></td><td><span class="num">' + nf(m.gb_navegador, 2) + '</span></td><td><small>' + esc(m.licenca || '—') + '</small></td><td><small>' + esc(m.atualizado || '—') + '</small></td></tr>';
    }).join('') : '<tr><td colspan="5">' + t('sem_modelos') + '</td></tr>';
    var more = $('#mais'); if (more) more.remove();
    if (ms.length > S.limite) { var b = document.createElement('button'); b.id = 'mais'; b.className = 'more'; b.type = 'button'; b.textContent = t('mais') + ' (' + (ms.length - S.limite) + ')'; $('.home-average-scroll').appendChild(b); }
    var c = { n: ms.length, nat: 0, gg: 0, no: 0 }; ms.forEach(function (m) { m.via === 'nativo' ? c.nat++ : m.via === 'gguf' ? c.gg++ : c.no++; });
    $('#resumo-recorte').textContent = nf(c.n) + ' ' + t('recorte') + ' · ' + nf(c.nat) + ' ' + t('so_nativo') + ' · ' + nf(c.nat + c.gg) + ' ' + t('nativo_gguf') + ' · ' + nf(c.no) + ' ' + t('semb');
  }
  function renderTabelaSel() { document.querySelectorAll('#tb tr.is-sel').forEach(function (r) { r.classList.remove('is-sel'); }); if (S.sel && S.sel.t === 'm') { var r = $('#tb tr[data-id="' + CSS.escape(S.sel.id) + '"]'); if (r) r.classList.add('is-sel'); } }
  $('#tb').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-sort]'); if (b) { var k = b.dataset.sort; S.sort = { k: k, d: S.sort.k === k ? -S.sort.d : 1 }; renderTabela(); return; }
    var tr = e.target.closest('tr[data-id]'); if (tr && !e.target.closest('a')) selecionar({ t: 'm', id: tr.dataset.id }, tr);
  });
  $('#tb').addEventListener('keydown', function (e) { var tr = e.target.closest && e.target.closest('tr[data-id]'); if (tr && e.key === 'Enter') selecionar({ t: 'm', id: tr.dataset.id }, tr); });
  $('.home-average-scroll').addEventListener('click', function (e) { if (e.target.id === 'mais') { S.limite += 150; renderTabela(); } });

  // ---------- resumo, metodo, textos ----------
  function contarEscopo(ms) { var c = { n: ms.length, nat: 0, gg: 0, no: 0 }; ms.forEach(function (m) { m.via === 'nativo' ? c.nat++ : m.via === 'gguf' ? c.gg++ : c.no++; }); return c; }
  function renderFoto() {
    var br = D.foto.brasil, mu = D.foto.mundo, pn = D.foto.publicadores.brasil_por_natureza || {}, cd = D.foto.candidatos || {};
    $('#foto').innerHTML =
      '<div><span>' + t('inv_br') + '</span><strong>' + nf(br.so_nativo) + ' ' + t('de') + ' ' + nf(br.modelos) + '</strong><p>' + t('inv_br_p') + ' <b>' + nf(br.nativo_mais_gguf) + '</b></p></div>' +
      '<div><span>' + t('inv_mu') + '</span><strong>' + nf(mu.so_nativo) + ' ' + t('de') + ' ' + nf(mu.modelos) + '</strong><p>' + t('inv_br_p') + ' <b>' + nf(mu.nativo_mais_gguf) + '</b></p></div>' +
      '<div><span>' + t('inv_pub') + '</span><strong>' + nf(D.foto.publicadores.brasil) + '</strong><p>' + nf(pn.independente || 0) + ' / ' + nf(pn.instituicao || 0) + ' / ' + nf(pn.empresa || 0) + (pn.nao_classificada ? ' / ' + nf(pn.nao_classificada) : '') + ' ' + t('inv_pub_p') + ' ' + nf(cd.descartados || 0) + ' ' + t('descartados') + '.</p></div>';
    $('#caveat').textContent = t('aviso');
    $('#rodape').textContent = t('rodape') + ' ' + D.meta.coletado_em + ' · ' + nf(D.modelos.length) + ' ' + t('modelos') + ' · ' + nf(D.publicadores.length) + (S.lang === 'pt' ? ' publicadores' : ' publishers');
    $('#metodo-corpo').innerHTML = [1, 2, 3].map(function (i) { return '<div><h3>' + t('m' + i + '_t') + '</h3><p>' + t('m' + i + '_a') + '</p><p>' + t('m' + i + '_b') + '</p><p>' + t('m' + i + '_c') + '</p></div>'; }).join('');
    $('#legenda').innerHTML = [['of', 'leg_of'], ['co', 'leg_co'], ['gg', 'leg_gg'], ['no', 'leg_no']].map(function (x) { return '<span><i class="' + x[0] + '"></i>' + t(x[1]) + '</span>'; }).join('');
  }
  function textos() {
    document.documentElement.lang = S.lang === 'pt' ? 'pt-BR' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(function (e) { var v = t(e.dataset.i18n); if (/<br>/.test(v)) e.innerHTML = v; else e.textContent = v; });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (e) { e.placeholder = t(e.dataset.i18nPh); });
    var sel = $('#f-nat'), cur = S.nat; sel.innerHTML = ['todas', 'independente', 'instituicao', 'empresa', 'nao_classificada'].map(function (k) { return '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + (k === 'todas' ? t('n_todos') : t(k)) + '</option>'; }).join('');
    document.querySelectorAll('[data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lang === S.lang)); });
    document.querySelectorAll('[data-escopo]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.escopo === S.escopo)); });
    document.querySelectorAll('[data-via]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.via === S.via)); });
    document.querySelectorAll('[data-agrupar]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.agrupar === S.agrupar)); });
    var mot = $('[data-sky-motion]'); mot.setAttribute('aria-label', S.paused ? (S.lang === 'pt' ? 'Retomar animação' : 'Resume animation') : (S.lang === 'pt' ? 'Pausar animação' : 'Pause animation'));
  }
  function tudo() { textos(); renderFoto(); montar(); G.forEach(function (g) { g.el.firstChild.textContent = g.nome + ' · ' + g.ms.length; g.el.setAttribute('aria-label', g.nome + ', ' + g.ms.length + ' ' + t('modelos')); }); assinatura = null; if (S.sel) renderDrawer(); resize(); }

  document.querySelectorAll('[data-lang]').forEach(function (b) { b.onclick = function () { S.lang = b.dataset.lang; try { localStorage.setItem('observatorio-lang', S.lang); } catch (e) {} textos(); renderFoto(); assinatura = null; if (S.sel) renderDrawer(); medirRotulos(); posicionar(); }; });
  document.querySelectorAll('[data-escopo]').forEach(function (b) { b.onclick = function () { S.escopo = b.dataset.escopo; fecharDrawer(); S.zoom = 1; S.panX = 0; S.panY = 0; tudo(); salvaUrl(); }; });
  document.querySelectorAll('[data-agrupar]').forEach(function (b) { b.onclick = function () { S.agrupar = b.dataset.agrupar; fecharDrawer(); S.zoom = 1; S.panX = 0; S.panY = 0; tudo(); salvaUrl(); }; });
  document.querySelectorAll('[data-via]').forEach(function (b) { b.onclick = function () { S.via = b.dataset.via; textos(); filtrou(); salvaUrl(); }; });
  $('#f-nat').onchange = function (e) { S.nat = e.target.value; filtrou(); };
  $('#busca').addEventListener('input', function (e) { S.busca = e.target.value; filtrou(); });
  $('#tema').onclick = function () {
    var r = document.documentElement, dark = (r.dataset.theme || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light')) === 'dark';
    r.dataset.theme = dark ? 'light' : 'dark'; try { localStorage.setItem('observatorio-tema', r.dataset.theme); } catch (e) {}
    refreshTema();
  };
  document.querySelectorAll('#navigation a').forEach(function (a) { a.addEventListener('click', function () { document.querySelectorAll('#navigation a').forEach(function (x) { x.removeAttribute('aria-current'); }); a.setAttribute('aria-current', 'page'); }); });
  (function () { var u = String(window.REPO_URL || '').replace(/\/+$/, ''), l = $('#privacidade'); if (l && /^https:\/\//.test(u)) { l.href = u + '/blob/main/docs/PRIVACIDADE.md'; l.hidden = false; } })();
  tudo();
  // gancho de medicao e de conferencia (somente leitura)
  window.__obs = { get estrelas() { return stars; }, get grupos() { return G; }, get estado() { return S; }, get stats() { return STATS; }, get modelos() { return D.modelos.length; }, achar: function (x, y) { return achar(x, y); } };
})();
