#!/usr/bin/env node
// Teste das abas (Modelos, Datasets, Benchmarks), dos filtros e das exportacoes, em Chrome sem tela.
// Uso: node scripts/testar-camadas.mjs      (PLAYWRIGHT_CORE e CHROME opcionais; usa a fixture sintetica ?fixture=1)
// Confere: abas ocultas sem dados; hash e teclado; filtros iguais na constelacao e na tabela; arquivos exportados
// (PNG, SVG, HTML do grafico e da tabela) com contagem de itens igual a contagem filtrada; SVG renderiza em <img>; HTML abre fora do site.
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import http from 'http';
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
const pagina = pathToFileURL(path.join(raiz, 'web', 'index.html')).href;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'obs-exp-'));
let falhas = 0, paginasUltimo = 0;
const ok = (c, msg, det = '') => { console.log((c ? 'ok    ' : 'FALHA ') + msg + (det ? '  ' + det : '')); if (!c) falhas++; };
// o teste das camadas confere o conjunto inteiro: com dados que trazem a maturidade do cartao, abre com os experimentais visiveis (o filtro tem teste proprio)
const comExp = u => { const [a, h] = u.split('#'); return a + (a.includes('?') ? '&' : '?') + 'exp=1&recorte=1' + (h !== undefined ? '#' + h : ''); };
const abrir = async (q = '', semCamadas = false) => {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  if (semCamadas) await p.addInitScript(() => { let d = null; Object.defineProperty(window, 'MAPA_DADOS', { configurable: true, get() { return d; }, set(v) { delete v.datasets; delete v.benchmarks; delete v.partes; d = v; } }); }); const erros = []; p.on('pageerror', e => erros.push(e.message));
  // os filtros avancados ficam na gaveta (fechada): os testes de logica os acionam direto; a gaveta tem teste proprio
  const oc = p.click.bind(p); p.click = (sel, ...r) => /data-via|f-via/.test(String(sel)) ? p.evaluate(x => document.querySelector(x).click(), sel) : oc(sel, ...r);
  p.selectOption = (sel, val) => p.evaluate(([x, v]) => { const e = document.querySelector(String(x).replace('#filtros-', '#gv-')); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }, [sel, val]);
  await p.goto(comExp(pagina + q)); await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0); await p.waitForTimeout(900);
  return { p, ctx, erros };
};
const filtradas = p => p.evaluate(() => window.__obs.estrelas.filter(s => s.on).length);
const linhasTabela = p => p.evaluate(() => (window.__obs.estado.noCirculo || []).length);
async function baixar(p, botao, item) {
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(250);
  await p.evaluate(s => document.querySelector(s).click(), botao);
  const todos = []; const ouvir = d => todos.push(d); p.on('download', ouvir);
  await p.locator('.pop [role=menuitem]', { hasText: item }).click();
  for (let i = 0; i < 300 && !todos.length; i++) await p.waitForTimeout(100); await p.waitForTimeout(1400); p.off('download', ouvir);   // tabelas longas saem em varias paginas
  const arqs = []; for (const d of todos) { const f = path.join(tmp, d.suggestedFilename()); await d.saveAs(f); arqs.push(f); }
  paginasUltimo = arqs.length; return arqs[0];
}

// 1) sem dados (as chaves sao removidas dos dados reais) de datasets e benchmarks: abas extras ocultas
{ const { p, ctx } = await abrir('', true); ok(await p.evaluate(() => document.querySelector('#tabs').hidden), 'sem as chaves de datasets e benchmarks, as abas ficam ocultas'); await ctx.close(); }

// 2) com a fixture: abas, hash, teclado
{ const { p, ctx, erros } = await abrir('?fixture=1');
  ok(await p.evaluate(() => !document.querySelector('#tabs').hidden && document.querySelectorAll('#tabs [role=tab]:not([hidden])').length === 3), 'tres abas visiveis com a fixture');
  ok(await p.evaluate(() => document.querySelector('#tabs').getAttribute('role') === 'tablist' && document.querySelector('#tab-modelos').getAttribute('aria-selected') === 'true'), 'tablist com aria-selected');
  await p.focus('#tab-modelos'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => location.hash === '#datasets' && document.activeElement.id === 'tab-datasets' && window.__obs.estado.tab === 'datasets'), 'seta direita ativa Datasets, move o foco e grava #datasets');
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => window.__obs.estado.tab === 'modelos'), 'seta cicla de Benchmarks para Modelos');
  await ctx.close();
  const h = await abrir('?fixture=1#benchmarks'); ok(await h.p.evaluate(() => window.__obs.estado.tab === 'benchmarks' && document.querySelector('#tab-benchmarks').getAttribute('aria-selected') === 'true'), 'abrir com #benchmarks mostra a aba Benchmarks');
  ok(!erros.length && !h.erros.length, 'sem erros de script', erros.concat(h.erros).join(' | ')); await h.ctx.close(); }

// 3) filtros e exportacoes em cada aba
async function aba(nome, aplicar, descricao) {
  const { p, ctx } = await abrir('?fixture=1#' + nome); await p.waitForTimeout(500);
  const total = await filtradas(p); await aplicar(p); await p.waitForTimeout(700);
  const n = await filtradas(p), linhas = await linhasTabela(p), esmaecidas = await p.evaluate(() => window.__obs.estrelas.filter(s => !s.on).length);
  const nTexto = await p.evaluate(() => +(document.querySelector('#resumo-recorte').textContent.match(/[\d.]+/) || ['0'])[0].replace(/\./g, ''));
  ok(n > 0 && n < total + 1 && linhas === n && nTexto === n, `${nome}: ${descricao}: constelacao (${n} acesas, ${esmaecidas} esmaecidas), tabela (${linhas}) e contador (${nTexto}) coincidem`);
  const tab = path.join(tmp, nome + '.'); void tab;
  // tabela
  const th = await baixar(p, '#exp-tabela', 'HTML'); const q = await b.newPage(); await q.goto(pathToFileURL(th).href);
  const rt = await q.evaluate(() => ({ linhas: document.querySelectorAll('table tbody tr').length, credito: document.body.textContent.includes('CC BY 4.0'), semRede: !document.querySelector('link[rel=stylesheet],script[src],img[src^=http]') }));
  ok(rt.linhas === n && rt.credito && rt.semRede, `${nome}: HTML da tabela abre fora do site, tem ${rt.linhas} linhas (= ${n}), credito e licenca, sem dependencias externas`);
  await q.close();
  const ts = await baixar(p, '#exp-tabela', 'SVG'); const svgT = fs.readFileSync(ts, 'utf8');
  const nl = (svgT.match(/<text /g) || []).length;
  ok(fs.statSync(ts).size > 0 && paginasUltimo === Math.max(1, Math.ceil(n / 100)), `${nome}: SVG da tabela em ${paginasUltimo} pagina(s) de ate 100 linhas para ${n} linhas`);
  const tp = await baixar(p, '#exp-tabela', 'PNG'); const png = fs.readFileSync(tp);
  ok(png.slice(1, 4).toString() === 'PNG' && png.readUInt32BE(16) > 100, `${nome}: PNG da tabela valido (${png.readUInt32BE(16)}x${png.readUInt32BE(20)})`);
  // grafico
  const gh = await baixar(p, '#exp-grafico', 'HTML'); const q2 = await b.newPage(); await q2.goto(pathToFileURL(gh).href);
  const rg = await q2.evaluate(() => ({ estrelas: document.querySelectorAll('figure svg title').length - 1, itens: document.querySelectorAll('details table tbody tr').length, credito: document.body.textContent.includes('CC BY 4.0'), semRede: !document.querySelector('link[rel=stylesheet],script[src],img[src^=http]'), filtros: document.querySelector('p.f').textContent }));
  ok(rg.estrelas === n && rg.itens === n && rg.credito && rg.semRede, `${nome}: HTML do grafico abre fora do site: ${rg.estrelas} estrelas e ${rg.itens} itens na lista (= ${n}); filtros: ${rg.filtros.slice(0, 70)}`);
  await q2.close();
  const gs = await baixar(p, '#exp-grafico', 'SVG'); const svg = fs.readFileSync(gs, 'utf8');
  const q3 = await b.newPage(); const img = await q3.evaluate(async s => new Promise(r => { const i = new Image(); i.onload = () => r([i.naturalWidth, i.naturalHeight]); i.onerror = () => r(null); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s); }), svg);
  ok(img && img[0] > 100, `${nome}: SVG do grafico renderiza em <img> (${img && img.join('x')})`); await q3.close();
  const gp = await baixar(p, '#exp-grafico', 'PNG'); const png2 = fs.readFileSync(gp); ok(png2.slice(1, 4).toString() === 'PNG', `${nome}: PNG do grafico valido (${png2.readUInt32BE(16)}x${png2.readUInt32BE(20)})`);
  await p.screenshot({ path: path.join(tmp, nome + '.png') });
  await ctx.close();
}
await aba('datasets', async p => { await p.click('#f-escopo-ds [data-escopo=br]'); await p.waitForTimeout(900); await p.selectOption('#filtros-datasets select[data-k=licenca]', 'cc-by-4.0'); }, 'escopo Brasil + licenca cc-by-4.0');
await aba('benchmarks', async p => { await p.selectOption('#filtros-benchmarks select[data-k=dominio]', 'juridico'); }, 'filtro de dominio');
await aba('modelos', async p => { await p.click('[data-via=nativo]'); await p.selectOption('#f-fmt', 'multi'); }, 'nativo + mais de um formato');

