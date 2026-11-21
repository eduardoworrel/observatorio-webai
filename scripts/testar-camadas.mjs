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
const abrir = async (q = '', semCamadas = false) => {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  if (semCamadas) await p.addInitScript(() => { let d = null; Object.defineProperty(window, 'MAPA_DADOS', { configurable: true, get() { return d; }, set(v) { delete v.datasets; delete v.benchmarks; delete v.partes; d = v; } }); }); const erros = []; p.on('pageerror', e => erros.push(e.message));
  await p.goto(pagina + q); await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0); await p.waitForTimeout(900);
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
await aba('datasets', async p => { await p.selectOption('#filtros-datasets select[data-k=escopo]', 'br'); await p.selectOption('#filtros-datasets select[data-k=licenca]', 'cc-by-4.0'); }, 'filtro br + licenca cc-by-4.0');
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
    const erros = []; p.on('pageerror', e => erros.push(e.message)); return { ctx, p, pedidos, erros, ir: (o) => p.goto(base + q, o) }; };
  const FALTA_FONTE = /font|woff|CORS|ERR_FAILED/i;
  // 1) tela de carregamento desde o primeiro quadro, com os dados atrasados
  { const t = await abrirHttp('?prefetch=0'); await t.p.route('**/data.js', async r => { await new Promise(x => setTimeout(x, 1500)); r.continue(); });
    await t.ir({ waitUntil: 'commit' }); await t.p.waitForTimeout(500);
    const l = await t.p.evaluate(() => { const e = document.getElementById('carregando'); return e ? { visivel: getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 100, role: e.getAttribute('role'), live: e.getAttribute('aria-live'), msg: document.getElementById('c-msg').textContent, etapa: document.getElementById('c-etapa').textContent, html: window.__carga.t.html } : null; });
    ok(l && l.visivel && l.role === 'status' && l.live === 'polite' && /Carregando modelos, datasets e benchmarks/.test(l.msg) && /Baixando dados/.test(l.etapa), `tela de carregamento visivel antes dos dados (inline em ${l && l.html} ms): "${l && l.msg}" / "${l && l.etapa}"`);
    await t.p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0); await t.p.waitForTimeout(900);
    const f = await t.p.evaluate(() => ({ some: !document.getElementById('carregando'), t: window.__carga.t }));
    ok(f.some && f.t.pronto > f.t.etapa1, `a tela some depois do primeiro desenho (etapas em ms: ${JSON.stringify(f.t)})`);
    const dados = t.pedidos.filter(x => /^data/.test(x)); ok(dados.length === 1 && dados[0].startsWith('data.js'), `com prefetch desligado, so ${dados.join(', ')} foi pedido na carga inicial`);
    const tam = fs.statSync(path.join(raiz, 'web', 'data.js')).size; ok(tam < 4e6, `data.js inicial tem ${(tam / 1e6).toFixed(2)} MB brutos (< 4 MB)`);
    await t.ctx.close(); }
  // 2) rede lenta: indicador imediato, progresso real, estrelas completas
  { const t = await abrirHttp('?prefetch=0'); await t.ir(); await t.p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0); await t.p.waitForTimeout(500);
    const cdp = await t.ctx.newCDPSession(t.p); await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 120, downloadThroughput: 250 * 1024, uploadThroughput: 250 * 1024 });
    await t.p.evaluate(() => document.querySelector('#tab-datasets').click()); await t.p.waitForTimeout(150);
    const i1 = await t.p.evaluate(() => ({ vis: !document.querySelector('#carga-camada').hidden, txt: document.querySelector('#carga-camada .carga-txt').textContent, w: document.querySelector('#carga-camada .c-barra-p i').style.width, tab: window.__obs.estado.tab }));
    await t.p.waitForTimeout(1200); const i2 = await t.p.evaluate(() => document.querySelector('#carga-camada .c-barra-p i').style.width);
    ok(i1.vis && /Carregando 2\.221 datasets/.test(i1.txt) && i1.tab === 'datasets', `indicador da aba aparece na hora: "${i1.txt}"`);
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
    await t.p.unroute('**/data-benchmarks.js'); await t.p.click('#carga-camada .carga-retry'); await t.p.waitForFunction(() => window.__obs.estrelas.length === 10, null, { timeout: 15000 });
    ok(await t.p.evaluate(() => document.querySelector('#carga-camada').hidden), 'Tentar de novo carrega os 10 benchmarks e esconde o indicador'); await t.ctx.close(); }
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

// 4) limpar restaura
{ const { p, ctx } = await abrir('?fixture=1#datasets'); const total = await filtradas(p);
  await p.selectOption('#filtros-datasets select[data-k=idioma]', 'en'); await p.waitForTimeout(400); const parcial = await filtradas(p);
  await p.click('#limpar'); await p.waitForTimeout(500);
  ok(parcial < total && (await filtradas(p)) === total && (await linhasTabela(p)) === total, `limpar filtros volta de ${parcial} para ${total} itens`); await ctx.close(); }
fs.rmSync(tmp, { recursive: true, force: true });
await b.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
