// Drawer de detalhes (modelo, publicador, instituicao, laboratorio, dataset, benchmark). Modulo isolado: o app.js entrega o contexto
// (dados e utilitarios) e chama abrir/ir/fechar/atualizar; aqui ficam a montagem, a navegacao (historico), o foco e os textos.
// Regra de dados: so o que existe; campo ausente = secao omitida, nunca "N/D" solto.
(function () {
  'use strict';
  var DT = {
    pt: {
      voltar: 'Voltar', fechar: 'Fechar', copiar: 'Copiar link', copiado: 'Link copiado', abrir_hf: 'Abrir no Hugging Face', abrir_fonte: 'Abrir a fonte', aba: 'Abre em outra aba',
      tp_modelo: 'Modelo', tp_publicador: 'Publicador', tp_instituicao: 'Instituição', tp_laboratorio: 'Laboratório', tp_dataset: 'Dataset', tp_benchmark: 'Benchmark', tp_familia: 'Família', tp_grupo: 'Grupo',
      s_roda: 'Roda no navegador', s_limit: 'Com limitações', s_nao: 'Ainda não', s_limit_d: 'GGUF via wllama', s_nao_d: 'sem versão para o navegador',
      o_br: 'Brasil', o_mu: 'Mundo', o_ev: 'evidência', mat_experimental: 'Experimental', mat_documentado: 'Documentado', mat_t: 'Cartão do modelo', sinais: 'Sinais do cartão',
      pt_idioma: 'Português', gguf_grande: 'GGUF acima de 4 GB',
      n_dl: 'Downloads em 30 dias', n_par: 'Parâmetros', n_gb: 'Download no navegador', n_lic: 'Licença', n_upd: 'Atualizado em', n_fam: 'Família', n_tar: 'Tarefa', n_base: 'Modelo base', n_conv: 'Conversão de',
      n_mod: 'Modelos no mapa', n_hf: 'No Hugging Face', n_nat: 'Com versão para o navegador', n_gg: 'Só GGUF', n_sem: 'Sem versão', n_membros: 'Membros', n_dl_tot: 'Downloads em 30 dias (soma)',
      m_gb_lim: 'de 4 GB', m_gb_t: 'Tamanho do download contra o limite de 4 GB do navegador', m_part: 'dos downloads de', m_part_t: 'Parte dos downloads do publicador',
      v_t: 'Versões para o navegador', v_principal: 'Versão principal', v_conv: 'convertida por', v_oficial: 'do publicador', v_comun: 'da comunidade', v_runtime: 'do projeto do formato', v_gb_nm: 'tamanho não medido',
      v_gguf_n: 'Não conta: acima do limite de tamanho', v_gguf_t: 'GGUF via wllama', v_mais: 'Mostrar mais', v_menos: 'Mostrar menos', v_dl: 'downloads', v_variante: 'variante', carregando: 'Carregando versões…', sem_det: 'Sem o detalhe de cada versão neste modelo.',
      r_t: 'Relacionados', r_pub: 'Publicador', r_inst: 'Instituições', r_lab: 'Laboratórios', r_rel: 'Publicadores relacionados', r_membro: 'Membro de', r_cred: 'Créditos', r_fam: 'Mesma família', r_base: 'Modelo base', r_parte: 'Parte de', r_sub: 'Faz parte dela', r_parc: 'Parcerias', r_pubs: 'Publicadores', r_mod: 'Principais modelos', r_ds: 'Datasets', r_bm: 'Benchmarks', r_labs: 'Laboratórios',
      f_t: 'Fontes e evidências', f_acessado: 'acessado em', f_rev: 'Mostrar fontes', f_pais: 'País', f_nat: 'Tipo', f_perfil: 'Perfil no Hugging Face', f_build: 'Versão',
      p_tarefa: 'Por tarefa', modelos_pub: 'Modelos', p_fam: 'Por família', p_status: 'Por situação', p_top: 'Principais modelos', p_todos: 'Todos os modelos', p_resumo: 'Resumo', nat: 'Natureza',
      ger: 'Geradores', cod: 'Codificadores', filtrar_inst: 'Filtrar o mapa por esta instituição', ver_mais: 'Ver mais', mais_n: 'mais',
      d_idiomas: 'Idiomas', d_tarefas: 'Tarefas', d_tam: 'Tamanho', d_likes: 'Curtidas', d_escopo: 'Escopo', d_pt: 'Português do Brasil', d_dom: 'Domínio', d_tipo: 'Tipo', d_ano: 'Ano', d_criador: 'Criador', d_nds: 'Datasets', d_links: 'Links',
      lk_artigo: 'Artigo', lk_site: 'Site', lk_leaderboard: 'Leaderboard', lk_codigo: 'Código', 
      dlg: 'Detalhes', modelos_do_grupo: 'Itens do grupo', itens: 'itens', abertos: 'abre o item',
      pp_desenvolvedor: 'Desenvolvido por', pp_financiador: 'Financiado por', pp_parceiro: 'Em parceria com', pp_plataforma: 'Plataforma', pp_credito: 'Créditos',
      pc_desenvolvedor: 'Desenvolvidos', pc_financiador: 'Financiados', pc_parceiro: 'Em parceria', pc_plataforma: 'Na plataforma', pc_credito: 'Creditados',
      pn_desenvolvedor: 'modelos desenvolvidos', pn_financiador: 'modelos financiados', pn_parceiro: 'modelos em parceria', pn_plataforma: 'modelos na plataforma', pn_credito: 'modelos creditados',
      mo_pub: 'publicador no Brasil', mo_dev: 'desenvolvido por', mo_fin: 'financiado por', mo_pt: 'focado no português do Brasil', r_fin_pub: 'Financiadores dos modelos'
    },
    en: {
      voltar: 'Back', fechar: 'Close', copiar: 'Copy link', copiado: 'Link copied', abrir_hf: 'Open on Hugging Face', abrir_fonte: 'Open the source', aba: 'Opens in a new tab',
      tp_modelo: 'Model', tp_publicador: 'Publisher', tp_instituicao: 'Institution', tp_laboratorio: 'Laboratory', tp_dataset: 'Dataset', tp_benchmark: 'Benchmark', tp_familia: 'Family', tp_grupo: 'Group',
      s_roda: 'Runs in the browser', s_limit: 'With limits', s_nao: 'Not yet', s_limit_d: 'GGUF via wllama', s_nao_d: 'no browser version',
      o_br: 'Brazil', o_mu: 'World', o_ev: 'evidence', mat_experimental: 'Experimental', mat_documentado: 'Documented', mat_t: 'Model card', sinais: 'Card signals',
      pt_idioma: 'Portuguese', gguf_grande: 'GGUF over 4 GB',
      n_dl: 'Downloads, 30 days', n_par: 'Parameters', n_gb: 'Browser download', n_lic: 'License', n_upd: 'Updated on', n_fam: 'Family', n_tar: 'Task', n_base: 'Base model', n_conv: 'Converted from',
      n_mod: 'Models on the map', n_hf: 'On Hugging Face', n_nat: 'With a browser version', n_gg: 'GGUF only', n_sem: 'No version', n_membros: 'Members', n_dl_tot: 'Downloads, 30 days (sum)',
      m_gb_lim: 'of 4 GB', m_gb_t: 'Download size against the 4 GB browser limit', m_part: 'of the downloads of', m_part_t: 'Share of the publisher downloads',
      v_t: 'Browser versions', v_principal: 'Main version', v_conv: 'converted by', v_oficial: 'by the publisher', v_comun: 'by the community', v_runtime: 'by the format project', v_gb_nm: 'size not measured',
      v_gguf_n: 'Does not count: over the size limit', v_gguf_t: 'GGUF via wllama', v_mais: 'Show more', v_menos: 'Show less', v_dl: 'downloads', v_variante: 'variant', carregando: 'Loading versions…', sem_det: 'No per-version detail for this model.',
      r_t: 'Related', r_pub: 'Publisher', r_inst: 'Institutions', r_lab: 'Laboratories', r_rel: 'Related publishers', r_membro: 'Member of', r_cred: 'Credits', r_fam: 'Same family', r_base: 'Base model', r_parte: 'Part of', r_sub: 'Part of it', r_parc: 'Partners', r_pubs: 'Publishers', r_mod: 'Top models', r_ds: 'Datasets', r_bm: 'Benchmarks', r_labs: 'Laboratories',
      f_t: 'Sources and evidence', f_acessado: 'accessed on', f_rev: 'Show sources', f_pais: 'Country', f_nat: 'Type', f_perfil: 'Hugging Face profile', f_build: 'Version',
      p_tarefa: 'By task', modelos_pub: 'Models', p_fam: 'By family', p_status: 'By status', p_top: 'Top models', p_todos: 'All models', p_resumo: 'Summary', nat: 'Type',
      ger: 'Generators', cod: 'Encoders', filtrar_inst: 'Filter the map by this institution', ver_mais: 'See more', mais_n: 'more',
      d_idiomas: 'Languages', d_tarefas: 'Tasks', d_tam: 'Size', d_likes: 'Likes', d_escopo: 'Scope', d_pt: 'Brazilian Portuguese', d_dom: 'Domain', d_tipo: 'Type', d_ano: 'Year', d_criador: 'Creator', d_nds: 'Datasets', d_links: 'Links',
      lk_artigo: 'Paper', lk_site: 'Site', lk_leaderboard: 'Leaderboard', lk_codigo: 'Code', 
      dlg: 'Details', modelos_do_grupo: 'Items in the group', itens: 'items', abertos: 'opens the item',
      pp_desenvolvedor: 'Developed by', pp_financiador: 'Funded by', pp_parceiro: 'In partnership with', pp_plataforma: 'Platform', pp_credito: 'Credits',
      pc_desenvolvedor: 'Developed', pc_financiador: 'Funded', pc_parceiro: 'In partnership', pc_plataforma: 'On the platform', pc_credito: 'Credited',
      pn_desenvolvedor: 'developed models', pn_financiador: 'funded models', pn_parceiro: 'partnership models', pn_plataforma: 'platform models', pn_credito: 'credited models',
      mo_pub: 'publisher in Brazil', mo_dev: 'developed by', mo_fin: 'funded by', mo_pt: 'focused on Brazilian Portuguese', r_fin_pub: 'Funders of the models'
    }
  };
  var ICO = {
    ext: '<svg class="dr-ico" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false"><path d="M6 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8a1.5 1.5 0 0 0 1.5-1.5V10M9 2h5v5M14 2 7.5 8.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    back: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    link: '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false"><path d="M6.5 9.5a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-.8.8M9.5 6.5a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l.8-.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    x: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="m3.5 3.5 9 9m0-9-9 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    chev: '<svg class="dr-chev" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    ok: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="m3 8.5 3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  var CLS = { oficial: 'of', comunidade: 'co', gguf: 'gg', nenhum: 'no' };

  window.criarDrawer = function (c) {
    var S = c.S, esc = c.esc, nf = c.nf, root = c.root, scrim = c.scrim, corpo = root.querySelector('#drawer-corpo');
    var reduced = matchMedia('(prefers-reduced-motion:reduce)');
    var hist = [], cur = null, opener = null, aberto = false, navegando = false, fechaT = 0, carregandoBuilds = null, tituloId = 'drawer-titulo';
    var idx = null;   // indices por publicador, uma vez
    var x = function (k) { return (DT[S.lang] && DT[S.lang][k]) || DT.pt[k] || c.t(k); };
    var seguro = c.seguro;

    // ---------- estrutura: barra fixa (voltar, copiar link, fechar) + corpo com rolagem propria ----------
    var bar = document.createElement('div'); bar.className = 'dr-bar';
    var btnVoltar = document.createElement('button'); btnVoltar.type = 'button'; btnVoltar.className = 'dr-btn dr-voltar'; btnVoltar.hidden = true; btnVoltar.innerHTML = ICO.back + '<span></span>';
    var btnCopiar = document.createElement('button'); btnCopiar.type = 'button'; btnCopiar.className = 'dr-btn dr-copiar'; btnCopiar.innerHTML = ICO.link + '<span></span>';
    var btnX = root.querySelector('#drawer-x'); btnX.className = 'dr-btn dr-x'; btnX.innerHTML = ICO.x;
    var sp = document.createElement('span'); sp.className = 'dr-bar-sp';
    var aviso = document.createElement('div'); aviso.className = 'dr-aviso'; aviso.setAttribute('role', 'status'); aviso.setAttribute('aria-live', 'polite');
    bar.appendChild(btnVoltar); bar.appendChild(sp); bar.appendChild(btnCopiar); bar.appendChild(btnX);
    root.insertBefore(bar, corpo); root.appendChild(aviso);
    var grip = document.createElement('span'); grip.className = 'dr-grip'; grip.setAttribute('aria-hidden', 'true'); bar.insertBefore(grip, bar.firstChild);
    corpo.setAttribute('tabindex', '-1');

    function rotulosBarra() {
      btnVoltar.querySelector('span').textContent = x('voltar'); btnVoltar.setAttribute('aria-label', x('voltar')); btnVoltar.title = x('voltar') + ' (Alt+←)';
      btnCopiar.querySelector('span').textContent = x('copiar'); btnCopiar.setAttribute('aria-label', x('copiar')); btnCopiar.title = x('copiar');
      btnX.setAttribute('aria-label', x('fechar')); btnX.title = x('fechar') + ' (Esc)';
    }

    // ---------- indices e utilitarios ----------
    function indices() {
      if (idx) return idx; idx = { pub: {}, dl: {}, fam: {} };
      c.D.modelos.forEach(function (m) { (idx.pub[m.publicador] = idx.pub[m.publicador] || []).push(m); idx.dl[m.publicador] = (idx.dl[m.publicador] || 0) + (m.downloads || 0); var k = m.publicador + '|' + m.familia; (idx.fam[k] = idx.fam[k] || []).push(m); });
      return idx;
    }
    var nome = function (m) { return m.nome || m.id; };
    var curto = function (n) { return String(n).split('/').pop(); };
    var fmtGb = function (g) { return nf(g, 2) + ' GB'; };
    var compact = function (n) { if (n == null) return ''; var a = Math.abs(n); if (a >= 1e9) return nf(n / 1e9, 1) + (S.lang === 'pt' ? ' bi' : ' B'); if (a >= 1e6) return nf(n / 1e6, 1) + (S.lang === 'pt' ? ' mi' : ' M'); if (a >= 1e4) return nf(n / 1e3, 0) + ' mil'.replace('mil', S.lang === 'pt' ? 'mil' : 'K'); return nf(n); };
    var a = function (url, rot, cls) { return '<a class="' + (cls || 'dr-ext') + '" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + rot + ICO.ext + '<span class="dr-sr"> (' + esc(x('aba')) + ')</span></a>'; };
    var IRT = { p: 'pub', i: 'inst', l: 'lab' };
    var go = function (tipo, id, rot, extra, tab) {   // chip/botao que navega dentro do drawer: data-abrir (modelo da aba), data-ir pub|inst|lab|datasets|benchmarks
      var at = tipo === 'm' && !tab ? 'data-abrir="' + esc(id) + '"' : 'data-ir="' + (tipo === 'm' ? tab : IRT[tipo]) + ':' + esc(id) + '"';
      return '<button type="button" class="dr-go" ' + at + '>' + (extra || '') + '<span class="dr-go-t">' + esc(rot) + '</span></button>';
    };
    var textoLoc = function (v) { return v && typeof v === 'object' ? (v[S.lang] || v.pt || v.en || '') : (v || ''); };
    var tile = function (v, rot, extra) { return v === '' || v == null ? '' : '<div class="dr-tile"><dt>' + esc(rot) + '</dt><dd>' + v + '</dd>' + (extra || '') + '</div>'; };
    var tiles = function (arr) { var h = arr.join(''); return h ? '<dl class="dr-tiles">' + h + '</dl>' : ''; };
    var meter = function (frac, rotulo, cls) { var p = Math.max(0, Math.min(1, frac)); return '<div class="dr-meter ' + (cls || '') + '" role="img" aria-label="' + esc(rotulo) + '"><i style="width:' + (p * 100).toFixed(1) + '%"></i></div>'; };
    var sec = function (tit, corpoH, cls) { return corpoH ? '<section class="dr-sec ' + (cls || '') + '"><h3>' + esc(tit) + '</h3>' + corpoH + '</section>' : ''; };
    var chips = function (arr) { return arr.length ? '<div class="dr-chips">' + arr.join('') + '</div>' : ''; };
    var grupoRel = function (tit, arr) { return arr.length ? '<div class="dr-relg"><h4>' + esc(tit) + '</h4>' + chips(arr) + '</div>' : ''; };
    var tipoTxt = function (k) { return x('tp_' + k); };
    var stackBar = function (cont, ordem, rotulo, rot) {
      var tot = ordem.reduce(function (s, k) { return s + (cont[k] || 0); }, 0); if (!tot) return '';
      return '<div class="dr-stack" role="img" aria-label="' + esc(rotulo) + '">' + ordem.map(function (k) { return cont[k] ? '<i class="s-' + CLS[k] + '" style="flex:' + cont[k] + '"></i>' : ''; }).join('') + '</div>' +
        '<ul class="dr-leg">' + ordem.map(function (k) { return cont[k] ? '<li><i class="s-' + CLS[k] + '"></i>' + esc(rot ? rot(k) : x('leg_' + CLS[k])) + ' <b>' + nf(cont[k]) + '</b></li>' : ''; }).join('') + '</ul>';
    };


    // ---------- creditos e papeis (leitura tolerante: texto 'inst:id', 'inst:id:papel' ou objeto {tipo|entidade, id, papel}) ----------
    var PAPEIS = ['desenvolvedor', 'financiador', 'parceiro', 'plataforma'], PAPEL_ALIAS = { desenvolvido: 'desenvolvedor', desenvolvido_por: 'desenvolvedor', developer: 'desenvolvedor', financiado: 'financiador', financiado_por: 'financiador', funder: 'financiador', parceria: 'parceiro', partner: 'parceiro', platform: 'plataforma' };
    var papelNorm = function (v) { v = String(v || '').toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, ''); return PAPEIS.indexOf(v) >= 0 ? v : (PAPEL_ALIAS[v] || ''); };
    function creditosDe(m) {
      return (m.creditos || []).map(function (k) {
        if (k && typeof k === 'object') { var tp = String(k.tipo || k.entidade || k.ent || '').replace(/^instituicao$/, 'inst').replace(/^laboratorio$/, 'lab'), id = k.id || k.alvo; if (!id) return null; var q0 = String(id).split(':'); if (/^(inst|lab)$/.test(q0[0]) && q0.length > 1) { tp = q0[0]; id = q0.slice(1).join(':'); } return { tipo: tp === 'lab' ? 'lab' : 'inst', id: id, papel: papelNorm(k.papel) }; }
        var q = String(k).split(':'), tipo = q.shift(), papel = ''; if (q.length > 1 && papelNorm(q[q.length - 1])) papel = papelNorm(q.pop());
        return { tipo: tipo === 'lab' ? 'lab' : 'inst', id: q.join(':'), papel: papel };
      }).filter(Boolean);
    }
    var PIC = {
      desenvolvedor: '<svg class="dr-pi" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false"><path d="m5.5 4.5-3.5 3.5 3.5 3.5M10.5 4.5 14 8l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      financiador: '<svg class="dr-pi" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 4.8v6.4M9.8 6.3C9.4 5.6 8.8 5.4 8 5.4c-1 0-1.7.5-1.7 1.2 0 1.8 3.6.9 3.6 2.8 0 .7-.8 1.2-1.9 1.2-.9 0-1.5-.3-1.9-1" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
      parceiro: '<svg class="dr-pi" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false"><circle cx="6" cy="8" r="3.6" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="10.4" cy="8" r="3.6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
      plataforma: '<svg class="dr-pi" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false"><path d="m8 2 6 3-6 3-6-3zM2 8.2l6 3 6-3M2 11l6 3 6-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>',
      credito: '<svg class="dr-pi" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="2.2" fill="currentColor"/></svg>'
    };
    var rotPapel = function (p) { return x('pp_' + (p || 'credito')); };
    var entNome = function (tipo, id) { var e = tipo === 'lab' ? c.REL.labBy[id] : tipo === 'inst' ? c.REL.instBy[id] : c.pubBy[id]; return e ? (e.sigla || (tipo === 'pub' ? e.nome : c.nomeDe(e))) : id; };
    // por que e brasileiro: codigo de motivo -> frase curta (campo ausente = sem linha)
    function motivoTxt(v) {
      if (v == null || v === '') return ''; if (Array.isArray(v)) v = v[0]; if (v == null) return '';
      if (typeof v === 'object' && (v.pt || v.en) && !v.codigo && !v.motivo) return textoLoc(v);
      var cod = typeof v === 'object' ? (v.codigo || v.motivo || v.tipo || '') : String(v), ent = typeof v === 'object' ? (v.entidade || v.por || v.id || '') : '';
      var q = String(cod).split(':'); if (q.length > 1 && !ent) { cod = q[0]; ent = q.slice(1).join(':'); }
      if (ent) { var qq = String(ent).split(':'); if (qq.length > 1 && /^(inst|lab|pub)$/.test(qq[0])) ent = entNome(qq[0], qq.slice(1).join(':')); else ent = entNome(c.REL.instBy[ent] ? 'inst' : c.REL.labBy[ent] ? 'lab' : 'pub', ent); }
      var k = String(cod).toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '');
      if (/^(publicador|publicador_br|publicador_no_brasil|publisher_br)$/.test(k)) return x('mo_pub');
      if (/^(desenvolvedor|desenvolvido|desenvolvido_por|developer)$/.test(k)) return x('mo_dev') + (ent ? ' ' + ent : '');
      if (/^(financiador|financiado|financiado_por|funder)$/.test(k)) return x('mo_fin') + (ent ? ' ' + ent : '');
      if (/^(foco_pt_br|foco_ptbr|portugues_br|pt_br|idioma_pt_br)$/.test(k)) return x('mo_pt');
      return String(cod) + (ent ? ' ' + ent : '');
    }

    // motivo de origem do modelo: texto ('financiador'), objeto/lista {codigo, entidade} ou texto + origem_fonte.credito ('inst:ID:papel') que nomeia a entidade
    function motivoModelo(m) {
      var v = m.origem_motivo; if (v == null || v === '') return '';
      var f = m.origem_fonte; if (typeof v === 'string' && f && typeof f === 'object' && f.credito) { var q = String(f.credito).split(':'); if (q.length > 2 && papelNorm(q[q.length - 1])) q.pop(); v = { codigo: v, entidade: q.join(':') }; }
      return motivoTxt(v);
    }
    // ---------- situacao e origem ----------
    var MAT = { e: 'experimental', experimental: 'experimental', d: 'documentado', documentado: 'documentado' };   // dados: 'e'/'d'/'i' (contrato de maturidade) ou o nome por extenso; 'i' (indeterminado) nao ganha selo
    function matDe(m) { return MAT[m.maturidade] || ''; }
    function cartaoSec(m) {   // estado do cartao em frase simples e ressalva neutra (texto do modulo de filtros, quando carregado)
      var F = window.MAPA_FILTROS; return F && F.exp && m.maturidade ? '<section class="dr-sec dr-cartao">' + F.exp.painelHtml(m, c.t, esc, S.lang) + '</section>' : '';
    }
    function viaDe(m) { return c.viaOf(m); }
    function selos(m, p) {
      var v = viaDe(m), s = [];
      if (v === 'oficial' || v === 'comunidade') s.push('<span class="dr-selo ok s-' + CLS[v] + '">' + esc(x('s_roda')) + '</span>');
      else if (v === 'gguf') s.push('<span class="dr-selo lim s-gg">' + esc(x('s_limit')) + '<small>' + esc(x('s_limit_d')) + '</small></span>');
      else s.push('<span class="dr-selo nao s-no">' + esc(x('s_nao')) + '</span>');
      if (m.gguf_grande && v === 'nenhum') s.push('<span class="dr-selo neutro">' + esc(x('gguf_grande')) + '</span>');
      var origem = m.escopo === 'br' || (p && p.escopo === 'br') ? 'br' : 'mu', motivo = motivoModelo(m) || motivoTxt(p && p.origem_motivo);
      s.push('<span class="dr-selo neutro">' + esc(x(origem === 'br' ? 'o_br' : 'o_mu')) + (motivo ? '<small>' + esc(motivo) + '</small>' : '') + '</span>');
      if (m.recorte_pt === true) s.push('<span class="dr-selo neutro">' + esc(x('rec_rotulo')) + '</span>');
      var mat = matDe(m); if (mat) s.push('<span class="dr-selo neutro">' + esc(x('mat_' + mat)) + '</span>');
      if (m.idioma_pt) s.push('<span class="dr-selo neutro">' + esc(x('pt_idioma')) + '</span>');
      return '<div class="dr-selos">' + s.join('') + '</div>';
    }
    function origemPub(p) {
      var br = p.escopo === 'br' || p.classe_pais === 'br_evidencia', motivo = motivoTxt(p.origem_motivo) || (br && p.evidencia_pais ? x('o_ev') + ': ' + c.tipoFonte(p.evidencia_pais.tipo) : '');
      return '<span class="dr-selo neutro">' + esc(x(br ? 'o_br' : 'o_mu')) + (motivo ? '<small>' + esc(motivo) + '</small>' : '') + '</span>';
    }

    // ---------- cabecalho ----------
    function cab(o) {   // {tipo, avatar, nome, sub, selos, acoes}
      return '<header class="dr-cab"><div class="dr-id">' + (o.avatar || '') + '<div class="dr-tt"><span class="dr-tipo">' + esc(o.tipo) + '</span><h2 id="' + tituloId + '" tabindex="-1">' + esc(o.nome) + '</h2>' + (o.sub ? '<p class="dr-sub">' + o.sub + '</p>' : '') + '</div></div>' + (o.selos || '') + (o.acoes ? '<div class="dr-acoes">' + o.acoes + '</div>' : '') + '</header>';
    }
    var tileLogo = function (txt) { return '<span class="av dr-logo dr-tilelogo" aria-hidden="true"><span class="ini">' + esc(String(txt || '?').slice(0, 3).toUpperCase()) + '</span></span>'; };
    var avPub = function (pid, org) { return window.Avatar ? Avatar.html(pid, 'dr-av' + (org ? ' logo' : '')) : ''; };
    var avGrande = function (pid, p) { return avPub(pid, p && (p.natureza === 'instituicao' || p.natureza === 'empresa' || p.tipo === 'organizacao')); };

    // ---------- fontes ----------
    function fonteLi(f) {
      return '<li>' + (seguro(f.url) ? a(seguro(f.url), esc(f.rotulo || c.tipoFonte(f.tipo) || f.url)) : esc(f.rotulo || '')) + (f.acessado ? '<span class="dr-data"> · ' + esc(x('f_acessado')) + ' ' + esc(f.acessado) + '</span>' : '') + (f.trecho ? '<blockquote>' + esc(f.trecho) + '</blockquote>' : '') + '</li>';
    }
    function fontes(lista) {
      var l = lista.filter(function (f) { return f && (f.url || f.rotulo); }); if (!l.length) return '';
      return '<details class="dr-fontes"><summary><span>' + esc(x('f_t')) + '</span><span class="dr-cnt">' + l.length + '</span>' + ICO.chev + '</summary><ul>' + l.map(fonteLi).join('') + '</ul></details>';
    }
    function evidenciasPub(p) {
      var l = [];
      if (p.evidencia_pais) l.push({ rotulo: x('f_pais') + ': ' + c.t('cl_' + p.classe_pais) + ' (' + c.tipoFonte(p.evidencia_pais.tipo) + ')', url: p.evidencia_pais.url, acessado: p.evidencia_pais.acessado, trecho: p.evidencia_pais.trecho });
      if (p.evidencia_natureza) l.push({ rotulo: x('f_nat') + ': ' + c.natTxt(p), url: p.evidencia_natureza.url, acessado: p.evidencia_natureza.acessado, trecho: p.evidencia_natureza.trecho });
      return l;
    }

    // ---------- relacionados (chips que navegam dentro do drawer) ----------
    var chipPub = function (id) { var p = c.pubBy[id]; return p ? go('p', id, p.nome, avPub(id, false)) : ''; };
    var paisSufixo = function (e) { return e && e.pais && e.pais !== 'BR' ? ' (' + e.pais + ')' : ''; };
    var chipInst = function (id) { var i = c.REL.instBy[id]; return i ? go('i', id, (i.sigla || c.nomeDe(i)) + paisSufixo(i), '<span class="dr-dot ent-i" aria-hidden="true"></span>') : ''; };
    var chipLab = function (id) { var l = c.REL.labBy[id]; return l ? go('l', id, (l.sigla ? l.sigla + ' · ' : '') + c.nomeDe(l) + paisSufixo(l), '<span class="dr-dot ent-l" aria-hidden="true"></span>') : ''; };
    var chipMod = function (m) { return go('m', m.id, curto(nome(m)), '<span class="dr-dot s-' + CLS[viaDe(m)] + '" aria-hidden="true"></span>'); };
    var chipPapel = function (cr) { var ch = cr.tipo === 'lab' ? chipLab(cr.id) : chipInst(cr.id); return ch ? ch.replace('<span class="dr-go-t">', PIC[cr.papel || 'credito'].replace('class="dr-pi"', 'class="dr-pi p-' + (cr.papel || 'credito') + '"') + '<span class="dr-go-t">') : ''; };
    function creditosPorPapel(lista) {   // [{tipo,id,papel}] -> um bloco por papel, cada um com rotulo e icone proprios; nunca mistura financiador com autoria
      var h = '', ordem = PAPEIS.concat(['']);
      ordem.forEach(function (pp) { var seen = {}, arr = lista.filter(function (cr) { var k = cr.tipo + ':' + cr.id; if ((cr.papel || '') !== pp || seen[k]) return false; seen[k] = 1; return true; }).map(chipPapel).filter(Boolean); if (arr.length) h += '<div class="dr-relg papel p-' + (pp || 'credito') + '"><h4>' + PIC[pp || 'credito'].replace('class="dr-pi"', 'class="dr-pi p-' + (pp || 'credito') + '"') + esc(rotPapel(pp)) + '</h4>' + chips(arr) + '</div>'; });
      return h;
    }
    function relPubs(pid) {   // publicadores relacionados (relacao simetrica), cada um com a contagem e os modelos principais
      var ids = (c.relDe[pid] || []).filter(function (q, i, arr) { return arr.indexOf(q) === i && c.pubBy[q]; }); if (!ids.length) return '';
      var li = ids.map(function (id) {
        var ms = (indices().pub[id] || []).slice().sort(function (p, q) { return (q.downloads || 0) - (p.downloads || 0); });
        return '<li>' + chipPub(id) + '<span class="dr-relpub-n">' + nf(ms.length) + ' ' + esc(c.t('rel_nmod')) + '</span>' + (ms.length ? '<span class="dr-relpub-m">' + ms.slice(0, 3).map(function (m) { return go('m', m.id, curto(nome(m))); }).join(', ') + '</span>' : '') + '</li>';
      }).join('');
      return '<div class="dr-relg"><h4>' + esc(x('r_rel')) + '</h4><ul class="dr-relpubs">' + li + '</ul></div>';
    }
    function vinculosPub(pid, m) {
      var o = c.REL.porPub ? c.REL.porPub[pid] : null, g = [];
      if (m && (m.creditos || []).length) g.push(creditosPorPapel(creditosDe(m)));
      if (o) {
        g.push(grupoRel(x('r_inst'), o.inst.map(chipInst).filter(Boolean)));
        g.push(grupoRel(x('r_lab'), o.labs.map(chipLab).filter(Boolean)));
        g.push(relPubs(pid));
        g.push(grupoRel(x('r_membro'), o.membro.map(chipPub).filter(Boolean)));
      }
      return g.join('');
    }
    function creditosDoPublicador(pid) {   // aggregated: entidades que financiam/desenvolvem/apoiam modelos desse publicador, com a contagem
      var por = {}, n = 0; (indices().pub[pid] || []).forEach(function (m) { creditosDe(m).forEach(function (cr) { if (!cr.papel) return; var k = cr.papel + '|' + cr.tipo + ':' + cr.id; por[k] = (por[k] || 0) + 1; n++; }); });
      if (!n) return ''; var lista = Object.keys(por).map(function (k) { var q = k.split('|'), t = q[1].split(':'); return { papel: q[0], tipo: t[0], id: t.slice(1).join(':'), n: por[k] }; });
      var h = ''; PAPEIS.forEach(function (pp) { var arr = lista.filter(function (r) { return r.papel === pp; }).sort(function (a1, b1) { return b1.n - a1.n; }).map(function (r) { return chipPapel(r).replace('</button>', '<span class="dr-n">' + nf(r.n) + '</span></button>'); }).filter(Boolean); if (arr.length) h += '<div class="dr-relg papel p-' + pp + '"><h4>' + PIC[pp].replace('class="dr-pi"', 'class="dr-pi p-' + pp + '"') + esc(rotPapel(pp)) + '</h4>' + chips(arr) + '</div>'; });
      return h;
    }

    function afilLinha(pid) {   // pessoa afiliada a instituicao/laboratorio: "pesquisador(a) no laboratorio X (Instituicao, Pais)"
      var p = c.pubBy[pid], o = c.REL.porPub ? c.REL.porPub[pid] : null; if (!p || p.natureza_rotulo !== 'afiliada' || !o) return '';
      var lb = o.labs.length ? c.REL.labBy[o.labs[0]] : null, ins = lb && lb.instituicao ? c.REL.instBy[lb.instituicao] : (o.inst.length ? c.REL.instBy[o.inst[0]] : null); if (!ins) return '';
      return '<p class="dr-sub dr-afil">' + (lb ? esc(c.t('pesq_lab') + ' ' + lb.nome) : esc(c.natTxt(p))) + ' (' + esc(ins.nome) + (ins.pais ? ', ' + esc(c.paisNome(ins.pais)) : '') + ')</p>';
    }
    // ---------- modelo ----------
    function versoes(m) {
      if (viaDe(m) === 'nenhum') return '';   // sem versao para o navegador: nada a mostrar nem a esperar
      var bs = (m.builds || []);
      var lazy = !m.builds && c.PARTES.builds && !window.MAPA_DETALHES;
      if (lazy) return '<section class="dr-sec" aria-busy="true"><h3>' + esc(x('v_t')) + '</h3><div class="dr-skel" aria-label="' + esc(x('carregando')) + '"><i></i><i></i><i></i></div></section>';
      if (!bs.length) return '';
      var pool = bs.filter(function (b) { return b.destaque; }); if (!pool.length) pool = bs;
      var nat = pool.filter(function (b) { return b.formato !== 'gguf'; }); if (nat.length) pool = nat;
      var principal = pool.slice().sort(function (p, q) { return (q.oficial ? 1 : 0) - (p.oficial ? 1 : 0) || (q.runtime_org ? 1 : 0) - (p.runtime_org ? 1 : 0) || (q.downloads || 0) - (p.downloads || 0); })[0];
      var por = {}; bs.forEach(function (b) { (por[b.formato] = por[b.formato] || []).push(b); });
      var maxdl = bs.reduce(function (s, b) { return Math.max(s, b.downloads || 0); }, 0), h = '';
      c.FORMATOS.forEach(function (f) {
        var l = por[f]; if (!l) return; l = l.slice().sort(function (p, q) { return (p === principal ? -1 : 0) - (q === principal ? -1 : 0) || (q.oficial ? 1 : 0) - (p.oficial ? 1 : 0) || (q.downloads || 0) - (p.downloads || 0); });
        var gg = f === 'gguf', nota = gg && !m.gguf_wllama ? '<span class="dr-fnota">' + esc(x('v_gguf_n')) + '</span>' : (gg ? '<span class="dr-fnota">' + esc(x('v_gguf_t')) + '</span>' : '');
        h += '<div class="dr-fmt" data-fmt="' + f + '"><h4><span class="dr-fmt-n">' + c.fmtNome[f] + '</span><span class="dr-cnt">' + l.length + '</span>' + nota + '</h4><ul class="dr-vers">' + l.slice(0, 4).map(function (b) { return versaoLi(b, b === principal, maxdl); }).join('') + '</ul>' +
          (l.length > 4 ? '<details class="dr-mais"><summary>' + esc(x('v_mais')) + ' (' + (Math.min(l.length, 24) - 4) + (l.length > 24 ? '+' : '') + ')</summary><ul class="dr-vers">' + l.slice(4, 24).map(function (b) { return versaoLi(b, false, maxdl); }).join('') + '</ul>' + (l.length > 24 ? '<p class="dr-nota">+ ' + nf(l.length - 24) + ' ' + esc(x('mais_n')) + '</p>' : '') + '</details>' : '') + '</div>';
      });
      return sec(x('v_t'), h, 'dr-versoes');
    }
    function versaoLi(b, principal, maxdl) {
      var papel = b.proprio || b.oficial ? x('v_oficial') : b.runtime_org ? x('v_runtime') : x('v_comun');
      return '<li class="dr-ver' + (principal ? ' principal' : '') + '">' + (principal ? '<span class="dr-star">' + esc(x('v_principal')) + '</span>' : '') +
        '<div class="dr-ver-l">' + (b.autor && window.Avatar ? Avatar.html(b.autor, 'dr-av-s') : '') + '<div class="dr-ver-t">' + (seguro(b.url) ? a(seguro(b.url), esc(curto(b.repo)), 'dr-ext dr-ver-n') : esc(curto(b.repo))) +
        '<small>' + esc(x('v_conv')) + ' <a class="dr-aut" href="https://huggingface.co/' + esc(b.autor) + '" target="_blank" rel="noopener noreferrer">' + esc(b.autor) + '</a> · ' + esc(papel) + '</small></div></div>' +
        '<div class="dr-ver-n2"><b>' + (b.gb ? fmtGb(b.gb) : '<span class="dr-mudo">' + esc(x('v_gb_nm')) + '</span>') + '</b>' + (b.downloads != null ? '<span class="dr-mini" title="' + esc(nf(b.downloads) + ' ' + x('v_dl')) + '"><i style="width:' + (maxdl ? Math.max(3, b.downloads / maxdl * 100) : 0).toFixed(0) + '%"></i></span><small>' + esc(compact(b.downloads)) + ' ' + esc(x('v_dl')) + '</small>' : '') + '</div></li>';
    }
    function drawerModelo(m) {
      var p = c.pubBy[m.publicador] || { nome: m.publicador, id: m.publicador }, i = indices(), tot = i.dl[m.publicador] || 0, gb = m.gb_navegador;
      var tar = c.t('ta_' + m.ftar) + (m.tarefa ? ' (' + m.tarefa + ')' : '');
      var t1 = [
        tile(m.downloads != null ? nf(m.downloads) : '', x('n_dl'), tot > 0 && m.downloads != null ? meter(m.downloads / tot, x('m_part_t'), 'm-dl') + '<small class="dr-mt">' + esc(nf(Math.min(100, m.downloads / tot * 100), m.downloads / tot < 0.1 ? 1 : 0)) + '% ' + esc(x('m_part')) + ' ' + esc(p.nome) + '</small>' : ''),
        tile(m.parametros_b ? nf(m.parametros_b, 2) + ' B' : '', x('n_par')),
        tile(gb ? fmtGb(gb) : '', x('n_gb'), gb ? meter(gb / 4, x('m_gb_t'), gb > 3.2 ? 'm-alerta' : '') + '<small class="dr-mt">' + esc(nf(gb, 2)) + ' ' + esc(x('m_gb_lim')) + '</small>' : ''),
        tile(m.licenca ? esc(m.licenca) : '', x('n_lic')),
        tile(m.atualizado ? esc(m.atualizado) : '', x('n_upd'))
      ];
      var det = [['n_fam', m.familia], ['n_tar', tar]];
      var base = m.base ? '<dt>' + esc(x('n_base')) + '</dt><dd>' + (c.modBy[m.base] ? go('m', m.base, m.base) : a('https://huggingface.co/' + encodeURI(m.base), esc(m.base))) + '</dd>' : '';
      var conv = m.conversao_de && m.conversao_de !== m.base ? '<dt>' + esc(x('n_conv')) + '</dt><dd>' + (c.modBy[m.conversao_de] ? go('m', m.conversao_de, m.conversao_de) : a('https://huggingface.co/' + encodeURI(m.conversao_de), esc(m.conversao_de))) + '</dd>' : '';
      var dl = '<dl class="dr-kv">' + det.filter(function (d) { return d[1]; }).map(function (d) { return '<dt>' + esc(x(d[0])) + '</dt><dd>' + esc(d[1]) + '</dd>'; }).join('') + base + conv + '</dl>';
      var irm = (i.fam[m.publicador + '|' + m.familia] || []).filter(function (q) { return q.id !== m.id; }).sort(function (q, r) { return (r.downloads || 0) - (q.downloads || 0); });
      var rel = '<div class="dr-relg"><h4>' + esc(x('r_pub')) + '</h4>' + chips([chipPub(m.publicador)]) + '</div>' + vinculosPub(m.publicador, m) +
        (irm.length ? '<div class="dr-relg"><h4>' + esc(x('r_fam')) + (irm.length > 8 ? ' · ' + irm.length : '') + '</h4>' + chips(irm.slice(0, 8).map(chipMod)) + '</div>' : '');
      var fl = (m.fontes || []).concat((m.builds || []).filter(function (b) { return b.destaque; }).map(function (b) { return { rotulo: x('f_build') + ' ' + c.fmtNome[b.formato] + ' · ' + b.repo, url: b.url, acessado: c.D.meta.coletado_em }; })).concat(evidenciasPub(p));
      return cab({
        tipo: tipoTxt('modelo') + ' · ' + c.t('ta_' + m.ftar), nome: nome(m), avatar: avGrande(m.publicador, p),
        sub: c.pubBy[m.publicador] ? '<button type="button" class="dr-go dr-go-inline" data-ir="pub:' + esc(m.publicador) + '"><span class="dr-go-t">' + esc(p.nome) + '</span></button> · ' + esc(c.natTxt(p)) : esc(p.nome),
        selos: selos(m, p), acoes: seguro(m.url) ? a(seguro(m.url), esc(x('abrir_hf')), 'dr-primario') : ''
      }) + afilLinha(m.publicador) + tiles(t1) + dl + cartaoSec(m) + versoes(m) + sec(x('r_t'), rel, 'dr-rels') + fontes(fl);
    }

    // ---------- listas de modelos com mini-barras ----------
    function listaModelos(ms, limite, chave) {
      var s = ms.slice().sort(function (p, q) { return (q.downloads || 0) - (p.downloads || 0); }), max = s.length ? (s[0].downloads || 0) : 0;
      var li = function (m) { return '<li><button type="button" class="dr-go dr-row" data-abrir="' + esc(m.id) + '"><span class="dr-dot s-' + CLS[viaDe(m)] + '" aria-hidden="true"></span><span class="dr-go-t">' + esc(curto(nome(m))) + '</span><span class="dr-mini"><i style="width:' + (max ? Math.max(2, (m.downloads || 0) / max * 100) : 0).toFixed(0) + '%"></i></span><span class="dr-val">' + esc(compact(m.downloads || 0)) + '</span></button></li>'; };
      var h = '<ul class="dr-top" data-lista="' + chave + '">' + s.slice(0, limite).map(li).join('') + '</ul>';
      if (s.length > limite) h += '<details class="dr-mais" data-lista-mais="' + chave + '"><summary>' + esc(x('ver_mais')) + ' (' + (Math.min(s.length, 60) - limite) + (s.length > 60 ? '+' : '') + ')</summary><ul class="dr-top">' + s.slice(limite, 60).map(li).join('') + '</ul>' + (s.length > 60 ? '<p class="dr-nota">+ ' + nf(s.length - 60) + ' ' + esc(x('mais_n')) + '</p>' : '') + '</details>';
      return h;
    }
    var tamTok = /^(tiny|mini|small|base|large|xl|xxl|medium|femto|nano|\d+(\.\d+)?[bkm])$/i;
    function nomeFamilia(ms, fam) {   // nome amigavel: o que os nomes tem em comum, sem os tamanhos
      var tk = ms.map(function (m) { return m.nome.split('/').pop().split(/[-_]/); }), comum = tk[0].filter(function (w) { return !tamTok.test(w) && tk.every(function (q) { return q.indexOf(w) >= 0; }); }), tam = [];
      tk.forEach(function (q) { q.forEach(function (w) { if (tamTok.test(w) && tam.indexOf(w) < 0) tam.push(w); }); });
      return (c.famNome[fam] || comum.join(' ') || fam) + (tam.length ? ' (' + tam.join(', ') + ')' : '');
    }
    function porFamilia(ms, aberto) {   // tamanhos e variantes de uma familia juntos
      var por = {}, ordem = []; ms.forEach(function (m) { if (!por[m.familia]) { por[m.familia] = []; ordem.push(m.familia); } por[m.familia].push(m); });
      if (ordem.length < 2 && ms.length < 2) return '';
      ordem.sort(function (p, q) { return por[q].length - por[p].length || (p < q ? -1 : 1); });
      var n = 0, h = '';
      for (var i = 0; i < ordem.length && n < 60; i++) {
        var g = por[ordem[i]].slice().sort(function (p, q) { return (q.downloads || 0) - (p.downloads || 0); }).slice(0, 60 - n); n += g.length;
        var btn = function (m) { return '<li>' + go('m', m.id, curto(nome(m)), '<span class="dr-dot s-' + CLS[viaDe(m)] + '" aria-hidden="true"></span>') + '</li>'; };
        h += g.length > 1 ? '<li class="dr-fam"><strong>' + esc(nomeFamilia(por[ordem[i]], ordem[i])) + '</strong> <span class="dr-cnt">' + por[ordem[i]].length + '</span><ul class="dr-famlista">' + g.map(btn).join('') + '</ul></li>' : btn(g[0]);
      }
      return '<details class="dr-mais dr-porfam"' + (aberto ? ' open' : '') + '><summary>' + esc(x('p_fam')) + '</summary><ul class="dr-famgrupos">' + h + '</ul>' + (ms.length > n ? '<p class="dr-nota">+ ' + nf(ms.length - n) + ' ' + esc(x('mais_n')) + '</p>' : '') + '</details>';
    }
    function resumoModelos(ms) {
      var cont = { oficial: 0, comunidade: 0, gguf: 0, nenhum: 0 }, ger = 0, cod = 0, dl = 0;
      ms.forEach(function (m) { cont[viaDe(m)]++; if (m.ftar === 'codificador') cod++; else ger++; dl += m.downloads || 0; });
      return { cont: cont, ger: ger, cod: cod, dl: dl, nat: cont.oficial + cont.comunidade, gg: cont.gguf, n: ms.length };
    }
    function blocoResumo(r, extra) {
      var tl = [tile(nf(r.n), x('n_mod')), tile(nf(r.nat), x('n_nat'), r.n ? meter(r.nat / r.n, x('n_nat')) : ''), tile(r.gg ? nf(r.gg) : (r.n ? '0' : ''), x('n_gg')), r.dl ? tile(esc(compact(r.dl)), x('n_dl_tot')) : ''].concat(extra || []);
      var por = '';
      if (r.ger || r.cod) por = '<div class="dr-por"><h4>' + esc(x('p_tarefa')) + '</h4><div class="dr-stack" role="img" aria-label="' + esc(x('ger') + ' ' + r.ger + ', ' + x('cod') + ' ' + r.cod) + '">' + (r.ger ? '<i class="s-ger" style="flex:' + r.ger + '"></i>' : '') + (r.cod ? '<i class="s-cod" style="flex:' + r.cod + '"></i>' : '') + '</div><ul class="dr-leg"><li><i class="s-ger"></i>' + esc(x('ger')) + ' <b>' + nf(r.ger) + '</b></li><li><i class="s-cod"></i>' + esc(x('cod')) + ' <b>' + nf(r.cod) + '</b></li></ul></div>';
      return tiles(tl) + por + (r.n ? '<div class="dr-por"><h4>' + esc(x('p_status')) + '</h4>' + stackBar(r.cont, ['oficial', 'comunidade', 'gguf', 'nenhum'], x('p_status')) + '</div>' : '');
    }

    // ---------- publicador ----------
    function drawerPublicador(pid, g) {
      var p = c.pubBy[pid]; if (!p) return '';
      var ms = indices().pub[pid] || [], r = resumoModelos(ms);
      var extra = [p.n_modelos_hf && p.n_modelos_hf !== ms.length ? tile(nf(p.n_modelos_hf), x('n_hf')) : '', p.n_membros ? tile(nf(p.n_membros), x('n_membros')) : ''];
      var rel = creditosDoPublicador(pid) + vinculosPub(pid, null), relPubs = '';
      var fl = (p.fontes || []).concat(evidenciasPub(p));
      return cab({
        tipo: tipoTxt('publicador') + (p.natureza && p.natureza !== 'nao_classificada' ? ' · ' + c.natTxt(p) : ''), nome: p.nome, avatar: avGrande(pid, p),
        sub: p.id !== p.nome ? '<span class="dr-mono">' + esc(p.id) + '</span>' : '', selos: '<div class="dr-selos">' + origemPub(p) + '</div>', acoes: seguro(p.url) ? a(seguro(p.url), esc(x('abrir_hf')), 'dr-primario') : ''
      }) + afilLinha(pid) + blocoResumo(r, extra) + (ms.length ? sec(ms.length > 8 ? x('p_top') : x('modelos_pub'), ms.length > 8 ? listaModelos(ms, 6, 'pub') + porFamilia(ms, false) : porFamilia(ms, true)) : '') + sec(x('r_t'), rel, 'dr-rels') + fontes(fl) + relPubs;
    }

    // ---------- instituicao e laboratorio ----------
    function modelosDe(fn) { return c.D.modelos.filter(fn); }
    function porPapel(tipo, id, pubs) {   // modelos da entidade separados por papel: autoria (contas vinculadas) e cada papel de credito
      var out = { desenvolvedor: [], financiador: [], parceiro: [], plataforma: [], '': [] }, vis = {};
      c.D.modelos.forEach(function (m) {
        var cr = creditosDe(m).filter(function (r) { return r.tipo === tipo && r.id === id; });
        if (pubs.indexOf(m.publicador) >= 0 && !cr.some(function (r) { return r.papel === 'desenvolvedor'; })) cr.push({ papel: 'desenvolvedor' });
        cr.forEach(function (r) { var k = r.papel || ''; if (!vis[m.id + '|' + k]) { vis[m.id + '|' + k] = 1; out[k].push(m); } });
      });
      return out;
    }
    function blocoPapeis(pp) {
      var tl = [], h = '';
      PAPEIS.concat(['']).forEach(function (k) { var l = pp[k]; if (!l.length) return; tl.push('<div class="dr-tile papel p-' + (k || 'credito') + '"><dt>' + PIC[k || 'credito'].replace('class="dr-pi"', 'class="dr-pi p-' + (k || 'credito') + '"') + esc(x('pn_' + (k || 'credito'))) + '</dt><dd>' + nf(l.length) + '</dd></div>'); });
      PAPEIS.concat(['']).forEach(function (k) { var l = pp[k]; if (l.length) h += sec(x('pc_' + (k || 'credito')) + ' · ' + nf(l.length), listaModelos(l, 5, 'pp-' + (k || 'credito')), 'papel p-' + (k || 'credito')); });
      return { tiles: tl.length ? '<dl class="dr-tiles dr-tiles-papel">' + tl.join('') + '</dl>' : '', listas: h, algum: tl.length };
    }
    function drawerInst(i) {
      var pubs = (i.publicadores || []).filter(function (q) { return c.pubBy[q]; }), ms = modelosDe(function (m) { return (m.insts || []).indexOf(i.id) >= 0; }), r = resumoModelos(ms), pp = porPapel('inst', i.id, i.publicadores || []);
      var subs = c.REL.inst.filter(function (q) { return q.parte_de === i.id; }), bp = blocoPapeis(pp);
      var loc = (i.pais ? c.paisNome(i.pais) + ' (' + i.pais + ')' : '') + (i.regiao ? ' · ' + i.regiao : '');
      var rel = (i.parte_de && c.REL.instBy[i.parte_de] ? grupoRel(x('r_parte'), [chipInst(i.parte_de)]) : '') + grupoRel(x('r_sub'), subs.map(function (q) { return chipInst(q.id); })) + grupoRel(x('r_labs'), (i.labs || []).map(chipLab).filter(Boolean)) + grupoRel(x('r_pubs'), pubs.map(chipPub));
      var filtrar = c.CAM().id === 'modelos' ? '<button type="button" class="dr-sec-btn" data-filtrar-inst="' + esc(i.id) + '">' + esc(x('filtrar_inst')) + '</button>' : '';
      return cab({ tipo: tipoTxt('instituicao') + (i.tipo ? ' · ' + i.tipo : ''), nome: c.nomeDe(i) + (i.sigla ? ' (' + i.sigla + ')' : ''), avatar: tileLogo(i.sigla || i.nome), sub: esc(loc), selos: '<div class="dr-selos">' + (i.pais ? '<span class="dr-selo neutro">' + esc(i.pais === 'BR' ? x('o_br') : x('o_mu')) + '</span>' : '') + '</div>' }) +
        (ms.length ? blocoResumo(r) : '') + bp.tiles + filtrar + (bp.algum ? bp.listas : (ms.length ? sec(x('p_top'), listaModelos(ms, 6, 'inst')) : '')) + sec(x('r_t'), rel, 'dr-rels') + fontes(i.fontes || []);
    }
    function drawerLab(l) {
      var pubs = (l.publicadores || []).filter(function (q) { return c.pubBy[q]; }), ms = modelosDe(function (m) { return (m.labsM || []).indexOf(l.id) >= 0; }), r = resumoModelos(ms), pp = porPapel('lab', l.id, l.publicadores || []), bp = blocoPapeis(pp);
      var rel = grupoRel(x('r_inst'), l.instituicao && c.REL.instBy[l.instituicao] ? [chipInst(l.instituicao)] : []) + grupoRel(x('r_parc'), (l.parceiras || []).map(chipInst).filter(Boolean)) + grupoRel(x('r_pubs'), pubs.map(chipPub));
      return cab({ tipo: tipoTxt('laboratorio'), nome: c.nomeDe(l) + (l.sigla ? ' (' + l.sigla + ')' : ''), avatar: tileLogo(l.sigla || l.nome), sub: esc(l.pais ? c.paisNome(l.pais) + ' (' + l.pais + ')' : ''), selos: '<div class="dr-selos">' + (l.pais ? '<span class="dr-selo neutro">' + esc(l.pais === 'BR' ? x('o_br') : x('o_mu')) + '</span>' : '') + '</div>' }) +
        (ms.length ? blocoResumo(r) : '') + bp.tiles + (bp.algum ? bp.listas : (ms.length ? sec(x('p_top'), listaModelos(ms, 6, 'lab')) : '')) + sec(x('r_t'), rel, 'dr-rels') + fontes(l.fontes || []);
    }

    // ---------- dataset e benchmark ----------
    var fmtB = c.fmtB;
    function drawerDataset(d) {
      var cls = c.clsDataset(d), bl = (d.benchmarks && d.benchmarks.length ? d.benchmarks.map(function (id) { return c.bmBy[id] || { id: id }; }) : Object.keys(c.bmBy).map(function (k) { return c.bmBy[k]; }).filter(function (b) { return (b.datasets || []).indexOf(d.id) >= 0; })), pid = d.publicador, p = c.pubBy[pid];
      var t1 = [tile(d.downloads != null ? nf(d.downloads) : '', x('n_dl')), tile(d.tamanho_bytes ? esc(fmtB(d.tamanho_bytes)) : '', x('d_tam')), tile(d.licenca ? esc(d.licenca) : '', x('n_lic')), tile(d.atualizado ? esc(d.atualizado) : '', x('n_upd')), tile(d.likes ? nf(d.likes) : '', x('d_likes'))];
      var dl = '<dl class="dr-kv">' + (d.idiomas && d.idiomas.length ? '<dt>' + esc(x('d_idiomas')) + '</dt><dd>' + esc(d.idiomas.join(', ')) + '</dd>' : '') + (d.tarefas && d.tarefas.length ? '<dt>' + esc(x('d_tarefas')) + '</dt><dd>' + esc(d.tarefas.join(', ')) + '</dd>' : '') + (d.escopo ? '<dt>' + esc(x('d_escopo')) + '</dt><dd>' + esc(d.escopo === 'br' ? x('o_br') : d.escopo) + '</dd>' : '') + '</dl>';
      var insts = c.REL.disponivel ? c.REL.instDoPub(pid) : [];
      var rel = grupoRel(x('r_pub'), p ? [chipPub(pid)] : []) + grupoRel(x('r_inst'), insts.map(chipInst).filter(Boolean)) + grupoRel(x('r_bm'), bl.map(function (b) { return go('m', b.id, b.sigla || b.nome || b.id, '<span class="dr-dot ent-b" aria-hidden="true"></span>', 'benchmarks'); }));
      var fl = seguro(d.url) ? [{ rotulo: d.nome, url: d.url, acessado: d.atualizado || c.D.meta.coletado_em }] : [];
      return cab({ tipo: tipoTxt('dataset'), nome: d.nome, avatar: avGrande(pid, p), sub: p ? '<button type="button" class="dr-go dr-go-inline" data-ir="pub:' + esc(pid) + '"><span class="dr-go-t">' + esc(p.nome) + '</span></button>' : esc(c.pubNome(pid)),
        selos: '<div class="dr-selos">' + (d.pt_br ? '<span class="dr-selo ok s-of">pt-BR</span>' : '') + '<span class="dr-selo neutro">' + esc(c.t('leg_ds_' + CLS[cls])) + '</span></div>', acoes: seguro(d.url) ? a(seguro(d.url), esc(x('abrir_hf')), 'dr-primario') : '' }) +
        (d.descricao ? '<p class="dr-desc">' + esc(d.descricao) + '</p>' : '') + tiles(t1) + dl + sec(x('r_t'), rel, 'dr-rels') + fontes(fl);
    }
    function drawerBench(b) {
      var cls = c.clsBench(b), ds = (b.datasets || []).map(function (id) { return c.dsBy[id]; }).filter(Boolean), desc = textoLoc(b.descricao);
      var links = (b.fontes || []).filter(function (f) { return seguro(f.url); }).map(function (f) { return { rotulo: f.rotulo || c.tipoFonte(f.tipo), url: f.url, acessado: f.acessado || c.D.meta.coletado_em, trecho: f.trecho }; });
      var lk = b.links || {}, linkRot = {}, bot = [];
      Object.keys(lk).forEach(function (k) { if (seguro(lk[k])) { bot.push(a(seguro(lk[k]), esc(x('lk_' + k) === 'lk_' + k ? k : x('lk_' + k)), 'dr-chip-link')); if (!links.some(function (l) { return l.url === lk[k]; })) links.push({ rotulo: x('lk_' + k), url: lk[k], acessado: c.D.meta.coletado_em }); } });
      var t1 = [tile(b.ano ? String(b.ano) : '', x('d_ano')), tile(ds.length ? nf(ds.length) : '', x('d_nds'))];
      var dl = '<dl class="dr-kv">' + (b.dominio && b.dominio.length ? '<dt>' + esc(x('d_dom')) + '</dt><dd>' + esc(b.dominio.map(function (k) { return c.t('dom_' + k); }).join(', ')) + '</dd>' : '') + (b.idiomas && b.idiomas.length ? '<dt>' + esc(x('d_idiomas')) + '</dt><dd>' + esc(b.idiomas.join(', ')) + '</dd>' : '') + (b.tarefas && b.tarefas.length ? '<dt>' + esc(x('d_tarefas')) + '</dt><dd>' + esc(b.tarefas.join(', ')) + '</dd>' : '') + '</dl>';
      var rel = grupoRel(x('r_ds'), ds.map(function (d) { return go('m', d.id, d.nome, '<span class="dr-dot ent-d" aria-hidden="true"></span>', 'datasets'); }));
      var prim = (lk.site && seguro(lk.site)) || (links[0] && links[0].url);
      return cab({ tipo: tipoTxt('benchmark') + (b.tipo ? ' · ' + c.rotTipo(b.tipo) : ''), nome: b.sigla && b.nome.toLowerCase().indexOf(b.sigla.toLowerCase()) !== 0 ? b.sigla + ' · ' + b.nome : b.nome, avatar: tileLogo(b.sigla || b.nome), sub: esc(b.criador || '') + (b.ano ? (b.criador ? ' · ' : '') + b.ano : ''),
        selos: '<div class="dr-selos"><span class="dr-selo neutro">' + esc(c.t('leg_bm_' + CLS[cls])) + '</span></div>', acoes: prim ? a(prim, esc(x('abrir_fonte')), 'dr-primario') + bot.filter(function (h) { return h.indexOf(prim) < 0; }).join('') : '' }) +
        (desc ? '<p class="dr-desc">' + esc(desc) + '</p>' : '') + tiles(t1) + dl + sec(x('r_t'), rel, 'dr-rels') + fontes(links);
    }

    // ---------- grupos do grafo (familia, constelacao) ----------
    function drawerGrupo(g) {
      if (g.inst) return drawerInst(g.inst);
      if (g.pub && c.CAM().id === 'modelos') return drawerPublicador(g.pub.id);
      var cam = c.CAM(), cont = {}; g.ms.forEach(function (m) { var k = cam.cls(m); cont[k] = (cont[k] || 0) + 1; });
      var li = g.ms.slice(0, 60).map(function (m) { return '<li><button type="button" class="dr-go dr-row" data-abrir="' + esc(m.id) + '"><span class="dr-dot s-' + CLS[cam.cls(m)] + '" aria-hidden="true"></span><span class="dr-go-t">' + esc(m.sigla || curto(nome(m))) + '</span></button></li>'; }).join('');
      return cab({ tipo: tipoTxt(g.pub ? 'publicador' : 'familia'), nome: g.nome }) + tiles([tile(nf(g.ms.length), c.t(cam.plural))]) + stackBar(cont, ['oficial', 'comunidade', 'gguf', 'nenhum'], g.nome, function (k) { var l = cam.legenda.filter(function (q) { return q[0] === k; })[0]; return l ? c.t(l[1]) : k; }) +
        sec(x('modelos_do_grupo'), '<ul class="dr-top">' + li + '</ul>' + (g.ms.length > 60 ? '<p class="dr-nota">+ ' + nf(g.ms.length - 60) + ' ' + esc(x('mais_n')) + '</p>' : ''));
    }

    // ---------- render e ciclo de vida ----------
    function html(sel) {
      var cam = c.CAM();
      if (sel.t === 'm') { var m = cam.por[sel.id]; if (!m) return ''; return cam.id === 'datasets' ? drawerDataset(m) : cam.id === 'benchmarks' ? drawerBench(m) : drawerModelo(m); }
      if (sel.t === 'p') return drawerPublicador(sel.id);
      if (sel.t === 'i') { var ii = c.REL.instBy[sel.id]; return ii ? drawerInst(ii) : ''; }
      if (sel.t === 'l') { var ll = c.REL.labBy[sel.id]; return ll ? drawerLab(ll) : ''; }
      var g = c.grupoPorId(sel.id); return g ? drawerGrupo(g) : '';
    }
    function render(manter) {
      if (!cur) return; var y = manter ? corpo.scrollTop : 0, h = html(cur); corpo.innerHTML = h || ''; corpo.scrollTop = y;
      root.setAttribute('aria-labelledby', tituloId); rotulosBarra(); btnVoltar.hidden = !hist.length;
      if (window.Avatar) Avatar.hidratar(corpo);
      var m = cur.t === 'm' && c.CAM().id === 'modelos' ? c.CAM().por[cur.id] : null;
      if (m && !m.builds && c.PARTES.builds && !window.MAPA_DETALHES) {
        var id = m.id; if (!carregandoBuilds) carregandoBuilds = c.carregarParte('builds').then(function () { c.aplicarDetalhes(); carregandoBuilds = null; if (aberto && cur && cur.id === id) trocaVersoes(m); }, function () { carregandoBuilds = null; });
      }
    }
    function trocaVersoes(m) {   // so a secao de versoes muda: o foco e a rolagem de quem le ficam onde estao
      var sk = corpo.querySelector('section[aria-busy="true"]'), h = versoes(m); if (!sk) { render(true); return; }
      var t = document.createElement('div'); t.innerHTML = h; var novo = t.firstElementChild; if (novo) sk.replaceWith(novo); else sk.remove();
      if (window.Avatar) Avatar.hidratar(corpo);
    }
    function hashDe(sel) { var tab = c.tab(); return '#' + tab + '&d=' + sel.t + ':' + encodeURIComponent(sel.id); }
    function url(sel) { return location.origin.replace('null', '') + location.pathname + location.search + hashDe(sel); }
    function focaveis() { return [].slice.call(root.querySelectorAll('a[href],button,summary,[tabindex="0"]')).filter(function (e) { return !e.disabled && !e.hidden && e.offsetParent !== null && !e.closest('details:not([open]) > :not(summary)'); }); }

    function abrir(sel, from) {   // abertura nova (tabela, grafo, link): zera o historico
      clearTimeout(fechaT);
      if (!aberto) opener = from || document.activeElement;
      hist = []; cur = sel; c.setSel(sel); mostrar(true);
    }
    function ir(sel, tab) {   // navegacao dentro do drawer: empilha
      var antes = cur ? { sel: cur, tab: c.tab() } : null;
      var feito = function () { if (antes) hist.push(antes); cur = sel; c.setSel(sel); render(false); foca(); };
      if (tab && tab !== c.tab()) { navegando = true; c.trocarTab(tab, undefined, function () { navegando = false; feito(); }); } else feito();
    }
    function voltar() {
      var e = hist.pop(); if (!e) return;
      var feito = function () { cur = e.sel; c.setSel(cur); render(false); foca(); };
      if (e.tab !== c.tab()) { navegando = true; c.trocarTab(e.tab, undefined, function () { navegando = false; feito(); }); } else feito();
    }
    function foca() { var h = corpo.querySelector('#' + tituloId); if (h) h.focus({ preventScroll: true }); corpo.scrollTop = 0; }
    function mostrar() {
      render(false); root.hidden = false; scrim.hidden = false; aberto = true;
      requestAnimationFrame(function () { scrim.classList.add('on'); root.classList.add('on'); });
      var h = corpo.querySelector('#' + tituloId); (h || btnX).focus({ preventScroll: true });
    }
    function fechar() {
      if (navegando || !aberto) return; aberto = false; hist = []; cur = null; c.limparSel();
      root.classList.remove('on'); scrim.classList.remove('on'); btnCopiar.classList.remove('feito');
      var fim = function () { if (!aberto) { root.hidden = true; scrim.hidden = true; } }; clearTimeout(fechaT); fechaT = setTimeout(fim, reduced.matches ? 0 : 300);
      if (opener && opener.focus && document.contains(opener)) try { opener.focus({ preventScroll: true }); } catch (e) {}
    }
    function copiar() {
      if (!cur) return; var u = url(cur), fim = function (ok) { aviso.textContent = ok ? x('copiado') : ''; btnCopiar.classList.toggle('feito', ok); btnCopiar.querySelector('span').textContent = ok ? x('copiado') : x('copiar'); setTimeout(function () { aviso.textContent = ''; btnCopiar.classList.remove('feito'); rotulosBarra(); }, 1800); };
      var fb = function () { try { var ta = document.createElement('textarea'); ta.value = u; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); var ok = document.execCommand('copy'); ta.remove(); fim(ok); } catch (e) { fim(false); } };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(function () { fim(true); }, fb); else fb();
    }

    // eventos
    btnX.onclick = function () { fechar(); }; scrim.onclick = function () { fechar(); }; btnVoltar.onclick = voltar; btnCopiar.onclick = copiar;
    scrim.addEventListener('wheel', function (e) { e.preventDefault(); }, { passive: false }); scrim.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
    root.addEventListener('click', function (e) {
      var m = e.target.closest('[data-abrir]'); if (m) { ir({ t: 'm', id: m.dataset.abrir }); return; }
      var b = e.target.closest('[data-ir]'); if (!b) return;
      var q = b.dataset.ir.split(':'), alvo = q.shift(), id = q.join(':');
      if (alvo === 'datasets' || alvo === 'benchmarks') ir({ t: 'm', id: id }, alvo); else ir({ t: alvo === 'pub' ? 'p' : alvo === 'inst' ? 'i' : 'l', id: id });
    });
    document.addEventListener('keydown', function (e) {
      if (!aberto) return;
      if (e.key === 'Escape') { if (c.outroAberto && c.outroAberto()) return; e.preventDefault(); e.stopPropagation(); fechar(); return; }
      if (e.key === 'ArrowLeft' && e.altKey) { e.preventDefault(); voltar(); return; }
      if (e.key === 'Tab') {
        var f = focaveis(); if (!f.length) return; var p = f[0], z = f[f.length - 1], at = document.activeElement;
        if (!root.contains(at)) { e.preventDefault(); p.focus(); } else if (e.shiftKey && (at === p || at === corpo || at.id === tituloId)) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && at === z) { e.preventDefault(); p.focus(); }
        return;
      }
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && document.activeElement && document.activeElement.classList.contains('dr-row')) {
        var rows = [].slice.call(root.querySelectorAll('.dr-row')).filter(function (r) { return r.offsetParent !== null; }), k = rows.indexOf(document.activeElement), n = rows[k + (e.key === 'ArrowDown' ? 1 : -1)];
        if (n) { e.preventDefault(); n.focus(); }
      }
    }, true);
    rotulosBarra();

    return {
      abrir: abrir, ir: ir, voltar: voltar, fechar: fechar, copiar: copiar, aberto: function () { return aberto; }, atual: function () { return cur; }, historico: function () { return hist.length; },
      atualizar: function () { if (aberto && cur) { if (!html(cur)) return; render(true); } },   // troca de idioma ou de dados: refaz no lugar
      linkDe: function (sel) { return url(sel); },
      doHash: function () { var m = /[#&]d=([a-z]):([^&]+)/.exec(location.hash); return m ? { t: m[1], id: decodeURIComponent(m[2]) } : null; },
      abaDoHash: function () { return location.hash.replace('#', '').split('&')[0]; }
    };
  };
})();