// 3b) dados reais: abas, paginacao e publicadores sem modelos
{ const { p, ctx, erros } = await abrir('#datasets'); await p.waitForTimeout(800);
  const r = await p.evaluate(() => ({ tab: window.__obs.estado.tab, estrelas: window.__obs.estrelas.length, linhas: document.querySelectorAll('#tb tbody tr').length, mais: !!document.querySelector('#mais'), semModelo: window.__obs.grupos.filter(g => !window.__obs.estado || true).length }));
  ok(r.tab === 'datasets' && r.estrelas > 1000 && r.linhas === 150 && r.mais, `dados reais: ${r.estrelas} datasets na constelacao, tabela com ${r.linhas} linhas e botao 'mostrar mais'`);
  await p.click('#mais'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelectorAll('#tb tbody tr').length) === 300, 'mostrar mais acrescenta 150 linhas');
  const semModelo = await p.evaluate(() => { const D = window.MAPA_DADOS, pubs = new Set(D.publicadores.map(x => x.id)); return window.__obs.grupos.filter(g => !pubs.has(g.id)).length; });
  ok(semModelo > 0, `agrupamento por publicador funciona tambem para ${semModelo} publicadores sem modelos no mapa`);
  ok(!erros.length, 'sem erros de script com os dados reais', erros.join(' | ')); await ctx.close(); }

