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
      eyebrow_ds: 'Datasets em português e no mundo', eyebrow_bm: 'Benchmarks de avaliação', tabs_aria: 'Camadas', tab_modelos: 'Modelos', tab_datasets: 'Datasets', tab_benchmarks: 'Benchmarks',
      res_label_ds: 'Datasets', res_titulo_ds: 'Quem publica dados, e em que idiomas', res_label_bm: 'Benchmarks', res_titulo_bm: 'Como os modelos são avaliados',
      campo_ds: 'datasets no mapa', campo_bm: 'benchmarks no mapa', recorte_ds: 'datasets no recorte', recorte_bm: 'benchmarks no recorte', datasets: 'datasets', benchmarks: 'benchmarks',
      sky_nota_ds: 'Posição é só organização por grupo; tamanho indica o tamanho do dataset (ou os downloads); brilho e cor indicam idioma e licença.', sky_nota_bm: 'Posição é só organização por domínio; tamanho indica o número de datasets; brilho e cor indicam o idioma. Linhas tênues ligam o benchmark aos seus datasets.',
      por_tema: 'Tema', por_dominio: 'Domínio', por_criador: 'Criador', limpar: 'Limpar filtros', exportar: 'Exportar', sem_itens: 'Nenhum item neste recorte.',
      f_fmt: 'Formatos de build', fmt_multi: 'Mais de um formato', f_escopo: 'Escopo', so_pt: 'Português', sem_licenca: 'Sem licença', desconhecido: 'Desconhecido', com_bench: 'Com benchmark', sem_bench: 'Sem benchmark',
      c_dataset: 'Dataset', c_pub: 'Publicador', c_idiomas: 'Idiomas', c_tarefas: 'Tarefas', c_tamanho: 'Tamanho', c_downloads: 'Downloads', c_benchmarks: 'Benchmarks', c_benchmark: 'Benchmark', c_dominio: 'Domínio', c_tipo: 'Tipo', c_ndatasets: 'Datasets', c_ano: 'Ano', c_criador: 'Criador', c_builds: 'Builds',
      dataset: 'Dataset', benchmark: 'Benchmark', escopo: 'Escopo', abrir_fonte: 'Abrir a fonte ↗', builds: 'Builds', formato: 'formato', formatos: 'formatos',
      aneis_1: 'Dois formatos de build para navegador: brilho mais forte e um anel ao redor da estrela.', aneis_2: 'Três ou mais formatos de build para navegador: brilho máximo e dois anéis ao redor da estrela.',
      sem_builds_det: 'Sem o detalhe de cada build neste modelo.', gguf_nao_conta: 'não conta (acima do limite de tamanho)', origem_oficial: 'oficial do publicador', origem_comunidade: 'da comunidade', gb_nao_medido: 'tamanho não medido',
      leg_ds_of: 'pt-BR, licença aberta', leg_ds_co: 'pt-BR, outra licença', leg_ds_gg: 'outro idioma, licença aberta', leg_ds_no: 'outro idioma, outra licença',
      leg_bm_of: 'inclui pt-BR', leg_bm_co: 'inclui pt', leg_bm_gg: 'multilíngue sem pt', leg_bm_no: 'outros', leg_aneis: 'mais de um formato de build = mais brilho e anéis (2: um anel; 3 ou mais: dois anéis)',
      exp_png: 'Imagem PNG', exp_svg: 'Imagem SVG', exp_html: 'HTML', exp_filtros: 'Filtros', exp_nenhum: 'nenhum filtro', exp_fonte: 'Fonte dos dados', exp_lic: 'Dados sob licença CC BY 4.0. Gerado no navegador, sem envio de dados.', exp_feito: 'Arquivo gerado:', exp_lista: 'Lista dos itens', exp_legenda_col: 'Classe', exp_item: 'Item', exp_grupo: 'Grupo', exp_enq: 'enquadramento atual',
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
      eyebrow_ds: 'Datasets in Portuguese and worldwide', eyebrow_bm: 'Evaluation benchmarks', tabs_aria: 'Layers', tab_modelos: 'Models', tab_datasets: 'Datasets', tab_benchmarks: 'Benchmarks',
      res_label_ds: 'Datasets', res_titulo_ds: 'Who publishes data, and in which languages', res_label_bm: 'Benchmarks', res_titulo_bm: 'How models are evaluated',
      campo_ds: 'datasets on the map', campo_bm: 'benchmarks on the map', recorte_ds: 'datasets in selection', recorte_bm: 'benchmarks in selection', datasets: 'datasets', benchmarks: 'benchmarks',
      sky_nota_ds: 'Position is only grouping; size shows the dataset size (or downloads); brightness and color show language and license.', sky_nota_bm: 'Position is only grouping by domain; size shows the number of datasets; brightness and color show the language. Faint lines link a benchmark to its datasets.',
      por_tema: 'Topic', por_dominio: 'Domain', por_criador: 'Creator', limpar: 'Clear filters', exportar: 'Export', sem_itens: 'No item in this selection.',
      f_fmt: 'Build formats', fmt_multi: 'More than one format', f_escopo: 'Scope', so_pt: 'Portuguese', sem_licenca: 'No license', desconhecido: 'Unknown', com_bench: 'With benchmark', sem_bench: 'Without benchmark',
      c_dataset: 'Dataset', c_pub: 'Publisher', c_idiomas: 'Languages', c_tarefas: 'Tasks', c_tamanho: 'Size', c_downloads: 'Downloads', c_benchmarks: 'Benchmarks', c_benchmark: 'Benchmark', c_dominio: 'Domain', c_tipo: 'Type', c_ndatasets: 'Datasets', c_ano: 'Year', c_criador: 'Creator', c_builds: 'Builds',
      dataset: 'Dataset', benchmark: 'Benchmark', escopo: 'Scope', abrir_fonte: 'Open the source ↗', builds: 'Builds', formato: 'format', formatos: 'formats',
      aneis_1: 'Two browser build formats: stronger glow and one ring around the star.', aneis_2: 'Three or more browser build formats: maximum glow and two rings around the star.',
      sem_builds_det: 'No per-build detail for this model.', gguf_nao_conta: 'does not count (over the size limit)', origem_oficial: 'official, by the publisher', origem_comunidade: 'by the community', gb_nao_medido: 'size not measured',
      leg_ds_of: 'pt-BR, open license', leg_ds_co: 'pt-BR, other license', leg_ds_gg: 'other language, open license', leg_ds_no: 'other language, other license',
      leg_bm_of: 'includes pt-BR', leg_bm_co: 'includes pt', leg_bm_gg: 'multilingual without pt', leg_bm_no: 'others', leg_aneis: 'more than one build format = more glow and rings (2: one ring; 3 or more: two rings)',
      exp_png: 'PNG image', exp_svg: 'SVG image', exp_html: 'HTML', exp_filtros: 'Filters', exp_nenhum: 'no filter', exp_fonte: 'Data source', exp_lic: 'Data under the CC BY 4.0 license. Generated in the browser, no data is sent.', exp_feito: 'File generated:', exp_lista: 'Item list', exp_legenda_col: 'Class', exp_item: 'Item', exp_grupo: 'Group', exp_enq: 'current framing',
      rodape: 'Hugging Face data from', modelo: 'Model', tarefa: 'Task', evidencias: 'Evidence', ev_pais: 'Country', ev_nat: 'Type', n_mod: 'models mapped', gguf_nota: 'GGUF exists, but is over 4 GB.', fam_t: 'Family', src_perfil_oficial: 'official profile', src_site_institucional: 'institutional site', src_pagina_pessoa: 'personal page', src_artigo: 'paper', src_repositorio: 'repository', src_cartao_modelo: 'model card', src_orgao_fomento: 'funding agency', src_perfil: 'profile', src_cartao: 'model card', src_institucional: 'institutional page', src_curadoria: 'curated list', src_perfil_cartao: 'profile or card'
    }
  };
  var S = { tab: 'modelos', fmt: '', f: { datasets: { escopo: '', idioma: '', tarefa: '', licenca: '', tamanho: '', publicador: '', bench: '', q: '' }, benchmarks: { dominio: '', idioma: '', tipo: '', tarefa: '', q: '' } }, modoL: { datasets: 'publicador', benchmarks: 'dominio' }, sortL: { modelos: { k: 'via', d: 1 }, datasets: { k: 'downloads', d: -1 }, benchmarks: { k: 'nome', d: 1 } }, lang: 'pt', escopo: 'todos', via: 'todos', nat: 'todas', busca: '', agrupar: 'publicador', sort: { k: 'via', d: 1 }, sel: null, paused: false, zoom: 1, panX: 0, panY: 0, limite: 150 };
  S.sort = S.sortL.modelos;
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


  // ---------- camadas (abas): modelos, datasets e benchmarks ----------
  var CC = window.MAPA_CAMADAS || { datasets: [], benchmarks: [] };
  var dsBy = {}, bmBy = {};
  CC.datasets.forEach(function (d) { dsBy[d.id] = d; }); CC.benchmarks.forEach(function (b) { bmBy[b.id] = b; });
  var TEM = { modelos: true, datasets: CC.datasets.length > 0, benchmarks: CC.benchmarks.length > 0 };
  var pubNome = function (id) { return pubBy[id] ? pubBy[id].nome : id; };
  var seguro = function (u) { return /^https?:\/\//i.test(String(u || '')) ? String(u) : ''; };
  var licAberta = function (l) { return !!l && /^(cc0|cc-by|apache|mit|bsd|odc|odbl|pddl|unlicense|mpl|openrail|gpl|lgpl|agpl)/i.test(l) && !/-n[cd]\b/i.test(l); };
  var uniq = function (a) { var o = {}, r = []; a.forEach(function (x) { if (x && !o[x]) { o[x] = 1; r.push(x); } }); return r.sort(); };
  var fmtB = function (b) { if (b == null) return '—'; if (b >= 1e9) return nf(b / 1e9, 2) + ' GB'; if (b >= 1e6) return nf(b / 1e6, 1) + ' MB'; return nf(b / 1e3, 0) + ' kB'; };
  var balde = function (b) { return b == null ? 'x' : b < 1e7 ? 'a' : b < 1e8 ? 'b' : b < 1e9 ? 'c' : b < 1e10 ? 'd' : 'e'; };
  var inclui = function (q, partes) { q = q.trim().toLowerCase(); if (!q) return true; return partes.join(' ').toLowerCase().indexOf(q) >= 0; };
  function passaDataset(d) {
    var f = S.f.datasets;
    if (f.escopo === 'br' && !(d.pt_br || d.escopo === 'br')) return false;
    if (f.escopo === 'pt' && !(d.pt_br || d.idiomas.some(function (i) { return /^pt/i.test(i); }))) return false;
    if (f.idioma && d.idiomas.indexOf(f.idioma) < 0) return false;
    if (f.tarefa && d.tarefas.indexOf(f.tarefa) < 0) return false;
    if (f.licenca && (f.licenca === '__sem' ? !!d.licenca : d.licenca !== f.licenca)) return false;
    if (f.tamanho && balde(d.tamanho_bytes) !== f.tamanho) return false;
    if (f.publicador && d.publicador !== f.publicador) return false;
    if (f.bench === 'sim' && !d.benchmarks.length) return false;
    if (f.bench === 'nao' && d.benchmarks.length) return false;
    return inclui(f.q, [d.nome, d.id, pubNome(d.publicador), d.descricao, d.tarefas.join(' ')]);
  }
  function passaBench(b) {
    var f = S.f.benchmarks;
    if (f.dominio && b.dominio.indexOf(f.dominio) < 0) return false;
    if (f.idioma && b.idiomas.indexOf(f.idioma) < 0) return false;
    if (f.tipo && b.tipo !== f.tipo) return false;
    if (f.tarefa && b.tarefas.indexOf(f.tarefa) < 0) return false;
    return inclui(f.q, [b.nome, b.sigla, b.id, b.criador, b.dominio.join(' ')]);
  }
  function passaModelo(m) {
    if (S.escopo !== 'todos' && m.escopo !== S.escopo) return false;
    if (S.via === 'nativo' && m.via !== 'nativo') return false;
    if (S.via === 'gguf' && m.via === 'nenhum') return false;
    if (S.via === 'nenhum' && m.via !== 'nenhum') return false;
    if (S.nat !== 'todas' && pubBy[m.publicador].natureza !== S.nat) return false;
    if (S.fmt === 'multi' && m.nfmt < 2) return false;
    var q = S.busca.trim().toLowerCase();
    if (q && m.id.toLowerCase().indexOf(q) < 0 && pubBy[m.publicador].nome.toLowerCase().indexOf(q) < 0 && m.familia.toLowerCase().indexOf(q) < 0) return false;
    return true;
  }
  var clsDataset = function (d) { var a = licAberta(d.licenca); return d.pt_br ? (a ? 'oficial' : 'comunidade') : (a ? 'gguf' : 'nenhum'); };
  var clsBench = function (b) { var ptbr = b.idiomas.some(function (i) { return /^pt-br$/i.test(i); }), pt = b.idiomas.some(function (i) { return /^pt/i.test(i); }); return ptbr ? 'oficial' : pt ? 'comunidade' : b.idiomas.length > 1 ? 'gguf' : 'nenhum'; };
  // diversidade de builds: formatos distintos prontos para o navegador entre onnx, mlc, litert e gguf via wllama (0 a 4)
  var FORMATOS = ['onnx', 'mlc', 'litert', 'gguf'];
  function formatosDe(m) {
    var o = {}; (m.builds || []).forEach(function (b) { if (b.formato === 'onnx' || b.formato === 'mlc' || b.formato === 'litert') o[b.formato] = 1; });
    if (m.gguf_wllama) o.gguf = 1;
    return FORMATOS.filter(function (f) { return o[f]; });
  }
  D.modelos.forEach(function (m) { m.fmts = formatosDe(m); m.nfmt = m.fmts.length; });
  CC.datasets.forEach(function (d) { d.nfmt = 1; }); CC.benchmarks.forEach(function (b) { b.nfmt = 1; });
  var CAM = null;
  var ORD = { oficial: 0, comunidade: 1, gguf: 2, nenhum: 3 };
  var CAMS = {
    modelos: {
      id: 'modelos', por: modBy, itens: function () { return D.modelos; }, passa: passaModelo, cls: viaOf, campo: 'campo', eb: 'eyebrow', recorte: 'recorte', nota: 'sky_nota', rot: 'res_label', tit: 'res_titulo', plural: 'modelos',
      modos: [['publicador', 'porpub'], ['familia', 'porfam']], modo: function () { return S.agrupar; },
      base: function () { return D.modelos.filter(function (m) { return S.escopo === 'todos' || m.escopo === S.escopo; }); },
      grupo: function (m) { return S.agrupar === 'publicador' ? { k: m.publicador, nome: pubBy[m.publicador].nome, pub: pubBy[m.publicador] } : { k: m.familia.toLowerCase(), nome: m.familia, pub: null }; },
      fam: function (m) { return m.familia; },
      ord: function (a, b) { return a.familia < b.familia ? -1 : a.familia > b.familia ? 1 : (b.downloads || 0) - (a.downloads || 0); },
      tam: function (m) { return 1.3 + Math.min(3, Math.sqrt(m.gb_navegador || m.gguf_gb || 0.4) * 1.25); },
      legenda: [['oficial', 'leg_of', 'of'], ['comunidade', 'leg_co', 'co'], ['gguf', 'leg_gg', 'gg'], ['nenhum', 'leg_no', 'no']],
      tip: function (m) { return '<b>' + esc(m.nome) + '</b><br>' + esc(pubBy[m.publicador].nome) + ' · ' + esc(t(viaOf(m))) + (m.gb_navegador ? ' · ' + nf(m.gb_navegador, 2) + ' GB' : ''); }
    },
    datasets: {
      id: 'datasets', por: dsBy, itens: function () { return CC.datasets; }, passa: passaDataset, cls: clsDataset, campo: 'campo_ds', eb: 'eyebrow_ds', recorte: 'recorte_ds', nota: 'sky_nota_ds', rot: 'res_label_ds', tit: 'res_titulo_ds', plural: 'datasets',
      modos: [['publicador', 'porpub'], ['tema', 'por_tema']], modo: function () { return S.modoL.datasets; },
      base: function () { return CC.datasets; },
      grupo: function (d) { return S.modoL.datasets === 'publicador' ? { k: d.publicador, nome: pubNome(d.publicador), pub: pubBy[d.publicador] || null } : { k: d.tarefas[0] || '—', nome: d.tarefas[0] || '—', pub: null }; },
      fam: function (d) { return d.tarefas[0] || ''; },
      ord: function (a, b) { return (a.tarefas[0] || '') < (b.tarefas[0] || '') ? -1 : (a.tarefas[0] || '') > (b.tarefas[0] || '') ? 1 : b.downloads - a.downloads; },
      tam: function (d) { return d.tamanho_bytes != null ? 1.3 + Math.min(3, 0.55 * Math.log10(1 + d.tamanho_bytes / 1e6)) : 1.3 + Math.min(2.4, 0.4 * Math.log10(1 + d.downloads)); },
      legenda: [['oficial', 'leg_ds_of', 'of'], ['comunidade', 'leg_ds_co', 'co'], ['gguf', 'leg_ds_gg', 'gg'], ['nenhum', 'leg_ds_no', 'no']],
      tip: function (d) { return '<b>' + esc(d.nome) + '</b><br>' + esc(pubNome(d.publicador)) + ' · ' + esc(d.idiomas.join(', ') || '—') + ' · ' + esc(fmtB(d.tamanho_bytes)); }
    },
    benchmarks: {
      id: 'benchmarks', por: bmBy, itens: function () { return CC.benchmarks; }, passa: passaBench, cls: clsBench, campo: 'campo_bm', eb: 'eyebrow_bm', recorte: 'recorte_bm', nota: 'sky_nota_bm', rot: 'res_label_bm', tit: 'res_titulo_bm', plural: 'benchmarks',
      modos: [['dominio', 'por_dominio'], ['criador', 'por_criador']], modo: function () { return S.modoL.benchmarks; },
      base: function () { return CC.benchmarks; },
      grupo: function (b) { return S.modoL.benchmarks === 'dominio' ? { k: b.dominio[0] || '—', nome: b.dominio[0] || '—', pub: null } : { k: b.criador || '—', nome: b.criador || '—', pub: null }; },
      fam: function (b) { return b.dominio[0] || ''; },
      ord: function (a, b) { return (a.ano || 0) - (b.ano || 0) || (a.nome < b.nome ? -1 : 1); },
      tam: function (b) { return 1.8 + Math.min(2.6, 1.0 * Math.log2(1 + b.datasets.length)); },
      legenda: [['oficial', 'leg_bm_of', 'of'], ['comunidade', 'leg_bm_co', 'co'], ['gguf', 'leg_bm_gg', 'gg'], ['nenhum', 'leg_bm_no', 'no']],
      tip: function (b) { return '<b>' + esc(b.sigla ? b.sigla + ' · ' + b.nome : b.nome) + '</b><br>' + esc(b.dominio.join(', ') || '—') + ' · ' + b.datasets.length + ' datasets'; }
    }
  };

  // colunas da tabela por camada: val (ordenacao), td (celula HTML) e txt (texto para exportar)
  var chipFmt = function (m) { return m.fmts.map(function (f) { return '<span class="chip-f f-' + f + '">' + ({ onnx: 'ONNX', mlc: 'MLC', litert: 'LiteRT', gguf: 'GGUF' })[f] + '</span>'; }).join('') || '<span class="chip-f f-0">—</span>'; };
  var fmtNome = { onnx: 'ONNX', mlc: 'MLC', litert: 'LiteRT', gguf: 'GGUF' };
  CAMS.modelos.cols = [
    { k: 'nome', rot: 'c_modelo', val: function (m) { return m.nome.toLowerCase(); }, td: function (m) { var p = pubBy[m.publicador]; return '<td><span class="mname">' + esc(m.nome) + '</span><small>' + esc(p.nome) + ' · ' + t(p.natureza) + ' · ' + esc(m.familia) + '</small></td>'; }, txt: function (m) { return m.nome + ' (' + pubBy[m.publicador].nome + ')'; } },
    { k: 'via', rot: 'c_status', val: function (m) { return ORD[viaOf(m)]; }, td: function (m) { var v = viaOf(m); return '<td><span class="badge ' + v + '">' + t(v) + '</span></td>'; }, txt: function (m) { return t(viaOf(m)); } },
    { k: 'builds', rot: 'c_builds', val: function (m) { return -m.nfmt; }, td: function (m) { return '<td class="c-builds">' + chipFmt(m) + '<small>' + m.nfmt + ' ' + t(m.nfmt === 1 ? 'formato' : 'formatos') + '</small></td>'; }, txt: function (m) { return m.fmts.map(function (f) { return fmtNome[f]; }).join(', ') + ' (' + m.nfmt + ')'; } },
    { k: 'gb', rot: 'c_gb', val: function (m) { return m.gb_navegador == null ? null : m.gb_navegador; }, td: function (m) { return '<td><span class="num">' + nf(m.gb_navegador, 2) + '</span></td>'; }, txt: function (m) { return nf(m.gb_navegador, 2); } },
    { k: 'lic', rot: 'c_lic', val: function (m) { return m.licenca || ''; }, td: function (m) { return '<td><small>' + esc(m.licenca || '—') + '</small></td>'; }, txt: function (m) { return m.licenca || '—'; } },
    { k: 'upd', rot: 'c_upd', val: function (m) { return m.atualizado || ''; }, td: function (m) { return '<td class="nw"><small>' + esc(m.atualizado || '—') + '</small></td>'; }, txt: function (m) { return m.atualizado || '—'; } }
  ];
  CAMS.datasets.cols = [
    { k: 'nome', rot: 'c_dataset', val: function (d) { return d.nome.toLowerCase(); }, td: function (d) { return '<td><span class="mname">' + esc(d.nome) + '</span></td>'; }, txt: function (d) { return d.nome; } },
    { k: 'pub', rot: 'c_pub', val: function (d) { return pubNome(d.publicador).toLowerCase(); }, td: function (d) { return '<td><small>' + esc(pubNome(d.publicador)) + '</small></td>'; }, txt: function (d) { return pubNome(d.publicador); } },
    { k: 'idiomas', rot: 'c_idiomas', val: function (d) { return d.idiomas.join(','); }, td: function (d) { return '<td>' + (d.pt_br ? '<span class="badge oficial">pt-BR</span> ' : '') + '<small>' + esc(d.idiomas.filter(function (i) { return !(d.pt_br && i === 'pt-BR'); }).join(', ')) + '</small></td>'; }, txt: function (d) { return d.idiomas.join(', ') || '—'; } },
    { k: 'tarefas', rot: 'c_tarefas', val: function (d) { return d.tarefas.join(','); }, td: function (d) { return '<td><small>' + esc(d.tarefas.join(', ') || '—') + '</small></td>'; }, txt: function (d) { return d.tarefas.join(', ') || '—'; } },
    { k: 'lic', rot: 'c_lic', val: function (d) { return d.licenca || ''; }, td: function (d) { return '<td><small>' + esc(d.licenca || '—') + '</small></td>'; }, txt: function (d) { return d.licenca || '—'; } },
    { k: 'tam', rot: 'c_tamanho', val: function (d) { return d.tamanho_bytes; }, td: function (d) { return '<td><span class="num">' + esc(fmtB(d.tamanho_bytes)) + '</span></td>'; }, txt: function (d) { return fmtB(d.tamanho_bytes); } },
    { k: 'downloads', rot: 'c_downloads', val: function (d) { return d.downloads; }, td: function (d) { return '<td><span class="num">' + nf(d.downloads) + '</span></td>'; }, txt: function (d) { return nf(d.downloads); } },
    { k: 'upd', rot: 'c_upd', val: function (d) { return d.atualizado || ''; }, td: function (d) { return '<td class="nw"><small>' + esc(d.atualizado || '—') + '</small></td>'; }, txt: function (d) { return d.atualizado || '—'; } },
    { k: 'nb', rot: 'c_benchmarks', val: function (d) { return d.benchmarks.length; }, td: function (d) { return '<td><span class="num">' + d.benchmarks.length + '</span></td>'; }, txt: function (d) { return String(d.benchmarks.length); } }
  ];
  CAMS.benchmarks.cols = [
    { k: 'nome', rot: 'c_benchmark', val: function (b) { return (b.sigla || b.nome).toLowerCase(); }, td: function (b) { return '<td><span class="mname">' + esc(b.sigla || b.nome) + '</span>' + (b.sigla ? '<small>' + esc(b.nome) + '</small>' : '') + '</td>'; }, txt: function (b) { return b.sigla ? b.sigla + ' (' + b.nome + ')' : b.nome; } },
    { k: 'dominio', rot: 'c_dominio', val: function (b) { return b.dominio.join(','); }, td: function (b) { return '<td><small>' + esc(b.dominio.join(', ') || '—') + '</small></td>'; }, txt: function (b) { return b.dominio.join(', ') || '—'; } },
    { k: 'idiomas', rot: 'c_idiomas', val: function (b) { return b.idiomas.join(','); }, td: function (b) { return '<td><small>' + esc(b.idiomas.join(', ') || '—') + '</small></td>'; }, txt: function (b) { return b.idiomas.join(', ') || '—'; } },
    { k: 'tipo', rot: 'c_tipo', val: function (b) { return b.tipo; }, td: function (b) { return '<td><small>' + esc(b.tipo || '—') + '</small></td>'; }, txt: function (b) { return b.tipo || '—'; } },
    { k: 'tarefas', rot: 'c_tarefas', val: function (b) { return b.tarefas.join(','); }, td: function (b) { return '<td><small>' + esc(b.tarefas.join(', ') || '—') + '</small></td>'; }, txt: function (b) { return b.tarefas.join(', ') || '—'; } },
    { k: 'nd', rot: 'c_ndatasets', val: function (b) { return b.datasets.length; }, td: function (b) { return '<td><span class="num">' + b.datasets.length + '</span></td>'; }, txt: function (b) { return String(b.datasets.length); } },
    { k: 'ano', rot: 'c_ano', val: function (b) { return b.ano; }, td: function (b) { return '<td><small>' + esc(b.ano == null ? '—' : b.ano) + '</small></td>'; }, txt: function (b) { return b.ano == null ? '—' : String(b.ano); } },
    { k: 'criador', rot: 'c_criador', val: function (b) { return b.criador.toLowerCase(); }, td: function (b) { return '<td><small>' + esc(b.criador || '—') + '</small></td>'; }, txt: function (b) { return b.criador || '—'; } }
  ];
  CAM = CAMS.modelos;

  // ---------- filtros ----------
  function passa(m) { return CAM.passa(m); }

  // ---------- grupos e layout (determinista) ----------
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
  var G = [], stars = [];
  function montar() {
    var base = CAM.base(), map = {};
    base.forEach(function (m) {
      var gi = CAM.grupo(m), g = map[gi.k] || (map[gi.k] = { id: gi.k, nome: gi.nome, ms: [], pub: gi.pub || null });
      g.ms.push(m);
    });
    G = Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.ms.length - a.ms.length || (a.id < b.id ? -1 : 1); });
    var placed = [];
    G.forEach(function (g) {
      g.ms.sort(CAM.ord);
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
        var st = { m: m, g: g, u: 0.5 + (g.x + g.off[i][0]) * k, v: 0.5 + (g.y + g.off[i][1]) * k, r: CAM.tam(m), xy: [0, 0], on: true, vis: false, dr: false, nf: CAM.id === 'modelos' ? m.nfmt : 1 };
        st.st = CAM.cls(m); st.idx = stars.length; st.ord = { oficial: 0, comunidade: 1, gguf: 2, nenhum: 3 }[st.st]; stars.push(st); starOf[m.id] = st; (g.stars = g.stars || []).push(st);
      });
    });
    var host = $('#sky-points'); host.innerHTML = '';
    G.forEach(function (g) {
      var b = document.createElement('button'); b.className = 'sky-model'; b.type = 'button'; b.dataset.g = g.id; b.setAttribute('aria-pressed', 'false');
      if (g.pub && g.pub.natureza === 'independente') b.classList.add('ind');
      b.innerHTML = '<span class="sky-name">' + esc(g.nome) + ' · ' + g.ms.length + '</span>';
      b.setAttribute('aria-label', g.nome + ', ' + g.ms.length + ' ' + t(CAM.plural));
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
        [1, 2].forEach(function (n) {   // aneis (halo): 1 anel = 2 formatos; 2 aneis = 3 ou mais
          var rc = document.createElement('canvas'); rc.width = rc.height = 192; var xc = rc.getContext('2d'); xc.strokeStyle = rgba(c, 1); xc.lineWidth = 10;
          xc.beginPath(); xc.arc(96, 96, 88, 0, 6.2832); xc.stroke(); if (n === 2) { xc.beginPath(); xc.arc(96, 96, 56, 0, 6.2832); xc.stroke(); }
          spr[v]['anel' + n] = rc;
        });
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
        if (prev) (CAM.fam(prev.m) === CAM.fam(s.m) ? arestas.fam : arestas.outra).push([prev, s, g.ms.length < 4]);
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
      var nfm = s.nf, forte = nfm >= 3 ? 1.7 : nfm === 2 ? 1.35 : 1, larg = nfm >= 3 ? 1.3 : nfm === 2 ? 1.15 : 1;   // mais formatos de build: mais brilho
      var tw = calmo ? 1 : 0.75 + 0.25 * Math.sin(elapsed * 0.0024 + s.u * 40), gr = r * RAZAO[v] * larg, sp = spr[v];
      c.globalAlpha = Math.min(1, ALFA[v] * a * tw * forte); c.drawImage(sp.glow, x - gr, y - gr, 2 * gr, 2 * gr);
      c.globalAlpha = a; c.drawImage(sp.core, x - r, y - r, 2 * r, 2 * r);
      if (nfm >= 2 && s.on) {   // aneis por sprite; pulso lento com 3 ou mais formatos (parado com movimento reduzido)
        var pu = nfm >= 3 && !calmo ? Math.sin(elapsed * 0.0016 + s.u * 10) : 0, ra = r * (nfm >= 3 ? 3.3 : 2.5) * (1 + 0.06 * pu);
        c.globalAlpha = Math.min(1, (nfm >= 3 ? 0.85 : 0.75) + 0.15 * pu); c.drawImage(sp[nfm >= 3 ? 'anel2' : 'anel1'], x - ra, y - ra, 2 * ra, 2 * ra);
      }
      if (v === 'oficial' && r > 2.6 && s.on) {
        c.globalAlpha = 1; c.strokeStyle = rgba(spr.oficial.cor, 0.6 * tw); c.lineWidth = 0.7; c.beginPath(); c.moveTo(x - r * 2.2, y); c.lineTo(x + r * 2.2, y); c.moveTo(x, y - r * 2.2); c.lineTo(x, y + r * 2.2); c.stroke();
      }
    }
    c.globalAlpha = 1;
    if (CAM.id === 'benchmarks' && TEM.datasets) {   // linha tenue do benchmark aos seus datasets: com zoom, ao passar o mouse ou ao selecionar
      var selId = sel && sel.t === 'm' ? sel.id : null, col = dk ? '215,221,255' : '50,60,150';
      c.lineWidth = 0.7;
      for (i = 0; i < listaVis.length; i++) {
        s = listaVis[i]; if (!s.on || !(S.zoom >= 2 || hoverStar === s || selId === s.m.id)) continue;
        var ids = s.m.datasets.filter(function (id) { return dsBy[id]; }), nn = ids.length;
        for (var j = 0; j < nn; j++) {
          var ang = (j / nn) * 6.2832 - 1.5708, rad = s.r * 3 + 16, px = s.xy[0] + Math.cos(ang) * rad, py = s.xy[1] + Math.sin(ang) * rad;
          c.strokeStyle = 'rgba(' + col + ',.3)'; c.beginPath(); c.moveTo(s.xy[0], s.xy[1]); c.lineTo(px, py); c.stroke();
          c.fillStyle = 'rgba(' + col + ',.75)'; c.beginPath(); c.arc(px, py, 1.8, 0, 6.2832); c.fill();
        }
      }
    }
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
    var campo = cnt + '|' + S.lang; if (campo !== lastCampo) { lastCampo = campo; $('#sky-field-count').textContent = nf(cnt) + ' ' + t(CAM.campo); }
    var z = S.zoom.toFixed(2) + S.lang; if (z !== lastZoom) { lastZoom = z; $('#sky-zoom').textContent = nf(S.zoom, 1) + '×'; stage.dataset.zoom = S.zoom.toFixed(2); }
  }

  function atualizarHover() {
    var p = hoverPos; hoverPos = null; if (!p) return;
    var s = achar(p[0], p[1]), tip = $('#sky-tip'), b = rectEst || (rectEst = stage.getBoundingClientRect());
    if (s !== hoverStar) { hoverStar = s; pintSuja = true; }
    stage.style.cursor = s ? 'pointer' : '';
    if (s) {
      var m = s.m; tip.hidden = false;
      tip.innerHTML = CAM.tip(m);
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
  var badgeLista = function (arr) { return arr.map(function (x) { return '<span class="badge">' + esc(x) + '</span>'; }).join(' '); };
  function drawerModelo(m) {
    var p = pubBy[m.publicador], v = viaOf(m), gruposB = {};
    (m.builds || []).forEach(function (b) { (gruposB[b.formato] = gruposB[b.formato] || []).push(b); });
    var secBuilds = '<h3>' + t('builds') + ' (' + m.nfmt + ' ' + t(m.nfmt === 1 ? 'formato' : 'formatos') + ')</h3>';
    if (m.nfmt >= 2) secBuilds += '<p class="note-aneis">' + t(m.nfmt >= 3 ? 'aneis_2' : 'aneis_1') + '</p>';
    var tem = FORMATOS.filter(function (f) { return gruposB[f]; });
    if (!tem.length) secBuilds += '<p>' + t('sem_builds_det') + ' <a href="' + esc(m.url) + '" target="_blank" rel="noopener">' + t('abrir_hf') + '</a></p>';
    tem.forEach(function (f) {
      secBuilds += '<h4>' + fmtNome[f] + (f === 'gguf' && !m.gguf_wllama ? ' · ' + t('gguf_nao_conta') : '') + '</h4><ul>' + gruposB[f].map(function (b) {
        return '<li><a href="' + esc(seguro(b.url)) + '" target="_blank" rel="noopener">' + esc(b.repo) + '</a> · ' + (b.oficial ? t('origem_oficial') : t('origem_comunidade')) + ' · ' + esc(b.autor || '') + ' · ' + (b.gb ? nf(b.gb, 2) + ' GB' : t('gb_nao_medido')) + '</li>';
      }).join('') + '</ul>';
    });
    var bl = (m.builds || []).filter(function (b) { return b.destaque; }).map(function (b) { return { rotulo: b.formato.toUpperCase() + ' · ' + (b.oficial ? t('oficial') : t('comunidade')) + ' · ' + b.repo + (b.gb ? ' · ' + nf(b.gb, 2) + ' GB' : ''), url: b.url, acessado: D.meta.coletado_em }; });
    return '<span class="dr-label">' + t('modelo') + '</span><h2 id="drawer-titulo">' + esc(m.nome) + '</h2><p class="dr-sub"><a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(p.nome) + '</a> · ' + t(p.natureza) + ' · ' + t('cl_' + p.classe_pais) + '</p>' +
      '<p><span class="badge ' + v + '">' + t(v) + '</span> <span class="badge">' + m.nfmt + ' ' + t(m.nfmt === 1 ? 'formato' : 'formatos') + '</span>' + (m.gguf_grande ? ' <span class="badge">' + t('gguf_nota') + '</span>' : '') + '</p>' +
      '<dl class="dr-grid"><dt>' + t('c_gb') + '</dt><dd>' + (m.gb_navegador ? nf(m.gb_navegador, 2) + ' GB' : '—') + '</dd><dt>' + t('c_lic') + '</dt><dd>' + esc(m.licenca || '—') + '</dd><dt>' + t('atualizado') + '</dt><dd>' + esc(m.atualizado || '—') + '</dd>' +
      '<dt>' + t('parametros') + '</dt><dd>' + (m.parametros_b ? nf(m.parametros_b, 2) + ' B' : '—') + '</dd><dt>' + t('familia') + '</dt><dd>' + esc(m.familia) + '</dd><dt>' + t('tarefa') + '</dt><dd>' + esc(m.tarefa || '—') + '</dd></dl>' +
      '<p><a href="' + esc(m.url) + '" target="_blank" rel="noopener">' + t('abrir_hf') + '</a></p>' + secBuilds + evidHtml(p) +
      '<h3>' + t('fontes') + ' (' + D.meta.coletado_em + ')</h3><ul>' + m.fontes.concat(bl).map(li).join('') + '</ul>';
  }
  function linhaIr(tab, id, rot) { return '<li><button type="button" data-ir="' + tab + ':' + esc(id) + '">' + esc(rot) + '</button></li>'; }
  function drawerDataset(d) {
    var cls = clsDataset(d), bl = d.benchmarks.map(function (id) { return bmBy[id]; }).filter(Boolean), srcs = seguro(d.url) ? [{ rotulo: d.nome, url: d.url, acessado: d.atualizado || D.meta.coletado_em }] : [];
    return '<span class="dr-label">' + t('dataset') + '</span><h2 id="drawer-titulo">' + esc(d.nome) + '</h2><p class="dr-sub">' + esc(pubNome(d.publicador)) + '</p>' +
      '<p><span class="badge ' + cls + '">' + t('leg_ds_' + ({ oficial: 'of', comunidade: 'co', gguf: 'gg', nenhum: 'no' })[cls]) + '</span></p>' + (d.descricao ? '<p>' + esc(d.descricao) + '</p>' : '') +
      '<dl class="dr-grid"><dt>' + t('c_idiomas') + '</dt><dd>' + esc(d.idiomas.join(', ') || '—') + '</dd><dt>' + t('c_tarefas') + '</dt><dd>' + esc(d.tarefas.join(', ') || '—') + '</dd><dt>' + t('c_lic') + '</dt><dd>' + esc(d.licenca || '—') + '</dd>' +
      '<dt>' + t('c_tamanho') + '</dt><dd>' + esc(fmtB(d.tamanho_bytes)) + '</dd><dt>' + t('c_downloads') + '</dt><dd>' + nf(d.downloads) + '</dd><dt>Likes</dt><dd>' + nf(d.likes) + '</dd><dt>' + t('atualizado') + '</dt><dd>' + esc(d.atualizado || '—') + '</dd><dt>' + t('escopo') + '</dt><dd>' + esc(d.escopo || '—') + '</dd></dl>' +
      (seguro(d.url) ? '<p><a href="' + esc(d.url) + '" target="_blank" rel="noopener">' + t('abrir_fonte') + '</a></p>' : '') +
      (bl.length ? '<h3>' + t('c_benchmarks') + ' (' + bl.length + ')</h3><ul class="dr-lista">' + bl.map(function (b) { return linhaIr('benchmarks', b.id, b.sigla || b.nome); }).join('') + '</ul>' : '') +
      '<h3>' + t('fontes') + '</h3><ul>' + srcs.map(li).join('') + '</ul>';
  }
  function drawerBench(b) {
    var cls = clsBench(b), ds = b.datasets.map(function (id) { return dsBy[id]; }).filter(Boolean), links = Object.keys(b.links).filter(function (k) { return seguro(b.links[k]); }).map(function (k) { return { rotulo: k, url: b.links[k], acessado: D.meta.coletado_em }; });
    var desc = (b.descricao && (b.descricao[S.lang] || b.descricao.pt || b.descricao.en)) || '';
    return '<span class="dr-label">' + t('benchmark') + '</span><h2 id="drawer-titulo">' + esc(b.sigla ? b.sigla + ' · ' + b.nome : b.nome) + '</h2><p class="dr-sub">' + esc(b.criador || '—') + (b.ano ? ' · ' + b.ano : '') + '</p>' +
      '<p><span class="badge ' + cls + '">' + t('leg_bm_' + ({ oficial: 'of', comunidade: 'co', gguf: 'gg', nenhum: 'no' })[cls]) + '</span></p>' + (desc ? '<p>' + esc(desc) + '</p>' : '') +
      '<dl class="dr-grid"><dt>' + t('c_dominio') + '</dt><dd>' + esc(b.dominio.join(', ') || '—') + '</dd><dt>' + t('c_idiomas') + '</dt><dd>' + esc(b.idiomas.join(', ') || '—') + '</dd><dt>' + t('c_tipo') + '</dt><dd>' + esc(b.tipo || '—') + '</dd>' +
      '<dt>' + t('c_tarefas') + '</dt><dd>' + esc(b.tarefas.join(', ') || '—') + '</dd><dt>' + t('c_ndatasets') + '</dt><dd>' + b.datasets.length + '</dd></dl>' +
      (ds.length ? '<h3>' + t('tab_datasets') + ' (' + ds.length + ')</h3><ul class="dr-lista">' + ds.map(function (d) { return linhaIr('datasets', d.id, d.nome); }).join('') + '</ul>' : '') +
      '<h3>' + t('fontes') + '</h3><ul>' + links.map(li).join('') + '</ul>';
  }
  CAMS.modelos.drawer = drawerModelo; CAMS.datasets.drawer = drawerDataset; CAMS.benchmarks.drawer = drawerBench;
  function drawerGrupo(g) {
    var p = g.pub, cont = {}; g.ms.forEach(function (m) { var c = CAM.cls(m); cont[c] = (cont[c] || 0) + 1; });
    var linhas = CAM.legenda.map(function (l) { return '<dt>' + t(l[1]) + '</dt><dd>' + (cont[l[0]] || 0) + '</dd>'; }).join('');
    return '<span class="dr-label">' + (p ? t('constelacao') : t('fam_t')) + '</span><h2 id="drawer-titulo">' + esc(g.nome) + '</h2>' + (p && p.natureza ? '<p class="dr-sub">' + t(p.natureza) + ' · ' + t('cl_' + p.classe_pais) + ' · <a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + t('perfil_hf') + '</a></p>' : '') +
      '<dl class="dr-grid"><dt>' + t(CAM.plural) + '</dt><dd>' + g.ms.length + '</dd>' + linhas + '</dl>' +
      (p && p.evidencia_pais ? evidHtml(p) + '<h3>' + t('fontes') + ' (' + D.meta.coletado_em + ')</h3><ul>' + p.fontes.map(li).join('') + '</ul>' : '') +
      '<h3>' + t(CAM.plural) + '</h3><ul class="dr-lista">' + g.ms.slice(0, 60).map(function (m) { return '<li><button type="button" data-abrir="' + esc(m.id) + '">' + esc(m.sigla || m.nome) + '</button> · ' + t(CAM.legenda.filter(function (l) { return l[0] === CAM.cls(m); })[0][1]) + '</li>'; }).join('') + (g.ms.length > 60 ? '<li>… +' + (g.ms.length - 60) + '</li>' : '') + '</ul>';
  }
  function renderDrawer() {
    var el = $('#drawer-corpo'), s = S.sel; if (!s) return;
    if (s.t === 'm') { var m = CAM.por[s.id]; if (m) el.innerHTML = CAM.drawer(m); }
    else { var g = grupoPorId[s.id]; if (g) el.innerHTML = drawerGrupo(g); }
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
  drawer.addEventListener('click', function (e) {
    var b = e.target.closest('[data-abrir]'); if (b) { selecionar({ t: 'm', id: b.dataset.abrir }, opener); return; }
    var ir = e.target.closest('[data-ir]'); if (ir) { var p = ir.dataset.ir.split(':'), alvo = p.shift(), id = p.join(':'); trocarTab(alvo); setTimeout(function () { if (CAM.por[id]) selecionar({ t: 'm', id: id }, null); }, 60); }
  });
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
  function ordenados() {
    var ms = (S.noCirculo || []).slice(), k = S.sort.k, d = S.sort.d, col = CAM.cols.filter(function (c) { return c.k === k; })[0] || CAM.cols[0];
    ms.sort(function (a, b) { var x = col.val(a), y = col.val(b); if (x == null && y == null) return (b.downloads || 0) - (a.downloads || 0); if (x == null) return 1; if (y == null) return -1; return (x < y ? -1 : x > y ? 1 : ((b.downloads || 0) - (a.downloads || 0))) * (x === y ? 1 : d); });
    return ms;
  }
  function renderTabela() {
    var ms = ordenados(), cols = CAM.cols;
    $('#tb').dataset.camada = CAM.id;
    $('#tb thead').innerHTML = '<tr>' + cols.map(function (c) { return '<th scope="col" aria-sort="' + (S.sort.k === c.k ? (S.sort.d > 0 ? 'ascending' : 'descending') : 'none') + '"><button type="button" data-sort="' + c.k + '">' + t(c.rot) + '</button></th>'; }).join('') + '</tr>';
    var mostrar = ms.slice(0, S.limite);
    $('#tb tbody').innerHTML = mostrar.length ? mostrar.map(function (m) {
      return '<tr tabindex="0" data-id="' + esc(m.id) + '"' + (S.sel && S.sel.t === 'm' && S.sel.id === m.id ? ' class="is-sel"' : '') + '>' + cols.map(function (c) { return c.td(m); }).join('') + '</tr>';
    }).join('') : '<tr><td colspan="' + cols.length + '">' + t('sem_itens') + '</td></tr>';
    var more = $('#mais'); if (more) more.remove();
    if (ms.length > S.limite) { var b = document.createElement('button'); b.id = 'mais'; b.className = 'more'; b.type = 'button'; b.textContent = t('mais') + ' (' + (ms.length - S.limite) + ')'; $('.home-average-scroll').appendChild(b); }
    if (CAM.id === 'modelos') {
      var c = { n: ms.length, nat: 0, gg: 0, no: 0 }; ms.forEach(function (m) { m.via === 'nativo' ? c.nat++ : m.via === 'gguf' ? c.gg++ : c.no++; });
      $('#resumo-recorte').textContent = nf(c.n) + ' ' + t('recorte') + ' · ' + nf(c.nat) + ' ' + t('so_nativo') + ' · ' + nf(c.nat + c.gg) + ' ' + t('nativo_gguf') + ' · ' + nf(c.no) + ' ' + t('semb');
    } else $('#resumo-recorte').textContent = nf(ms.length) + ' ' + t(CAM.recorte) + ' ' + t('de') + ' ' + nf(CAM.itens().length);
  }
  function renderTabelaSel() { document.querySelectorAll('#tb tr.is-sel').forEach(function (r) { r.classList.remove('is-sel'); }); if (S.sel && S.sel.t === 'm') { var r = $('#tb tr[data-id="' + CSS.escape(S.sel.id) + '"]'); if (r) r.classList.add('is-sel'); } }
  $('#tb').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-sort]'); if (b) { var k = b.dataset.sort; S.sort.d = S.sort.k === k ? -S.sort.d : 1; S.sort.k = k; renderTabela(); return; }
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
    renderLegenda();
  }
  function renderLegenda() {
    $('#legenda').innerHTML = CAM.legenda.map(function (x) { return '<span><i class="' + x[2] + '"></i>' + t(x[1]) + '</span>'; }).join('') +
      (CAM.id === 'modelos' ? '<span class="leg-aneis"><i class="a0"></i><i class="a1"></i><i class="a2"></i>' + t('leg_aneis') + '</span>' : '');
  }
  function textos() {
    document.documentElement.lang = S.lang === 'pt' ? 'pt-BR' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(function (e) { var v = t(e.dataset.i18n); if (/<br>/.test(v)) e.innerHTML = v; else e.textContent = v; });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (e) { e.placeholder = t(e.dataset.i18nPh); });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (e) { e.setAttribute('aria-label', t(e.dataset.i18nAria)); });
    var sel = $('#f-nat'), cur = S.nat; sel.innerHTML = ['todas', 'independente', 'instituicao', 'empresa', 'nao_classificada'].map(function (k) { return '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + (k === 'todas' ? t('n_todos') : t(k)) + '</option>'; }).join('');
    document.querySelectorAll('[data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lang === S.lang)); });
    document.querySelectorAll('[data-escopo]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.escopo === S.escopo)); });
    document.querySelectorAll('[data-via]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.via === S.via)); });
    renderModos(); renderFiltros(); var ff = $('#f-fmt'); if (ff) ff.value = S.fmt;
    var mot = $('[data-sky-motion]'); mot.setAttribute('aria-label', S.paused ? (S.lang === 'pt' ? 'Retomar animação' : 'Resume animation') : (S.lang === 'pt' ? 'Pausar animação' : 'Pause animation'));
  }
  function tudo() { textos(); renderFoto(); montar(); G.forEach(function (g) { g.el.firstChild.textContent = g.nome + ' · ' + g.ms.length; g.el.setAttribute('aria-label', g.nome + ', ' + g.ms.length + ' ' + t(CAM.plural)); }); renderLegenda(); assinatura = null; if (S.sel) renderDrawer(); resize(); }

  document.querySelectorAll('[data-lang]').forEach(function (b) { b.onclick = function () { S.lang = b.dataset.lang; try { localStorage.setItem('observatorio-lang', S.lang); } catch (e) {} textos(); renderFoto(); assinatura = null; if (S.sel) renderDrawer(); medirRotulos(); posicionar(); }; });
  document.querySelectorAll('[data-escopo]').forEach(function (b) { b.onclick = function () { S.escopo = b.dataset.escopo; fecharDrawer(); S.zoom = 1; S.panX = 0; S.panY = 0; tudo(); salvaUrl(); }; });
  $('#f-agrupar').addEventListener('click', function (e) {
    var b = e.target.closest('[data-modo]'); if (!b) return;
    if (S.tab === 'modelos') S.agrupar = b.dataset.modo; else S.modoL[S.tab] = b.dataset.modo;
    fecharDrawer(); S.zoom = 1; S.panX = 0; S.panY = 0; tudo(); salvaUrl();
  });
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

  // ---------- exportar (grafico e tabela), tudo no navegador ----------
  var EX = window.MAPA_EXPORT, hoje = function () { return new Date().toISOString().slice(0, 10); };
  var ROT_F = { escopo: 'f_escopo', idioma: 'c_idiomas', tarefa: 'c_tarefas', licenca: 'c_lic', tamanho: 'c_tamanho', publicador: 'c_pub', bench: 'c_benchmarks', dominio: 'c_dominio', tipo: 'c_tipo', q: 'buscar' };
  var TAM_ROT = { a: '< 10 MB', b: '10 – 100 MB', c: '100 MB – 1 GB', d: '1 – 10 GB', e: '> 10 GB', x: null };
  function valorFiltro(k, v) {
    if (k === 'publicador') return pubNome(v); if (k === 'licenca' && v === '__sem') return t('sem_licenca'); if (k === 'escopo') return t(v === 'br' ? 'br' : 'so_pt');
    if (k === 'bench') return t(v === 'sim' ? 'com_bench' : 'sem_bench'); if (k === 'tamanho') return TAM_ROT[v] || t('desconhecido'); return v;
  }
  function filtrosAtivos() {
    var l = [];
    if (S.tab === 'modelos') {
      if (S.escopo !== 'todos') l.push(t('f_escopo') + ': ' + t(S.escopo === 'br' ? 'br' : 'mundo')); if (S.via !== 'todos') l.push(t('c_status') + ': ' + t('v_' + S.via));
      if (S.nat !== 'todas') l.push(t('f_nat') + ': ' + t(S.nat)); if (S.fmt) l.push(t('f_fmt') + ': ' + t('fmt_multi')); if (S.busca.trim()) l.push(t('buscar') + ': ' + S.busca.trim());
    } else { var f = S.f[S.tab]; Object.keys(f).forEach(function (k) { if (f[k] !== '') l.push(t(ROT_F[k]) + ': ' + valorFiltro(k, f[k])); }); }
    return l.length ? l : [t('exp_nenhum')];
  }
  function rodapeExp() {
    var u = String(window.REPO_URL || '').replace(/\/+$/, '');
    return [t('exp_fonte') + ': ' + t('rodape') + ' ' + D.meta.coletado_em, 'Observatório Web AI · ' + hoje() + (u ? ' · ' + u : ''), t('exp_lic')];
  }
  var nomeItem = function (m) { return m.sigla ? m.sigla + ' · ' + m.nome : m.nome; };
  var rotCls = function (m) { return t(CAM.legenda.filter(function (l) { return l[0] === CAM.cls(m); })[0][1]); };
  function snapGrafico(tipo) {
    var completo = tipo === 'completo', W0 = completo ? 900 : Math.round(W), H0 = completo ? 640 : Math.round(H), est = [], rot = [], itens = [], sc = Math.sqrt(S.zoom);
    var R0 = Math.min(W0, H0) / 2 - 8, esc0 = 2 * R0 * 0.82;
    stars.forEach(function (s) {
      if (!s.on) return;
      var x, y, r;
      if (completo) { x = W0 / 2 + (s.u - 0.5) * esc0; y = H0 / 2 + (s.v - 0.5) * esc0; r = s.r; }
      else { if (!s.vis) return; x = s.xy[0]; y = s.xy[1]; r = s.r * (0.85 + 0.15 * sc); }
      est.push({ x: x, y: y, r: r, c: s.st, t: nomeItem(s.m) + ' · ' + s.g.nome });
    });
    G.forEach(function (g) {
      var n = g.stars.filter(function (q) { return q.on; }).length; if (!n) return;
      if (completo) rot.push({ x: W0 / 2 + (g.u - 0.5) * esc0, y: H0 / 2 + (g.v - 0.5) * esc0 + g.R * g.k * esc0 * 0.5 + 16, t: g.nome + ' · ' + n });
      else if (g.hasAnt && g.inside) rot.push({ x: g.px, y: g.py + 22, t: g.nome + ' · ' + n });
    });
    stars.forEach(function (s) { if (s.on && (completo || s.vis)) itens.push([nomeItem(s.m), s.g.nome, rotCls(s.m)]); });
    var fl = filtrosAtivos(), n = est.length;
    return { titulo: 'Observatório Web AI · ' + t('tab_' + S.tab), filtros: [n + ' ' + t(CAM.plural) + (completo ? '' : ' (' + t('exp_enq') + ')')].concat(fl), w: W0, h: H0, estrelas: est, rotulos: rot,
      legenda: CAM.legenda.map(function (l) { return { c: l[0], t: t(l[1]) }; }), rodape: rodapeExp(), lang: S.lang, itens: itens, colunasLista: [t('exp_item'), t('exp_grupo'), t('exp_legenda_col')], rotuloLista: t('exp_lista') };
  }
  function snapTabela() {
    var ms = ordenados(), cols = CAM.cols;
    return { titulo: 'Observatório Web AI · ' + t('tab_' + S.tab), filtros: filtrosAtivos(), colunas: cols.map(function (c) { return { rot: t(c.rot) }; }), linhas: ms.map(function (m) { return cols.map(function (c) { return c.txt(m); }); }), rodape: rodapeExp(), lang: S.lang };
  }
  var nomeArq = function (tipo, ext, suf) { return 'observatorio-' + S.tab + '-' + tipo + '-' + hoje() + (suf || '') + '.' + ext; };
  var statusEl = document.createElement('div'); statusEl.className = 'sr'; statusEl.setAttribute('role', 'status'); document.body.appendChild(statusEl);
  function entregar(nome, blob) { EX.baixar(nome, blob); statusEl.textContent = t('exp_feito') + ' ' + nome; }
  function exportarGrafico(fmt) {
    if (fmt === 'html') return entregar(nomeArq('grafico', 'html'), new Blob([EX.htmlGrafico(snapGrafico('completo'))], { type: 'text/html;charset=utf-8' }));
    var svg = EX.svgGrafico(snapGrafico('enq'));
    if (fmt === 'svg') return entregar(nomeArq('grafico', 'svg'), new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    EX.svgParaPng(svg, 2).then(function (b) { entregar(nomeArq('grafico', 'png'), b); });
  }
  function exportarTabela(fmt) {
    var tb = snapTabela();
    if (fmt === 'html') return entregar(nomeArq('tabela', 'html'), new Blob([EX.htmlTabela(tb)], { type: 'text/html;charset=utf-8' }));
    var pags = EX.svgsTabela(tb, 100);
    pags.forEach(function (svg, i) {
      var suf = pags.length > 1 ? '-' + (i + 1) : '';
      setTimeout(function () {
        if (fmt === 'svg') entregar(nomeArq('tabela', 'svg', suf), new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
        else EX.svgParaPng(svg, 2).then(function (b) { entregar(nomeArq('tabela', 'png', suf), b); });
      }, i * 350);
    });
  }
  // menu de exportar: um botao por bloco, popover com itens (padrao dos menus do mapa State of the Art)
  var menuEl = null, menuBtn = null;
  function fecharMenu(foco) { if (!menuEl) return; menuEl.remove(); menuEl = null; if (menuBtn) { menuBtn.setAttribute('aria-expanded', 'false'); if (foco) menuBtn.focus(); } menuBtn = null; }
  function abrirMenu(btn, itens) {
    if (menuEl && menuBtn === btn) return fecharMenu(true);
    fecharMenu(); var m = document.createElement('div'); m.className = 'pop'; m.setAttribute('role', 'menu'); m.setAttribute('aria-label', btn.textContent);
    itens.forEach(function (it) { var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'menuitem'); b.tabIndex = -1; b.textContent = t(it[0]); b.addEventListener('click', function () { fecharMenu(true); it[1](); }); m.appendChild(b); });
    document.body.appendChild(m); var r = btn.getBoundingClientRect();
    m.style.top = (r.bottom + 4) + 'px'; m.style.left = Math.max(8, Math.min(innerWidth - m.offsetWidth - 8, r.right - m.offsetWidth)) + 'px';
    btn.setAttribute('aria-expanded', 'true'); menuEl = m; menuBtn = btn; m.firstChild.focus();
  }
  document.addEventListener('keydown', function (e) {
    if (!menuEl) return; var its = [].slice.call(menuEl.querySelectorAll('[role=menuitem]')), i = its.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fecharMenu(true); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); its[(i + 1) % its.length].focus(); } else if (e.key === 'ArrowUp') { e.preventDefault(); its[(i - 1 + its.length) % its.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); its[0].focus(); } else if (e.key === 'End') { e.preventDefault(); its[its.length - 1].focus(); } else if (e.key === 'Tab') fecharMenu(false);
  }, true);
  document.addEventListener('click', function (e) { if (menuEl && !menuEl.contains(e.target) && e.target !== menuBtn) fecharMenu(false); });
  addEventListener('scroll', function (e) { if (menuEl && (e.target === document || e.target === document.documentElement)) fecharMenu(false); }, true);
  var itensExp = function (f) { return [['exp_png', function () { f('png'); }], ['exp_svg', function () { f('svg'); }], ['exp_html', function () { f('html'); }]]; };
  $('#exp-grafico').addEventListener('click', function (e) { abrirMenu(e.currentTarget, itensExp(exportarGrafico)); });
  $('#exp-tabela').addEventListener('click', function (e) { abrirMenu(e.currentTarget, itensExp(exportarTabela)); });
  ['#exp-grafico', '#exp-tabela'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'ArrowDown') { e.preventDefault(); $(id).click(); } }); });
  window.__exp = { snapGrafico: snapGrafico, snapTabela: snapTabela, filtros: filtrosAtivos, grafico: exportarGrafico, tabela: exportarTabela };

  // ---------- modos de agrupamento, filtros por aba, abas ----------
  function renderModos() {
    var modo = CAM.modo();
    $('#f-agrupar').innerHTML = CAM.modos.map(function (m) { return '<button type="button" data-modo="' + m[0] + '" aria-pressed="' + (m[0] === modo) + '">' + t(m[1]) + '</button>'; }).join('');
  }
  var selHtml = function (tab, k, rot, ops) {
    var v = S.f[tab][k];
    return '<label class="sel"><span class="sr">' + t(rot) + '</span><select data-f="' + tab + '" data-k="' + k + '" aria-label="' + esc(t(rot)) + '"><option value="">' + t(rot) + '</option>' + ops.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === v ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
  };
  var buscaHtml = function (tab) { return '<label class="sel search"><span class="sr">' + t('buscar') + '</span><input type="search" data-f="' + tab + '" data-q="1" value="' + esc(S.f[tab].q) + '" placeholder="' + esc(t('buscar_ph')) + '" autocomplete="off"></label>'; };
  var plano = function (a) { var r = []; a.forEach(function (x) { r = r.concat(x); }); return r; };
  var paraOps = function (arr) { return arr.map(function (x) { return [x, x]; }); };
  function renderFiltros() {
    var fm = $('#f-fmt'); if (fm) fm.innerHTML = '<option value="">' + t('f_fmt') + '</option><option value="multi">' + t('fmt_multi') + '</option>';
    if (fm) fm.value = S.fmt;
    if (TEM.datasets) {
      $('#filtros-datasets').innerHTML =
        selHtml('datasets', 'escopo', 'f_escopo', [['br', t('br')], ['pt', t('so_pt')]]) + selHtml('datasets', 'idioma', 'c_idiomas', paraOps(uniq(plano(CC.datasets.map(function (d) { return d.idiomas; }))))) +
        selHtml('datasets', 'tarefa', 'c_tarefas', paraOps(uniq(plano(CC.datasets.map(function (d) { return d.tarefas; }))))) + selHtml('datasets', 'licenca', 'c_lic', paraOps(uniq(CC.datasets.map(function (d) { return d.licenca; }))).concat([['__sem', t('sem_licenca')]])) +
        selHtml('datasets', 'tamanho', 'c_tamanho', [['a', '< 10 MB'], ['b', '10 – 100 MB'], ['c', '100 MB – 1 GB'], ['d', '1 – 10 GB'], ['e', '> 10 GB'], ['x', t('desconhecido')]]) +
        selHtml('datasets', 'publicador', 'c_pub', uniq(CC.datasets.map(function (d) { return d.publicador; })).map(function (p) { return [p, pubNome(p)]; })) + selHtml('datasets', 'bench', 'c_benchmarks', [['sim', t('com_bench')], ['nao', t('sem_bench')]]) + buscaHtml('datasets');
    }
    if (TEM.benchmarks) {
      $('#filtros-benchmarks').innerHTML =
        selHtml('benchmarks', 'dominio', 'c_dominio', paraOps(uniq(plano(CC.benchmarks.map(function (b) { return b.dominio; }))))) + selHtml('benchmarks', 'idioma', 'c_idiomas', paraOps(uniq(plano(CC.benchmarks.map(function (b) { return b.idiomas; }))))) +
        selHtml('benchmarks', 'tipo', 'c_tipo', paraOps(uniq(CC.benchmarks.map(function (b) { return b.tipo; })))) + selHtml('benchmarks', 'tarefa', 'c_tarefas', paraOps(uniq(plano(CC.benchmarks.map(function (b) { return b.tarefas; }))))) + buscaHtml('benchmarks');
    }
  }
  ['#filtros-datasets', '#filtros-benchmarks'].forEach(function (id) {
    var el = $(id);
    el.addEventListener('change', function (e) { var c = e.target.closest('select[data-f]'); if (!c) return; S.f[c.dataset.f][c.dataset.k] = c.value; filtrou(); });
    el.addEventListener('input', function (e) { var c = e.target.closest('input[data-q]'); if (!c) return; S.f[c.dataset.f].q = c.value; filtrou(); });
  });
  $('#f-fmt').addEventListener('change', function (e) { S.fmt = e.target.value; filtrou(); });
  $('#limpar').addEventListener('click', function () {
    if (S.tab === 'modelos') { S.escopo = 'todos'; S.via = 'todos'; S.nat = 'todas'; S.busca = ''; S.fmt = ''; $('#busca').value = ''; textos(); fecharDrawer(); S.zoom = 1; S.panX = 0; S.panY = 0; tudo(); }
    else { var f = S.f[S.tab]; Object.keys(f).forEach(function (k) { f[k] = ''; }); renderFiltros(); filtrou(); }
    salvaUrl();
  });

  function atualizarTabsUI() {
    var ha = TEM.datasets || TEM.benchmarks; $('#tabs').hidden = !ha;
    document.querySelectorAll('#tabs [role=tab]').forEach(function (b) { var on = b.dataset.tab === S.tab; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; b.hidden = !TEM[b.dataset.tab]; });
    $('#inicio').setAttribute('aria-labelledby', 'tab-' + S.tab);
    $('#filtros-modelos').hidden = S.tab !== 'modelos'; $('#filtros-datasets').hidden = S.tab !== 'datasets'; $('#filtros-benchmarks').hidden = S.tab !== 'benchmarks';
    var tit = $('#res-titulo'), rot = document.querySelector('.home-section-label'), nota = $('.sky-bottom'), cap = $('#tb caption');
    $('.home-eyebrow i').dataset.i18n = CAM.eb; tit.dataset.i18n = CAM.tit; rot.dataset.i18n = CAM.rot; nota.dataset.i18n = CAM.nota; cap.dataset.i18n = CAM.tit;
    $('#caveat').hidden = S.tab !== 'modelos';
  }
  function trocarTab(id, doHash) {
    if (!TEM[id]) id = 'modelos';
    if (id === S.tab && CAM === CAMS[id] && stars.length) { atualizarTabsUI(); return; }
    fecharDrawer(); S.tab = id; CAM = CAMS[id]; S.sort = S.sortL[id]; S.sel = null; S.zoom = 1; S.panX = 0; S.panY = 0; S.limite = 150; S.noCirculo = [];
    atualizarTabsUI(); textos(); tudo();
    if (doHash !== false) { var h = '#' + id; if (location.hash !== h && !(id === 'modelos' && !location.hash)) { try { history.pushState(null, '', location.pathname + location.search + (id === 'modelos' ? '' : h)); } catch (e) { location.hash = h; } } }
  }
  $('#tabs').addEventListener('click', function (e) { var b = e.target.closest('[role=tab]'); if (b && !b.hidden) trocarTab(b.dataset.tab); });
  $('#tabs').addEventListener('keydown', function (e) {
    var abas = [].slice.call(document.querySelectorAll('#tabs [role=tab]')).filter(function (b) { return !b.hidden; }), i = abas.indexOf(document.activeElement); if (i < 0) return;
    var j = e.key === 'ArrowRight' ? (i + 1) % abas.length : e.key === 'ArrowLeft' ? (i - 1 + abas.length) % abas.length : e.key === 'Home' ? 0 : e.key === 'End' ? abas.length - 1 : -1;
    if (j < 0) return; e.preventDefault(); abas[j].focus(); trocarTab(abas[j].dataset.tab);
  });
  function abaDoHash() { var h = location.hash.replace('#', ''); return h === 'datasets' || h === 'benchmarks' || h === 'modelos' ? h : null; }
  window.addEventListener('hashchange', function () { var a = abaDoHash(); if (a && a !== S.tab) trocarTab(a, false); else if (!location.hash && S.tab !== 'modelos') trocarTab('modelos', false); });
  window.addEventListener('popstate', function () { var a = abaDoHash() || 'modelos'; if (a !== S.tab) trocarTab(a, false); });

  (function () { var a = abaDoHash(); if (a && TEM[a]) { S.tab = a; CAM = CAMS[a]; S.sort = S.sortL[a]; } atualizarTabsUI(); })();
  tudo();
  // gancho de medicao e de conferencia (somente leitura)
  window.__obs = { get estrelas() { return stars; }, get grupos() { return G; }, get estado() { return S; }, get stats() { return STATS; }, get modelos() { return D.modelos.length; }, achar: function (x, y) { return achar(x, y); } };
})();
