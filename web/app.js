(function () {
  'use strict';
  var D = window.MAPA_DADOS;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var pubBy = {}, modBy = {}, famNome = {};   // famNome: id da familia -> nome curado (ex.: bert-portuguese -> BERTimbau), quando existir nos dados
  D.publicadores.forEach(function (p) { pubBy[p.id] = p; });
  (D.familias || []).forEach(function (f) { if (f && f.id && f.nome && f.nome !== f.id) famNome[f.id] = f.nome; });
  D.modelos.forEach(function (m) { modBy[m.id] = m; });

  var T = {
    pt: {
      skip: 'Pular o mapa e ir para a tabela', brand_sub: 'de Web AI no Brasil e no mundo', nav_inicio: 'Início', nav_metodo: 'Como lemos os dados',
      eyebrow: 'Modelos no navegador e na borda', desc: 'Quem publica modelos de linguagem, no Brasil e no mundo, e quais deles já rodam no navegador.',
      res_label: 'Modelos', res_titulo: 'Quem já roda no navegador', res_link: 'Regras ↗',
      br: 'Brasil', mundo: 'Mundo', todos: 'Tudo', v_todos: 'Todos', v_nativo: 'Sim', v_gguf: 'Com limitações', v_nenhum: 'Ainda não', f_nat: 'Natureza do publicador', buscar: 'Buscar', buscar_ph: 'Buscar',
      porpub: 'Publicador', porfam: 'Família', recentrar: 'Recentrar ⌾', hint: 'Arraste ou aproxime para filtrar a tabela.', sky_nota: 'Posição é só organização por grupo; brilho e cor indicam se o modelo roda no navegador; tamanho, o download. Estrelas tênues no fundo são decorativas.',
      p1_t: 'Quem já roda<br>no navegador?', p1_p: 'Tabela com status, tamanho e fontes de cada modelo.', p2_t: 'E os modelos<br>mais pesados?', p2_p: 'Rodam no navegador, com limitações: mais pesados e com limite de tamanho. Contados à parte.',
      p3_t: 'O que é um modelo<br>brasileiro?', p3_p: 'Quem desenvolveu ou financiou, com evidência pública, ou focado no português do Brasil.', m_t: 'Como lemos os dados',
      credito: 'Inspirado no Observatório da Maritaca ↗', privacidade: 'Privacidade', fonte_lic: 'Fonte Atkinson Hyperlegible, licença SIL OFL 1.1.',
      c_modelo: 'Modelo', c_status: 'Roda no navegador?', c_gb: 'GB (q4)', c_lic: 'Licença', c_upd: 'Atualizado',
      oficial: 'Sim · do publicador', comunidade: 'Sim · da comunidade', gguf: 'Com limitações', nenhum: 'Ainda não', gguf_grande: 'Pesado demais para o navegador',
      n_todos: 'Todas as naturezas', independente: 'Independente', instituicao: 'Instituição', afiliada: 'Afiliada', afiliada_a: 'Afiliado(a) a', pesq_lab: 'pesquisador(a) no laboratório', busca_inst: 'modelos de publicadores ligados a', filtrar_inst: 'Filtrar por esta instituição', tit_inst: 'Instituição', leg_rel: 'linha tênue = relacionados', leg_relanel: 'anel tracejado = publicador relacionado', rel_t: 'Relacionados', rel_nmod: 'modelos', principais: 'Principais', pais_DE: 'Alemanha', pais_BR: 'Brasil', empresa: 'Empresa', nao_classificada: 'Natureza não classificada',
      cl_br_evidencia: 'Brasil (evidência)', cl_nao_classificado: 'Não classificado', cl_fora_br: 'Fora do Brasil',
      campo: 'modelos no mapa', sem_modelos: 'Nenhum modelo neste recorte.', mais: 'Mostrar mais',
      recorte: 'modelos no recorte', so_nativo: 'rodam no navegador', nativo_gguf: 'com limitações', semb: 'ainda não',
      em_obs: 'Em observação', constelacao: 'Constelação', abrir_hf: 'Abrir no Hugging Face ↗', perfil_hf: 'Perfil no Hugging Face ↗', fontes: 'Fontes e evidências',
      publicador: 'Publicador', familia: 'Família', parametros: 'Parâmetros', atualizado: 'Atualizado em', download: 'Download', modelos: 'modelos', de: 'de',
      aviso: 'Existir uma versão para o navegador não quer dizer que roda bem. "Com limitações" conta se a menor variante Q4 do GGUF couber em até 4 GB (wllama, WebAssembly). Amostra: todos os modelos de linguagem de até 12 B de cada publicador classificado.',
      inv_br: 'Brasil: rodam no navegador', inv_mu: 'Mundo: rodam no navegador', inv_pub: 'Publicadores brasileiros',
      inv_br_p: 'Mais, com limitações (mais pesados e lentos):', inv_pub_p: 'independentes, instituições e empresas, com evidência pública.', descartados: 'candidatos sem evidência ficaram de fora',
      leg_of: 'Roda, versão do publicador', leg_co: 'Roda, versão da comunidade', leg_gg: 'Com limitações', leg_no: 'Ainda não',
      m1_t: 'Roda no navegador?', m1_a: 'Sim: há arquivos prontos para o navegador, em ONNX (Transformers.js), MLC (WebLLM) ou LiteRT, publicados pelo próprio publicador ou pela comunidade.', m1_b: 'Com limitações: só há GGUF, que roda no navegador pelo wllama (WebAssembly), mas é mais pesado e lento. Conta só se a menor variante Q4 tiver até 4 GB (limite do WebAssembly de 32 bits; arquivo de até 2 GB por parte). Ainda não: nenhuma versão para o navegador.', m1_c: 'Existir não é rodar: o mapa não executa modelos.',
      m2_t: 'Modelo brasileiro', m2_a: 'Brasil = quem desenvolveu ou financiou, com evidência pública, ou focado no português do Brasil.', m2_b: 'Um modelo é do Brasil se o publicador está no Brasil, ou se um desenvolvedor ou financiador brasileiro está creditado com fonte, ou se o nome, o cartão ou o artigo citado declara o português do Brasil como alvo (português europeu e português sem variante não bastam). Cada modelo guarda o motivo e o link da evidência. Modelo multilíngue que apenas inclui o português não conta.', m2_c: 'O publicador (quem hospeda o modelo) é um atributo à parte. O recorte Em português (global) é opcional e vem desligado.',
      m3_t: 'Independente, instituição, empresa', m3_a: 'Independente: pessoa ou grupo pequeno sem vínculo institucional declarado. Instituição: universidade ou instituto. Empresa: declarada no perfil ou em página institucional.', m3_b: 'A ausência de vínculo declarado não prova que não exista; a evidência fica registrada em cada publicador.', m3_c: 'Dados: API pública do Hugging Face, coletados por regra, sem modelo de linguagem decidindo.',
      eyebrow_ds: 'Datasets em português e no mundo', eyebrow_bm: 'Benchmarks de avaliação', esc_br: 'Publicador no Brasil', f_pt: 'Idioma português', pt_todos: 'Todos', pt_pt: 'Português', pt_ptbr: 'Português do Brasil (pt-BR)', sem_itens_datasets: 'Nenhum dataset com esses filtros.', sem_itens_benchmarks: 'Nenhum benchmark com esses filtros.', link_artigo: 'Artigo', link_site: 'Site', link_leaderboard: 'Leaderboard', link_codigo: 'Código',
      dom_geral: 'Geral', dom_vestibular_educacao: 'Vestibular e educação', dom_juridico: 'Jurídico', dom_saude: 'Saúde', dom_codigo: 'Código', dom_matematica: 'Matemática', dom_extracao_classificacao: 'Extração e classificação', dom_cultura_lingua: 'Cultura e língua', dom_outros: 'Outros',
      tipo_conjunto: 'Conjunto de dados', tipo_avaliacao: 'Avaliação', tipo_leaderboard: 'Leaderboard',
      porinst: 'Instituição', agrupar: 'Agrupar por', f_tarefa: 'Tarefa', ta_todas: 'Todas', ta_gerador: 'Gerador', ta_codificador: 'Codificador', f_inst: 'Instituição', f_lab: 'Laboratório', c_tarefa: 'Tarefa', c_inst: 'Instituição',
      vinculos: 'Vínculos', v_inst: 'Instituição', v_lab: 'Laboratório', v_rel: 'Publicadores relacionados', v_membro: 'Membro de', v_cred: 'Créditos do modelo', papel_desenvolvedor: 'desenvolvimento', papel_financiador: 'financiamento', papel_parceiro: 'parceria', papel_plataforma: 'plataforma', parte_de: 'parte de', b_nativo: 'Modelos que rodam no navegador', b_gguf: 'Modelos com limitações',
      capa_br: 'Brasil', capa_todos: 'Todos os publicadores', capa_sem: 'Sem o maior publicador', capa_nativo: 'rodam no navegador', capa_gguf: 'rodam com limitações', capa_ger: 'Geradores que rodam no navegador', capa_cod: 'Codificadores que rodam no navegador', capa_nota: 'Um publicador ({p}) concentra {x}% dos modelos do Brasil.',
      carga_datasets: 'Carregando {n} datasets…', carga_benchmarks: 'Carregando {n} benchmarks…', carga_builds: 'Carregando as versões deste modelo…', carga_erro: 'Não foi possível carregar {x}.', tentar: 'Tentar de novo',
      filtros: 'Filtros', fechar: 'Fechar', g_build: 'Roda no navegador?', g_publicador: 'Publicador', g_formato: 'Versões', g_idioma: 'Idioma', g_conteudo: 'Conteúdo', g_licenca: 'Licença e tamanho', g_dominio: 'Tema e tipo', gaveta_ver: 'Ver resultados', rem_filtro: 'Remover filtro', c_portado: 'Portado por', portado_proprio: 'Versão do próprio publicador', portado_comunidade: 'Versão da comunidade', portado_runtime: 'Versão da organização do motor de execução', portado_ver: 'Perfil no Hugging Face',
      tabs_aria: 'Camadas', tab_modelos: 'Modelos', tab_datasets: 'Datasets', tab_benchmarks: 'Benchmarks',
      res_label_ds: 'Datasets', res_titulo_ds: 'Quem publica dados, e em que idiomas', res_label_bm: 'Benchmarks', res_titulo_bm: 'Como os modelos são avaliados',
      campo_ds: 'datasets no mapa', campo_bm: 'benchmarks no mapa', recorte_ds: 'datasets no recorte', recorte_bm: 'benchmarks no recorte', datasets: 'datasets', benchmarks: 'benchmarks',
      sky_nota_ds: 'Posição é só organização por grupo; tamanho indica o tamanho do dataset (ou os downloads); brilho e cor indicam idioma e licença. Estrelas tênues no fundo são decorativas.', sky_nota_bm: 'Posição é só organização por domínio; tamanho indica o número de datasets; brilho e cor indicam o idioma. Linhas tênues ligam o benchmark aos seus datasets. Estrelas tênues no fundo são decorativas.',
      por_tema: 'Tema', por_dominio: 'Domínio', por_criador: 'Criador', limpar: 'Limpar filtros', exportar: 'Exportar', sem_itens: 'Nenhum item neste recorte.',
      f_fmt: 'Versões para o navegador', fmt_multi: 'Mais de uma versão', f_escopo: 'Escopo', so_pt: 'Português', sem_licenca: 'Sem licença', desconhecido: 'Desconhecido', com_bench: 'Com benchmark', sem_bench: 'Sem benchmark',
      c_dataset: 'Dataset', c_pub: 'Publicador', c_idiomas: 'Idiomas', c_tarefas: 'Tarefas', c_tamanho: 'Tamanho', c_downloads: 'Downloads', c_benchmarks: 'Benchmarks', c_benchmark: 'Benchmark', c_dominio: 'Domínio', c_tipo: 'Tipo', c_ndatasets: 'Datasets', c_ano: 'Ano', c_criador: 'Criador', c_builds: 'Versões',
      dataset: 'Dataset', benchmark: 'Benchmark', escopo: 'Escopo', abrir_fonte: 'Abrir a fonte ↗', builds: 'Versões para o navegador', formato: 'versão', formatos: 'versões',
      aneis_1: 'Duas versões para o navegador: brilho mais forte e um anel ao redor da estrela.', aneis_2: 'Três ou mais versões para o navegador: brilho máximo e dois anéis ao redor da estrela.',
      sem_builds_det: 'Sem o detalhe de cada versão neste modelo.', gguf_nao_conta: 'não conta (acima do limite de tamanho)', origem_oficial: 'oficial do publicador', origem_comunidade: 'da comunidade', gb_nao_medido: 'tamanho não medido',
      leg_ds_of: 'pt-BR, licença aberta', leg_ds_co: 'pt-BR, outra licença', leg_ds_gg: 'outro idioma, licença aberta', leg_ds_no: 'outro idioma, outra licença',
      leg_bm_of: 'inclui pt-BR', leg_bm_co: 'inclui pt', leg_bm_gg: 'multilíngue sem pt', leg_bm_no: 'outros', leg_aneis: 'mais de uma versão para o navegador = mais brilho e anéis (2: um anel; 3 ou mais: dois anéis)',
      exp_png: 'Imagem PNG', exp_svg: 'Imagem SVG', exp_html: 'HTML', exp_filtros: 'Filtros', exp_nenhum: 'nenhum filtro', exp_fonte: 'Fonte dos dados', exp_lic: 'Dados sob licença CC BY 4.0. Gerado no navegador, sem envio de dados.', exp_feito: 'Arquivo gerado:', exp_lista: 'Lista dos itens', exp_legenda_col: 'Classe', exp_item: 'Item', exp_grupo: 'Grupo', exp_enq: 'enquadramento atual',
      rodape: 'Dados do Hugging Face de', modelo: 'Modelo', tarefa: 'Tarefa', evidencias: 'Evidências', ev_pais: 'País', ev_nat: 'Natureza', rel_nmod: 'modelos mapeados', gguf_nota: 'Há GGUF, mas passa de 4 GB: pesado demais para o navegador.', fam_t: 'Família', src_perfil_oficial: 'perfil oficial', src_site_institucional: 'site institucional', src_pagina_pessoa: 'página da pessoa', src_artigo: 'artigo', src_repositorio: 'repositório', src_cartao_modelo: 'cartão do modelo', src_orgao_fomento: 'órgão de fomento', src_perfil: 'perfil', src_cartao: 'cartão do modelo', src_institucional: 'página institucional', src_curadoria: 'lista curada', src_perfil_cartao: 'perfil ou cartão'
    },
    en: {
      skip: 'Skip the map and go to the table', brand_sub: 'of Web AI in Brazil and the world', nav_inicio: 'Home', nav_metodo: 'How we read the data',
      eyebrow: 'Models in the browser and at the edge', desc: 'Who publishes language models, in Brazil and worldwide, and which of them already run in the browser.',
      res_label: 'Models', res_titulo: 'Who already runs in the browser', res_link: 'Rules ↗',
      br: 'Brazil', mundo: 'World', todos: 'All', v_todos: 'All', v_nativo: 'Yes', v_gguf: 'With limits', v_nenhum: 'Not yet', f_nat: 'Publisher type', buscar: 'Search', buscar_ph: 'Search',
      porpub: 'Publisher', porfam: 'Family', recentrar: 'Recenter ⌾', hint: 'Drag or zoom to filter the table.', sky_nota: 'Position is only grouping; brightness and color show whether the model runs in the browser; size shows the download. Faint background stars are decorative.',
      p1_t: 'Who already runs<br>in the browser?', p1_p: 'A table with status, size and sources for each model.', p2_t: 'What about the<br>heavier models?', p2_p: 'They run in the browser with limits: heavier, with a size cap. Counted separately.',
      p3_t: 'What is a Brazilian<br>model?', p3_p: 'Who developed or funded it, with public evidence, or focused on Brazilian Portuguese.', m_t: 'How we read the data',
      credito: 'Inspired by the Maritaca Observatory ↗', privacidade: 'Privacy', fonte_lic: 'Atkinson Hyperlegible font, SIL OFL 1.1 license.',
      c_modelo: 'Model', c_status: 'Runs in the browser?', c_gb: 'GB (q4)', c_lic: 'License', c_upd: 'Updated',
      oficial: 'Yes · by the publisher', comunidade: 'Yes · by the community', gguf: 'With limits', nenhum: 'Not yet', gguf_grande: 'Too heavy for the browser',
      n_todos: 'All types', independente: 'Independent', instituicao: 'Institution', afiliada: 'Affiliated', afiliada_a: 'Affiliated with', pesq_lab: 'researcher at the lab', busca_inst: 'models from publishers linked to', filtrar_inst: 'Filter by this institution', tit_inst: 'Institution', leg_rel: 'faint line = related', leg_relanel: 'dashed ring = related publisher', rel_t: 'Related', rel_nmod: 'models', principais: 'Main models', pais_DE: 'Germany', pais_BR: 'Brazil', empresa: 'Company', nao_classificada: 'Type not classified',
      cl_br_evidencia: 'Brazil (evidence)', cl_nao_classificado: 'Not classified', cl_fora_br: 'Outside Brazil',
      campo: 'models on the map', sem_modelos: 'No model in this selection.', mais: 'Show more',
      recorte: 'models in selection', so_nativo: 'run in the browser', nativo_gguf: 'with limits', semb: 'not yet',
      em_obs: 'In focus', constelacao: 'Constellation', abrir_hf: 'Open on Hugging Face ↗', perfil_hf: 'Hugging Face profile ↗', fontes: 'Sources and evidence',
      publicador: 'Publisher', familia: 'Family', parametros: 'Parameters', atualizado: 'Updated on', download: 'Download', modelos: 'models', de: 'of',
      aviso: 'A version for the browser existing does not mean it runs well. "With limits" counts if the smallest Q4 GGUF variant fits in 4 GB (wllama, WebAssembly). Sample: every language model up to 12 B from each classified publisher.',
      inv_br: 'Brazil: run in the browser', inv_mu: 'World: run in the browser', inv_pub: 'Brazilian publishers',
      inv_br_p: 'Plus, with limits (heavier and slower):', inv_pub_p: 'independents, institutions and companies, with public evidence.', descartados: 'candidates without evidence were left out',
      leg_of: 'Runs, publisher version', leg_co: 'Runs, community version', leg_gg: 'With limits', leg_no: 'Not yet',
      m1_t: 'Runs in the browser?', m1_a: 'Yes: there are files ready for the browser, in ONNX (Transformers.js), MLC (WebLLM) or LiteRT, published by the publisher itself or by the community.', m1_b: 'With limits: only GGUF exists, which runs in the browser through wllama (WebAssembly) but is heavier and slower. It counts only if the smallest Q4 variant is up to 4 GB (32-bit WebAssembly limit; up to 2 GB per file part). Not yet: no version for the browser.', m1_c: 'Existing is not running: this map does not execute models.',
      m2_t: 'Brazilian model', m2_a: 'Brazil = who developed or funded it, with public evidence, or focused on Brazilian Portuguese.', m2_b: 'A model is Brazilian if its publisher is in Brazil, or a Brazilian developer or funder is credited with a source, or its name, card or cited paper declares Brazilian Portuguese as the target (European Portuguese and Portuguese without a variant are not enough). Each model stores the reason and the evidence link. A multilingual model that merely includes Portuguese does not count.', m2_c: 'The publisher (who hosts the model) is a separate attribute. The In Portuguese (global) view is optional and off by default.',
      m3_t: 'Independent, institution, company', m3_a: 'Independent: a person or small group with no declared institutional tie. Institution: university or institute. Company: declared on the profile or an institutional page.', m3_b: 'No declared tie does not prove there is none; the evidence is stored on each publisher.', m3_c: 'Data: public Hugging Face API, collected by rule, with no language model deciding.',
      eyebrow_ds: 'Datasets in Portuguese and worldwide', eyebrow_bm: 'Evaluation benchmarks', esc_br: 'Publisher in Brazil', f_pt: 'Portuguese language', pt_todos: 'All', pt_pt: 'Portuguese', pt_ptbr: 'Brazilian Portuguese (pt-BR)', sem_itens_datasets: 'No dataset matches these filters.', sem_itens_benchmarks: 'No benchmark matches these filters.', link_artigo: 'Paper', link_site: 'Website', link_leaderboard: 'Leaderboard', link_codigo: 'Code',
      dom_geral: 'General', dom_vestibular_educacao: 'Entrance exams and education', dom_juridico: 'Legal', dom_saude: 'Health', dom_codigo: 'Code', dom_matematica: 'Math', dom_extracao_classificacao: 'Extraction and classification', dom_cultura_lingua: 'Culture and language', dom_outros: 'Other',
      tipo_conjunto: 'Dataset', tipo_avaliacao: 'Evaluation', tipo_leaderboard: 'Leaderboard',
      porinst: 'Institution', agrupar: 'Group by', f_tarefa: 'Task', ta_todas: 'All', ta_gerador: 'Generator', ta_codificador: 'Encoder', f_inst: 'Institution', f_lab: 'Laboratory', c_tarefa: 'Task', c_inst: 'Institution',
      vinculos: 'Links', v_inst: 'Institution', v_lab: 'Laboratory', v_rel: 'Related publishers', v_membro: 'Member of', v_cred: 'Model credits', papel_desenvolvedor: 'development', papel_financiador: 'funding', papel_parceiro: 'partnership', papel_plataforma: 'platform', parte_de: 'part of', b_nativo: 'Models that run in the browser', b_gguf: 'Models with limits',
      capa_br: 'Brazil', capa_todos: 'All publishers', capa_sem: 'Without the largest publisher', capa_nativo: 'run in the browser', capa_gguf: 'run with limits', capa_ger: 'Generators that run in the browser', capa_cod: 'Encoders that run in the browser', capa_nota: 'One publisher ({p}) holds {x}% of the models in Brazil.',
      carga_datasets: 'Loading {n} datasets…', carga_benchmarks: 'Loading {n} benchmarks…', carga_builds: 'Loading the versions of this model…', carga_erro: 'Could not load {x}.', tentar: 'Try again',
      filtros: 'Filters', fechar: 'Close', g_build: 'Runs in the browser?', g_publicador: 'Publisher', g_formato: 'Versions', g_idioma: 'Language', g_conteudo: 'Content', g_licenca: 'License and size', g_dominio: 'Topic and type', gaveta_ver: 'Show results', rem_filtro: 'Remove filter', c_portado: 'Ported by', portado_proprio: 'Version by the publisher itself', portado_comunidade: 'Community version', portado_runtime: 'Version by the organization behind the engine', portado_ver: 'Profile on Hugging Face',
      tabs_aria: 'Layers', tab_modelos: 'Models', tab_datasets: 'Datasets', tab_benchmarks: 'Benchmarks',
      res_label_ds: 'Datasets', res_titulo_ds: 'Who publishes data, and in which languages', res_label_bm: 'Benchmarks', res_titulo_bm: 'How models are evaluated',
      campo_ds: 'datasets on the map', campo_bm: 'benchmarks on the map', recorte_ds: 'datasets in selection', recorte_bm: 'benchmarks in selection', datasets: 'datasets', benchmarks: 'benchmarks',
      sky_nota_ds: 'Position is only grouping; size shows the dataset size (or downloads); brightness and color show language and license. Faint background stars are decorative.', sky_nota_bm: 'Position is only grouping by domain; size shows the number of datasets; brightness and color show the language. Faint lines link a benchmark to its datasets. Faint background stars are decorative.',
      por_tema: 'Topic', por_dominio: 'Domain', por_criador: 'Creator', limpar: 'Clear filters', exportar: 'Export', sem_itens: 'No item in this selection.',
      f_fmt: 'Versions for the browser', fmt_multi: 'More than one version', f_escopo: 'Scope', so_pt: 'Portuguese', sem_licenca: 'No license', desconhecido: 'Unknown', com_bench: 'With benchmark', sem_bench: 'Without benchmark',
      c_dataset: 'Dataset', c_pub: 'Publisher', c_idiomas: 'Languages', c_tarefas: 'Tasks', c_tamanho: 'Size', c_downloads: 'Downloads', c_benchmarks: 'Benchmarks', c_benchmark: 'Benchmark', c_dominio: 'Domain', c_tipo: 'Type', c_ndatasets: 'Datasets', c_ano: 'Year', c_criador: 'Creator', c_builds: 'Versions',
      dataset: 'Dataset', benchmark: 'Benchmark', escopo: 'Scope', abrir_fonte: 'Open the source ↗', builds: 'Versions for the browser', formato: 'version', formatos: 'versions',
      aneis_1: 'Two browser versions: stronger glow and one ring around the star.', aneis_2: 'Three or more browser versions: maximum glow and two rings around the star.',
      sem_builds_det: 'No per-version detail for this model.', gguf_nao_conta: 'does not count (over the size limit)', origem_oficial: 'official, by the publisher', origem_comunidade: 'by the community', gb_nao_medido: 'size not measured',
      leg_ds_of: 'pt-BR, open license', leg_ds_co: 'pt-BR, other license', leg_ds_gg: 'other language, open license', leg_ds_no: 'other language, other license',
      leg_bm_of: 'includes pt-BR', leg_bm_co: 'includes pt', leg_bm_gg: 'multilingual without pt', leg_bm_no: 'others', leg_aneis: 'more than one browser version = more glow and rings (2: one ring; 3 or more: two rings)',
      exp_png: 'PNG image', exp_svg: 'SVG image', exp_html: 'HTML', exp_filtros: 'Filters', exp_nenhum: 'no filter', exp_fonte: 'Data source', exp_lic: 'Data under the CC BY 4.0 license. Generated in the browser, no data is sent.', exp_feito: 'File generated:', exp_lista: 'Item list', exp_legenda_col: 'Class', exp_item: 'Item', exp_grupo: 'Group', exp_enq: 'current framing',
      rodape: 'Hugging Face data from', modelo: 'Model', tarefa: 'Task', evidencias: 'Evidence', ev_pais: 'Country', ev_nat: 'Type', rel_nmod: 'models mapped', gguf_nota: 'GGUF exists, but is over 4 GB: too heavy for the browser.', fam_t: 'Family', src_perfil_oficial: 'official profile', src_site_institucional: 'institutional site', src_pagina_pessoa: 'personal page', src_artigo: 'paper', src_repositorio: 'repository', src_cartao_modelo: 'model card', src_orgao_fomento: 'funding agency', src_perfil: 'profile', src_cartao: 'model card', src_institucional: 'institutional page', src_curadoria: 'curated list', src_perfil_cartao: 'profile or card'
    }
  };
  var MF = window.MAPA_FILTROS;   // filtros.js: Experimentais e Roda no navegador?
  ['pt', 'en'].forEach(function (l) { [MF.exp.textos, MF.roda.textos, MF.papel.textos, MF.rec.textos].forEach(function (x) { Object.keys(x[l]).forEach(function (k) { T[l][k] = x[l][k]; }); }); });
  var S = { tab: 'modelos', fmt: '', tarefa: '', inst: '', lab: '', semMaior: false, f: { datasets: { pt: '', idioma: '', tarefa: '', licenca: '', tamanho: '', publicador: '', bench: '', q: '' }, benchmarks: { dominio: '', idioma: '', tipo: '', tarefa: '', q: '' } }, modoL: { datasets: 'publicador', benchmarks: 'dominio' }, sortL: { modelos: { k: 'via', d: 1 }, datasets: { k: 'downloads', d: -1 }, benchmarks: { k: 'nome', d: 1 } }, lang: 'pt', escopo: 'todos', via: 'todos', nat: 'todas', busca: '', agrupar: 'publicador', sort: { k: 'via', d: 1 }, sel: null, paused: false, zoom: 1, panX: 0, panY: 0, limite: 150 };
  S.sort = S.sortL.modelos;
  var qs = new URLSearchParams(location.search);
  try { var sl = localStorage.getItem('observatorio-lang'); if (sl) S.lang = sl; } catch (e) {}
  if (qs.get('lang')) S.lang = qs.get('lang') === 'en' ? 'en' : 'pt';
  if (qs.get('escopo')) S.escopo = qs.get('escopo');
  if (qs.get('via')) S.via = MF.roda.normaliza(qs.get('via'));
  S.papel = MF.papel.lista.indexOf(qs.get('papel')) >= 0 ? qs.get('papel') : 'todos';
  S.recorte = MF.rec.disponivel && qs.get('recorte') === '1';   // Em portugues (global): desligado por padrao
  S.mostrarExp = qs.get('exp') === '1' || qs.get('exp') === 'mostrar';   // padrao: experimentais ocultos
  if (qs.get('agrupar') === 'familia') S.agrupar = 'familia';
  if (qs.get('agrupar') === 'instituicao') S.agrupar = 'instituicao';
  if (qs.get('tarefa') === 'gerador' || qs.get('tarefa') === 'codificador') S.tarefa = qs.get('tarefa');
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
  // ---------- partes dos dados, sob demanda ----------
  // data.js traz o necessario para a aba Modelos; datasets, benchmarks e os builds de cada modelo vem de arquivos proprios (D.partes),
  // baixados quando a aba e aberta (ou em ociosidade, depois do primeiro desenho). Com D.partes_bytes o progresso e real.
  var PARTES = D.partes || {}, parteEstado = {};
  var parteCarregada = function (n) { return n === 'builds' ? !!window.MAPA_DETALHES : n === 'datasets' ? !!D.datasets : n === 'benchmarks' ? !!D.benchmarks : n === 'avatares' ? !!window.MAPA_AVATARES : true; };
  function baixarParte(url, total, prog) {
    return new Promise(function (ok, erro) {
      function porTag(u, blob) { var el = document.createElement('script'); el.src = u; el.onload = function () { if (blob) URL.revokeObjectURL(u); ok(); }; el.onerror = function () { erro(new Error('falha ao carregar ' + url)); }; document.head.appendChild(el); }
      if (/^https?:$/.test(location.protocol) && window.fetch && window.ReadableStream && total) {
        fetch(url).then(function (r) {
          if (!r.ok || !r.body) throw new Error('http ' + r.status);
          var rd = r.body.getReader(), pedacos = [], rec = 0;
          (function ler() { return rd.read().then(function (x) { if (x.done) { if (prog) prog(1); porTag(URL.createObjectURL(new Blob(pedacos, { type: 'text/javascript' })), true); return; } pedacos.push(x.value); rec += x.value.length; if (prog) prog(Math.min(0.99, rec / total)); return ler(); }); })();
        }).catch(erro);
      } else porTag(url, false);
    });
  }
  function carregarParte(n, onProg) {
    if (parteCarregada(n)) return Promise.resolve();
    var e = parteEstado[n];
    if (e) { if (onProg) e.cbs.push(onProg); return e.promessa; }
    e = parteEstado[n] = { cbs: onProg ? [onProg] : [] };
    if (!PARTES[n]) return Promise.reject(new Error('sem arquivo para ' + n));
    e.promessa = baixarParte(PARTES[n], (D.partes_bytes || {})[n], function (f) { e.cbs.forEach(function (cb) { cb(f); }); }).catch(function (err) { parteEstado[n] = null; throw err; });
    return e.promessa;
  }
  function aplicarDetalhes() {
    var det = window.MAPA_DETALHES; if (!det) return;
    D.modelos.forEach(function (m) { var d = det[m.id]; if (d) { m.builds = d.builds; m.fontes = d.fontes; } });
  }
  var CC = window.MAPA_CAMADAS || { datasets: [], benchmarks: [] };
  var dsBy = {}, bmBy = {}, TEM = { modelos: true, datasets: false, benchmarks: false };
  function prepararCamadas() {
    if (window.MAPA_CAMADAS_LER) { var novo = window.MAPA_CAMADAS_LER(); if (!CC.datasets.length && novo.datasets.length) CC.datasets = novo.datasets; if (!CC.benchmarks.length && novo.benchmarks.length) CC.benchmarks = novo.benchmarks; CC.foto = novo.foto; CC.fixture = novo.fixture; }
    Object.keys(dsBy).forEach(function (k) { delete dsBy[k]; }); Object.keys(bmBy).forEach(function (k) { delete bmBy[k]; });
    CC.datasets.forEach(function (d) { dsBy[d.id] = d; d.nfmt = 1; }); CC.benchmarks.forEach(function (b) { bmBy[b.id] = b; b.nfmt = 1; });
    TEM.datasets = CC.datasets.length > 0 || !!(PARTES.datasets && !D.datasets); TEM.benchmarks = CC.benchmarks.length > 0 || !!(PARTES.benchmarks && !D.benchmarks);
  }
  prepararCamadas();
  var pubNome = function (id) { return pubBy[id] ? pubBy[id].nome : id; };
  var seguro = function (u) { return /^https?:\/\//i.test(String(u || '')) ? String(u) : ''; };
  var licAberta = function (l) { return !!l && /^(cc0|cc-by|apache|mit|bsd|odc|odbl|pddl|unlicense|mpl|openrail|gpl|lgpl|agpl)/i.test(l) && !/-n[cd]\b/i.test(l); };
  var uniq = function (a) { var o = {}, r = []; a.forEach(function (x) { if (x && !o[x]) { o[x] = 1; r.push(x); } }); return r.sort(); };
  var fmtB = function (b) { if (b == null) return '—'; if (b >= 1e9) return nf(b / 1e9, 2) + ' GB'; if (b >= 1e6) return nf(b / 1e6, 1) + ' MB'; return nf(b / 1e3, 0) + ' kB'; };
  var balde = function (d) { return d.faixa || 'x'; };
  // busca sem acentos nem maiusculas; cada palavra da consulta precisa aparecer (nome, sigla, apelidos e nome em portugues de instituicoes e laboratorios entram no texto do publicador)
  var norm = function (x) { return String(x == null ? '' : x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); };
  var tokensBusca = function (q) { return norm(q).split(/\s+/).filter(Boolean); };
  var contem = function (h, toks) { for (var i = 0; i < toks.length; i++) if (h.indexOf(toks[i]) < 0) return false; return true; };
  var inclui = function (q, partes) { var tk = tokensBusca(q); if (!tk.length) return true; return contem(norm(partes.join(' ')), tk); };
  var tkQ = '', tkR = [];
  var tokensMemo = function (q) { if (q !== tkQ) { tkQ = q; tkR = tokensBusca(q); } return tkR; };
  var entTxt = function (e) { return norm([e.nome, e.nome_pt, e.sigla].concat(e.aliases || []).join(' ')); };
  var nomeDe = function (x) { return S.lang === 'pt' && x.nome_pt ? x.nome_pt : x.nome; };
  var pubTxtC = {};
  function pubTxt(pid) {   // texto do publicador para a busca: nome, id e as instituicoes/laboratorios ligados
    if (pubTxtC[pid]) return pubTxtC[pid];
    var p = pubBy[pid], h = norm((p ? p.nome : '') + ' ' + pid);
    REL.instDoPub(pid).forEach(function (i) { if (REL.instBy[i]) h += ' ' + entTxt(REL.instBy[i]); });
    REL.labsDoPub(pid).forEach(function (l) { if (REL.labBy[l]) h += ' ' + entTxt(REL.labBy[l]); });
    return (pubTxtC[pid] = h);
  }
  function passaDataset(d) {
    var f = S.f.datasets;
    if (S.escopo !== 'todos' && d.escopo !== S.escopo) return false;   // Brasil | Mundo | Tudo: o mesmo seletor e o mesmo valor dos modelos
    if (f.pt === 'pt' && !d.pt) return false;
    if (f.pt === 'ptbr' && !d.pt_br) return false;
    if (f.idioma && d.idiomas.indexOf(f.idioma) < 0) return false;
    if (f.tarefa && d.tarefas.indexOf(f.tarefa) < 0) return false;
    if (f.licenca && (f.licenca === '__sem' ? !!d.licenca : d.licenca !== f.licenca)) return false;
    if (f.tamanho && balde(d) !== f.tamanho) return false;
    if (f.publicador && d.publicador !== f.publicador) return false;
    if (f.bench === 'sim' && !d.benchmarks.length) return false;
    if (f.bench === 'nao' && d.benchmarks.length) return false;
    return inclui(f.q, [d.nome, d.id, pubNome(d.publicador), d.descricao, d.tarefas.join(' '), pubTxt(d.publicador)]);
  }
  function passaBench(b) {
    var f = S.f.benchmarks;
    if (f.dominio && b.dominio.indexOf(f.dominio) < 0) return false;
    if (f.idioma && b.idiomas.indexOf(f.idioma) < 0) return false;
    if (f.tipo && b.tipo !== f.tipo) return false;
    if (f.tarefa && b.tarefas.indexOf(f.tarefa) < 0) return false;
    return inclui(f.q, [b.nome, b.sigla, b.id, b.criador, b.dominio.join(' ')]);
  }
  var ocultaExp = function (m) { return MF.exp.disponivel && !S.mostrarExp && m._mat === 'e'; };
  function passaModelo(m) { return !ocultaExp(m) && passaOutros(m); }
  function passaOutros(m) {   // todos os filtros, menos Experimentais
    if (MF.rec.disponivel && !S.recorte && m.recorte_pt === true) return false;   // o recorte desligado nao entra em contagem nenhuma
    if (S.escopo !== 'todos' && m.escopo !== S.escopo) return false;
    if (!MF.roda.passa(m, S.via)) return false;   // Sim | Com limitacoes (so GGUF) | Ainda nao
    if (S.nat !== 'todas' && natRot(pubBy[m.publicador]) !== S.nat) return false;
    if (S.fmt === 'multi' && m.nfmt < 2) return false;
    if (S.tarefa && m.ftar !== S.tarefa) return false;
    if (S.inst && (m.insts.indexOf(S.inst) < 0 || !MF.papel.passa(m, 'inst', S.inst, S.papel))) return false;
    if (S.lab && (m.labsM.indexOf(S.lab) < 0 || !MF.papel.passa(m, 'lab', S.lab, S.papel))) return false;
    var tkBusca = tokensMemo(S.busca);
    if (tkBusca.length) {
      if (m._h === undefined) { var hi = ''; m.insts.forEach(function (i) { if (REL.instBy[i]) hi += ' ' + entTxt(REL.instBy[i]); }); m.labsM.forEach(function (l) { if (REL.labBy[l]) hi += ' ' + entTxt(REL.labBy[l]); }); m._h = norm(m.id + ' ' + m.familia) + ' ' + pubTxt(m.publicador) + hi; }
      if (!contem(m._h, tkBusca)) return false;
    }
    return true;
  }
  var clsDataset = function (d) { var a = licAberta(d.licenca); return d.pt_br ? (a ? 'oficial' : 'comunidade') : (a ? 'gguf' : 'nenhum'); };
  var clsBench = function (b) { var ptbr = b.idiomas.some(function (i) { return /^pt-br$/i.test(i); }), pt = b.idiomas.some(function (i) { return /^pt/i.test(i); }); return ptbr ? 'oficial' : pt ? 'comunidade' : b.idiomas.length > 1 ? 'gguf' : 'nenhum'; };
  // diversidade de builds: formatos distintos prontos para o navegador entre onnx, mlc, litert e gguf via wllama (0 a 4)
  var FORMATOS = ['onnx', 'mlc', 'litert', 'gguf'];
  function formatosDe(m) {
    var o = {}; (m.builds ? m.builds.map(function (b) { return b.formato; }) : (m.formatos_navegador || [])).forEach(function (f) { if (f === 'onnx' || f === 'mlc' || f === 'litert') o[f] = 1; });
    if (m.gguf_wllama) o.gguf = 1;
    return FORMATOS.filter(function (f) { return o[f]; });
  }
  var REL = window.MAPA_REL || { disponivel: false, inst: [], lab: [], instBy: {}, labBy: {}, pares: [], instDoPub: function () { return []; }, labsDoPub: function () { return []; }, raizDoPub: function () { return null; }, labDoPub: function () { return null; }, famDeTarefa: function (t) { return /^(text-generation|image-text-to-text|any-to-any|text2text-generation)$/.test(t || 'text-generation') ? 'gerador' : 'codificador'; }, rot: function (x) { return x ? (x.sigla || x.nome) : ''; } };
  var creditosDe = function (m, pref) { return (m._cred || []).filter(function (c) { return c.t === pref; }).map(function (c) { return c.id; }); };
  D.modelos.forEach(function (m) {
    m.fmts = formatosDe(m); m.nfmt = m.fmts.length; m.ftar = m.familia_tarefa || REL.famDeTarefa(m.tarefa);
    var is = REL.instDoPub(m.publicador).concat(creditosDe(m, 'inst')), ls = REL.labsDoPub(m.publicador).concat(creditosDe(m, 'lab'));
    m.insts = is.filter(function (x, i) { return is.indexOf(x) === i; }); m.labsM = ls.filter(function (x, i) { return ls.indexOf(x) === i; });
  });
  var rotDom = function (x) { var v = T[S.lang]['dom_' + x]; return v || String(x).replace(/_/g, ' '); };
  var rotTipo = function (x) { var v = T[S.lang]['tipo_' + x]; return v || String(x).replace(/_/g, ' '); };
  var CAM = null;
  var ORD = { oficial: 0, comunidade: 1, gguf: 2, nenhum: 3 };
  var CAMS = {
    modelos: {
      id: 'modelos', por: modBy, itens: function () { return D.modelos; }, passa: passaModelo, cls: viaOf, campo: 'campo', eb: 'eyebrow', recorte: 'recorte', nota: 'sky_nota', rot: 'res_label', tit: 'res_titulo', plural: 'modelos',
      modos: function () { return REL.disponivel ? [['publicador', 'porpub'], ['familia', 'porfam'], ['instituicao', 'porinst']] : [['publicador', 'porpub'], ['familia', 'porfam']]; }, modo: function () { return S.agrupar === 'instituicao' && !REL.disponivel ? 'publicador' : S.agrupar; },
      base: function () { return D.modelos.filter(passaModelo); },   // o grafo e re-layoutado so com o recorte dos filtros
      grupo: function (m) {
        if (S.agrupar === 'instituicao' && REL.disponivel) { var r = REL.raizDoPub(m.publicador); return r ? { k: 'i:' + r, nome: REL.rot(REL.instBy[r]) || r, pub: null, inst: REL.instBy[r] } : { k: m.publicador, nome: pubBy[m.publicador].nome, pub: pubBy[m.publicador] }; }
        return S.agrupar === 'publicador' ? { k: m.publicador, nome: pubBy[m.publicador].nome, pub: pubBy[m.publicador] } : { k: m.familia.toLowerCase(), nome: famNome[m.familia] || m.familia, pub: null };
      },
      fam: function (m) { return S.agrupar === 'instituicao' ? (REL.labDoPub(m.publicador) || m.publicador) : m.familia; },
      ord: function (a, b) {
        if (S.agrupar === 'instituicao') { var la = REL.labDoPub(a.publicador) || '~', lb = REL.labDoPub(b.publicador) || '~'; if (la !== lb) return la < lb ? -1 : 1; if (a.publicador !== b.publicador) return a.publicador < b.publicador ? -1 : 1; }
        return a.familia < b.familia ? -1 : a.familia > b.familia ? 1 : (b.downloads || 0) - (a.downloads || 0);
      },
      tam: function (m) { return 1.3 + Math.min(3, Math.sqrt(m.gb_navegador || m.gguf_gb || 0.4) * 1.25); },
      legenda: [['oficial', 'leg_of', 'of'], ['comunidade', 'leg_co', 'co'], ['gguf', 'leg_gg', 'gg'], ['nenhum', 'leg_no', 'no']],
      tip: function (m) { return '<b>' + esc(m.nome) + '</b><br>' + esc(pubBy[m.publicador].nome) + ' · ' + esc(t(viaOf(m))) + (m.gb_navegador ? ' · ' + nf(m.gb_navegador, 2) + ' GB' : ''); }
    },
    datasets: {
      id: 'datasets', por: dsBy, itens: function () { return CC.datasets; }, passa: passaDataset, cls: clsDataset, campo: 'campo_ds', eb: 'eyebrow_ds', recorte: 'recorte_ds', nota: 'sky_nota_ds', rot: 'res_label_ds', tit: 'res_titulo_ds', plural: 'datasets',
      modos: [['publicador', 'porpub'], ['tema', 'por_tema']], modo: function () { return S.modoL.datasets; },
      base: function () { return CC.datasets.filter(passaDataset); },
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
      base: function () { return CC.benchmarks.filter(passaBench); },
      grupo: function (b) { return S.modoL.benchmarks === 'dominio' ? { k: b.dominio[0] || '—', nome: b.dominio[0] ? rotDom(b.dominio[0]) : '—', pub: null } : { k: b.criador || '—', nome: b.criador || '—', pub: null }; },
      fam: function (b) { return b.dominio[0] || ''; },
      ord: function (a, b) { return (a.ano || 0) - (b.ano || 0) || (a.nome < b.nome ? -1 : 1); },
      tam: function (b) { return 1.8 + Math.min(2.6, 1.0 * Math.log2(1 + b.datasets.length)); },
      legenda: [['oficial', 'leg_bm_of', 'of'], ['comunidade', 'leg_bm_co', 'co'], ['gguf', 'leg_bm_gg', 'gg'], ['nenhum', 'leg_bm_no', 'no']],
      tip: function (b) { return '<b>' + esc(b.sigla ? b.sigla + ' · ' + b.nome : b.nome) + '</b><br>' + esc(b.dominio.map(rotDom).join(', ') || '—') + ' · ' + b.datasets.length + ' datasets'; }
    }
  };

  // colunas da tabela por camada: val (ordenacao), td (celula HTML) e txt (texto para exportar)
  var chipFmt = function (m) { return m.fmts.map(function (f) { return '<span class="chip-f f-' + f + '">' + ({ onnx: 'ONNX', mlc: 'MLC', litert: 'LiteRT', gguf: 'GGUF' })[f] + '</span>'; }).join('') || '<span class="chip-f f-0">—</span>'; };
  var fmtNome = { onnx: 'ONNX', mlc: 'MLC', litert: 'LiteRT', gguf: 'GGUF' };
  var nomesInst = function (ids, m) { return ids.map(function (id) { var p = m ? MF.papel.rotulo(m, 'inst', id) : ''; return (REL.rot(REL.instBy[id]) || id) + (p ? ' · ' + t('pl_' + p) : ''); }).join(', '); };
  CAMS.modelos.cols = [
    { k: 'nome', rot: 'c_modelo', val: function (m) { return m.nome.toLowerCase(); }, td: function (m) { var p = pubBy[m.publicador]; return '<td><span class="mname">' + esc(m.nome) + '</span>' + '<small>' + esc(p.nome) + ' · ' + natTxt(p) + ' · ' + esc(m.familia) + '</small>' + (m.portado_por ? '<small class="porta-m">' + t('c_portado') + ' ' + esc(m.portado_por) + '</small>' : '') + '</td>'; }, txt: function (m) { return m.nome + ' (' + pubBy[m.publicador].nome + ')'; } },
    { k: 'tar', rot: 'c_tarefa', val: function (m) { return m.ftar; }, td: function (m) { return '<td><span class="chip-t t-' + m.ftar + '"' + (m.tarefa ? ' title="' + esc(m.tarefa) + '"' : '') + '>' + t('ta_' + m.ftar) + '</span></td>'; }, txt: function (m) { return t('ta_' + m.ftar); } },   // um elemento so: o tipo; a tarefa original do Hugging Face fica na dica e no drawer
    { k: 'via', rot: 'c_status', val: function (m) { return ORD[viaOf(m)]; }, td: function (m) { var v = viaOf(m); return '<td><span class="badge ' + v + '">' + t(v) + '</span></td>'; }, txt: function (m) { return t(viaOf(m)); } },
    { k: 'builds', rot: 'c_builds', val: function (m) { return -m.nfmt; }, td: function (m) { return '<td class="c-builds">' + chipFmt(m) + '<small>' + m.nfmt + ' ' + t(m.nfmt === 1 ? 'formato' : 'formatos') + '</small></td>'; }, txt: function (m) { return m.fmts.map(function (f) { return fmtNome[f]; }).join(', ') + ' (' + m.nfmt + ')'; } },
    { k: 'gb', rot: 'c_gb', val: function (m) { return m.gb_navegador == null ? null : m.gb_navegador; }, td: function (m) { return '<td><span class="num">' + nf(m.gb_navegador, 2) + '</span></td>'; }, txt: function (m) { return nf(m.gb_navegador, 2); } },
    { k: 'lic', rot: 'c_lic', val: function (m) { return m.licenca || ''; }, td: function (m) { return '<td><small>' + esc(m.licenca || '—') + '</small></td>'; }, txt: function (m) { return m.licenca || '—'; } },
    { k: 'upd', rot: 'c_upd', val: function (m) { return m.atualizado || ''; }, td: function (m) { return '<td class="nw"><small>' + esc(m.atualizado || '—') + '</small></td>'; }, txt: function (m) { return m.atualizado || '—'; } }
  ];
  if (REL.disponivel) CAMS.modelos.cols.push({ k: 'inst', rot: 'c_inst', val: function (m) { return nomesInst(m.insts, m).toLowerCase(); }, td: function (m) { return '<td><small>' + esc(nomesInst(m.insts, m) || '—') + '</small></td>'; }, txt: function (m) { return nomesInst(m.insts, m) || '—'; } });
  // Portado por: quem publicou o build para a web (autor do build em destaque); avatar publico do Hugging Face carregado sob demanda, com iniciais de reserva
  var avHtml = function (autor) { return Avatar.html(autor); };
  var portadorHtml = function (m, completo) {
    if (!m.portado_por) return '—'; var papel = t('portado_' + (m.portado_papel || 'comunidade'));
    return '<a class="portador" href="https://huggingface.co/' + esc(m.portado_por) + '" target="_blank" rel="noopener" title="' + esc(papel + ' · ' + t('portado_ver')) + '">' + avHtml(m.portado_por) + '<span class="pn">' + esc(m.portado_por) + '</span></a>' +
      (seguro(m.portado_url) ? ' <a class="repo-b" href="' + esc(m.portado_url) + '" target="_blank" rel="noopener" aria-label="' + esc(papel) + '" title="' + esc(papel) + '">↗</a>' : '');
  };
  CAMS.modelos.cols.push({ k: 'portado', rot: 'c_portado', val: function (m) { return (m.portado_por || '').toLowerCase(); }, td: function (m) { return '<td class="col-portado">' + portadorHtml(m) + '</td>'; }, txt: function (m) { return m.portado_por || '—'; } });
  // avatares: so o endereco vem dos dados; a imagem e carregada do Hugging Face quando a linha aparece (sem enviar nada do visitante)
  function hidratarAvatares() { Avatar.hidratar(document); }
  Avatar.config({ carregar: function () { return PARTES.avatares ? carregarParte('avatares') : Promise.reject(); } });
  CAMS.datasets.cols = [
    { k: 'nome', rot: 'c_dataset', val: function (d) { return d.nome.toLowerCase(); }, td: function (d) { return '<td><span class="mname">' + esc(d.nome) + '</span></td>'; }, txt: function (d) { return d.nome; } },
    { k: 'pub', rot: 'c_pub', val: function (d) { return pubNome(d.publicador).toLowerCase(); }, td: function (d) { return '<td><small>' + esc(pubNome(d.publicador)) + '</small></td>'; }, txt: function (d) { return pubNome(d.publicador); } },
    { k: 'inst', rot: 'c_inst', val: function (d) { return nomesInst(REL.instDoPub(d.publicador)).toLowerCase(); }, td: function (d) { return '<td><small>' + esc(nomesInst(REL.instDoPub(d.publicador)) || '—') + '</small></td>'; }, txt: function (d) { return nomesInst(REL.instDoPub(d.publicador)) || '—'; }, so: 'rel' },
    { k: 'idiomas', rot: 'c_idiomas', val: function (d) { return d.idiomas.join(','); }, td: function (d) { return '<td>' + (d.pt_br ? '<span class="badge oficial">pt-BR</span> ' : '') + '<small>' + esc(d.idiomas.filter(function (i) { return !(d.pt_br && i === 'pt-BR'); }).join(', ')) + '</small></td>'; }, txt: function (d) { return d.idiomas.join(', ') || '—'; } },
    { k: 'tarefas', rot: 'c_tarefas', val: function (d) { return d.tarefas.join(','); }, td: function (d) { return '<td><small>' + esc(d.tarefas.join(', ') || '—') + '</small></td>'; }, txt: function (d) { return d.tarefas.join(', ') || '—'; } },
    { k: 'lic', rot: 'c_lic', val: function (d) { return d.licenca || ''; }, td: function (d) { return '<td><small>' + esc(d.licenca || '—') + '</small></td>'; }, txt: function (d) { return d.licenca || '—'; } },
    { k: 'tam', rot: 'c_tamanho', val: function (d) { return d.tamanho_bytes; }, td: function (d) { return '<td><span class="num">' + esc(fmtB(d.tamanho_bytes)) + '</span></td>'; }, txt: function (d) { return fmtB(d.tamanho_bytes); } },
    { k: 'downloads', rot: 'c_downloads', val: function (d) { return d.downloads; }, td: function (d) { return '<td><span class="num">' + nf(d.downloads) + '</span></td>'; }, txt: function (d) { return nf(d.downloads); } },
    { k: 'upd', rot: 'c_upd', val: function (d) { return d.atualizado || ''; }, td: function (d) { return '<td class="nw"><small>' + esc(d.atualizado || '—') + '</small></td>'; }, txt: function (d) { return d.atualizado || '—'; } },
    { k: 'nb', rot: 'c_benchmarks', val: function (d) { return d.benchmarks.length; }, td: function (d) { return '<td><span class="num">' + d.benchmarks.length + '</span></td>'; }, txt: function (d) { return String(d.benchmarks.length); } }
  ];
  if (!REL.disponivel) CAMS.datasets.cols = CAMS.datasets.cols.filter(function (c) { return c.so !== 'rel'; });
  CAMS.benchmarks.cols = [
    { k: 'nome', rot: 'c_benchmark', val: function (b) { return (b.sigla || b.nome).toLowerCase(); }, td: function (b) { return '<td><span class="mname">' + esc(b.sigla || b.nome) + '</span>' + (b.sigla ? '<small>' + esc(b.nome) + '</small>' : '') + '</td>'; }, txt: function (b) { return b.sigla ? b.sigla + ' (' + b.nome + ')' : b.nome; } },
    { k: 'dominio', rot: 'c_dominio', val: function (b) { return b.dominio.join(','); }, td: function (b) { return '<td><small>' + esc(b.dominio.map(rotDom).join(', ') || '—') + '</small></td>'; }, txt: function (b) { return b.dominio.map(rotDom).join(', ') || '—'; } },
    { k: 'idiomas', rot: 'c_idiomas', val: function (b) { return b.idiomas.join(','); }, td: function (b) { return '<td><small>' + esc(b.idiomas.join(', ') || '—') + '</small></td>'; }, txt: function (b) { return b.idiomas.join(', ') || '—'; } },
    { k: 'tipo', rot: 'c_tipo', val: function (b) { return b.tipo; }, td: function (b) { return '<td><small>' + esc(b.tipo ? rotTipo(b.tipo) : '—') + '</small></td>'; }, txt: function (b) { return b.tipo ? rotTipo(b.tipo) : '—'; } },
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
  var G = [], stars = [], pubC = {}, subRot = [], ORDR = [];
  var montagemId = 0, fatia = function (fn) { if (window.scheduler && scheduler.postTask) scheduler.postTask(fn, { priority: 'user-visible' }); else setTimeout(fn, 0); };
  var ORCAMENTO = 10;   // ms por fatia: camadas grandes montam em varias fatias, sem travar a pagina
  function limparConstelacao() { montagemId++; ORDR = []; G = []; stars = []; starOf = {}; grupoPorId = {}; grade = null; listaVis = []; visN = []; visB = []; arestas = { fam: [], outra: [] }; estrelasNenhum = []; estrelasBrilho = []; $('#sky-points').innerHTML = ''; S.noCirculo = []; assinatura = null; estSuja = true; camSuja = true; pintSuja = true; agendar(); }
  function montar(cb) {
    var ESPACO = 12;   // folga entre grupos (parametro unico; antes 8): mais ar entre as constelacoes, para os rotulos caberem no zoom out
    var CEL_P = 64, malha = {};   // malha espacial dos circulos ja colocados: a conferencia olha so as celulas proximas (mesmo resultado, bem mais rapido)
    var cel = function (v) { return Math.floor(v / CEL_P); };
    var MR = 4;   // folga entre retangulos de rotulo (px de tela, convertida para o mundo)
    // Cada grupo e um circulo mais o retangulo do seu rotulo (abaixo do circulo, tamanho real do texto convertido ao mundo); nenhum circulo ou rotulo
    // pode invadir o de outro grupo, ligado ou nao, entao a atracao entre ligados para na borda dos rotulos.
    function rcDist(rc, cx, cy) { var dx = Math.max(rc.x0 - cx, 0, cx - rc.x1), dy = Math.max(rc.y0 - cy, 0, cy - rc.y1); return Math.hypot(dx, dy); }
    function livre(px, py, R, rt) {
      var hw = rt ? rt.hw : 0, ext = Math.max(R + ESPACO, hw + 8, rt ? Math.abs(rt.y1) + 8 : 0);
      var cr = rt ? { x0: px - hw, x1: px + hw, y0: py + rt.y0, y1: py + rt.y1 } : null;
      var x0 = cel(px - ext), x1 = cel(px + ext), y0 = cel(py - ext), y1 = cel(py + ext);
      for (var cx = x0; cx <= x1; cx++) for (var cy = y0; cy <= y1; cy++) {
        var l = malha[cx + ',' + cy]; if (!l) continue;
        for (var q = 0; q < l.length; q++) {
          var p = l[q]; if (p.v === visita) continue; p.v = visita;
          if (!(Math.hypot(p.x - px, p.y - py) > p.R + R + ESPACO)) return false;
          if (cr && rcDist(cr, p.x, p.y) < p.R * 0.8 + 4) return false;
          if (p.rc) {
            if (rt && !(cr.x1 + rt.m < p.rc.x0 || cr.x0 - rt.m > p.rc.x1 || cr.y1 + rt.m < p.rc.y0 || cr.y0 - rt.m > p.rc.y1)) return false;
            if (rcDist(p.rc, px, py) < R * 0.8 + 4) return false;
          }
        }
      }
      return true;
    }
    var visita = 0;
    function ocupar(px, py, R, rt) {
      var p = { x: px, y: py, R: R, rc: rt ? { x0: px - rt.hw, x1: px + rt.hw, y0: py + rt.y0, y1: py + rt.y1 } : null, v: 0 };
      var hw = rt ? rt.hw : 0, ex = Math.max(R, hw), ey = Math.max(R, rt ? Math.abs(rt.y1) : 0), x0 = cel(px - ex), x1 = cel(px + ex), y0 = cel(py - ey), y1 = cel(py + ey);
      for (var cx = x0; cx <= x1; cx++) for (var cy = y0; cy <= y1; cy++) (malha[cx + ',' + cy] = malha[cx + ',' + cy] || []).push(p);
    }
    var meu = ++montagemId, base = CAM.base(), map = {}, i = 0, sigM = sigDe(base), frag = document.createDocumentFragment(), j2 = 0;
    base.forEach(function (m) {
      var gi = CAM.grupo(m), g = map[gi.k] || (map[gi.k] = { id: gi.k, nome: gi.nome, ms: [], pub: gi.pub || null, inst: gi.inst || null });
      g.ms.push(m);
    });
    var GG = Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.ms.length - a.ms.length || (a.id < b.id ? -1 : 1); });
    // proximidade: grupos ligados por relacao, instituicao ou laboratorio sao colocados perto dos ja colocados (mesma entrada, mesma saida)
    var nbr = {};
    if (CAM.id === 'modelos' && REL.disponivel) {
      var gDoPub = {}; GG.forEach(function (g) { g.ms.forEach(function (m) { var l = gDoPub[m.publicador] || (gDoPub[m.publicador] = []); if (l.indexOf(g) < 0) l.push(g); }); });
      var arestasPub = REL.pares.slice();
      REL.inst.concat(REL.lab).forEach(function (e) { var ps = (e.publicadores || []).filter(function (x) { return gDoPub[x] && !(REL.financiador && REL.financiador[x + '|' + e.id]); }); for (var a = 0; a < ps.length; a++) for (var b2 = a + 1; b2 < ps.length; b2++) arestasPub.push([ps[a], ps[b2]]); });
      arestasPub.forEach(function (e) { (gDoPub[e[0]] || []).forEach(function (ga) { (gDoPub[e[1]] || []).forEach(function (gb) { if (ga === gb) return; (nbr[ga.id] = nbr[ga.id] || {})[gb.id] = gb; (nbr[gb.id] = nbr[gb.id] || {})[ga.id] = ga; }); }); });
    }
    nbrG = nbr;
    if (Object.keys(nbr).length) {   // ordem de colocacao: cada grupo ligado entra logo depois do maior vizinho (grupos pequenos ligados chegavam por ultimo, quando nao ha mais espaco perto, e ficavam longe)
      var visto = {}, ordem = [], porTam = function (x, y) { return y.ms.length - x.ms.length || (x.id < y.id ? -1 : 1); };
      GG.forEach(function (g0) { if (visto[g0.id]) return; visto[g0.id] = 1; var fila = [g0]; while (fila.length) { var x = fila.shift(); ordem.push(x); Object.keys(nbr[x.id] || {}).map(function (k) { return nbr[x.id][k]; }).sort(porTam).forEach(function (v) { if (!visto[v.id]) { visto[v.id] = 1; fila.push(v); } }); } });
      GG = ordem;
    }
    function alvoDe(g) {   // centro dos vizinhos ja colocados (ou null)
      var viz = nbr[g.id], sx = 0, sy = 0, n = 0; if (!viz) return null;
      Object.keys(viz).sort().forEach(function (k) { var v = viz[k]; if (v.colocado) { sx += v.x; sy += v.y; n++; } });
      return n ? [sx / n, sy / n] : null;
    }
    // importancia e prioridade de rotulo antes do layout (o layout reserva espaco para os rotulos que importam)
    importancia(GG);
    var cvm = document.createElement('canvas').getContext('2d'); cvm.font = '500 10px "Atkinson Hyperlegible Next",system-ui,sans-serif';
    var rotW = function (g) { return Math.ceil(cvm.measureText(g.nome + ' · ' + g.ms.length).width * 1.08) + 14 + (g.pub && g.pub.natureza === 'independente' ? 12 : 0); }, ROT_H = 18;
    var sr = stage.getBoundingClientRect(), pw = sr.width > 80 ? sr.width : Math.min(innerWidth * 0.45, 640), ph = sr.height > 80 ? sr.height : Math.min(innerHeight * 0.7, 640);
    var PX0 = 2 * (Math.min(pw, ph) / 2 - 8) * 0.82 * 0.47;   // px por unidade de (mundo / rmax) no zoom 1
    var comRect = {}; GG.slice().sort(function (a, b) { return b.imp - a.imp || (a.id < b.id ? -1 : 1); }).forEach(function (g, r) { if (r < 30) comRect[g.id] = true; });
    var fPx = (function () {   // estima px/unidade do mundo: area dos circulos + dos rotulos = disco de raio rmax (densidade ~0,4), ponto fixo
      var ac = 0, ar = 0; GG.forEach(function (g) { var R = 20 + 13 * Math.sqrt(g.ms.length) + ESPACO; ac += Math.PI * R * R; if (comRect[g.id]) ar += rotW(g) * ROT_H; });
      var f0 = PX0 / Math.sqrt(ac / (Math.PI * 0.4)), f = f0;
      for (var it = 0; it < 30; it++) f = Math.max(0.45 * f0, PX0 / Math.sqrt((ac + ar * 1.1 / (f * f)) / (Math.PI * 0.5)));   // limitado: os circulos nao encolhem alem de 45%
      return f;
    })();
    var RECT_FR = 0;   // fracao da largura do rotulo reservada no layout dos grupos ligados (ficam perto: o rotulo se resolve por posicoes candidatas e rotulo composto); os demais reservam o rotulo inteiro
    function rectDe(g, R) {   // retangulo do rotulo em coordenadas do mundo, relativo ao centro do grupo (zoom padrao)
      if (!comRect[g.id]) return null;
      var w = rotW(g) * (nbr[g.id] ? RECT_FR : 1.12) / fPx, h = ROT_H / fPx; g.rw = w;
      var y0 = Math.max(0, 0.5 * R - 14 / fPx) + 12 / fPx;
      return { hw: w / 2, y0: y0, y1: y0 + h, m: MR / fPx };
    }
    function colocar() {
      var t0 = performance.now();
      while (i < GG.length && (GG.length < 150 || performance.now() - t0 < ORCAMENTO)) {
        var g = GG[i++];
        g.ms.sort(CAM.ord);
        var R = 20 + 13 * Math.sqrt(g.ms.length); g.R = R;
        g.off = g.ms.map(function (m, j) { var a = j * 2.39996 + hash(g.id) * 6.28, r = 12 * Math.sqrt(j + 0.6); return [Math.cos(a) * r, Math.sin(a) * r]; });
        var rt = rectDe(g, R), ang = hash(g.id + 'a') * 6.28, rad = 0, ok = false, px = 0, py = 0, n = 0, alvo = alvoDe(g), ax = alvo ? alvo[0] : 0, ay = alvo ? alvo[1] : 0;
        while (!ok && n < 6000) {
          px = ax + Math.cos(ang) * rad; py = ay + Math.sin(ang) * rad;
          visita++; ok = livre(px, py, R, rt);
          if (!ok && n === 3000 && rt) { rt = null; }   // sem espaco para o rotulo: so o circulo
          ang += 0.5; rad += 0.8; n++;
        }
        g.x = px; g.y = py; g.colocado = true; ocupar(px, py, R, rt);
      }
      if (meu !== montagemId) return;
      if (i < GG.length) fatia(colocar); else estrelasEGrupos();
    }
    function estrelasEGrupos() {
      G = GG; var rmax = 1; G.forEach(function (g) { rmax = Math.max(rmax, Math.hypot(g.x, g.y) + g.R); });
      var k = 0.47 / rmax; KMUNDO = k; ZMAX = zmaxEf(); stars = []; starOf = {}; grupoPorId = {};
      G.forEach(function (g) {
        g.u = 0.5 + g.x * k; g.v = 0.5 + g.y * k; g.k = k;
        g.ms.forEach(function (m, j) {
          var st = { m: m, g: g, u: 0.5 + (g.x + g.off[j][0]) * k, v: 0.5 + (g.y + g.off[j][1]) * k, r: CAM.tam(m), xy: [0, 0], on: true, vis: false, dr: false, nf: CAM.id === 'modelos' ? m.nfmt : 1 };
          st.dia = m.ftar === 'codificador'; st.st = CAM.cls(m); st.idx = stars.length; st.ord = { oficial: 0, comunidade: 1, gguf: 2, nenhum: 3 }[st.st]; stars.push(st); starOf[m.id] = st; (g.stars = g.stars || []).push(st);
        });
      });
      pubC = {}; subRot = [];
      if (CAM.id === 'modelos' && REL.disponivel) stars.forEach(function (s) { var c = pubC[s.m.publicador] || (pubC[s.m.publicador] = { u: 0, v: 0, n: 0, st: [] }); c.u += s.u; c.v += s.v; c.n++; c.st.push(s); });
      if (CAM.id === 'modelos' && S.agrupar === 'instituicao' && REL.disponivel) {
        G.forEach(function (g) {
          var por = {}; g.stars.forEach(function (s) { var l = REL.labDoPub(s.m.publicador); if (l) { var o = por[l] || (por[l] = { nome: REL.rot(REL.labBy[l]) || l, u: 0, v: 0, n: 0 }); o.u += s.u; o.v += s.v; o.n++; } });
          Object.keys(por).forEach(function (l) { subRot.push({ nome: por[l].nome, u: por[l].u / por[l].n, v: por[l].v / por[l].n }); });
        });
      }
      ORDR = G.map(function (g, i) { return i; }).sort(function (a, b) { return G[a].faixa - G[b].faixa || G[b].imp - G[a].imp || (G[a].id < G[b].id ? -1 : 1); }); rotulos();
    }
    // prioridade dos rotulos por regra objetiva: primeiro quem tem vinculo a laboratorio/instituicao ou build nativo; dentro de cada faixa, pela importancia
    // (downloads dos modelos com build, numero de modelos e relacoes); o rotulo so entra se nao colidir
    function importancia(L) {
      var lista = L || G, dls = [];
      lista.forEach(function (g) {
        var dl = 0, nat = false, vinc = false, dlb = 0;
        g.ms.forEach(function (m) {
          if (CAM.id === 'modelos') { if (m.nfmt > 0) { dl += m.downloads || 0; dlb += m.downloads || 0; } if (m.via === 'nativo') nat = true; if (REL.labsDoPub(m.publicador).length || REL.instDoPub(m.publicador).length) vinc = true; }
          else dl += m.downloads || m.downloads_total || 0;
        });
        g.imp = Math.log1p(dl) * 2 + Math.log1p(g.ms.length) * 3 + (nbr[g.id] ? Object.keys(nbr[g.id]).length : 0) + (vinc ? 4 : 0) + (nat ? 4 : 0);
        g.dlb = dlb; g.faixa = (CAM.id === 'modelos' && (nat || vinc)) ? 0 : 1; dls.push(g);
      });
      dls.sort(function (a, b) { return b.dlb - a.dlb || (a.id < b.id ? -1 : 1); }).slice(0, 30).forEach(function (g) { if (g.dlb > 0) g.faixa = 0; });
      lista.slice().sort(function (a, b) { return b.imp - a.imp || (a.id < b.id ? -1 : 1); }).slice(0, 30).forEach(function (g) { g.faixa = 0; g.t30 = true; });   // os 30 mais importantes tambem   // os 30 mais baixados com build tambem entram na faixa prioritaria
      if (!L) ORDR = G.map(function (g, i) { return i; }).sort(function (a, b) { return G[a].faixa - G[b].faixa || G[b].imp - G[a].imp || (G[a].id < G[b].id ? -1 : 1); });
    }
    function rotulos() {
      var t0 = performance.now();
      while (j2 < G.length && (G.length < 150 || performance.now() - t0 < ORCAMENTO)) {
        var g = G[j2++], b = document.createElement('button'); b.className = 'sky-model'; b.type = 'button'; b.dataset.g = g.id; b.setAttribute('aria-pressed', 'false');
        if (g.pub && g.pub.natureza === 'independente') b.classList.add('ind');
        b.innerHTML = '<span class="sky-name">' + esc(g.nome) + ' · ' + g.ms.length + '</span>';
        b.setAttribute('aria-label', g.nome + ', ' + g.ms.length + ' ' + t(CAM.plural));
        if (g.inst) b.title = nomeDe(g.inst) + (g.inst.sigla ? ' (' + g.inst.sigla + ')' : '');   // dica com o nome completo
        frag.appendChild(b); g.el = b; g.nome_el = b.firstChild; grupoPorId[g.id] = g;
      }
      if (meu !== montagemId) return;
      if (j2 < G.length) fatia(rotulos); else concluir();
    }
    function concluir() {
      var host = $('#sky-points'); host.innerHTML = ''; host.appendChild(frag);
      sigMontada = sigM; nomeCheio = false; stage.classList.toggle('grande', G.length > 120); montarGrade(); medirRotulos(); filtroSuja = true; assinatura = null; estSuja = true; snap = null;
      if (cb) cb();
    }
    colocar();
  }
  function medirRotulos() {
    stage.classList.remove('grande');   // sem display:none, para medir todos
    G.forEach(function (g) { g.lw = g.nome_el.offsetWidth; g.lh = g.nome_el.offsetHeight; g.lw0 = undefined; g.lx = g.ly = g.trAnt = null; g.hasAnt = undefined; g.insideAnt = undefined; });
    stage.classList.toggle('grande', G.length > 120);
  }

  // ---------- camera e pintura ----------
  // Tecnicas de desempenho (nenhum elemento e removido; so muda como e desenhado):
  //  1 canvas unico por camada (nenhuma estrela ou ligacao e DOM); 2 sprites de brilho (sem gradiente por quadro);
  //  3 camada estatica em cache (ligacoes + estrelas sem build): transformada durante arrasto/zoom, redesenhada a cada 100 ms e ao parar;
  //  4 grade espacial: culling e hit-test so nas celulas visiveis; 5 agregacao visual: estrelas minusculas viram pontos;
  //  6 requestAnimationFrame com marcas de sujo; 7 cintilar em camada propria (canvas de brilho), 25 quadros/s, desligado com movimento reduzido;
  //  8 devicePixelRatio limitado a 2; 9 eventos passivos e hover em um quadro; 10 estrelas agrupadas por sprite para reduzir trocas de textura.
  var stage = $('#ceu'), canvas = $('#sky-canvas'), ctx = canvas.getContext('2d'), canvasB = $('#sky-canvas-brilho'), ctxB = canvasB.getContext('2d');
  var layer = document.createElement('canvas'), lctx = layer.getContext('2d');
  var VW = 1, VH = 1, OX = 0, OY = 0, CX1V = 1;   // CX1V: limite direito (na janela) do que o grafo desenha; a coluna de conteudo cobre o resto
     // janela e posicao do painel (area de interacao) nela; o grafo e desenhado na janela inteira
  var W = 1, H = 1, RAD = 1, elapsed = 0, last = 0, drag = null, moved = 0, frame = 0, hoverStar = null, rectEst = null, visivel = true;
  var camSuja = true, pintSuja = true, estSuja = true, filtroSuja = true, assinatura = null, tabelaT = 0;
  var snap = null, ultRender = 0, ultInteracao = 0, interagindo = false, hoverPos = null;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // zoom maximo em termos absolutos (pixels por unidade do mundo, como no layout compacto original), nao relativos ao tamanho do layout: o layout maior nao tira a capacidade de ampliar
  var KMUNDO = 0, cvR = null, nbrG = {};
  function zmaxEf() { return KMUNDO > 0 ? Math.min(1000, Math.max(8, 0.0265 / KMUNDO)) : 8; }   // ~145 px entre estrelas vizinhas no zoom maximo (desktop), qualquer que seja o tamanho do layout; nunca abaixo da ampliacao que a versao publicada oferecia (testar-faixa-zoom)
  function bounds() { S.zoom = Math.max(0.8, Math.min(zmaxEf(), S.zoom)); S.panX = Math.max(-0.7, Math.min(0.7, S.panX)); S.panY = Math.max(-0.7, Math.min(0.7, S.panY)); }
  var scale = function () { return 2 * RAD * 0.82 * S.zoom; };
  var STATS = { estrelas: 0, linhas: 0, desenhadasNaCamada: 0 };
  var arestas = { fam: [], outra: [] };
  var estrelasNenhum = [], estrelasBrilho = [], listaVis = [], visN = [], visB = [], grade = null;
  function agendar() { if (!frame) frame = requestAnimationFrame(loop); }
  function posicionar() { camSuja = true; pintSuja = true; agendar(); }
  function mexeu() { ultInteracao = performance.now(); interagindo = true; posicionar(); }
  function paint() { pintSuja = true; agendar(); }
  function marcaAtivos() {
    document.querySelectorAll('.sel select').forEach(function (c) { c.classList.toggle('ativo', c.value !== '' && c.value !== 'todas'); });
    var f = S.f[S.tab], tem = S.tab === 'modelos' ? (S.escopo !== 'todos' || S.via !== 'todos' || S.nat !== 'todas' || S.busca.trim() !== '' || S.fmt !== '' || S.tarefa !== '' || S.inst !== '' || S.lab !== '' || (MF.exp.disponivel && S.mostrarExp)) : Object.keys(f).some(function (k) { return f[k] !== ''; }) || (S.tab === 'datasets' && S.escopo !== 'todos');
    var l = $('#limpar'); if (l) l.disabled = !tem; atualizarFiltrosUI();
  }
  // ---------- botao Filtros, chips dos filtros ativos e gaveta ----------
  function btnFiltrosHtml() { return '<button type="button" class="btn-filtros" data-abrir-filtros aria-haspopup="dialog"><span>' + t('filtros') + '</span><span class="n" aria-hidden="true"></span></button><span class="chips-filtros" role="list"></span>'; }
  function ativosAvancados() {   // filtros fora da barra principal (escopo, tarefa e busca ficam na barra)
    var l = [];
    if (S.tab === 'modelos') {
      if (S.nat !== 'todas') l.push({ rot: t('f_nat'), val: t(S.nat === 'afiliada' ? 'afiliada' : S.nat), limpar: function () { S.nat = 'todas'; } });
      if (S.inst) l.push({ rot: t('f_inst'), val: ((REL.instBy[S.inst] && (REL.instBy[S.inst].sigla || nomeDe(REL.instBy[S.inst]))) || S.inst) + sufPapel(), limpar: function () { S.inst = ''; S.lab = ''; S.papel = 'todos'; } });
      if (S.lab) l.push({ rot: t('f_lab'), val: ((REL.labBy[S.lab] && (REL.labBy[S.lab].sigla || nomeDe(REL.labBy[S.lab]))) || S.lab) + (S.inst ? '' : sufPapel()), limpar: function () { S.lab = ''; if (!S.inst) S.papel = 'todos'; } });
      if (S.fmt) l.push({ rot: t('f_fmt'), val: t('fmt_multi'), limpar: function () { S.fmt = ''; } });
    } else { var f = S.f[S.tab]; Object.keys(f).forEach(function (k) { if (k !== 'q' && f[k] !== '') l.push({ rot: t(ROT_F[k] || k), val: valorFiltro(k, f[k]), limpar: function () { f[k] = ''; } }); }); }
    return l;
  }
  var sufPapel = function () { return MF.papel.disponivel && S.papel !== 'todos' ? ' · ' + t('pl_' + S.papel) : ''; };
  var ativosCache = [];
  // Experimentais: contagem dos ocultos dentro dos demais filtros (em cache por combinacao de filtros)
  var ocMemo = { k: '', n: 0 };
  function expOcultos() {
    if (!MF.exp.disponivel || S.mostrarExp) return 0;
    var k = [S.recorte, S.escopo, S.via, S.nat, S.fmt, S.tarefa, S.inst, S.lab, S.papel, S.busca].join('|'); if (k === ocMemo.k) return ocMemo.n;
    var n = 0; D.modelos.forEach(function (m) { if (m._mat === 'e' && passaOutros(m)) n++; }); ocMemo = { k: k, n: n }; return n;
  }
  function renderChipRec() {
    var el = $('#rec-slot'); if (!el) return; var h = MF.rec.chipHtml(S.recorte, t, esc); el.hidden = !h;
    var chave = (S.recorte ? 1 : 0) + '|' + S.lang + '|' + h; if (el.dataset.k === chave) return;
    var foco = document.activeElement && document.activeElement.id === 'chip-rec'; el.dataset.k = chave; el.innerHTML = h; if (foco) { var b = $('#chip-rec'); if (b) b.focus(); }
  }
  function renderChipExp() {
    var el = $('#exp-slot'); if (!el) return; var h = MF.exp.chipHtml(expOcultos(), S.mostrarExp, t, esc); el.hidden = !h;
    var chave = (S.mostrarExp ? 1 : 0) + '|' + S.lang + '|' + h; if (el.dataset.k === chave) return;
    var foco = document.activeElement && document.activeElement.id === 'chip-exp'; el.dataset.k = chave; el.innerHTML = h; if (foco) { var b = $('#chip-exp'); if (b) b.focus(); }
  }
  function atualizarFiltrosUI() {
    renderChipExp(); renderChipRec(); ativosCache = ativosAvancados();
    document.querySelectorAll('.btn-filtros').forEach(function (b) { var n = b.querySelector('.n'); n.textContent = ativosCache.length ? ' · ' + ativosCache.length : ''; b.classList.toggle('tem', ativosCache.length > 0); b.setAttribute('aria-label', t('filtros') + (ativosCache.length ? ' (' + ativosCache.length + ')' : '')); });
    var h = ativosCache.map(function (a, i) { return '<button type="button" class="chip" role="listitem" data-chip="' + i + '" aria-label="' + esc(t('rem_filtro') + ': ' + a.rot + ' ' + a.val) + '" title="' + esc(a.rot) + '">' + esc(a.val) + ' <span aria-hidden="true">×</span></button>'; }).join('');
    document.querySelectorAll('.chips-filtros').forEach(function (c) { c.innerHTML = h; });
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('#chip-rec')) { S.recorte = !S.recorte; textos(); renderFoto(); filtrou(); salvaUrl(); return; }
    if (e.target.closest('#chip-exp')) { S.mostrarExp = !S.mostrarExp; textos(); renderFoto(); filtrou(); salvaUrl(); return; }
    var ch = e.target.closest('[data-chip]'); if (ch) { var a = ativosCache[+ch.dataset.chip]; if (a) { a.limpar(); if (S.tab === 'modelos') textos(); else renderFiltros(); filtrou(); } return; }
    if (e.target.closest('[data-abrir-filtros]')) abrirGaveta(e.target.closest('[data-abrir-filtros]'));
  });
  var gaveta = $('#gaveta-filtros'), gScrim = $('#gaveta-scrim'), gOpener = null;
  function abrirGaveta(from) {
    gOpener = from || document.activeElement; gScrim.hidden = false; gaveta.hidden = false;
    ['modelos', 'datasets', 'benchmarks'].forEach(function (k) { $('#gv-' + k).hidden = S.tab !== k; });
    requestAnimationFrame(function () { gScrim.classList.add('on'); gaveta.classList.add('on'); });
    setTimeout(function () { var f = gaveta.querySelector('select,button,input'); (f || $('#gaveta-x')).focus(); }, 40);
  }
  function fecharGaveta() {
    if (!gaveta.classList.contains('on')) return;
    gaveta.classList.remove('on'); gScrim.classList.remove('on'); setTimeout(function () { gaveta.hidden = true; gScrim.hidden = true; }, reduced.matches ? 0 : 240);
    if (gOpener && gOpener.focus) try { gOpener.focus(); } catch (e) {}
  }
  $('#gaveta-x').onclick = fecharGaveta; $('#gaveta-ok').onclick = fecharGaveta; gScrim.onclick = fecharGaveta; $('#gaveta-limpar').onclick = function () { $('#limpar').click(); };
  document.addEventListener('keydown', function (e) {
    if (!gaveta.classList.contains('on')) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fecharGaveta(); return; }
    if (e.key === 'Tab') {
      var f = [].slice.call(gaveta.querySelectorAll('select,button,input,a[href]')).filter(function (x) { return !x.disabled && x.offsetParent !== null; }); if (!f.length) return;
      var a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } else if (!gaveta.contains(document.activeElement)) { e.preventDefault(); a.focus(); }
    }
  }, true);
  // o grafo acompanha o filtro: re-layout so com o recorte (determinista), camera reenquadrada com transicao curta; a tabela responde na hora
  var relayoutT = 0, sigMontada = '';
  function sigDe(arr) { var h = 2166136261 ^ arr.length; for (var i = 0; i < arr.length; i++) { var id = arr[i].id; for (var j = 0; j < id.length; j++) h = Math.imul(h ^ id.charCodeAt(j), 16777619); } return h + ':' + arr.length; }
  var relayoutPend = false;
  function sigDeAtualDiferente() { return relayoutPend; }
  function relayout() {
    relayoutT = 0; if (!G) return; if (sigDe(CAM.base()) === sigMontada) { relayoutPend = false; pintSuja = true; agendar(); return; }
    montar(function () { relayoutPend = false; assinatura = null; camSuja = true; estSuja = true; pintSuja = true; enquadrar(); agendar(); });
  }
  function enquadrar() {   // volta ao enquadramento do painel: zoom levemente afastado que assenta em 1x (sem animacao com movimento reduzido)
    S.panX = 0; S.panY = 0; zAnim = false;
    if (reduced.matches) { S.zoom = 1; } else { S.zoom = 0.86; zoomAlvo = 1; zAncora = [0, 0]; zAnim = true; zUlt = 0; var gl = $('#grafo-camada'); gl.classList.remove('entrando'); void gl.offsetWidth; gl.classList.add('entrando'); }
    mexeu(); salvaUrl();
  }
  function filtrou() { marcaAtivos(); filtroSuja = true; assinatura = null; camSuja = true; estSuja = true; pintSuja = true; agendar(); relayoutPend = true; clearTimeout(relayoutT); relayoutT = setTimeout(relayout, 220); }
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
      var cd = document.createElement('canvas'); cd.width = cd.height = 32; var dc = cd.getContext('2d'); dc.fillStyle = rgba(c, 1); dc.beginPath(); dc.moveTo(16, 0); dc.lineTo(32, 16); dc.lineTo(16, 32); dc.lineTo(0, 16); dc.closePath(); dc.fill();
      spr[v] = { core: core, coreD: cd, cor: c };
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
    if (!grade) { for (var q = 0; q < listaVis.length; q++) { listaVis[q].vis = false; listaVis[q].dr = false; } listaVis.length = 0; visN.length = 0; visB.length = 0; return 0; }
    var sc = scale(), hx = W / 2 + (S.panX - 0.5) * sc, hy = H / 2 + (S.panY - 0.5) * sc, h = 17, n = 0, i;
    for (i = 0; i < listaVis.length; i++) { listaVis[i].vis = false; listaVis[i].dr = false; }
    listaVis.length = 0; visN.length = 0; visB.length = 0;
    // janela inteira E painel, em coordenadas do painel: o conjunto visivel no painel (que filtra a tabela) nao pode depender da rolagem da pagina
    var cx0 = Math.min(0, -OX) - 4, cx1 = Math.max(W, CX1V - OX) + 4, cy0 = Math.min(0, -OY) - 4, cy1 = Math.max(H, VH - OY) + 4;
    var u0 = Math.max(0, Math.floor((cx0 - hx) / sc / CEL)), u1 = Math.min(NC - 1, Math.floor((cx1 - hx) / sc / CEL));
    var v0 = Math.max(0, Math.floor((cy0 - hy) / sc / CEL)), v1 = Math.min(NC - 1, Math.floor((cy1 - hy) / sc / CEL));
    for (var cy = v0; cy <= v1; cy++) for (var cx = u0; cx <= u1; cx++) {
      var cel = grade[cy * NC + cx]; if (!cel) continue;
      for (i = 0; i < cel.length; i++) {
        var s = cel[i], x = hx + s.u * sc, y = hy + s.v * sc;
        if (x < cx0 || x > cx1 || y < cy0 || y > cy1) continue;
        s.xy[0] = x; s.xy[1] = y; s.dr = true; s.vis = x >= 0 && x <= W && y >= 0 && y <= H; listaVis.push(s);
        if (s.vis) s.fo = 1; else { var dd = Math.max(0 - x, x - W, 0 - y, y - H); s.fo = dd >= 90 ? 0.62 : 0.62 + 0.38 * (1 - dd / 90); }   // fora do painel: um pouco mais tenue, em rampa (sem emenda)
        (s.st === 'nenhum' ? visN : visB).push(s);
        if (s.vis && s.on) { h = (Math.imul(h, 31) + s.idx + 1) | 0; n++; }
      }
    }
    if (visB.length > 1) {   // ordem de desenho por status (oficial, comunidade, gguf), em tempo linear
      var bk = [[], [], [], []], q2; for (q2 = 0; q2 < visB.length; q2++) bk[visB[q2].ord].push(visB[q2]);
      visB.length = 0; for (q2 = 0; q2 < 4; q2++) for (var q3 = 0; q3 < bk[q2].length; q3++) visB.push(bk[q2][q3]);
    }
    return h ^ (n << 20);
  }

  // ---------- campo estelar de fundo: extensao infinita e decorativa do ceu (nao e dado) ----------
  // Tiles procedurais pre-renderizados em canvas (uma pequena reserva de variantes); a variante de cada tile vem de um hash das
  // coordenadas (tx, ty), entao qualquer regiao do plano tem estrelas, sem borda e sem repeticao regular. Densidade constante em tela.
  var CAMPO = { T: 320, NV: 12, PAR: 0.45, pool: null, chave: '' };
  function hash2(a, b) { var h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; }
  function criarCampo() {
    var dpr = Math.min(devicePixelRatio || 1, 2), T = CAMPO.T, pool = [];
    for (var v = 0; v < CAMPO.NV; v++) {
      var cv = document.createElement('canvas'); cv.width = cv.height = Math.round(T * dpr); var c = cv.getContext('2d'); c.scale(dpr, dpr);
      var sd = hash2(v, 7919) || 1, rr = function () { sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0; return sd / 4294967296; };
      for (var i = 0; i < 52; i++) {
        var r = 0.5 + Math.pow(rr(), 3) * 0.7, a = 0.3 + rr() * 0.35, x = 2 + rr() * (T - 4), y = 2 + rr() * (T - 4);
        c.fillStyle = DK ? 'rgba(190,204,255,' + a * 0.8 + ')' : 'rgba(70,84,170,' + a * 0.7 + ')';
        c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill();
      }
      pool.push(cv);
    }
    CAMPO.pool = pool; CAMPO.chave = (DK ? 'd' : 'l') + dpr;
  }
  // desenha o campo em ctx ( ja com a escala do dpr ); ox/oy = deslocamento do campo (paralaxe)
  function desenharCampo(c, w, h, ox, oy) {
    if (!CAMPO.pool || CAMPO.chave !== (DK ? 'd' : 'l') + Math.min(devicePixelRatio || 1, 2)) criarCampo();
    var T = CAMPO.T, i0 = Math.floor(-ox / T), i1 = Math.floor((w - ox) / T), j0 = Math.floor(-oy / T), j1 = Math.floor((h - oy) / T), n = 0;
    for (var j = j0; j <= j1; j++) for (var i = i0; i <= i1; i++) { c.drawImage(CAMPO.pool[hash2(i, j) % CAMPO.NV], Math.round(i * T + ox), Math.round(j * T + oy), T, T); n++; }
    return n;
  }

  // relacoes entre publicadores (vinculo "relacionado"): linhas tenues na camada estatica, em qualquer agrupamento
  var relDe = {};
  REL.pares.forEach(function (p) { (relDe[p[0]] = relDe[p[0]] || []).push(p[1]); (relDe[p[1]] = relDe[p[1]] || []).push(p[0]); });
  function centroOn(pid, sc2, hx, hy) {   // centro, em tela, das estrelas acesas do publicador (null se nenhuma)
    var c = pubC[pid]; if (!c) return null; var u = 0, v = 0, n = 0;
    for (var i = 0; i < c.st.length; i++) if (c.st[i].on) { u += c.st[i].u; v += c.st[i].v; n++; }
    return n ? [hx + u / n * sc2, hy + v / n * sc2] : null;
  }
  function linhasRel(c, esc2, hx, hy, so, forte) {
    var R = 4, nl = 0;
    REL.pares.forEach(function (p) {
      if (so && p[0] !== so && p[1] !== so) return;
      var a = centroOn(p[0], esc2, hx, hy), b = centroOn(p[1], esc2, hx, hy); if (!a || !b) return;
      if ((a[0] < -OX - R && b[0] < -OX - R) || (a[0] > VW - OX + R && b[0] > VW - OX + R) || (a[1] < -OY - R && b[1] < -OY - R) || (a[1] > VH - OY + R && b[1] > VH - OY + R)) return;
      c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); nl++;
    });
    return nl;
  }
  // camada estatica: ligacoes e estrelas sem build, em bitmap proprio
  function renderEstatica() {
    var dk = DK, sc = Math.sqrt(S.zoom), l = lctx, dpr = canvas.width / VW, esc2 = scale();
    var hx = W / 2 + (S.panX - 0.5) * esc2, hy = H / 2 + (S.panY - 0.5) * esc2;
    l.setTransform(1, 0, 0, 1, 0, 0); l.clearRect(0, 0, layer.width, layer.height); l.setTransform(dpr, 0, 0, dpr, dpr * OX, dpr * OY);
    var n = 0, R = 4;
    l.lineWidth = 0.7;
    [['fam', dk ? 'rgba(215,221,255,.42)' : 'rgba(50,60,150,.5)'], ['outra', dk ? 'rgba(215,221,255,.16)' : 'rgba(50,60,150,.18)']].forEach(function (t2) {
      var lista = arestas[t2[0]]; l.strokeStyle = t2[1];
      for (var i = 0; i < lista.length; i++) {
        var e = lista[i]; if (S.zoom < 1.15 && e[2]) continue;
        var ax = hx + e[0].u * esc2, ay = hy + e[0].v * esc2, bx = hx + e[1].u * esc2, by = hy + e[1].v * esc2;
        var wx0 = -OX - R, wx1 = CX1V - OX + R, wy0 = -OY - R, wy1 = VH - OY + R;
        if (!((ax >= wx0 && ax <= wx1 && ay >= wy0 && ay <= wy1) || (bx >= wx0 && bx <= wx1 && by >= wy0 && by <= wy1) || (Math.min(ax, bx) < wx0 && Math.max(ax, bx) > wx1) || (Math.min(ay, by) < wy0 && Math.max(ay, by) > wy1))) continue;
        l.beginPath(); l.moveTo(ax, ay); l.lineTo(bx, by); l.stroke(); n++;   // um traco por ligacao (o alfa acumula nas ligacoes sobrepostas)
      }
    });
    if (CAM.id === 'modelos' && REL.disponivel && REL.pares.length) {   // relacionados: linha tracejada tenue entre as constelacoes dos publicadores
      l.setLineDash([3, 4]); l.lineWidth = 0.9; l.strokeStyle = dk ? 'rgba(215,221,255,.34)' : 'rgba(50,60,150,.36)'; l.beginPath(); STATS.rel = linhasRel(l, esc2, hx, hy); l.stroke(); l.setLineDash([]);
    } else STATS.rel = 0;
    STATS.linhas = n;
    if (modoBitmap) {   // nucleos das estrelas com build (cor por status), sem brilho
      for (var jb = 0; jb < visB.length; jb++) { var sb = visB[jb], spb = spr[sb.st], rb = sb.r * (0.85 + 0.15 * sc); l.globalAlpha = (sb.on ? 1 : 0.1) * sb.fo; if (sb.dia) { var rdb = rb * 1.2; l.drawImage(spb.coreD, sb.xy[0] - rdb, sb.xy[1] - rdb, 2 * rdb, 2 * rdb); } else l.drawImage(spb.core, sb.xy[0] - rb, sb.xy[1] - rb, 2 * rb, 2 * rb); }
      l.globalAlpha = 1;
    }
    var core = spr.nenhum.core, coreD = spr.nenhum.coreD, al = dk ? 0.5 : 0.6, peq = [[], [], [], [], [], [], []], c = spr.nenhum.cor, NIV = [1, 0.82, 0.64];
    for (var j = 0; j < visN.length; j++) {
      var s = visN[j], r = s.r * (0.85 + 0.15 * sc) * 0.8;
      var nv = s.fo > 0.9 ? 0 : s.fo > 0.76 ? 1 : 2;
      if (r < 1.5) { peq[(s.on ? 1 : 0) + 2 * nv].push(s.xy[0] - r, s.xy[1] - r, 2 * r); continue; }   // agregacao visual: ponto
      l.globalAlpha = al * (s.on ? 1 : 0.1) * s.fo; if (s.dia) { var rd = r * 1.2; l.drawImage(coreD, s.xy[0] - rd, s.xy[1] - rd, 2 * rd, 2 * rd); } else l.drawImage(core, s.xy[0] - r, s.xy[1] - r, 2 * r, 2 * r);
    }
    [[0, al * 0.1], [1, al], [2, al * 0.082], [3, al * 0.82], [4, al * 0.064], [5, al * 0.64]].forEach(function (g) { var arr = peq[g[0]]; if (!arr.length) return; l.globalAlpha = 1; l.fillStyle = rgba(c, g[1]); for (var q = 0; q < arr.length; q += 3) l.fillRect(arr[q], arr[q + 1], arr[q + 2], arr[q + 2]); });
    l.globalAlpha = 1;
    snap = { px: S.panX, py: S.panY, z: S.zoom, sc: esc2, cx: OX + W / 2, cy: OY + H / 2 }; ultRender = performance.now(); estSuja = false;
  }
  // mostra a camada estatica, transformada se a camera mudou desde o ultimo render
  function blitEstatica() {
    var dpr = canvas.width / VW, rw = Math.min(canvas.width, Math.ceil(CX1V * dpr) + 2);   // so a regiao que o grafo desenha (a coluna da direita cobre o resto)
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, rw, canvas.height); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    STATS.campo = desenharCampo(ctx, CX1V, VH, S.panX * scale() * CAMPO.PAR, S.panY * scale() * CAMPO.PAR);   // so decorativo: fora de hit-test, busca, filtros e contagens
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, CX1V, VH); ctx.clip(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    var k = scale() / snap.sc, cx = OX + W / 2, cy = OY + H / 2, tx = (S.panX - snap.px) * scale() + cx - k * snap.cx, ty = (S.panY - snap.py) * scale() + cy - k * snap.cy;
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * tx, dpr * ty); ctx.drawImage(layer, 0, 0, VW, VH); ctx.restore(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // camada de brilho: estrelas com build (cintilar) e marcas por cima
  function desenharBrilho() {
    var dk = DK, sc = Math.sqrt(S.zoom), sel = S.sel, busca = S.busca.trim() !== '', c = ctxB, i, s;
    var dprB = canvasB.width / VW; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, Math.min(canvasB.width, Math.ceil(CX1V * dprB) + 2), canvasB.height); c.setTransform(dprB, 0, 0, dprB, dprB * OX, dprB * OY);
    var calmo = reduced.matches || S.paused, leve = interagindo && visB.length > 2500;   // muitas estrelas durante o gesto: so os nucleos, sem brilho nem cintilar
    STATS.estrelas = listaVis.length;
    for (i = 0; i < (modoBitmap ? 0 : visB.length); i++) {
      s = visB[i];
      var v = s.st, x = s.xy[0], y = s.xy[1], a = (s.on ? 1 : 0.1) * s.fo, r = s.r * (0.85 + 0.15 * sc);
      var nfm = s.nf, forte = nfm >= 3 ? 1.7 : nfm === 2 ? 1.35 : 1, larg = nfm >= 3 ? 1.3 : nfm === 2 ? 1.15 : 1;   // mais formatos de build: mais brilho
      var tw = calmo || leve ? 1 : 0.75 + 0.25 * Math.sin(elapsed * 0.0024 + s.u * 40), gr = r * RAZAO[v] * larg, sp = spr[v];
      if (!leve) { c.globalAlpha = Math.min(1, ALFA[v] * a * tw * forte); c.drawImage(sp.glow, x - gr, y - gr, 2 * gr, 2 * gr); }
      c.globalAlpha = a; if (s.dia) { var rd = r * 1.2; c.drawImage(sp.coreD, x - rd, y - rd, 2 * rd, 2 * rd); } else c.drawImage(sp.core, x - r, y - r, 2 * r, 2 * r);
      if (nfm >= 2 && s.on && !leve) {   // aneis por sprite; pulso lento com 3 ou mais formatos (parado com movimento reduzido)
        var pu = nfm >= 3 && !calmo ? Math.sin(elapsed * 0.0016 + s.u * 10) : 0, ra = r * (nfm >= 3 ? 3.3 : 2.5) * (1 + 0.06 * pu);
        c.globalAlpha = Math.min(1, (nfm >= 3 ? 0.85 : 0.75) + 0.15 * pu) * s.fo; c.drawImage(sp[nfm >= 3 ? 'anel2' : 'anel1'], x - ra, y - ra, 2 * ra, 2 * ra);
      }
      if (v === 'oficial' && r > 2.6 && s.on) {
        c.globalAlpha = 1; c.strokeStyle = rgba(spr.oficial.cor, 0.6 * tw); c.lineWidth = 0.7; c.beginPath(); c.moveTo(x - r * 2.2, y); c.lineTo(x + r * 2.2, y); c.moveTo(x, y - r * 2.2); c.lineTo(x, y + r * 2.2); c.stroke();
      }
    }
    c.globalAlpha = 1;
    if (CAM.id === 'modelos' && S.agrupar === 'instituicao' && REL.disponivel) {   // vinculos "relacionado" (tenues) e sub-rotulos dos laboratorios (com zoom)
      var col2 = dk ? '215,221,255' : '50,60,150', sc2 = scale(), hx = W / 2 + (S.panX - 0.5) * sc2, hy = H / 2 + (S.panY - 0.5) * sc2;
      if (S.zoom >= 2.2) { c.font = '600 11px "Atkinson Hyperlegible Next",system-ui,sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = dk ? 'rgba(31,39,83,.85)' : 'rgba(255,255,255,.9)'; c.fillStyle = dk ? '#f4f6ff' : '#171c47';
        subRot.forEach(function (r) { var x2 = hx + r.u * sc2, y2 = hy + r.v * sc2 - 12; if (x2 < -OX || x2 > VW - OX || y2 < -OY || y2 > VH - OY) return; c.strokeText(r.nome, x2, y2); c.fillText(r.nome, x2, y2); }); }
    }
    if (CAM.id === 'benchmarks' && CC.datasets.length) {   // linha tenue do benchmark aos seus datasets: com zoom, ao passar o mouse ou ao selecionar
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
    if (CAM.id === 'modelos' && REL.disponivel && REL.pares.length) {   // foco (pairar/selecionar): linha forte e aneis tracejados nas estrelas dos publicadores relacionados
      var fs = hoverStar || (sel && sel.t === 'm' ? starOf[sel.id] : null), fp = fs ? fs.m.publicador : (sel && sel.t === 'p' ? sel.id : (sel && sel.t === 'g' && grupoPorId[sel.id] && grupoPorId[sel.id].pub ? grupoPorId[sel.id].pub.id : null));
      if (fp && relDe[fp]) {
        var sc3 = scale(), hx3 = W / 2 + (S.panX - 0.5) * sc3, hy3 = H / 2 + (S.panY - 0.5) * sc3;
        c.lineWidth = 1.5; c.strokeStyle = dk ? 'rgba(255,246,207,.75)' : 'rgba(44,51,160,.75)'; c.setLineDash([5, 3]); c.beginPath(); linhasRel(c, sc3, hx3, hy3, fp); c.stroke();
        c.lineWidth = 1.2; c.setLineDash([2, 3]); c.beginPath(); var nr = 0;
        relDe[fp].forEach(function (q) { var pc = pubC[q]; if (!pc) return; for (var k2 = 0; k2 < pc.st.length && nr < 150; k2++) { var q2 = pc.st[k2]; if (!q2.on || !q2.dr) continue; var rr2 = q2.r * (0.85 + 0.15 * sc) + 8; c.moveTo(q2.xy[0] + rr2, q2.xy[1]); c.arc(q2.xy[0], q2.xy[1], rr2, 0, 6.2832); nr++; } });
        c.stroke(); c.setLineDash([]);
      }
    }
    c.lineWidth = 0.8; c.strokeStyle = dk ? 'rgba(215,221,255,.45)' : 'rgba(50,60,150,.45)'; c.beginPath();   // linha-guia fina dos rotulos deslocados do lugar padrao
    for (i = 0; i < G.length; i++) { var gq = G[i]; if (!gq.hasAnt || !gq.lado || !gq.chv || gq.cull) continue; var lx0 = gq.ax + gq.chv[0], ly0 = gq.ay + gq.chv[1], lx1 = Math.max(lx0, Math.min(gq.ax, lx0 + gq.lw)), ly1 = Math.max(ly0, Math.min(gq.ay, ly0 + gq.lh)); c.moveTo(gq.ax, gq.ay); c.lineTo(lx1, ly1); }
    c.stroke();
    if (busca && sigDeAtualDiferente()) { c.strokeStyle = 'rgba(255,111,168,.95)'; c.lineWidth = 1.5; c.beginPath(); for (i = 0; i < listaVis.length; i++) { s = listaVis[i]; if (s.on) { var rb = s.r * (0.85 + 0.15 * sc) + 4; c.moveTo(s.xy[0] + rb, s.xy[1]); c.arc(s.xy[0], s.xy[1], rb, 0, 6.2832); } } c.stroke(); }
    if (sel && sel.t === 'g') {
      var gg = grupoPorId[sel.id]; if (gg) { c.strokeStyle = dk ? 'rgba(255,246,207,.7)' : 'rgba(44,51,160,.7)'; c.lineWidth = 1; c.beginPath(); gg.stars.forEach(function (q) { if (q.dr && q.on) { var rs = q.r * (0.85 + 0.15 * sc) + 3; c.moveTo(q.xy[0] + rs, q.xy[1]); c.arc(q.xy[0], q.xy[1], rs, 0, 6.2832); } }); c.stroke(); }
    }
    [sel && sel.t === 'm' ? starOf[sel.id] : null, hoverStar].forEach(function (q) {
      if (!q || !q.dr) return; var rs = q.r * (0.85 + 0.15 * sc) + 5; c.strokeStyle = dk ? '#fff6cf' : '#2c33a0'; c.lineWidth = 1.5; c.beginPath(); c.arc(q.xy[0], q.xy[1], rs, 0, 6.2832); c.stroke();
    });
  }

  var lastCampo = '', lastZoom = '';
  // a tabela filtrada pelas estrelas do painel so e recalculada com o gesto parado (140 ms ocioso): redesenhar 150 linhas a cada passo travava o arrasto
  function agendaTabela() {
    clearTimeout(tabelaT);
    tabelaT = setTimeout(function () {
      if (performance.now() < gestoAte) { agendaTabela(); return; }   // gesto do usuario em andamento
      S.noCirculo = listaVis.filter(function (s) { return s.vis && s.on; }).map(function (s) { return s.m; }); S.limite = 150; renderTabela();
    }, 140);
  }
  var gestoAte = 0, nomeCheio = false;
  function atualizarCamera() {
    var cheio = S.zoom >= 2 && CAM.id === 'modelos' && S.agrupar === 'instituicao';   // agrupamento por instituicao: com zoom, o rotulo mostra o nome completo
    if (cheio !== nomeCheio && G.length && G[0].nome_el) { nomeCheio = cheio; G.forEach(function (g) { if (g.inst && g.nome_el) g.nome_el.textContent = (cheio ? nomeDe(g.inst) : g.nome) + ' · ' + g.ms.length; }); medirRotulos(); }
    var sig = projetar(), sc = scale(), grande = G.length > 120;   // camadas com muitos grupos: so os rotulos visiveis existem no DOM
    G.forEach(function (g) {
      var px = W / 2 + (g.u - 0.5 + S.panX) * sc, py = H / 2 + (g.v - 0.5 + S.panY) * sc, ext = g.R * g.k * sc * 0.5, top = py + Math.max(0, ext - 14);
      var inside = px >= 6 - OX && px <= VW - OX - 6 && py >= 6 - OY && py <= VH - OY - 6, el = g.el, pnl = px >= 0 && px <= W && py >= 0 && py <= H;   // inside: na janela; pnl: no painel (area de interacao)
      g.px = px; g.py = top; g.inside = inside; if (pnl !== g.pnl) { g.pnl = pnl; el.classList.toggle('fora-painel', !pnl); }
      if (!grande && inside !== g.insideAnt) { g.insideAnt = inside; el.classList.toggle('out-of-field', !inside); el.setAttribute('aria-hidden', String(!inside)); el.tabIndex = inside ? 0 : -1; }
    });
    // rotulos sem colisao, dos maiores para os menores; layout estavel: quem ja tinha rotulo (e lado) o mantem enquanto couber,
    // so depois entram os novos, em ordem; em camadas grandes, no maximo 90. Sem isso, o conjunto trocava a cada passo de zoom e piscava.
    var placed = [];
    if (interagindo) {   // durante o gesto (zoom, pinca, botoes, arrasto): o layout dos rotulos fica congelado; so a ancora acompanha a estrela, por transform; fora da janela, so esconde
      G.forEach(function (g) {
        if (!g.hasAnt) return;
        var fora = g.px < -OX - g.lw - 30 || g.px > VW - OX + g.lw + 30 || g.py < -OY - 40 || g.py > VH - OY + 40;
        if (fora !== g.cull) { g.cull = fora; g.el.classList.toggle('cull', fora); }
        if (!fora) { var tr = 'translate(' + g.px + 'px,' + g.py + 'px) translate(-50%,-50%)'; if (tr !== g.trAnt) { g.trAnt = tr; g.el.style.transform = tr; } }
        // a ancora do rotulo (e da linha-guia) acompanha a camera: do proprio grupo ou, no rotulo composto, o centro dos grupos citados
        if (g.cl) { var sx = 0, sy = 0; g.cl.forEach(function (q) { sx += q.px; sy += q.py; }); g.ax = sx / g.cl.length; g.ay = sy / g.cl.length; } else { g.ax = g.px; g.ay = g.py; }
        if (g.chv && !fora) { var tl2 = 'translate(' + (g.chv[0] + g.ax - g.px) + 'px,' + (g.chv[1] - 11 + g.ay - g.py) + 'px)'; if (g.lx !== tl2) { g.lx = tl2; g.nome_el.style.transform = tl2; } }
      });
    } else {
    var tRot = performance.now();   // medicao do layout dos rotulos (STATS.rotMs)
    G.forEach(function (g) { if (g.cull) { g.cull = false; g.el.classList.remove('cull'); } });
    function tenta(g, ordem) {
      var w = g.lw, h = g.lh, x = g.ax, y = g.ay, ch = [[-w / 2, 12], [-w / 2, -h - 12], [14, -h / 2], [-w - 14, -h / 2], [14, 12], [-w - 14, 12], [14, -h - 12], [-w - 14, -h - 12]];
      for (var j = 0; j < ordem.length; j++) {
        var c = ch[ordem[j]], bx = x + c[0], by = y + c[1];
        var fits = bx > 3 - OX && bx + w < VW - OX - 3 && by > 3 - OY && by + h < VH - OY - 3 && !placed.some(function (q) { return bx < q.x + q.w + 3 && bx + w + 3 > q.x && by < q.y + q.h + 3 && by + h + 3 > q.y; });
        if (fits) { placed.push({ x: bx, y: by, w: w, h: h }); g.lado = ordem[j]; g.chv = c; return true; }
      }
      if (g.cl) for (var rr = 0; rr < 5; rr++) for (var aa = 0; aa < 12; aa++) {   // rotulo composto sem lugar nas 8 posicoes: afasta-se em aneis, com linha-guia
        var d = [24, 48, 80, 120, 170][rr], ang = aa * 0.5236 + 1.5708, c2 = [Math.cos(ang) * (w / 2 + d) - w / 2, Math.sin(ang) * (h / 2 + d) - h / 2], bx2 = x + c2[0], by2 = y + c2[1];
        var fits2 = bx2 > 3 - OX && bx2 + w < VW - OX - 3 && by2 > 3 - OY && by2 + h < VH - OY - 3 && !placed.some(function (q) { return bx2 < q.x + q.w + 3 && bx2 + w + 3 > q.x && by2 < q.y + q.h + 3 && by2 + h + 3 > q.y; });
        if (fits2) { placed.push({ x: bx2, y: by2, w: w, h: h }); g.lado = 1; g.chv = c2; return true; }
      }
      return false;
    }
    function nomeCurto(n) {   // nome enxuto para o rotulo composto: primeira parte ate ~20 caracteres, sem terminar em artigo ou preposicao
      var w = n.split(/\s+-\s+|\s*\(/)[0].split(/\s+/), o = w[0];
      for (var q = 1; q < w.length && (o + ' ' + w[q]).length <= 20; q++) o += ' ' + w[q];
      return o.replace(/\s+(de|da|do|dos|das|em|e|of|the|for|and)$/i, '');
    }
    // rotulo composto: grupos ligados tao perto que os rotulos colidiriam mostram UM rotulo combinado, no centro do aglomerado, ate o zoom separa-los
    cvR = cvR || (cvR = document.createElement('canvas').getContext('2d')); cvR.font = '500 10px "Atkinson Hyperlegible Next",system-ui,sans-serif';
    G.forEach(function (g) { g.ax = g.px; g.ay = g.py; g.cl = null; g.clIds = null; if (g.lw0 === undefined) g.lw0 = Math.ceil(cvR.measureText(g.nome + ' · ' + g.ms.length).width * 1.08) + 14 + (g.pub && g.pub.natureza === 'independente' ? 12 : 0); g.lw = g.lw0; });
    var cand = []; ORDR.forEach(function (gi) { var g = G[gi]; if (g && g.inside && nbrG[g.id] && cand.length < 120) cand.push(g); });
    var pai = {}; cand.forEach(function (g) { pai[g.id] = g.id; });
    var raiz = function (x) { while (pai[x] !== x) { pai[x] = pai[pai[x]]; x = pai[x]; } return x; };
    cand.forEach(function (a) { cand.forEach(function (c) {
      if (a.id >= c.id || !(nbrG[a.id] && nbrG[a.id][c.id])) return;   // so grupos ligados entre si
      if (a.px - a.lw / 2 - 4 < c.px + c.lw / 2 && a.px + a.lw / 2 + 4 > c.px - c.lw / 2 && a.py - 4 < c.py + c.lh + 14 && a.py + a.lh + 14 + 4 > c.py) pai[raiz(a.id)] = raiz(c.id);
    }); });
    var clusters = {}; cand.forEach(function (g) { (clusters[raiz(g.id)] = clusters[raiz(g.id)] || []).push(g); });
    var emCluster = {};
    Object.keys(clusters).forEach(function (k) {
      var m = clusters[k]; if (m.length < 2) return;
      m.sort(function (a, b) { return ORDR.indexOf(G.indexOf(a)) - ORDR.indexOf(G.indexOf(b)); });
      var lid = m[0], nomes = m.slice(0, 3).map(function (g) { return nomeCurto(g.nome); }).join(' · ') + (m.length > 3 ? ' +' + (m.length - 3) : '');
      lid.cl = m; lid.clIds = m.map(function (g) { return g.id; }); lid.ax = m.reduce(function (a, g) { return a + g.px; }, 0) / m.length; lid.ay = m.reduce(function (a, g) { return a + g.py; }, 0) / m.length;
      lid.txtComb = nomes; lid.lw = Math.ceil(cvR.measureText(nomes).width * 1.08) + 14 + (lid.pub && lid.pub.natureza === 'independente' ? 12 : 0);
      m.forEach(function (g) { if (g !== lid) emCluster[g.id] = lid; });
    });
    G.forEach(function (g) { var t0 = g.cl ? g.txtComb : g.nome + ' · ' + g.ms.length; if (g.txtAtual === t0) return; var antes = g.txtAtual; g.txtAtual = t0;
      if (antes === undefined || !g.hasAnt) { g.nome_el.textContent = t0; return; }
      clearTimeout(g.txTimer); g.nome_el.style.opacity = '0'; g.txTimer = setTimeout(function () { g.nome_el.textContent = g.txtAtual; g.nome_el.style.opacity = ''; }, 150);   // crossfade ao juntar/separar o rotulo composto
    });
    var tem = new Array(G.length), ORD = [0, 1, 2, 3, 4, 5, 6, 7].map(function (a) { return [a].concat([0, 1, 2, 3, 4, 5, 6, 7].filter(function (x) { return x !== a; })); });
    // ordem: os 30 mais importantes, depois os rotulos compostos (todo par ligado precisa de um rotulo), depois o resto
    ORDR.forEach(function (gi) { var g = G[gi]; if (g && g.t30 && !emCluster[g.id] && g.inside && (!grande || placed.length < 90)) tem[gi] = tenta(g, ORD[g.hasAnt ? (g.lado || 0) : 0]); });
    ORDR.forEach(function (gi) { var g = G[gi]; if (g && g.cl && tem[gi] === undefined && g.inside) tem[gi] = tenta(g, ORD[g.hasAnt ? (g.lado || 0) : 0]); });
    ORDR.forEach(function (gi) { var g = G[gi]; if (g && !emCluster[g.id] && tem[gi] === undefined && g.hasAnt && g.faixa === 0 && g.inside && (!grande || placed.length < 90)) tem[gi] = tenta(g, ORD[g.lado || 0]); });
    ORDR.forEach(function (gi) { var g = G[gi]; if (g && emCluster[g.id]) { tem[gi] = false; return; } if (g && tem[gi] === undefined && g.inside && (!grande || placed.length < 90)) tem[gi] = tenta(g, ORD[g.hasAnt ? (g.lado || 0) : 0]); });
    G.forEach(function (g, gi) {
      var has = !!tem[gi], el = g.el;
      if (has) { var tl = 'translate(' + (g.chv[0] + g.ax - g.px) + 'px,' + (g.chv[1] - 11 + g.ay - g.py) + 'px)'; if (g.lx !== tl) { g.nome_el.classList.toggle('mov', !!(g.hasAnt && g.lx)); g.nome_el.style.transform = g.lx = tl; } }
      if (has !== g.hasAnt) {
        g.hasAnt = has; el.classList.toggle('has-label', has); if (!has) { g.nome_el.classList.remove('mov'); g.lx = null; }
        if (grande) { el.classList.toggle('nolabel', !has); el.tabIndex = has ? 0 : -1; el.setAttribute('aria-hidden', String(!has)); }
      }
      if (!grande || has) { var tr = 'translate(' + g.px + 'px,' + g.py + 'px) translate(-50%,-50%)'; if (tr !== g.trAnt) { g.trAnt = tr; el.style.transform = tr; } }
    });
    STATS.rotMs = performance.now() - tRot;
    }
    if (sig !== assinatura) {
      assinatura = sig; clearTimeout(tabelaT);
      agendaTabela();
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
      tip.style.left = Math.max(4, Math.min(OX + p[0] + 14, innerWidth - 240)) + 'px'; tip.style.top = Math.max(4, OY + p[1] + 14) + 'px';
    } else tip.hidden = true;
  }

  function loop(now) {
    frame = 0;
    if (!spr.nenhum) criarSprites();
    if (zAnim) passoZoom(now);
    var dt = Math.min(now - (last || now), 80);
    var anima = !document.hidden && visivel && !S.paused && !reduced.matches, desenhou = false;
    if (filtroSuja) refiltrar();
    var bmp = interagindo && visB.length > 2500;
    if (bmp !== modoBitmap) { modoBitmap = bmp; estSuja = true; pintSuja = true; }
    if (camSuja) {
      atualizarCamera(); camSuja = false;
      if (interagindo) {   // durante arrasto/zoom: so transforma o bitmap; redesenha a cada 100 ms (400 ms com muitas estrelas)
        if (estSuja || !snap || now - ultRender >= (modoBitmap ? 400 : 100)) renderEstatica();
        blitEstatica();
      } else { renderEstatica(); blitEstatica(); }
      pintSuja = true;
    }
    if (interagindo && now - ultInteracao > 170) { interagindo = false; estSuja = true; camSuja = true; }
    if (estSuja && !interagindo && !camSuja) { renderEstatica(); blitEstatica(); }
    if (hoverPos) atualizarHover();
    if (pintSuja) { if (anima && now - last >= 40) { elapsed += dt; last = now; } else if (!last) last = now; desenharBrilho(); pintSuja = false; desenhou = true; }
    else if (anima && now - last >= 40) { elapsed += dt; last = now; desenharBrilho(); desenhou = true; }
    if (anima || camSuja || pintSuja || interagindo || estSuja) agendar();
  }
  // muitas estrelas durante o gesto: os nucleos das estrelas com build entram no bitmap da camada estatica (transformado a cada quadro, barato) e a camada de brilho
  // nao redesenha milhares de sprites por quadro; ao fim do gesto volta o desenho completo (brilho, cintilar, aneis)
  var modoBitmap = false;
  var layerEl = $('#grafo-camada'), rotEl = $('#sky-points');
  function medirPainel() {   // posicao do painel na janela; devolve se mudou
    var b = stage.getBoundingClientRect(), stg = $('.sky-stage').getBoundingClientRect(), ty = (innerWidth > 1050 && stg.top < 86) ? 86 + (b.top - stg.top) : b.top;   // no fim da pagina o painel sticky solta e sobe: o grafo continua fixo atras do conteudo, na posicao do painel fixo
    CX1V = VW;   // o grafo e o fundo estelar cobrem a janela inteira (a coluna da direita e semitransparente: nada de regiao nao desenhada)
    var mud = b.left !== OX || ty !== OY || b.width !== W || b.height !== H; rectEst = b; OX = b.left; OY = ty; W = b.width || 1; H = b.height || 1; RAD = Math.min(W, H) / 2 - 8;
    rotEl.style.left = OX + 'px'; rotEl.style.top = OY + 'px'; rotEl.style.width = W + 'px'; rotEl.style.height = H + 'px'; return mud;
  }
  function resize() {
    VW = innerWidth; VH = innerHeight; medirPainel();
    // o grafo ocupa a janela inteira: em janelas grandes a densidade de pixels e limitada (~4,5 Mpx por camada), para o desenho e a composicao nao pesarem
    var dpr = Math.min(devicePixelRatio || 1, 2, Math.max(1, Math.sqrt(4.5e6 / (VW * VH))));
    canvas.width = canvasB.width = layer.width = Math.round(VW * dpr); canvas.height = canvasB.height = layer.height = Math.round(VH * dpr);
    [canvas, canvasB].forEach(function (c) { c.style.width = VW + 'px'; c.style.height = VH + 'px'; });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctxB.setTransform(dpr, 0, 0, dpr, 0, 0);
    criarSprites(); estSuja = true; snap = null; posicionar();
  }
  new ResizeObserver(resize).observe(stage);
  addEventListener('resize', function () { resize(); }, { passive: true });
  addEventListener('scroll', function () { rectEst = null; if (medirPainel()) { ultInteracao = performance.now(); interagindo = true; posicionar(); } }, { passive: true });   // o painel se moveu na janela: o grafo acompanha
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
      if (S.agrupar === 'familia' || S.agrupar === 'instituicao') p.set('agrupar', S.agrupar); else p.delete('agrupar');
      if (S.tarefa) p.set('tarefa', S.tarefa); else p.delete('tarefa');
      if (S.papel !== 'todos') p.set('papel', S.papel); else p.delete('papel');
      if (S.mostrarExp) p.set('exp', '1'); else p.delete('exp');
      if (S.recorte) p.set('recorte', '1'); else p.delete('recorte');
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
    drag = { x: e.clientX, y: e.clientY }; moved = 0; try { stage.setPointerCapture(e.pointerId); } catch (x) {} stage.classList.add('is-dragging');
    // durante o arrasto o documento inteiro nao seleciona texto (so durante o gesto) e o cursor segue 'grabbing' mesmo fora do painel
    document.documentElement.classList.add('arrastando-grafo'); try { var sel0 = getSelection(); if (sel0 && sel0.rangeCount) sel0.removeAllRanges(); } catch (x) {}
    e.preventDefault();
  }, { passive: false });
  ['selectstart', 'dragstart'].forEach(function (ev) { document.addEventListener(ev, function (e) { if (drag) e.preventDefault(); }, true); });
  stage.addEventListener('lostpointercapture', function () { fim(null); });
  addEventListener('blur', function () { fim(null); }); document.addEventListener('visibilitychange', function () { if (document.hidden) fim(null); });
  stage.addEventListener('pointermove', function (e) {
    var b = rectEst || (rectEst = stage.getBoundingClientRect());
    if (drag) {
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved += Math.abs(dx) + Math.abs(dy);
      S.panX += dx / scale(); S.panY += dy / scale(); drag = { x: e.clientX, y: e.clientY }; gestoAte = performance.now() + 200; mexeu(); return;
    }
    hoverPos = [e.clientX - OX, e.clientY - OY]; agendar();   // hit-test no proximo quadro (um por quadro)
  }, { passive: true });
  function fim(e) {
    if (!drag) return;
    var clique = moved < 5; drag = null; stage.classList.remove('is-dragging'); document.documentElement.classList.remove('arrastando-grafo'); salvaUrl();
    if (clique && e && e.type === 'pointerup') {
      var b = rectEst || (rectEst = stage.getBoundingClientRect()), s = achar(e.clientX - OX, e.clientY - OY);
      if (s) selecionar({ t: 'm', id: s.m.id }, stage);
      else { var px = e.clientX - OX, py = e.clientY - OY, gg = null; G.forEach(function (g) { if (!gg && g.hasAnt && g.pnl && g.chv && ((px >= g.ax + g.chv[0] && px <= g.ax + g.chv[0] + g.lw && py >= g.ay + g.chv[1] && py <= g.ay + g.chv[1] + g.lh) || Math.hypot(px - g.px, py - g.py) < 12)) gg = g; }); if (gg) selecionar({ t: 'g', id: gg.id }, gg.el); }   // rotulos ficam atras do conteudo: o clique chega pelo painel
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
    gestoAte = performance.now() + 250; e.preventDefault();   // com o ponteiro no painel a roda e sempre do grafo, tambem no limite do zoom (nunca rola a pagina por tras)
    if (alvo === base) return;
    var b = rectEst || (rectEst = stage.getBoundingClientRect());
    zoomAlvo = alvo; zAncora = [e.clientX - OX - W / 2, e.clientY - OY - H / 2]; zAnim = true; zUlt = 0; mexeu();
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
  var drawer = $('#drawer'), scrim = $('#scrim'), DR = null;
  function selecionar(sel, from) { DR.abrir(sel, from); }   // clique na tabela, no grafo ou no link do item: o modulo drawer.js monta e cuida do foco
  function setSel(sel) { S.sel = sel; G.forEach(function (g) { g.el.setAttribute('aria-pressed', String(!!sel && sel.t === 'g' && sel.id === g.id)); }); renderTabelaSel(); paint(); }
  function limparSel() { S.sel = null; G.forEach(function (g) { g.el.setAttribute('aria-pressed', 'false'); }); renderTabelaSel(); paint(); }
  function fecharDrawer() { if (DR) DR.fechar(); }
  function renderDrawer() { if (DR) DR.atualizar(); }
  // natureza de publicador pessoa com instituicao: "Afiliado(a) a <instituicao>" (natureza_rotulo/afiliado_a do contrato 1.1)
  var natRot = function (p) { return p && p.natureza_rotulo === 'afiliada' ? 'afiliada' : (p ? p.natureza : ''); };
  function natTxt(p) {
    if (!p) return '';
    if (natRot(p) !== 'afiliada') return t(p.natureza);
    var nomes = (p.afiliado_a || []).map(function (id) { var i = REL.instBy[id]; return i ? (i.sigla || i.nome) : id; });
    return t('afiliada_a') + (nomes.length ? ' ' + nomes.join(', ') : '');
  }
  var paisNome = function (c) { var k = 'pais_' + c; return T[S.lang][k] || c; };
  var nomeLab = function (id) { var l = REL.labBy[id]; return l ? (l.sigla ? l.sigla + ' · ' + nomeDe(l) : nomeDe(l)) + (l.pais ? ' (' + l.pais + ')' : '') : id; };
  var nomeInstFull = function (id) { var i = REL.instBy[id]; return i ? (i.sigla ? i.sigla + ' · ' + nomeDe(i) : nomeDe(i)) + (i.pais ? ' (' + i.pais + ')' : '') : id; };
  DR = criarDrawer({
    S: S, D: D, root: drawer, scrim: scrim, esc: esc, nf: nf, t: t, tipoFonte: tipoFonte, seguro: seguro, fmtB: fmtB, nomeDe: nomeDe, pubNome: pubNome, paisNome: paisNome, natTxt: natTxt,
    pubBy: pubBy, modBy: modBy, famNome: famNome, relDe: relDe, REL: REL, dsBy: dsBy, bmBy: bmBy, FORMATOS: FORMATOS, fmtNome: fmtNome, PARTES: PARTES, viaOf: viaOf, clsDataset: clsDataset, clsBench: clsBench, rotTipo: rotTipo,
    CAM: function () { return CAM; }, tab: function () { return S.tab; }, grupoPorId: function (id) { return grupoPorId[id]; }, portadorHtml: portadorHtml,
    carregarParte: carregarParte, aplicarDetalhes: aplicarDetalhes, setSel: setSel, limparSel: limparSel, trocarTab: trocarTab,
    outroAberto: function () { var gv = $('#gaveta-filtros'); return !!(gv && gv.classList.contains('on')); }
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
  // a caixa da tabela tem altura fixa e rolagem interna; o recorte pode mudar com zoom/pan, a caixa nao. O scrollTop so volta ao topo se o recorte mudou de fato.
  var rolEl = $('.home-average-scroll'), sigTab = '';
  function renderTabela() {
    var st0 = rolEl.scrollTop; renderTabelaIn();
    if (sigTab === rolEl.dataset.sig) rolEl.scrollTop = st0; else { rolEl.scrollTop = 0; sigTab = rolEl.dataset.sig; }
  }
  function renderTabelaIn() {
    var ms = ordenados(), cols = CAM.cols;
    $('#tb').dataset.camada = CAM.id;
    $('#tb thead').innerHTML = '<tr>' + cols.map(function (c) { return '<th scope="col" aria-sort="' + (S.sort.k === c.k ? (S.sort.d > 0 ? 'ascending' : 'descending') : 'none') + '"><button type="button" data-sort="' + c.k + '">' + t(c.rot) + '</button></th>'; }).join('') + '</tr>';
    rolEl.dataset.sig = S.tab + ':' + sigDe(ms);
    var mostrar = ms.slice(0, S.limite);
    $('#tb tbody').innerHTML = mostrar.length ? mostrar.map(function (m) {
      return '<tr tabindex="0" data-id="' + esc(m.id) + '"' + (S.sel && S.sel.t === 'm' && S.sel.id === m.id ? ' class="is-sel"' : '') + '>' + cols.map(function (c) { return c.td(m); }).join('') + '</tr>';
    }).join('') : '<tr><td colspan="' + cols.length + '">' + t(S.tab === 'modelos' ? 'sem_itens' : 'sem_itens_' + S.tab) + '</td></tr>';
    var more = $('#mais'); if (more) more.remove();
    if (ms.length > S.limite) { var b = document.createElement('button'); b.id = 'mais'; b.className = 'more'; b.type = 'button'; b.textContent = t('mais') + ' (' + (ms.length - S.limite) + ')'; $('.home-average-scroll').appendChild(b); }
    if (CAM.id === 'modelos') {
      var c = { n: ms.length, nat: 0, gg: 0, no: 0 }; ms.forEach(function (m) { m.via === 'nativo' ? c.nat++ : m.via === 'gguf' ? c.gg++ : c.no++; });
      $('#resumo-recorte').textContent = nf(c.n) + ' ' + t('recorte') + ' · ' + nf(c.nat) + ' ' + t('so_nativo') + ' · ' + nf(c.gg) + ' ' + t('nativo_gguf') + ' · ' + nf(c.no) + ' ' + t('semb') + (expOcultos() ? ' · ' + nf(expOcultos()) + ' ' + t('exp_n_ocultos') : '') + (S.recorte && MF.rec.disponivel ? ' · ' + nf(ms.filter(MF.rec.ehRec).length) + ' ' + t('rec_mais') : '');
    } else $('#resumo-recorte').textContent = nf(ms.length) + ' ' + t(CAM.recorte) + ' ' + t('de') + ' ' + nf(CAM.itens().length);
    renderBuscaInst(ms); hidratarAvatares();
  }
  // quando a busca casa com uma instituicao ou laboratorio: etiqueta com a contagem de modelos e atalho para filtrar por ela
  function renderBuscaInst(ms) {
    var el = $('#busca-inst'), tk = tokensMemo(S.busca), h = '';
    if (CAM.id === 'modelos' && REL.disponivel && tk.length && !S.inst && !S.lab) {
      var achados = REL.inst.filter(function (i) { return contem(entTxt(i), tk); }).map(function (i) { return { k: 'inst', e: i, n: ms.filter(function (m) { return m.insts.indexOf(i.id) >= 0; }).length }; })
        .concat(REL.lab.filter(function (l) { return contem(entTxt(l), tk); }).map(function (l) { return { k: 'lab', e: l, n: ms.filter(function (m) { return m.labsM.indexOf(l.id) >= 0; }).length }; }));
      h = achados.slice(0, 3).map(function (a) {
        var nome = a.e.sigla || nomeDe(a.e);
        return '<span class="busca-inst-i">' + nf(a.n) + ' ' + t('busca_inst') + ' <b>' + esc(nome) + '</b> (' + t(a.k === 'inst' ? 'tit_inst' : 'v_lab') + ')' + (a.k === 'inst' ? ' <button type="button" class="text-button" data-filtrar-inst="' + esc(a.e.id) + '">' + t('filtrar_inst') + '</button>' : '') + '</span>';
      }).join(' ');
    }
    el.innerHTML = h; el.hidden = !h;
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-filtrar-inst]'); if (!b) return;
    S.busca = ''; $('#busca').value = ''; fecharDrawer(); var sel = $('#f-inst'); sel.value = b.dataset.filtrarInst; sel.dispatchEvent(new Event('change'));
  });
  function renderTabelaSel() { document.querySelectorAll('#tb tr.is-sel').forEach(function (r) { r.classList.remove('is-sel'); }); if (S.sel && S.sel.t === 'm') { var r = $('#tb tr[data-id="' + CSS.escape(S.sel.id) + '"]'); if (r) r.classList.add('is-sel'); } }
  $('#tb').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-sort]'); if (b) { var k = b.dataset.sort; S.sort.d = S.sort.k === k ? -S.sort.d : 1; S.sort.k = k; renderTabela(); return; }
    var tr = e.target.closest('tr[data-id]'); if (tr && !e.target.closest('a')) selecionar({ t: 'm', id: tr.dataset.id }, tr);
  });
  $('#tb').addEventListener('keydown', function (e) { var tr = e.target.closest && e.target.closest('tr[data-id]'); if (tr && e.key === 'Enter') selecionar({ t: 'm', id: tr.dataset.id }, tr); });
  $('.home-average-scroll').addEventListener('click', function (e) { if (e.target.id === 'mais') { S.limite += 150; renderTabela(); } });

  // ---------- resumo, metodo, textos ----------
  function contarEscopo(ms) { var c = { n: ms.length, nat: 0, gg: 0, no: 0 }; ms.forEach(function (m) { m.via === 'nativo' ? c.nat++ : m.via === 'gguf' ? c.gg++ : c.no++; }); return c; }
  function contarM(ms) { var c = { modelos: ms.length, so_nativo: 0, nativo_mais_gguf: 0 }; ms.forEach(function (m) { if (m.via === 'nativo') { c.so_nativo++; c.nativo_mais_gguf++; } else if (m.via === 'gguf') c.nativo_mais_gguf++; }); return c; }
  function maiorBR() {
    var f = D.foto.sem_maior_publicador; if (f && f.id) return { id: f.id, n: f.modelos };
    var cnt = {}; D.modelos.forEach(function (m) { if (m.escopo === 'br') cnt[m.publicador] = (cnt[m.publicador] || 0) + 1; });
    var id = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; })[0]; return id ? { id: id, n: cnt[id] } : null;
  }
  function capaCont(fam, sem, bruto) {   // usa foto.por_familia_tarefa e foto.sem_maior_publicador quando existem; senao, calcula dos modelos. Com experimentais ocultos, calcula dos modelos (bruto: ignora o filtro)
    var F = D.foto, mb = maiorBR();
    if (MF.exp.disponivel && !S.mostrarExp && !bruto) return contarM(D.modelos.filter(function (m) { return m.escopo === 'br' && m._mat !== 'e' && (!fam || m.ftar === fam) && (!sem || !mb || m.publicador !== mb.id); }));
    if (fam && F.por_familia_tarefa && F.por_familia_tarefa[fam] && F.por_familia_tarefa[fam][sem ? 'brasil_sem_maior' : 'brasil']) return F.por_familia_tarefa[fam][sem ? 'brasil_sem_maior' : 'brasil'];
    if (!fam && sem && F.sem_maior_publicador && F.sem_maior_publicador.brasil) return F.sem_maior_publicador.brasil;
    if (!fam && !sem && F.brasil && F.brasil.modelos) return F.brasil;
    return contarM(D.modelos.filter(function (m) { return m.escopo === 'br' && (!fam || m.ftar === fam) && (!sem || !mb || m.publicador !== mb.id); }));
  }
  // Experimentais ocultos: numeros do Brasil e do mundo saem dos modelos exibidos; a nota do maior publicador diz quantos dos seus modelos ficaram de fora
  var expOculto = function () { return MF.exp.disponivel && !S.mostrarExp; };
  function notaMaior(mb) {
    if (!mb) return '';
    var tot = capaCont('', false, true).modelos;
    if (!expOculto()) return t('capa_nota').replace('{p}', pubNome(mb.id)).replace('{x}', nf(Math.round(100 * mb.n / Math.max(1, tot))));
    var vis = capaCont('', false).modelos, pv = D.modelos.filter(function (m) { return m.publicador === mb.id && m._mat !== 'e'; }).length;
    return t('capa_exp_nota').replace('{p}', pubNome(mb.id)).replace('{x}', nf(Math.round(100 * pv / Math.max(1, vis)))).replace('{a}', nf(pv)).replace('{b}', nf(vis)).replace('{e}', nf(mb.n - pv)).replace('{c}', nf(mb.n));
  }
  function renderCapa() {
    var el = $('#capa'); el.hidden = CAM.id !== 'modelos'; if (el.hidden) return;
    var mb = maiorBR(), sem = S.semMaior && !!mb, c = capaCont('', sem), g = capaCont('gerador', sem), k = capaCont('codificador', sem), br = capaCont('', sem, true);
    var rot = t('capa_br'), cls = '';
    if (MF.exp.disponivel) { cls = ' cont'; rot += ' <b>' + (expOculto() ? nf(c.modelos) + ' ' + t('de') + ' ' + nf(br.modelos) + '</b>, ' + nf(br.modelos - c.modelos) + ' ' + t('exp_n_ocultos') : nf(br.modelos) + '</b>, ' + t('exp_visiveis_nota')); }
    el.innerHTML = '<div class="capa-topo"><span class="capa-rot' + cls + '">' + rot + '</span>' + (mb ? '<span class="segmented" role="group" aria-label="' + esc(t('capa_br')) + '"><button type="button" data-sem="0" aria-pressed="' + (!sem) + '">' + t('capa_todos') + '</button><button type="button" data-sem="1" aria-pressed="' + sem + '">' + t('capa_sem') + '</button></span>' : '') + '</div>' +
      '<div class="capa-nums"><div><strong>' + nf(c.so_nativo) + ' ' + t('de') + ' ' + nf(c.modelos) + '</strong><span>' + t('capa_nativo') + '</span></div><div><strong>' + nf(c.nativo_mais_gguf - c.so_nativo) + '</strong><span>' + t('capa_gguf') + '</span></div>' +
      '<div><strong>' + nf(g.so_nativo) + ' ' + t('de') + ' ' + nf(g.modelos) + '</strong><span>' + t('capa_ger') + '</span></div><div><strong>' + nf(k.so_nativo) + ' ' + t('de') + ' ' + nf(k.modelos) + '</strong><span>' + t('capa_cod') + '</span></div></div>' +
      (mb ? '<p class="capa-nota">' + esc(notaMaior(mb)) + '</p>' : '');
  }
  $('#capa').addEventListener('click', function (e) { var b = e.target.closest('button[data-sem]'); if (!b) return; S.semMaior = b.dataset.sem === '1'; renderCapa(); renderFoto(); });
  function renderFoto() {
    var mbx = maiorBR(), br = capaCont('', S.semMaior && !!mbx), mu = expOculto() ? contarM(D.modelos.filter(function (m) { return m.escopo === 'mundo' && m._mat !== 'e' && m.recorte_pt !== true; })) : D.foto.mundo, pn = D.foto.publicadores.brasil_por_natureza || {}, cd = D.foto.candidatos || {};
    $('#foto').innerHTML =
      '<div><span>' + t('inv_br') + '</span><strong>' + nf(br.so_nativo) + ' ' + t('de') + ' ' + nf(br.modelos) + '</strong><p>' + t('inv_br_p') + ' <b>' + nf(br.nativo_mais_gguf - br.so_nativo) + '</b></p></div>' +
      '<div><span>' + t('inv_mu') + '</span><strong>' + nf(mu.so_nativo) + ' ' + t('de') + ' ' + nf(mu.modelos) + '</strong><p>' + t('inv_br_p') + ' <b>' + nf(mu.nativo_mais_gguf - mu.so_nativo) + '</b></p>' + (S.recorte && MF.rec.disponivel ? '<p class="rec-n">+ ' + nf(MF.rec.n) + ' ' + t('rec_mais') + (D.foto.recorte_pt ? ': ' + nf(D.foto.recorte_pt.so_nativo) + ' ' + t('rec_n_rodam') : '') + '</p>' : '') + '</div>' +
      '<div><span>' + t('inv_pub') + '</span><strong>' + nf(D.foto.publicadores.brasil) + '</strong><p>' + nf(pn.independente || 0) + ' / ' + nf(pn.instituicao || 0) + ' / ' + nf(pn.empresa || 0) + (pn.nao_classificada ? ' / ' + nf(pn.nao_classificada) : '') + ' ' + t('inv_pub_p') + ' ' + nf(cd.descartados || 0) + ' ' + t('descartados') + '.</p></div>';
    $('#caveat').textContent = t('aviso') + (expOculto() ? ' ' + t('aviso_exp').replace('{n}', nf(D.modelos.filter(function (m) { return m._mat === 'e' && (S.recorte || m.recorte_pt !== true); }).length)) : '');
    $('#rodape').textContent = t('rodape') + ' ' + D.meta.coletado_em + ' · ' + nf(D.modelos.length - (MF.rec.disponivel && !S.recorte ? MF.rec.n : 0)) + ' ' + t('modelos') + ' · ' + nf(D.publicadores.length) + (S.lang === 'pt' ? ' publicadores' : ' publishers');
    $('#metodo-corpo').innerHTML = [1, 2, 3].concat(MF.exp.disponivel ? [4] : []).map(function (i) { return '<div><h3>' + t('m' + i + '_t') + '</h3><p>' + t('m' + i + '_a') + '</p><p>' + t('m' + i + '_b') + '</p><p>' + t('m' + i + '_c') + '</p></div>'; }).join('');
    renderLegenda(); renderCapa();
  }
  function renderLegenda() {
    $('#legenda').innerHTML = CAM.legenda.map(function (x) { return '<span><i class="' + x[2] + '"></i>' + t(x[1]) + '</span>'; }).join('') +
      (CAM.id === 'modelos' ? '<span class="leg-forma"><i class="f-c"></i>' + t('ta_gerador') + ' <i class="f-d"></i>' + t('ta_codificador') + '</span>' : '') +
      (CAM.id === 'modelos' && REL.disponivel && REL.pares.length ? '<span class="leg-rel"><i></i>' + t('leg_rel') + ' · <i class="an"></i>' + t('leg_relanel') + '</span>' : '') +
      (CAM.id === 'modelos' ? '<span class="leg-aneis"><i class="a0"></i><i class="a1"></i><i class="a2"></i>' + t('leg_aneis') + '</span>' : '');
  }
  function textos() {
    document.documentElement.lang = S.lang === 'pt' ? 'pt-BR' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(function (e) { var v = t(e.dataset.i18n); if (/<br>/.test(v)) e.innerHTML = v; else e.textContent = v; });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (e) { e.placeholder = t(e.dataset.i18nPh); });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (e) { e.setAttribute('aria-label', t(e.dataset.i18nAria)); });
    var sel = $('#f-nat'), cur = S.nat; sel.innerHTML = ['todas', 'independente', 'instituicao', 'afiliada', 'empresa', 'nao_classificada'].map(function (k) { return '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + (k === 'todas' ? t('n_todos') : t(k)) + '</option>'; }).join('');
    document.querySelectorAll('[data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lang === S.lang)); });
    document.querySelectorAll('[data-escopo]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.escopo === S.escopo)); });
    document.querySelectorAll('[data-via]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.via === S.via)); b.title = t('dica_' + b.dataset.via); });
    var dd = $('#f-build-dica'); if (dd) dd.textContent = t('dica_' + S.via);
    renderModos(); renderFiltros(); marcaAtivos(); var ff = $('#f-fmt'); if (ff) ff.value = S.fmt;
    var mot = $('[data-sky-motion]'); mot.setAttribute('aria-label', S.paused ? (S.lang === 'pt' ? 'Retomar animação' : 'Resume animation') : (S.lang === 'pt' ? 'Pausar animação' : 'Pause animation'));
  }
  function tudo(cb) { textos(); renderFoto(); montar(function () { renderLegenda(); assinatura = null; if (S.sel) renderDrawer(); resize(); if (cb) cb(); }); }

  document.querySelectorAll('[data-lang]').forEach(function (b) { b.onclick = function () { S.lang = b.dataset.lang; try { localStorage.setItem('observatorio-lang', S.lang); } catch (e) {} textos(); renderFoto(); assinatura = null; if (S.sel) renderDrawer(); if (S.tab === 'benchmarks') tudo(); else { medirRotulos(); posicionar(); } }; });
  document.querySelectorAll('[data-escopo]').forEach(function (b) { b.onclick = function () { S.escopo = b.dataset.escopo; fecharDrawer(); S.zoom = 1; S.panX = 0; S.panY = 0; tudo(); salvaUrl(); }; });
  $('#filtros-datasets').addEventListener('click', function (e) { var b = e.target.closest('[data-escopo]'); if (!b) return; S.escopo = b.dataset.escopo; fecharDrawer(); S.zoom = 1; S.panX = 0; S.panY = 0; tudo(); salvaUrl(); });
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
  var ROT_F = { pt: 'f_pt', idioma: 'c_idiomas', tarefa: 'c_tarefas', licenca: 'c_lic', tamanho: 'c_tamanho', publicador: 'c_pub', bench: 'c_benchmarks', dominio: 'c_dominio', tipo: 'c_tipo', q: 'buscar' };
  var TAM_ROT = { '<1MB': '< 1 MB', '1-100MB': '1 – 100 MB', '100MB-1GB': '100 MB – 1 GB', '1-10GB': '1 – 10 GB', '>10GB': '> 10 GB', x: null };
  function valorFiltro(k, v) {
    if (k === 'publicador') return pubNome(v); if (k === 'licenca' && v === '__sem') return t('sem_licenca'); if (k === 'pt') return t('pt_' + v);
    if (k === 'dominio') return rotDom(v); if (k === 'tipo') return rotTipo(v); if (k === 'bench') return t(v === 'sim' ? 'com_bench' : 'sem_bench'); if (k === 'tamanho') return TAM_ROT[v] || t('desconhecido'); return v;
  }
  function filtrosAtivos() {
    var l = [];
    if (S.tab === 'modelos') {
      l.push(t('agrupar') + ': ' + t({ publicador: 'porpub', familia: 'porfam', instituicao: 'porinst' }[CAM.modo()]));
      if (S.tarefa) l.push(t('c_tarefa') + ': ' + t('ta_' + S.tarefa)); if (S.inst) l.push(t('f_inst') + ': ' + nomeInstFull(S.inst)); if (S.lab) l.push(t('f_lab') + ': ' + nomeLab(S.lab)); if (MF.papel.disponivel && (S.inst || S.lab)) l.push(t('f_papel') + ': ' + t('pp_' + S.papel));
      if (S.escopo !== 'todos') l.push(t('f_escopo') + ': ' + t(S.escopo === 'br' ? 'br' : 'mundo')); if (S.via !== 'todos') l.push(t('c_status') + ': ' + t('v_' + S.via));
      if (S.nat !== 'todas') l.push(t('f_nat') + ': ' + t(S.nat)); if (S.fmt) l.push(t('f_fmt') + ': ' + t('fmt_multi')); if (S.busca.trim()) l.push(t('buscar') + ': ' + S.busca.trim());
      if (MF.rec.disponivel) l.push(t('rec_filtro') + ': ' + (S.recorte ? t('rec_f_ligado') + ' (' + nf(MF.rec.n) + ')' : t('rec_f_desligado')));
      if (MF.exp.disponivel) l.push(t('exp_filtro') + ': ' + (S.mostrarExp ? t('exp_f_visiveis') : t('exp_f_ocultos') + ' (' + nf(expOcultos()) + ')'));
    } else { if (S.tab === 'datasets' && S.escopo !== 'todos') l.push(t('f_escopo') + ': ' + t(S.escopo === 'br' ? 'br' : 'mundo')); var f = S.f[S.tab]; Object.keys(f).forEach(function (k) { if (f[k] !== '') l.push(t(ROT_F[k]) + ': ' + valorFiltro(k, f[k])); }); }
    return l.length ? l : [t('exp_nenhum')];
  }
  function rodapeExp() {
    var u = String(window.REPO_URL || '').replace(/\/+$/, '');
    var l = [t('exp_fonte') + ': ' + t('rodape') + ' ' + D.meta.coletado_em];
    if (S.tab === 'modelos') { var mb = maiorBR(), sem = S.semMaior && !!mb, c = capaCont('', sem), br = capaCont('', sem, true); l.push(t('capa_br') + ' (' + t(sem ? 'capa_sem' : 'capa_todos') + '): ' + nf(c.so_nativo) + ' ' + t('de') + ' ' + nf(c.modelos) + ' ' + t('capa_nativo') + '; ' + nf(c.nativo_mais_gguf - c.so_nativo) + ' ' + t('capa_gguf') + (expOculto() ? '; ' + nf(br.modelos - c.modelos) + ' ' + t('exp_n_ocultos') : MF.exp.disponivel ? '; ' + t('exp_visiveis_nota') : '') + (mb ? '. ' + notaMaior(mb) : '')); }
    return l.concat(['Observatório Web AI · ' + hoje() + (u ? ' · ' + u : ''), t('exp_lic')]);
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
      est.push({ x: x, y: y, r: r, c: s.st, d: !!s.dia, t: nomeItem(s.m) + ' · ' + s.g.nome });
    });
    G.forEach(function (g) {
      var n = g.stars.filter(function (q) { return q.on; }).length; if (!n) return;
      if (completo) rot.push({ x: W0 / 2 + (g.u - 0.5) * esc0, y: H0 / 2 + (g.v - 0.5) * esc0 + g.R * g.k * esc0 * 0.5 + 16, t: g.nome + ' · ' + n });
      else if (g.hasAnt && g.pnl) rot.push({ x: g.px, y: g.py + 22, t: g.nome + ' · ' + n });
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
  var menuEl = null, menuBtn = null, menuY = 0;
  function fecharMenu(foco) { if (!menuEl) return; menuEl.remove(); menuEl = null; if (menuBtn) { menuBtn.setAttribute('aria-expanded', 'false'); if (foco) menuBtn.focus(); } menuBtn = null; }
  function abrirMenu(btn, itens) {
    if (menuEl && menuBtn === btn) return fecharMenu(true);
    fecharMenu(); var m = document.createElement('div'); m.className = 'pop'; m.setAttribute('role', 'menu'); m.setAttribute('aria-label', btn.textContent);
    itens.forEach(function (it) { var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'menuitem'); b.tabIndex = -1; b.textContent = t(it[0]); b.addEventListener('click', function () { fecharMenu(true); it[1](); }); m.appendChild(b); });
    document.body.appendChild(m); var r = btn.getBoundingClientRect();
    m.style.top = (r.bottom + 4 + m.offsetHeight > innerHeight - 8 ? Math.max(8, r.top - m.offsetHeight - 4) : r.bottom + 4) + 'px'; m.style.left = Math.max(8, Math.min(innerWidth - m.offsetWidth - 8, r.right - m.offsetWidth)) + 'px';
    btn.setAttribute('aria-expanded', 'true'); menuEl = m; menuBtn = btn; menuY = scrollY; m.firstChild.focus({ preventScroll: true });
  }
  document.addEventListener('keydown', function (e) {
    if (!menuEl) return; var its = [].slice.call(menuEl.querySelectorAll('[role=menuitem]')), i = its.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fecharMenu(true); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); its[(i + 1) % its.length].focus({ preventScroll: true }); } else if (e.key === 'ArrowUp') { e.preventDefault(); its[(i - 1 + its.length) % its.length].focus({ preventScroll: true }); }
    else if (e.key === 'Home') { e.preventDefault(); its[0].focus(); } else if (e.key === 'End') { e.preventDefault(); its[its.length - 1].focus(); } else if (e.key === 'Tab') fecharMenu(false);
  }, true);
  document.addEventListener('click', function (e) { if (menuEl && !menuEl.contains(e.target) && e.target !== menuBtn) fecharMenu(false); });
  addEventListener('scroll', function (e) { if (menuEl && (e.target === document || e.target === document.documentElement) && Math.abs(scrollY - menuY) > 30) fecharMenu(false); }, true);
  var itensExp = function (f) { return [['exp_png', function () { f('png'); }], ['exp_svg', function () { f('svg'); }], ['exp_html', function () { f('html'); }]]; };
  $('#exp-grafico').addEventListener('click', function (e) { abrirMenu(e.currentTarget, itensExp(exportarGrafico)); });
  $('#exp-tabela').addEventListener('click', function (e) { abrirMenu(e.currentTarget, itensExp(exportarTabela)); });
  ['#exp-grafico', '#exp-tabela'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'ArrowDown') { e.preventDefault(); $(id).click(); } }); });
  window.__exp = { snapGrafico: snapGrafico, snapTabela: snapTabela, filtros: filtrosAtivos, grafico: exportarGrafico, tabela: exportarTabela };

  // ---------- modos de agrupamento, filtros por aba, abas ----------
  function renderModos() {
    var modo = CAM.modo();
    $('#f-agrupar').setAttribute('aria-label', t('agrupar'));
    $('#f-agrupar').innerHTML = '<span class="mini-rot">' + t('agrupar') + '</span>' + (typeof CAM.modos === 'function' ? CAM.modos() : CAM.modos).map(function (m) { return '<button type="button" data-modo="' + m[0] + '" aria-pressed="' + (m[0] === modo) + '">' + t(m[1]) + '</button>'; }).join('');
  }
  var selHtml = function (tab, k, rot, ops) {
    var v = S.f[tab][k];
    return '<label class="sel"><span class="sr">' + t(rot) + '</span><select data-f="' + tab + '" data-k="' + k + '" aria-label="' + esc(t(rot)) + '"><option value="">' + t(rot) + '</option>' + ops.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === v ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
  };
  function escopoDsHtml() {   // Brasil | Mundo | Tudo, igual ao dos modelos, com as contagens por escopo
    var nb = 0, nm = 0; CC.datasets.forEach(function (d) { if (d.escopo === 'br') nb++; else nm++; });
    return '<div class="segmented" role="group" aria-label="' + esc(t('f_escopo')) + '" id="f-escopo-ds">' + [['br', 'br'], ['mundo', 'mundo'], ['todos', 'todos']].map(function (o) { return '<button type="button" data-escopo="' + o[0] + '" aria-pressed="' + (S.escopo === o[0]) + '">' + t(o[1]) + '</button>'; }).join('') + '</div>' +
      '<span class="mini-rot" id="ds-esc-n">' + t('br') + ' ' + nf(nb) + ' · ' + t('mundo') + ' ' + nf(nm) + '</span>';
  }
  function selPt() {   // filtro de idioma: Todos | Portugues | Portugues do Brasil (pt-BR); o filtro geral de Idiomas continua
    var v = S.f.datasets.pt;
    return '<label class="sel"><span class="sr">' + t('f_pt') + '</span><select data-f="datasets" data-k="pt" aria-label="' + esc(t('f_pt')) + '">' + [['', t('f_pt') + ': ' + t('pt_todos').toLowerCase()], ['pt', t('pt_pt')], ['ptbr', t('pt_ptbr')]].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
  }
  var buscaHtml = function (tab) { return '<label class="sel search"><span class="sr">' + t('buscar') + '</span><input type="search" data-f="' + tab + '" data-q="1" value="' + esc(S.f[tab].q) + '" placeholder="' + esc(t('buscar_ph')) + '" autocomplete="off"></label>'; };
  var plano = function (a) { var r = []; a.forEach(function (x) { r = r.concat(x); }); return r; };
  var paraOps = function (arr) { return arr.map(function (x) { return [x, x]; }); };
  function renderRelFiltros() {
    $('#w-inst').hidden = $('#w-lab').hidden = !REL.disponivel; if (!REL.disponivel) return;
    var is = REL.inst.slice().sort(function (a, b) { return (REL.rot(a) || '').toLowerCase() < (REL.rot(b) || '').toLowerCase() ? -1 : 1; });
    $('#f-inst').innerHTML = '<option value="">' + t('f_inst') + '</option>' + is.map(function (i) { return '<option value="' + esc(i.id) + '">' + esc(nomeInstFull(i.id) + contPapel('inst', i.id)) + '</option>'; }).join(''); $('#f-inst').value = S.inst;
    var ls = REL.lab.filter(function (l) { return !S.inst || l.instituicao === S.inst || (l.parceiras || []).indexOf(S.inst) >= 0; });
    $('#f-lab').innerHTML = '<option value="">' + t('f_lab') + '</option>' + ls.map(function (l) { return '<option value="' + esc(l.id) + '">' + esc(nomeLab(l.id)) + '</option>'; }).join(''); $('#f-lab').value = S.lab;
    renderPapel();
    document.querySelectorAll('#f-tarefa button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.tarefa === S.tarefa)); });
  }
  // contagem por papel nas opcoes (so papeis que nao sao desenvolvedor): 'FAPERGS · financiou 13'
  var contP = null;
  function contPapel(tipo, id) {
    if (!MF.papel.disponivel) return '';
    if (!contP) { contP = {}; D.modelos.forEach(function (m) { Object.keys(m._papel).forEach(function (k) { var p = m._papel[k]; if (p === 'desenvolvedor') return; (contP[k] = contP[k] || {})[p] = (contP[k][p] || 0) + 1; }); }); }
    var c = contP[tipo + ':' + id]; return c ? Object.keys(c).map(function (p) { return ' · ' + t('pl_' + p) + ' ' + nf(c[p]); }).join('') : '';
  }
  function renderPapel() {
    var w = $('#w-papel'); if (!w) return; w.hidden = !(MF.papel.disponivel && (S.inst || S.lab)); if (w.hidden) return;
    $('#f-papel').innerHTML = ['todos'].concat(MF.papel.lista).map(function (p) { return '<button type="button" data-papel="' + p + '" aria-pressed="' + (p === S.papel) + '">' + t('pp_' + p) + '</button>'; }).join('');
  }
  function renderFiltros() {
    renderRelFiltros(); document.querySelectorAll('#f-tarefa button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.tarefa === S.tarefa)); });
    var fm = $('#f-fmt'); if (fm) fm.innerHTML = '<option value="">' + t('f_fmt') + '</option><option value="multi">' + t('fmt_multi') + '</option>';
    if (fm) fm.value = S.fmt;
    var gp = function (rot, html) { return '<div class="gv-grupo"><h3>' + t(rot) + '</h3>' + html + '</div>'; };
    if (TEM.datasets) {
      $('#filtros-datasets').innerHTML = escopoDsHtml() + buscaHtml('datasets') + btnFiltrosHtml();
      $('#gv-datasets').innerHTML = gp('g_idioma', selPt() + selHtml('datasets', 'idioma', 'c_idiomas', paraOps(uniq(plano(CC.datasets.map(function (d) { return d.idiomas; })))))) +
        gp('g_conteudo', selHtml('datasets', 'tarefa', 'c_tarefas', paraOps(uniq(plano(CC.datasets.map(function (d) { return d.tarefas; }))))) + selHtml('datasets', 'bench', 'c_benchmarks', [['sim', t('com_bench')], ['nao', t('sem_bench')]])) +
        gp('g_licenca', selHtml('datasets', 'licenca', 'c_lic', paraOps(uniq(CC.datasets.map(function (d) { return d.licenca; }))).concat([['__sem', t('sem_licenca')]])) + selHtml('datasets', 'tamanho', 'c_tamanho', [['<1MB', '< 1 MB'], ['1-100MB', '1 – 100 MB'], ['100MB-1GB', '100 MB – 1 GB'], ['1-10GB', '1 – 10 GB'], ['>10GB', '> 10 GB'], ['x', t('desconhecido')]])) +
        gp('g_publicador', selHtml('datasets', 'publicador', 'c_pub', uniq(CC.datasets.map(function (d) { return d.publicador; })).map(function (p) { return [p, pubNome(p)]; })));
    }
    if (TEM.benchmarks) {
      $('#filtros-benchmarks').innerHTML = buscaHtml('benchmarks') + btnFiltrosHtml();
      $('#gv-benchmarks').innerHTML = gp('g_dominio', selHtml('benchmarks', 'dominio', 'c_dominio', uniq(plano(CC.benchmarks.map(function (b) { return b.dominio; }))).map(function (x) { return [x, rotDom(x)]; })) + selHtml('benchmarks', 'tipo', 'c_tipo', uniq(CC.benchmarks.map(function (b) { return b.tipo; })).map(function (x) { return [x, rotTipo(x)]; }))) +
        gp('g_idioma', selHtml('benchmarks', 'idioma', 'c_idiomas', paraOps(uniq(plano(CC.benchmarks.map(function (b) { return b.idiomas; }))))) + selHtml('benchmarks', 'tarefa', 'c_tarefas', paraOps(uniq(plano(CC.benchmarks.map(function (b) { return b.tarefas; }))))));
    }
    atualizarFiltrosUI();
  }
  ['#filtros-datasets', '#filtros-benchmarks', '#gv-datasets', '#gv-benchmarks'].forEach(function (id) {
    var el = $(id);
    el.addEventListener('change', function (e) { var c = e.target.closest('select[data-f]'); if (!c) return; S.f[c.dataset.f][c.dataset.k] = c.value; filtrou(); });
    el.addEventListener('input', function (e) { var c = e.target.closest('input[data-q]'); if (!c) return; S.f[c.dataset.f].q = c.value; filtrou(); });
  });
  $('#f-fmt').addEventListener('change', function (e) { S.fmt = e.target.value; filtrou(); });
  $('#f-inst').addEventListener('change', function (e) { S.inst = e.target.value; var l = REL.labBy[S.lab]; if (S.lab && l && S.inst && l.instituicao !== S.inst && (l.parceiras || []).indexOf(S.inst) < 0) S.lab = ''; if (!S.inst) S.papel = 'todos'; renderRelFiltros(); filtrou(); });
  $('#f-lab').addEventListener('change', function (e) { S.lab = e.target.value; if (!S.lab && !S.inst) S.papel = 'todos'; renderPapel(); filtrou(); });
  $('#f-papel').addEventListener('click', function (e) { var b = e.target.closest('[data-papel]'); if (!b) return; S.papel = b.dataset.papel; renderPapel(); filtrou(); salvaUrl(); });
  $('#f-tarefa').addEventListener('click', function (e) { var b = e.target.closest('button[data-tarefa]'); if (!b) return; S.tarefa = b.dataset.tarefa; renderRelFiltros(); filtrou(); });
  document.addEventListener('change', function (e) { if (e.target.matches && e.target.matches('.sel select')) marcaAtivos(); });
  $('#limpar').addEventListener('click', function () {
    if (S.tab === 'modelos') { S.escopo = 'todos'; S.via = 'todos'; S.mostrarExp = false; S.recorte = false; S.nat = 'todas'; S.busca = ''; S.fmt = ''; S.tarefa = ''; S.inst = ''; S.lab = ''; S.papel = 'todos'; $('#busca').value = ''; textos(); fecharDrawer(); S.zoom = 1; S.panX = 0; S.panY = 0; tudo(); }
    else { var f = S.f[S.tab]; Object.keys(f).forEach(function (k) { f[k] = ''; }); if (S.tab === 'datasets' && S.escopo !== 'todos') { S.escopo = 'todos'; fecharDrawer(); S.zoom = 1; S.panX = 0; S.panY = 0; tudo(); } else { renderFiltros(); filtrou(); } }
    salvaUrl();
  });

  function atualizarTabsUI() {
    var ha = TEM.datasets || TEM.benchmarks; $('#tabs').hidden = !ha;
    document.querySelectorAll('#tabs [role=tab]').forEach(function (b) { var on = b.dataset.tab === S.tab; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; b.hidden = !TEM[b.dataset.tab]; });
    $('#inicio').setAttribute('aria-labelledby', 'tab-' + S.tab);
    $('#filtros-modelos').hidden = S.tab !== 'modelos'; ['modelos', 'datasets', 'benchmarks'].forEach(function (k) { var g = $('#gv-' + k); if (g) g.hidden = S.tab !== k; }); $('#filtros-datasets').hidden = S.tab !== 'datasets'; $('#filtros-benchmarks').hidden = S.tab !== 'benchmarks';
    var tit = $('#res-titulo'), rot = document.querySelector('.home-section-label'), nota = $('.sky-bottom'), cap = $('#tb caption');
    $('.home-eyebrow i').dataset.i18n = CAM.eb; tit.dataset.i18n = CAM.tit; rot.dataset.i18n = CAM.rot; nota.dataset.i18n = CAM.nota; cap.dataset.i18n = CAM.tit;
    $('#caveat').hidden = S.tab !== 'modelos';
  }
  // indicador de carga da aba (pequeno, na area da aba): imediato, com progresso real e estado de erro
  var cargaEl = $('#carga-camada'), cargaCeu = $('#carga-ceu');
  function textoCarga(parte) { var tot = D.foto_camadas && D.foto_camadas[parte] ? D.foto_camadas[parte].total : null; return t('carga_' + parte).replace('{n}', tot != null ? nf(tot) : ''); }
  function mostrarCarga(parte, frac, erro) {
    var txt = erro ? t('carga_erro').replace('{x}', t(parte)) : textoCarga(parte) + (frac != null && frac > 0 ? ' ' + Math.round(frac * 100) + '%' : '');
    [cargaEl, cargaCeu].forEach(function (e) {
      e.hidden = false; e.classList.toggle('erro', !!erro); e.querySelector('.carga-txt').textContent = txt;
      var p = e.querySelector('.c-barra-p'); p.hidden = !!erro; p.classList.toggle('indet', frac == null); p.firstChild.style.width = frac != null ? Math.round(frac * 100) + '%' : '';
      var rt = e.querySelector('.carga-retry'); if (rt) rt.hidden = !erro;
    });
    $('.home-average-scroll').hidden = true; $('#resumo-recorte').textContent = '';
    if (erro) cargaEl.querySelector('.carga-retry').focus({ preventScroll: true });
  }
  function ocultarCarga() { cargaEl.hidden = true; cargaCeu.hidden = true; $('.home-average-scroll').hidden = false; }
  function atualizarHash(id, doHash) { if (doHash !== false) { var h = '#' + id; if (location.hash !== h && !(id === 'modelos' && !location.hash)) { try { history.pushState(null, '', location.pathname + location.search + (id === 'modelos' ? '' : h)); } catch (e) { location.hash = h; } } } }
  function trocarTab(id, doHash, depois) {
    if (!TEM[id]) id = 'modelos';
    if (id === S.tab && CAM === CAMS[id] && stars.length) { atualizarTabsUI(); if (depois) depois(); return; }
    fecharDrawer(); S.tab = id; CAM = CAMS[id]; S.sort = S.sortL[id]; S.sel = null; S.zoom = 1; S.panX = 0; S.panY = 0; S.limite = 150; S.noCirculo = [];
    limparConstelacao(); atualizarHash(id, doHash); atualizarTabsUI(); textos();
    var parte = id === 'datasets' || id === 'benchmarks' ? id : null;
    function concluir() { if (S.tab !== id) return; ocultarCarga(); atualizarTabsUI(); textos(); tudo(depois); }
    if (parte && !parteCarregada(parte) && !CC[parte].length) {
      mostrarCarga(parte, null, false);   // indicador antes de qualquer trabalho pesado
      carregarParte(parte, function (f) { if (S.tab === id) mostrarCarga(parte, f, false); }).then(function () { prepararCamadas(); concluir(); }, function () { if (S.tab === id) mostrarCarga(parte, null, true); });
    } else { prepararCamadas(); concluir(); }
  }
  cargaEl.querySelector('.carga-retry').addEventListener('click', function () { var id = S.tab; S.tab = 'modelos'; CAM = CAMS.modelos; trocarTab(id, false); });
  $('#tabs').addEventListener('click', function (e) { var b = e.target.closest('[role=tab]'); if (b && !b.hidden) trocarTab(b.dataset.tab); });
  $('#tabs').addEventListener('keydown', function (e) {
    var abas = [].slice.call(document.querySelectorAll('#tabs [role=tab]')).filter(function (b) { return !b.hidden; }), i = abas.indexOf(document.activeElement); if (i < 0) return;
    var j = e.key === 'ArrowRight' ? (i + 1) % abas.length : e.key === 'ArrowLeft' ? (i - 1 + abas.length) % abas.length : e.key === 'Home' ? 0 : e.key === 'End' ? abas.length - 1 : -1;
    if (j < 0) return; e.preventDefault(); abas[j].focus(); trocarTab(abas[j].dataset.tab);
  });
  function abaDoHash() { var h = location.hash.replace('#', '').split('&')[0]; return h === 'datasets' || h === 'benchmarks' || h === 'modelos' ? h : null; }
  window.addEventListener('hashchange', function () { var a = abaDoHash(); if (a && a !== S.tab) trocarTab(a, false); else if (!location.hash && S.tab !== 'modelos') trocarTab('modelos', false); });
  window.addEventListener('popstate', function () { var a = abaDoHash() || 'modelos'; if (a !== S.tab) trocarTab(a, false); });

  // carga inicial: so o necessario para a aba pedida; o resto, em ociosidade depois do primeiro desenho
  function prefetchOcioso() {
    if (/[?&]prefetch=0/.test(location.search)) return;
    var c = navigator.connection; if (c && (c.saveData || /2g/.test(c.effectiveType || ''))) return;
    var ric = window.requestIdleCallback || function (f) { setTimeout(f, 1500); }, fila = ['builds', 'datasets', 'benchmarks'].filter(function (n) { return PARTES[n] && !parteCarregada(n); });
    (function prox() {
      var n = fila.shift(); if (!n) return;
      ric(function () {
        carregarParte(n).then(function () { if (n === 'builds') aplicarDetalhes(); else { prepararCamadas(); atualizarTabsUI(); paint(); } prox(); }, prox);
      }, { timeout: 6000 });
    })();
  }
  (function () {
    var a = abaDoHash(), inicial = a && (a === 'datasets' || a === 'benchmarks') && TEM[a] && !parteCarregada(a) && !CC[a].length ? a : null;
    function iniciar() {
      if (a && TEM[a]) { S.tab = a; CAM = CAMS[a]; S.sort = S.sortL[a]; }
      atualizarTabsUI();
      tudo(function () {
        if (window.__carga) __carga.etapa(2);
        var dh = DR.doHash(); if (dh && !DR.aberto()) DR.abrir(dh, null);   // link direto para um item (#aba&d=tipo:id)
        requestAnimationFrame(function () { requestAnimationFrame(function () { if (window.__carga) __carga.fim(); prefetchOcioso(); }); });
      });
    }
    if (inicial) {
      var msg = $('#c-msg'), prog = $('#c-prog'); if (msg) msg.textContent = textoCarga(inicial);
      carregarParte(inicial, function (f) { if (prog) prog.style.width = Math.round(8 + 32 * f) + '%'; }).then(function () { prepararCamadas(); iniciar(); }, function () { a = null; iniciar(); });
    } else iniciar();
  })();
  // gancho de medicao e de conferencia (somente leitura)
  window.__obs = { get estrelas() { return stars; }, get grupos() { return G; }, get estado() { return S; }, get stats() { return STATS; }, get modelos() { return D.modelos.length; }, achar: function (x, y) { return achar(x, y); }, drawer: DR, abrir: function (tab, sel) { var f = function () { DR.abrir(sel, null); }; if (S.tab !== tab) trocarTab(tab, false, f); else f(); } };
})();