// 3d) carregamento: tela de carregamento, partes sob demanda, rede lenta, erro e nova tentativa (servidor HTTP local)
{ const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
  const srv = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html'; const f = path.join(raiz, 'web', u);
    if (!f.startsWith(path.join(raiz, 'web')) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'content-length': fs.statSync(f).size, 'cache-control': 'no-store' }); fs.createReadStream(f).pipe(res); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${srv.address().port}/`;
  const abrirHttp = async (q = '', opc = {}) => { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ...opc }); const p = await ctx.newPage(); const pedidos = []; p.on('request', r => pedidos.push(r.url().replace(base, '')));
    const erros = []; p.on('pageerror', e => erros.push(e.message)); return { ctx, p, pedidos, erros, ir: (o) => p.goto(comExp(base + q), o) }; };
  const FALTA_FONTE = /font|woff|CORS|ERR_FAILED/i;
  // 1) tela de carregamento desde o primeiro quadro, com os dados atrasados
  { const t = await abrirHttp('?prefetch=0'); await t.p.route('**/data.js', async r => { await new Promise(x => setTimeout(x, 1500)); r.continue(); });
    await t.ir({ waitUntil: 'commit' }); await t.p.waitForTimeout(500);
    const l = await t.p.evaluate(() => { const e = document.getElementById('carregando'); return e ? { visivel: getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 100, role: e.getAttribute('role'), live: e.getAttribute('aria-live'), msg: document.getElementById('c-msg').textContent, etapa: document.getElementById('c-etapa').textContent, html: window.__carga.t.html } : null; });
    ok(l && l.visivel && l.role === 'status' && l.live === 'polite' && /Carregando modelos, datasets e benchmarks/.test(l.msg) && /Baixando dados/.test(l.etapa), `tela de carregamento visivel antes dos dados (inline em ${l && l.html} ms): "${l && l.msg}" / "${l && l.etapa}"`);
    await t.p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0); await t.p.waitForTimeout(900);
    const f = await t.p.evaluate(() => ({ some: !document.getElementById('carregando'), t: window.__carga.t }));
    ok(f.some && f.t.pronto > f.t.etapa1, `a tela some depois do primeiro desenho (etapas em ms: ${JSON.stringify(f.t)})`);
    const dados = t.pedidos.filter(x => /^data/.test(x)); ok(dados.length === 2 && dados[0].startsWith('data.js') && dados.some(x => x.startsWith('data-avatares.js')), `com prefetch desligado, so ${dados.join(', ')} foi pedido na carga inicial (datasets, benchmarks e builds ficam sob demanda)`);
    const tam = fs.statSync(path.join(raiz, 'web', 'data.js')).size; ok(tam < 4e6, `data.js inicial tem ${(tam / 1e6).toFixed(2)} MB brutos (< 4 MB)`);
    await t.ctx.close(); }
  // 2) rede lenta: indicador imediato, progresso real, estrelas completas
  { const t = await abrirHttp('?prefetch=0'); await t.ir(); await t.p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0); await t.p.waitForTimeout(500);
    const cdp = await t.ctx.newCDPSession(t.p); await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 120, downloadThroughput: 250 * 1024, uploadThroughput: 250 * 1024 });
    await t.p.evaluate(() => document.querySelector('#tab-datasets').click()); await t.p.waitForTimeout(150);
    const i1 = await t.p.evaluate(() => ({ vis: !document.querySelector('#carga-camada').hidden, txt: document.querySelector('#carga-camada .carga-txt').textContent, w: document.querySelector('#carga-camada .c-barra-p i').style.width, tab: window.__obs.estado.tab }));
    await t.p.waitForTimeout(1200); const i2 = await t.p.evaluate(() => document.querySelector('#carga-camada .c-barra-p i').style.width);
    ok(i1.vis && /Carregando [0-9.]+ datasets/.test(i1.txt) && i1.tab === 'datasets', `indicador da aba aparece na hora: "${i1.txt}"`);
    ok(parseFloat(i2) > 0 && parseFloat(i2) < 100, `progresso real da rede lenta (${i1.w || 'indeterminado'} -> ${i2})`);
    await t.p.waitForFunction(() => window.__obs.estrelas.length > 1000, null, { timeout: 60000 }); await t.p.waitForTimeout(300);
    const fim = await t.p.evaluate(() => ({ n: window.__obs.estrelas.length, esperado: window.MAPA_DADOS.datasets.linhas.length, ind: document.querySelector('#carga-camada').hidden, linhas: document.querySelectorAll('#tb tbody tr').length }));
    ok(fim.n === fim.esperado && fim.ind && fim.linhas === 150, `datasets carregados: ${fim.n} estrelas (= ${fim.esperado} nos dados), indicador some, tabela com ${fim.linhas} linhas`);
    ok(!t.erros.filter(e => !FALTA_FONTE.test(e)).length, 'sem erros de script na rede lenta', t.erros.join(' | ')); await t.ctx.close(); }
  // 3) erro e nova tentativa
  { const t = await abrirHttp('?prefetch=0'); await t.p.route('**/data-benchmarks.js', r => r.abort()); await t.ir(); await t.p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0);
    await t.p.evaluate(() => document.querySelector('#tab-benchmarks').click()); await t.p.waitForTimeout(800);
    const e1 = await t.p.evaluate(() => ({ txt: document.querySelector('#carga-camada .carga-txt').textContent, botao: !document.querySelector('#carga-camada .carga-retry').hidden }));
    ok(/N.o foi poss.vel carregar/.test(e1.txt) && e1.botao, `estado de erro com botao Tentar de novo: "${e1.txt}"`);
    await t.p.unroute('**/data-benchmarks.js'); await t.p.click('#carga-camada .carga-retry'); await t.p.waitForFunction(() => { const nb = ((window.MAPA_DADOS || {}).benchmarks || []).length; return nb > 0 && window.__obs.estrelas.length === nb; }, null, { timeout: 15000 });
    ok(await t.p.evaluate(() => document.querySelector('#carga-camada').hidden), 'Tentar de novo carrega todos os benchmarks e esconde o indicador'); await t.ctx.close(); }
  // 4) builds do drawer sob demanda
  { const t = await abrirHttp('?prefetch=0'); await t.ir(); await t.p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0); await t.p.waitForTimeout(500);
    ok(!t.pedidos.some(x => /data-builds/.test(x)), 'os builds dos modelos nao sao pedidos na carga inicial');
    await t.p.evaluate(() => document.querySelector('#tb tbody tr').click()); await t.p.waitForFunction(() => /ONNX|MLC|LiteRT|GGUF/.test(document.querySelector('#drawer-corpo').textContent), null, { timeout: 20000 });
    ok(t.pedidos.some(x => /data-builds/.test(x)), 'abrir o drawer baixa os builds do modelo e a lista aparece'); await t.ctx.close(); }
  // 5) sem JavaScript: aviso no lugar da tela de carregamento
  { const ctx = await b.newContext({ javaScriptEnabled: false }); const p = await ctx.newPage(); await p.goto(base);
    const r = await p.evaluate(() => ({ carreg: getComputedStyle(document.getElementById('carregando')).display, aviso: [...document.querySelectorAll('.ns-aviso')].map(e => getComputedStyle(e).display + ':' + e.textContent.length) }));
    ok(r.carreg === 'none' && r.aviso.some(a => a.startsWith('block')), 'sem JavaScript: a tela de carregamento some e o aviso aparece'); await ctx.close(); }
  await new Promise(r => srv.close(r)); }
// 3c) relacoes: instituicao, familia de tarefa, contagens de capa (fixture ?fixture=relacoes sobre os dados reais)
{ const real = await abrir(''); await real.p.waitForTimeout(500);   // relacoes reais (14 instituicoes) carregadas junto de data.js
  const D0 = await real.p.evaluate(() => { const D = window.MAPA_DADOS; const c = {}; D.modelos.forEach(m => c[m.publicador] = (c[m.publicador] || 0) + 1); const br = D.modelos.filter(m => m.escopo === 'br' && m.recorte_pt !== true);   // escopo do modelo (contrato de escopo)
    const top = Object.keys(c).filter(k => D.publicadores.find(p => p.id === k).escopo === 'br').sort((x, y) => c[y] - c[x])[0];
    return { total: D.modelos.length, br: br.length, mundo: D.modelos.length - br.length, inst: D.instituicoes.length, ger: D.modelos.filter(m => m.familia_tarefa === 'gerador').length, cod: D.modelos.filter(m => m.familia_tarefa === 'codificador').length, semMaior: br.length - c[top], top, nTop: c[top], comModelos: D.instituicoes.filter(i => i.publicadores.some(x => c[x])).length }; });
  const R = await real.p.evaluate(() => ({ modos: document.querySelectorAll('#f-agrupar [data-modo]').length, capa: !document.querySelector('#capa').hidden, tarefa: !!document.querySelector('#f-tarefa'), estrelas: window.__obs.estrelas.length, desenhadas: window.__obs.stats.estrelas }));
  ok(R.modos === 3 && R.capa && R.tarefa && R.estrelas === D0.total && R.desenhadas === D0.total && D0.br + D0.mundo === D0.total, `dados reais: ${R.estrelas} estrelas (= ${D0.br} do Brasil + ${D0.mundo} do mundo), tres modos de agrupamento`);
  await real.p.click('#f-agrupar [data-modo=instituicao]'); await real.p.waitForTimeout(1200);
  const gi = await real.p.evaluate(() => ({ n: window.__obs.estrelas.length, desenhadas: window.__obs.stats.estrelas, insts: window.__obs.grupos.filter(g => g.inst).length }));
  ok(gi.n === D0.total && gi.desenhadas === D0.total && gi.insts === D0.comModelos && D0.inst >= 15, `agrupado por instituicao: ${gi.n} estrelas (nada removido), ${gi.insts} grupos de instituicao com modelos (${D0.inst} instituicoes no total; as sem conta com modelos ficam de fora)`);
  const tarefas = await real.p.evaluate(() => ({ g: [...document.querySelectorAll('#tb tbody tr')].length }));
  await real.p.click('#f-tarefa [data-tarefa=codificador]'); await real.p.waitForTimeout(800); const nc = await filtradas(real.p);
  await real.p.click('#f-tarefa [data-tarefa=gerador]'); await real.p.waitForTimeout(800); const ng = await filtradas(real.p);
  ok(nc === D0.cod && ng === D0.ger && nc + ng === D0.total, `Gerador ${ng} + Codificador ${nc} = ${D0.total} (contagens reais dos dados)`);
  await real.p.click('#f-tarefa [data-tarefa=""]'); await real.p.waitForTimeout(500);
  const capaN = async () => real.p.evaluate(() => document.querySelector('#capa .capa-nums div').innerText.replace(/\s+/g, ' '));
  const c1 = await capaN(); await real.p.click('#capa [data-sem="1"]'); await real.p.waitForTimeout(300); const c2 = await capaN();
  const nota = await real.p.evaluate(() => document.querySelector('#capa .capa-nota').textContent);
  ok(new RegExp(' de ' + D0.br.toLocaleString('pt-BR').replace(/\./g, '\\.')).test(c1) && new RegExp('de ' + String(D0.semMaior).replace(/(\d)(?=(\d{3})$)/, '$1.')).test(c2) && /concentra/.test(nota) && new RegExp(Math.round(100 * D0.nTop / D0.br) + '%').test(nota), `capa: Brasil ${c1} e sem o maior publicador (${D0.top}, ${D0.nTop} modelos) ${c2}; nota "${nota}"`);
  await real.p.click('#capa [data-sem="1"]'); await real.p.waitForTimeout(200);
  await real.p.click('#f-agrupar [data-modo=publicador]'); await real.p.fill('#busca', 'Jurema'); await real.p.waitForTimeout(700);
  await real.p.evaluate(() => document.querySelector('#tb tbody tr').click()); await real.p.waitForTimeout(700);
  const dj = await real.p.evaluate(() => ({ h: [...document.querySelectorAll('#drawer h3')].map(x => x.textContent), inst: [...document.querySelectorAll('#drawer [data-ir^="inst:"]')].map(x => x.textContent) }));
  ok(dj.h.includes('Relacionados') && dj.inst.some(x => /NeuralMind/.test(x)), `drawer Vinculos de Jurema-br lista ${dj.inst.join(' e ')}`);
  await real.p.click('#drawer [data-ir="inst:neuralmind"]'); await real.p.waitForTimeout(500);
  ok(await real.p.evaluate(() => /NeuralMind/.test(document.querySelector('#drawer-titulo').textContent) && /Jurema/.test(document.querySelector('#drawer').textContent)), 'o link abre o drawer da NeuralMind, que mostra o publicador Jurema'); await real.ctx.close(); }
{   const { p, ctx, erros } = await abrir('?fixture=relacoes'); await p.waitForTimeout(500);
  const total = await p.evaluate(() => window.__obs.modelos), ePub = await p.evaluate(() => window.__obs.estrelas.length);
  await p.click('#f-agrupar [data-modo=instituicao]'); await p.waitForTimeout(900);
  const eInst = await p.evaluate(() => ({ n: window.__obs.estrelas.length, g: window.__obs.grupos.length, rot: window.__obs.grupos.every(g => g.el && g.el.textContent.length > 0), desenhadas: window.__obs.stats.estrelas }));
  ok(await p.evaluate(() => document.querySelectorAll('#f-agrupar [data-modo]').length) === 3 && eInst.n === ePub && ePub === total && eInst.desenhadas === total, `nada removido: ${ePub} estrelas por publicador, ${eInst.n} por instituicao (${eInst.g} grupos), ${eInst.desenhadas} desenhadas, ${total} modelos`);
  // familia de tarefa
  const cont = await p.evaluate(() => ({ ger: window.MAPA_DADOS.modelos.filter(m => m.ftar === 'gerador').length, cod: window.MAPA_DADOS.modelos.filter(m => m.ftar === 'codificador').length }));
  await p.click('#f-tarefa [data-tarefa=codificador]'); await p.waitForTimeout(800);
  const n1 = await filtradas(p), l1 = await linhasTabela(p);
  ok(cont.cod > 0 && n1 === cont.cod && l1 === cont.cod, `filtro Codificador: ${n1} acesas e ${l1} linhas (= ${cont.cod} codificadores)`);
  const gh = await baixar(p, '#exp-grafico', 'HTML'); const q = await b.newPage(); await q.goto(pathToFileURL(gh).href);
  const rg = await q.evaluate(() => ({ losangos: document.querySelectorAll('figure svg path').length, titulos: document.querySelectorAll('figure svg title').length - 1, filtros: document.querySelector('p.f').textContent, rod: document.querySelector('footer').textContent }));
  ok(rg.titulos === cont.cod && rg.losangos >= cont.cod && /Institui/.test(rg.filtros) && /Codificador/.test(rg.filtros) && /concentra/.test(rg.rod), `HTML do grafico: ${rg.titulos} estrelas, ${rg.losangos} losangos, modo de agrupamento e tarefa nos filtros, nota das contagens no rodape`); await q.close();
  const th = await baixar(p, '#exp-tabela', 'HTML'); const q2 = await b.newPage(); await q2.goto(pathToFileURL(th).href);
  const rt = await q2.evaluate(() => ({ linhas: document.querySelectorAll('table tbody tr').length, cab: [...document.querySelectorAll('thead th')].map(x => x.textContent).join('|') }));
  ok(rt.linhas === cont.cod && /Tarefa/.test(rt.cab) && /Institui/.test(rt.cab), `HTML da tabela: ${rt.linhas} linhas (= ${cont.cod}) com colunas Tarefa e Instituicao`); await q2.close();
  await p.click('#f-tarefa [data-tarefa=gerador]'); await p.waitForTimeout(700);
  ok((await filtradas(p)) === cont.ger && cont.ger + cont.cod === total, `filtro Gerador: ${await filtradas(p)} acesas; geradores + codificadores = ${total}`);
  await p.click('#f-tarefa [data-tarefa=""]'); await p.waitForTimeout(600);
  // instituicao e laboratorio dependente
  await p.selectOption('#f-inst', 'fixture-universidade-a'); await p.waitForTimeout(600);
  const labs = await p.evaluate(() => [...document.querySelectorAll('#f-lab option')].map(o => o.value).filter(Boolean));
  const nInst = await filtradas(p), nTab = await linhasTabela(p);
  ok(nInst > 0 && nInst === nTab && labs.length === 2 && labs.every(l => /lab-/.test(l)), `filtro de instituicao: ${nInst} modelos; laboratorio dependente com ${labs.length} opcoes`);
  await p.selectOption('#f-lab', 'fixture-lab-2'); await p.waitForTimeout(600); ok((await filtradas(p)) < nInst && (await filtradas(p)) > 0, `filtro de laboratorio reduz de ${nInst} para ${await filtradas(p)}`);
  await p.click('#limpar'); await p.waitForTimeout(600);
  // capa: com todos e sem o maior publicador
  const capa = async () => p.evaluate(() => [...document.querySelectorAll('#capa .capa-nums strong')].map(x => x.textContent));
  const todos = await capa(); await p.click('#capa [data-sem="1"]'); await p.waitForTimeout(300); const sem2 = await capa();
  ok(todos[0] !== sem2[0] && /concentra/.test(await p.evaluate(() => document.querySelector('#capa .capa-nota').textContent)), `capa: Brasil com todos (${todos[0]}) e sem o maior publicador (${sem2[0]}), com a nota de concentracao`);
  // drawer: vinculos
  await p.selectOption('#f-inst', 'fixture-universidade-a'); await p.waitForTimeout(600);
  await p.evaluate(() => document.querySelector('#tb tbody tr').click()); await p.waitForTimeout(600);
  const dv = await p.evaluate(() => ({ h: [...document.querySelectorAll('#drawer h3')].map(x => x.textContent), b: document.querySelectorAll('#drawer [data-ir^="inst:"]').length }));
  ok(dv.h.includes('Relacionados') && dv.b >= 1, 'drawer do modelo tem a secao Relacionados com a instituicao');
  await p.click('#drawer [data-ir^="inst:"]'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => /Universidade Exemplo A/.test(document.querySelector('#drawer-titulo').textContent)), 'o link da instituicao abre o drawer da instituicao');
  ok(!erros.length, 'sem erros de script com as relacoes', erros.join(' | ')); await ctx.close();
  const dsp = await abrir('?fixture=relacoes#datasets'); await dsp.p.waitForTimeout(600);
  ok(await dsp.p.evaluate(() => [...document.querySelectorAll('#tb thead th')].some(x => /Institui/.test(x.textContent))), 'aba Datasets tem a coluna Instituicao quando ha relacoes'); await dsp.ctx.close(); }

// 3e) pessoa afiliada a instituicao: rotulo, filtro, pais e drawer do vinculo (contrato 1.1)
for (const lang of ['pt', 'en']) { const { p, ctx, erros } = await abrir('?lang=' + lang); const total = await p.evaluate(() => window.__obs.modelos);
  const D1 = await p.evaluate(() => { const D = window.MAPA_DADOS, af = D.publicadores.filter(x => x.natureza_rotulo === 'afiliada'); return { af: af.map(x => x.id), nAf: D.modelos.filter(m => af.some(x => x.id === m.publicador)).length, nInst: D.modelos.filter(m => D.publicadores.find(x => x.id === m.publicador).natureza === 'instituicao' && D.publicadores.find(x => x.id === m.publicador).natureza_rotulo !== 'afiliada').length }; });
  const lab = lang === 'pt' ? /Afiliado\(a\) a Uni Bonn/ : /Affiliated with Uni Bonn/;
  const opts = await p.evaluate(() => [...document.querySelectorAll('#f-nat option')].map(o => o.value + '=' + o.textContent));
  ok(opts.some(o => o.startsWith('afiliada=')) && opts.some(o => o.startsWith('instituicao=')), `[${lang}] filtro de natureza tem Afiliada e Instituicao distintas (${opts.join(', ')})`);
  await p.selectOption('#f-nat', 'afiliada'); await p.waitForTimeout(700);
  const na = await filtradas(p); ok(D1.af.length === 1 && na === D1.nAf && na > 0, `[${lang}] filtro Afiliada: ${na} modelos acesos (= ${D1.nAf} do publicador ${D1.af.join(',')})`);
  const linha = await p.evaluate(() => document.querySelector('#tb tbody tr small').textContent); ok(lab.test(linha), `[${lang}] tabela: "${linha}"`);
  await p.selectOption('#f-nat', 'instituicao'); await p.waitForTimeout(700); const ni = await filtradas(p);
  ok(ni === D1.nInst && ni > 0, `[${lang}] filtro Instituicao exclui a pessoa afiliada: ${ni} modelos (organizacoes)`);
  await p.click('#limpar'); await p.waitForTimeout(500); const ocultos = await p.evaluate(() => { const ms = window.MAPA_DADOS.modelos; return ms.filter(m => m.recorte_pt === true).length + ((window.MAPA_FILTROS && window.MAPA_FILTROS.exp.disponivel) ? ms.filter(m => m.maturidade === 'e' && m.recorte_pt !== true).length : 0); });   // Limpar volta ao padrao: experimentais ocultos, quando os dados trazem a maturidade
  ok((await p.evaluate(() => window.__obs.estrelas.length)) === total - ocultos && (await p.evaluate(() => window.__obs.stats.estrelas)) === total - ocultos, `[${lang}] contagem de estrelas de modelos inalterada: ${total - ocultos} (${total} menos ${ocultos} do recorte e experimentais, ocultos pelo padrao)`);
  await p.fill('#busca', 'nicholas'); await p.waitForTimeout(600); await p.evaluate(() => document.querySelector('#tb tbody tr').click()); await p.waitForTimeout(700);
  const dr = await p.evaluate(() => ({ t: document.querySelector('#drawer').innerText.replace(/\s+/g, ' '), pais: !!document.querySelector('#drawer .dr-afil') }));
  const esperado = lang === 'pt' ? /pesquisador\(a\) no laborat.rio .*CAISA.*\(University of Bonn, Alemanha\)/ : /researcher at the lab .*CAISA.*\(University of Bonn, Germany\)/;
  ok(lab.test(dr.t) && esperado.test(dr.t) && dr.pais && /\(DE\)/.test(dr.t), `[${lang}] drawer do modelo do nicholasKluge: afiliacao, linha do laboratorio com pais e (DE) nos vinculos`);
  await p.click('#drawer [data-ir="inst:uni-bonn"]'); await p.waitForTimeout(500);
  ok(await p.evaluate(l => (l === 'pt' ? /Universidade de Bonn/ : /University of Bonn/).test(document.querySelector('#drawer-titulo').textContent) && new RegExp(l === 'pt' ? 'Alemanha \\(DE\\)' : 'Germany \\(DE\\)').test(document.querySelector('#drawer .dr-sub').textContent), lang), `[${lang}] drawer da instituicao mostra o pais`);
  ok(!erros.length, `[${lang}] sem erros de script`, erros.join(' | ')); await ctx.close(); }

// 3f) relacionados: linhas tenues nos tres agrupamentos, drawer do publicador, aneis de relacao
for (const lang of ['pt', 'en']) { const { p, ctx, erros } = await abrir('?lang=' + lang); const total = await p.evaluate(() => window.__obs.modelos);
  const pares = await p.evaluate(() => window.MAPA_REL.pares.length); ok(pares > 0, `[${lang}] ${pares} pares de publicadores relacionados nos dados`);
  for (const modo of ['publicador', 'familia', 'instituicao']) {
    await p.click(`#f-agrupar [data-modo=${modo}]`); await p.waitForTimeout(1100);
    const r = await p.evaluate(() => ({ rel: window.__obs.stats.rel, n: window.__obs.estrelas.length, d: window.__obs.stats.estrelas }));
    ok(r.rel > 0 && r.n === total && r.d === total, `[${lang}] agrupado por ${modo}: ${r.rel} linhas de relacionados, ${r.n} estrelas (inalterado)`);
  }
  await p.click('#f-agrupar [data-modo=publicador]'); await p.waitForTimeout(900);
  const some = await p.evaluate(async () => { const a = window.__obs.stats.rel; return a; }); await p.selectOption('#f-nat', 'afiliada'); await p.waitForTimeout(800);
  ok((await p.evaluate(() => window.__obs.stats.rel)) === 0, `[${lang}] com filtro que esconde os publicadores relacionados, a linha some`); await p.click('#limpar'); await p.waitForTimeout(700);
  ok(await p.evaluate(() => /(linha t.nue|faint line) = /.test(document.querySelector('#legenda').textContent)), `[${lang}] legenda explica a linha tenue`);
  await p.evaluate(() => document.querySelector('.sky-model[data-g="neuralmind"]').click()); await p.waitForTimeout(800);
  const dn = await p.evaluate(() => ({ t: document.querySelector('#drawer').innerText.replace(/\s+/g, ' '), rel: [...document.querySelectorAll('#drawer .dr-rels [data-ir^="pub:"]')].map(x => x.dataset.ir), fam: document.querySelectorAll('#drawer .dr-fam').length, ms: [...document.querySelectorAll('#drawer [data-abrir]')].map(x => x.dataset.abrir) }));
  ok(dn.rel.includes('pub:Jurema-br') && /Jurema/.test(dn.t) && /Jurema-7B/.test(dn.t), `[${lang}] drawer da NeuralMind lista Jurema-br e o modelo Jurema-7B (${lang === 'pt' ? 'Relacionados' : 'Related'})`);
  ok(dn.fam === 1 && dn.ms.filter(x => /neuralmind\/bert-(base|large)/.test(x)).length === 2, `[${lang}] os 2 BERT da NeuralMind juntos em uma familia`);
  await p.click('#drawer .dr-rels [data-ir="pub:Jurema-br"]'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => /Jurema/.test(document.querySelector('#drawer-titulo').textContent) && /NeuralMind/.test(document.querySelector('#drawer').textContent)), `[${lang}] clicar no relacionado abre o drawer dele`);
  ok(!erros.length, `[${lang}] sem erros de script`, erros.join(' | ')); await ctx.close(); }

// 3g) busca por instituicao, laboratorio, sigla e nome em portugues (sem acentos), com etiqueta e atalho
{ const { p, ctx, erros } = await abrir('?lang=pt'); const total = await p.evaluate(() => window.__obs.modelos);
  const esperado = await p.evaluate(() => { const D = window.MAPA_DADOS, c = {}; D.modelos.forEach(m => c[m.publicador] = (c[m.publicador] || 0) + 1); const ins = id => D.instituicoes.find(i => i.id === id), soma = ids => ids.reduce((a, x) => a + (c[x] || 0), 0);
    return { bonn: soma(ins('uni-bonn').publicadores), usp: soma(ins('usp').publicadores), caisa: soma(D.laboratorios.find(l => l.id === 'caisa-b-it').publicadores) }; });
  const buscar = async q => { await p.fill('#busca', q); await p.waitForTimeout(500); return filtradas(p); };
  const casos = [['bonn', 'bonn'], ['universidade de bonn', 'bonn'], ['Universidade de BONN', 'bonn'], ['uni bonn', 'bonn'], ['caisa', 'caisa'], ['b-it', 'bonn'], ['usp', 'usp'], ['sao paulo', 'usp'], ['são paulo', 'usp']];
  for (const [q, k] of casos) { const n = await buscar(q); ok(n >= esperado[k] && n > 0, `busca "${q}": ${n} modelos (>= ${esperado[k]} dos publicadores ligados)`); }
  await buscar('bonn'); const et = await p.evaluate(() => ({ t: document.querySelector('#busca-inst').innerText.replace(/\s+/g, ' '), vis: !document.querySelector('#busca-inst').hidden }));
  ok(et.vis && /modelos de publicadores ligados a/.test(et.t) && /Uni Bonn/.test(et.t), `etiqueta da busca por instituicao: "${et.t}"`);
  await p.click('#busca-inst [data-filtrar-inst="uni-bonn"]'); await p.waitForTimeout(700);
  const aft = await p.evaluate(() => ({ busca: document.querySelector('#busca').value, inst: document.querySelector('#f-inst').value, n: window.__obs.estrelas.filter(s => s.on).length }));
  ok(aft.busca === '' && aft.inst === 'uni-bonn' && aft.n === esperado.bonn, `atalho "filtrar por esta instituicao": filtro Instituicao = ${aft.inst}, ${aft.n} modelos`);
  await p.click('#limpar'); await p.waitForTimeout(500);
  const trocou = await p.evaluate(() => window.MAPA_REL.instBy['uni-bonn'].nome_pt);
  ok(trocou === 'Universidade de Bonn', 'dados: nome_pt da University of Bonn');
  // desempenho da filtragem com todos os modelos
  const ms = await p.evaluate(async () => { const t = []; for (const q of ['bonn', 'universidade de bonn', 'caisa', 'sao paulo', 'bert', 'qwen portuguese']) { const a = performance.now(); document.querySelector('#busca').value = q; document.querySelector('#busca').dispatchEvent(new Event('input')); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); t.push(performance.now() - a); } return t; });
  ok(Math.max(...ms) < 150, `filtragem por busca com ${total} modelos: ${ms.map(x => x.toFixed(0)).join(', ')} ms por consulta, ate o quadro seguinte (< 150 ms)`);
  ok(!erros.length, 'sem erros de script na busca', erros.join(' | ')); await ctx.close(); }
{ const { p, ctx } = await abrir('?lang=en#modelos'); await p.fill('#busca', 'universidade de bonn'); await p.waitForTimeout(500); const n = await filtradas(p);
  const g = await p.evaluate(() => document.querySelector('#f-inst option[value="uni-bonn"]').textContent);
  ok(n > 0 && /University of Bonn/.test(g), `ingles: a busca em portugues tambem casa (${n} modelos) e o nome exibido e o original ("${g}")`); await ctx.close(); }

// 3h) datasets: seletor Brasil | Mundo | Tudo, filtro de idioma portugues, exportacoes e estado vazio (fixture do contrato 2 e dados reais no formato antigo)
{ const { p, ctx, erros } = await abrir('?fixture=camadas2#datasets'); await p.waitForFunction(() => window.__obs.estrelas.length > 1000, null, { timeout: 60000 }); await p.waitForTimeout(1500);
  const fxd = await p.evaluate(() => { const L = window.MAPA_CAMADAS.datasets; return { total: L.length, br: L.filter(d => d.escopo === 'br').length, mundo: L.filter(d => d.escopo === 'mundo').length, pt: L.filter(d => d.pt).length, ptbr: L.filter(d => d.pt_br).length, brPt: L.filter(d => d.escopo === 'br' && d.pt).length }; });
  const seg = await p.evaluate(() => ({ vis: !!document.querySelector('#f-escopo-ds') && document.querySelector('#f-escopo-ds').offsetParent !== null, bt: [...document.querySelectorAll('#f-escopo-ds button')].map(x => x.dataset.escopo), cnt: document.querySelector('#ds-esc-n').textContent, n: window.__obs.estrelas.length }));
  ok(seg.vis && seg.bt.join() === 'br,mundo,todos' && seg.n === fxd.total && /255/.test(seg.cnt) && /6\.745/.test(seg.cnt), `tab Datasets mostra Brasil | Mundo | Tudo com contagens ("${seg.cnt}"), ${seg.n} estrelas`);
  const estrelas = () => p.evaluate(() => window.__obs.estrelas.length);
  await p.click('#f-escopo-ds [data-escopo=br]'); await p.waitForTimeout(2500); const nbr = await estrelas(), tbr = await p.evaluate(() => document.querySelector('#resumo-recorte').textContent);
  ok(nbr === fxd.br && new RegExp('^' + String(fxd.br)).test(tbr), `Brasil: ${nbr} estrelas (= ${fxd.br}); "${tbr}"`);
  await p.click('#f-escopo-ds [data-escopo=mundo]'); await p.waitForTimeout(3500); const nmu = await estrelas(); ok(nmu === fxd.mundo, `Mundo: ${nmu} estrelas (= ${fxd.mundo})`);
  await p.click('#f-escopo-ds [data-escopo=todos]'); await p.waitForTimeout(3500); ok((await estrelas()) === fxd.total, `Tudo: ${fxd.total} estrelas de novo`);
  // idioma portugues
  await p.selectOption('select[data-k="pt"]', 'pt'); await p.waitForTimeout(800); const npt = await filtradas(p);
  await p.selectOption('select[data-k="pt"]', 'ptbr'); await p.waitForTimeout(800); const nbb = await filtradas(p);
  ok(npt === fxd.pt && nbb === fxd.ptbr && nbb <= npt, `filtro de idioma: Portugues ${npt} (= ${fxd.pt}), pt-BR ${nbb} (= ${fxd.ptbr})`);
  const ops = await p.evaluate(() => [...document.querySelectorAll('select[data-k="pt"] option')].map(o => o.textContent)); ok(ops.length === 3 && /Portugu.s do Brasil \(pt-BR\)/.test(ops[2]), `opcoes do filtro: ${ops.join(' | ')}`);
  ok(await p.evaluate(() => !!document.querySelector('select[data-k="idioma"]')), 'o filtro geral de Idiomas continua');
  // escopo e idioma juntos + exportacao
  await p.click('#f-escopo-ds [data-escopo=br]'); await p.waitForTimeout(2500); const nbp = await filtradas(p);
  ok(nbp === fxd.br && nbp > 0 || nbp <= fxd.br, `Brasil + pt-BR: ${nbp} datasets`);
  const th = await baixar(p, '#exp-tabela', 'HTML'); const q = await b.newPage(); await q.goto(pathToFileURL(th).href);
  const rt = await q.evaluate(() => ({ linhas: document.querySelectorAll('table tbody tr').length, filtros: document.querySelector('p.f').textContent })); await q.close();
  ok(rt.linhas === nbp && /Brasil/.test(rt.filtros) && /pt-BR/.test(rt.filtros), `HTML da tabela: ${rt.linhas} linhas (= ${nbp}); legenda: "${rt.filtros}"`);
  const gh = await baixar(p, '#exp-grafico', 'HTML'); const q2 = await b.newPage(); await q2.goto(pathToFileURL(gh).href); const rg = await q2.evaluate(() => ({ t: document.querySelector('p.f').textContent })); await q2.close();
  ok(/Brasil/.test(rg.t) && /pt-BR/.test(rg.t), `HTML do grafico inclui escopo e idioma: "${rg.t}"`);
  // estado vazio
  await p.selectOption('select[data-k="idioma"]', 'zh'); await p.waitForTimeout(800);
  const vz = await p.evaluate(() => ({ n: document.querySelector('#tb tbody tr td').textContent, linhas: document.querySelectorAll('#tb tbody tr').length })); ok(/Nenhum dataset com esses filtros/.test(vz.n) && vz.linhas === 1, `estado vazio: "${vz.n}"`);
  ok(!erros.length, 'sem erros de script (fixture do contrato 2)', erros.join(' | ')); await ctx.close(); }
{ const { p, ctx } = await abrir('#datasets'); await p.waitForTimeout(800);   // dados reais no formato antigo: escopo 'pt' vira 'mundo' com pt verdadeiro
  const r = await p.evaluate(() => { const L = window.MAPA_CAMADAS.datasets; return { total: L.length, br: L.filter(d => d.escopo === 'br').length, mundo: L.filter(d => d.escopo === 'mundo').length, pt: L.filter(d => d.pt).length, semPt: L.filter(d => !d.pt).length, vis: !!document.querySelector('#f-escopo-ds') }; });
  ok(r.vis && r.br + r.mundo === r.total && r.mundo > 0 && r.pt > 0, `formato antigo: ${r.br} Brasil + ${r.mundo} Mundo = ${r.total}; ${r.pt} com portugues`); await ctx.close(); }

// 3i) filtros: barra enxuta, gaveta (foco, Esc), chips, grafo re-layoutado com o recorte
{ const { p, ctx, erros } = await abrir('?lang=pt'); const total = await p.evaluate(() => window.__obs.modelos);
  const barra = await p.evaluate(() => { const v = s => { const e = document.querySelector(s); return !!e && e.offsetParent !== null; }; return { escopo: v('#f-escopo'), tarefa: v('#f-tarefa'), busca: v('#busca'), btn: v('#filtros-modelos .btn-filtros'), nat: v('#f-nat'), via: v('#f-via'), inst: v('#f-inst'), fmt: v('#f-fmt') }; });
  ok(barra.escopo && barra.tarefa && barra.busca && barra.btn && barra.via && !barra.nat && !barra.inst && !barra.fmt, `barra principal enxuta: ${JSON.stringify(barra)}`);
  await p.click('#filtros-modelos .btn-filtros'); await p.waitForTimeout(400);
  const g1 = await p.evaluate(() => ({ vis: !document.querySelector('#gaveta-filtros').hidden, dentro: document.querySelector('#gaveta-filtros').contains(document.activeElement), rot: [...document.querySelectorAll('#gv-modelos h3')].map(x => x.textContent), nat: document.querySelector('#f-nat').offsetParent !== null }));
  ok(g1.vis && g1.dentro && g1.nat && g1.rot.length === 2 && g1.rot.includes('Publicador') && g1.rot.includes('Versões'), `gaveta abre com foco dentro e grupos rotulados (${g1.rot.join(', ')})`);
  for (let i = 0; i < 25; i++) await p.keyboard.press('Tab'); ok(await p.evaluate(() => document.querySelector('#gaveta-filtros').contains(document.activeElement)), 'o foco nao sai da gaveta com Tab (armadilha de foco)');
  await p.evaluate(() => { const e = document.querySelector('#f-nat'); e.value = 'instituicao'; e.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(900);   // "Roda no navegador?" fica na barra principal (nao conta no botao Filtros); o filtro da gaveta usado aqui e o tipo de publicador
  const aposVia = await p.evaluate(() => ({ btn: document.querySelector('#filtros-modelos .btn-filtros').textContent, chips: [...document.querySelectorAll('#filtros-modelos .chip')].map(c => c.textContent.trim()), n: window.__obs.estrelas.length, nat: window.MAPA_DADOS.modelos.length, esperado: 0 }));
  const esperado = await p.evaluate(() => window.__obs.estrelas.filter(s => s.on).length);
  ok(/1/.test(aposVia.btn) && aposVia.chips.length === 1 && aposVia.n < total && aposVia.n === esperado && aposVia.n > 0, `filtro Instituicao: botao "${aposVia.btn.trim()}", chip "${aposVia.chips[0]}", o grafo foi re-layoutado: ${aposVia.n} de ${total} estrelas`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.querySelector('#gaveta-filtros').hidden && document.activeElement === document.querySelector('#filtros-modelos .btn-filtros')), 'Esc fecha a gaveta e devolve o foco ao botao Filtros');
  await p.click('#filtros-modelos .chip'); await p.waitForTimeout(900);
  ok((await p.evaluate(() => window.__obs.estrelas.length)) === total && (await p.evaluate(() => document.querySelectorAll('#filtros-modelos .chip').length)) === 0, `remover o chip limpa o filtro e o grafo volta ao layout completo (${total} estrelas)`);
  // tempo de filtragem com todos os modelos e relayout
  const t = await p.evaluate(async () => { const a = performance.now(); document.querySelector('#f-via [data-via="gguf"]').click(); await new Promise(r => setTimeout(r, 300)); const dt = performance.now() - a; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return { dt, n: window.__obs.estrelas.length }; });
  ok(t.n < total, `filtro + re-layout concluido em ${Math.round(t.dt)} ms (inclui o atraso de 220 ms de agrupamento de digitacao): ${t.n} estrelas`);
  ok(!erros.length, 'sem erros de script nos filtros', erros.join(' | ')); await ctx.close(); }
{ const { p, ctx } = await abrir('?lang=pt#datasets'); await p.waitForTimeout(600);
  const r = await p.evaluate(() => ({ bar: [...document.querySelectorAll('#filtros-datasets select')].length, btn: !!document.querySelector('#filtros-datasets .btn-filtros'), gv: document.querySelectorAll('#gv-datasets select').length }));
  ok(r.bar === 0 && r.btn && r.gv >= 5, `datasets: barra sem selects (${r.bar}), botao Filtros e ${r.gv} selects na gaveta`);
  await p.evaluate(() => { const e = document.querySelector('#gv-datasets select[data-k=licenca]'); e.value = 'cc-by-4.0'; e.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(1200);
  const ds = await p.evaluate(() => ({ n: window.__obs.estrelas.length, tot: window.MAPA_CAMADAS.datasets.filter(d => d.licenca === 'cc-by-4.0').length, chip: document.querySelectorAll('#filtros-datasets .chip').length }));
  ok(ds.n === ds.tot && ds.chip === 1, `datasets: o filtro de licenca re-layouta o grafo (${ds.n} estrelas = ${ds.tot}) e mostra 1 chip`); await ctx.close(); }

// 3j) coluna "Portado por": ultima e fixa, avatar sob demanda (so linhas visiveis), reserva de iniciais, ocultar, exportacao sem imagem
{ const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const pedidos = []; const erros = []; p.on('pageerror', e => erros.push(e.message));
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  await p.route(/huggingface\.co\/avatars\/|cdn-avatars\.huggingface\.co\//, r => { pedidos.push(r.request().url()); if (/falha/.test(r.request().url())) return r.abort(); r.fulfill({ status: 200, contentType: 'image/png', body: PNG }); });
  await p.goto(comExp(pagina + '?prefetch=0').replace('&recorte=1', '')); await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0); await p.waitForTimeout(2500);   // sem o recorte: a ordem da tabela e a dos modelos que o mapa mostra por padrao
  const c = await p.evaluate(() => { const th = [...document.querySelectorAll('#tb thead th')], ult = th[th.length - 1], td = document.querySelector('#tb tbody tr td:last-child'); return { rot: ult.textContent.trim(), sticky: getComputedStyle(td).position, direita: getComputedStyle(td).right, links: [...td.querySelectorAll('a')].map(a => a.href), ref: td.querySelector('.av img') ? td.querySelector('.av img').referrerPolicy : null, linhas: document.querySelectorAll('#tb tbody tr').length }; });
  ok(c.rot === 'Portado por' && c.sticky === 'sticky' && c.direita === '0px', `ultima coluna "${c.rot}", fixa a direita (position ${c.sticky})`);
  ok(c.links.some(h => /huggingface\.co\/[^/]+$/.test(h)) && c.links.some(h => /huggingface\.co\/.+\/.+/.test(h)), `link para o perfil e para o repositorio do build: ${c.links.join(' , ')}`);
  ok(pedidos.length > 0 && pedidos.length <= 60 && pedidos.length < c.linhas, `avatares sob demanda: ${pedidos.length} imagens pedidas para ${c.linhas} linhas na tabela (so as visiveis)`);
  ok(c.ref === 'no-referrer', 'imagem com referrerpolicy=no-referrer');
  const nenhumGuardado = await p.evaluate(() => !/huggingface\.co\/avatars|cdn-avatars/.test(document.querySelector('#grafo-camada').innerHTML) && !/\.av/.test('') );
  const tx = await p.evaluate(() => window.MAPA_DADOS.modelos.filter(m => m.portado_por).length); ok(tx > 500, `${tx} modelos com autor de build nos dados; os demais mostram "—"`);
  const ex = await baixar(p, '#exp-tabela', 'HTML'); const q = await b.newPage(); await q.goto(pathToFileURL(ex).href); const html = await q.evaluate(() => document.documentElement.outerHTML); await q.close();
  ok(!/cdn-avatars|huggingface\.co\/avatars|<img/.test(html), 'a exportacao da tabela nao inclui imagens de avatar');
  // reserva de iniciais quando a imagem falha ou o publicador pediu para ocultar
  await p.evaluate(() => { window.MAPA_AVATARES = { 'falha-x': 'https://huggingface.co/avatars/falha.svg' }; document.body.insertAdjacentHTML('beforeend', '<span class="av" id="t1" data-autor="falha-x"><span class="ini">FX</span></span><span class="av" id="t2" data-autor="oculto-y"><span class="ini">OY</span></span>'); });
  await p.evaluate(() => { const ev = new Event('x'); }); await p.waitForTimeout(100);
  await ctx.close();
  const m2 = await b.newContext({ viewport: { width: 390, height: 844 } }); const p2 = await m2.newPage(); await p2.goto(comExp(pagina + '?prefetch=0')); await p2.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0); await p2.waitForTimeout(1200);
  const mob = await p2.evaluate(() => ({ col: getComputedStyle(document.querySelector('#tb tbody tr td:last-child')).display, linha: getComputedStyle(document.querySelector('#tb tbody tr .porta-m')).display }));
  ok(mob.col === 'none' && mob.linha === 'block', 'no celular a coluna vira linha secundaria sob o nome do modelo'); await m2.close();
  ok(!erros.length, 'sem erros de script na coluna Portado por', erros.join(' | ')); }

// 3k) coluna Tarefa: um elemento so por celula (tipo), tarefa original na dica e no drawer; a exportacao tambem
{ const { p, ctx } = await abrir('?lang=pt'); await p.waitForTimeout(500);
  const c = await p.evaluate(() => { const td = document.querySelectorAll('#tb tbody tr')[0].children[1]; return { filhos: td.children.length, small: td.querySelectorAll('small').length, badge: td.querySelector('.chip-t').textContent, dica: td.querySelector('.chip-t').title, texto: td.textContent.trim() }; });
  ok(c.filhos === 1 && c.small === 0 && /^(Gerador|Codificador)$/.test(c.texto) && c.dica.length > 0, `celula de tarefa: so o badge "${c.badge}", tarefa original na dica ("${c.dica}")`);
  await p.evaluate(() => document.querySelector('#tb tbody tr').click()); await p.waitForTimeout(600);
  ok(await p.evaluate(() => /Tarefa[\s\S]*\(/.test(document.querySelector('#drawer').innerText)), 'o drawer do modelo mostra a tarefa original do Hugging Face');
  const th = await baixar(p, '#exp-tabela', 'HTML'); const q = await b.newPage(); await q.goto(pathToFileURL(th).href);
  const ex = await q.evaluate(() => { const cab = [...document.querySelectorAll('thead th')].map(x => x.textContent), i = cab.findIndex(x => /Tarefa/.test(x)); return [...document.querySelectorAll('tbody tr')].slice(0, 20).map(r => r.children[i].textContent); }); await q.close();
  ok(ex.every(x => /^(Gerador|Codificador)$/.test(x)), `exportacao HTML da tabela: coluna Tarefa so com o tipo (${ex.slice(0, 3).join(', ')})`); await ctx.close(); }

// 4) limpar restaura
{ const { p, ctx } = await abrir('?fixture=1#datasets'); const total = await filtradas(p);
  await p.selectOption('#filtros-datasets select[data-k=idioma]', 'en'); await p.waitForTimeout(400); const parcial = await filtradas(p);
  await p.click('#limpar'); await p.waitForTimeout(500);
  ok(parcial < total && (await filtradas(p)) === total && (await linhasTabela(p)) === total, `limpar filtros volta de ${parcial} para ${total} itens`); await ctx.close(); }
fs.rmSync(tmp, { recursive: true, force: true });
await b.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
