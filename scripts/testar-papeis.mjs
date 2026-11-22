#!/usr/bin/env node
// Papel da instituicao no modelo (desenvolveu | financiou | em parceria | plataforma): sub-filtro na gaveta, rotulos na tabela e nos chips, motivo de origem,
// exportacao com o papel, leitura tolerante (sem o campo, o sub-filtro some) e i18n pt/en. Fixture: ?fixture=papeis.
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path'; import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const WEB = path.join(raiz, 'web');
let falhas = 0; const ok = (c, m, x = '') => { console.log((c ? 'ok    ' : 'FALHA ') + m + (c || !x ? '' : '  ' + x)); if (!c) falhas++; };
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
async function abrir(q) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage();
  // exp=1 na URL abaixo: o conjunto inteiro (o filtro Experimentais tem teste proprio)
  if (/sempapel/.test(q)) await p.addInitScript(() => { let d = null; Object.defineProperty(window, 'MAPA_DADOS', { configurable: true, get() { return d; }, set(v) { (v.modelos || []).forEach(m => { m.creditos = (m.creditos || []).map(c => c.split(':').slice(0, 2).join(':')); delete m.origem_motivo; delete m.origem_fonte; }); d = v; } }); });   // simula dados sem o papel do credito
  await p.goto(pathToFileURL(path.join(WEB, 'index.html')).href + '?prefetch=0&exp=1' + q); await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0, null, { timeout: 60000 }); await p.waitForTimeout(1200); return p;
}
const escolher = (p, id) => p.evaluate(i => { const s = document.querySelector('#f-inst'); s.value = i; s.dispatchEvent(new Event('change', { bubbles: true })); }, id);
const ligados = p => p.evaluate(() => window.__obs.estrelas.filter(s => s.on).length);
const esperar = async (p, f) => { for (let i = 0; i < 40; i++) { if (await f()) return true; await p.waitForTimeout(150); } return false; };
{
  const p = await abrir('&fixture=papeis'); await p.locator('.btn-filtros').first().click(); await p.waitForTimeout(500);
  const T = await p.evaluate(() => { const r = {}; for (const pa of ['desenvolvedor', 'financiador', 'parceiro', 'plataforma']) r[pa] = window.MAPA_DADOS.modelos.filter(m => m._papel['inst:fapergs'] === pa).length; r.ufmg = window.MAPA_DADOS.modelos.filter(m => m._papel['inst:ufmg'] === 'plataforma').length; return r; });
  ok(T.financiador >= 10 && T.parceiro === 1 && T.ufmg === 1, 'fixture com os papeis', JSON.stringify(T));
  ok(await p.locator('#w-papel').isHidden(), 'sem instituicao escolhida, o sub-filtro Papel nao aparece');
  const opt = await p.locator('#f-inst option[value="fapergs"]').innerText(); ok(/financiou \d+/.test(opt) && /em parceria 1/.test(opt), 'opcao da instituicao mostra a contagem por papel', opt);
  await escolher(p, 'fapergs'); await p.waitForTimeout(500);
  ok(await p.locator('#w-papel').isVisible() || (await p.locator('#w-papel').getAttribute('hidden')) === null, 'com instituicao, o sub-filtro Papel aparece');
  const bt = await p.locator('#f-papel button').allInnerTexts(); ok(bt.join('|') === 'Todos|Desenvolveu|Financiou|Em parceria|Plataforma', 'opcoes: Todos | Desenvolveu | Financiou | Em parceria | Plataforma', bt.join('|'));
  ok(await p.locator('#f-papel [aria-pressed=true]').innerText() === 'Todos', 'padrao: Todos');
  await esperar(p, async () => (await ligados(p)) === T.financiador + T.parceiro + T.desenvolvedor);
  ok(await ligados(p) === T.financiador + T.parceiro + T.desenvolvedor, 'Todos: todos os modelos ligados a FAPERGS', String(await ligados(p)));
  for (const [pa, rot] of [['financiador', 'Financiou'], ['parceiro', 'Em parceria'], ['desenvolvedor', 'Desenvolveu'], ['plataforma', 'Plataforma']]) {
    await p.locator('#f-papel button', { hasText: new RegExp('^' + rot + '$') }).click(); await esperar(p, async () => (await ligados(p)) === T[pa]); await p.waitForTimeout(300);
    ok(await ligados(p) === T[pa], `papel ${rot}: ${T[pa]} modelos`, String(await ligados(p)));
    ok(await p.evaluate(pp => window.__obs.estrelas.filter(s => s.on).every(s => s.m._papel['inst:fapergs'] === pp), pa), `papel ${rot}: so modelos com esse papel`);
  }
  await p.locator('#f-papel button', { hasText: /^Financiou$/ }).click(); await p.waitForTimeout(600);
  const chips = await p.locator('.chips-filtros').first().innerText(); ok(/FAPERGS · financiou/.test(chips), 'chip do filtro ativo: "FAPERGS · financiou"', chips);
  await p.evaluate(() => document.querySelector('#gaveta-ok').click()); await p.waitForTimeout(500);
  await esperar(p, async () => (await p.locator('#tb tbody tr').count()) > 0);
  const tb = await p.locator('#tb tbody').first().innerText(); ok(/FAPERGS · financiou/.test(tb), 'tabela: instituicao com o papel ("FAPERGS · financiou")', tb.slice(0, 120));
  // painel: origem e creditos com papel
  await p.locator('#tb tbody tr').first().click(); await p.waitForTimeout(500);
  const dr = await p.locator('#drawer').innerText(); ok(/Brasil\s*financiado por FAPERGS/.test(dr) && /Financiado por\s*FAPERGS/.test(dr), 'painel: selo de origem "financiado por FAPERGS" e bloco de credito "Financiado por" com FAPERGS', dr.slice(0, 400));
  await p.keyboard.press('Escape');
  // exportacao
  await p.locator('#exp-tabela').click(); const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('[role=menuitem]', { hasText: 'HTML' }).first().click()]);
  const txt = fs.readFileSync(await dl.path(), 'utf8'); ok(/Papel: Financiou/.test(txt) && /FAPERGS · financiou/.test(txt), 'exportacao: legenda com o papel e linhas com o rotulo');
  // limpar
  await p.locator('#limpar').click(); await p.waitForTimeout(500); ok(await p.evaluate(() => window.__obs.estado.papel === 'todos' && !window.__obs.estado.inst), 'Limpar volta o papel a Todos');
  await p.context().close();
}
{
  const p = await abrir('&sempapel=1');
  await escolher(p, 'fapergs'); await p.waitForTimeout(600);
  ok(await p.locator('#w-papel').isHidden(), 'sem o campo de papel nos dados, o sub-filtro some');
  const opt = await p.locator('#f-inst option[value="fapergs"]').innerText(); ok(!/ · /.test(opt.replace(/^[^(]*\([^)]*\)/, '')) , 'sem papel: opcao sem contagem por papel', opt);
  await p.evaluate(() => document.querySelector('#gaveta-ok') && document.querySelector('#gaveta-ok').click()); await p.waitForTimeout(500);
  await esperar(p, async () => (await p.locator('#tb tbody tr').count()) > 0);
  const tb = await p.locator('#tb tbody').first().innerText(); ok(/FAPERGS/.test(tb) && !/financiou|desenvolveu|em parceria/.test(tb), 'sem papel: instituicao aparece sem rotulo de papel');
  await p.context().close();
}
{
  const app = fs.readFileSync(path.join(WEB, 'app.js'), 'utf8'), ia = app.indexOf('    pt: {\n'), ie = app.indexOf('    en: {\n'), ifim = app.indexOf('  var S = {');
  const chaves = x => new Set([...x.matchAll(/(?:^|[,{\s])([A-Za-z_]\w*): '/g)].map(m => m[1]));
  const pt = chaves(app.slice(ia, ie)), en = chaves(app.slice(ie, ifim));
  const ctx = { window: { MAPA_DADOS: { modelos: [] } } }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(WEB, 'filtros.js'), 'utf8'), ctx);
  const F = ctx.window.MAPA_FILTROS; for (const g of [F.exp.textos, F.roda.textos, F.papel.textos, F.rec.textos]) { Object.keys(g.pt).forEach(k => pt.add(k)); Object.keys(g.en).forEach(k => en.add(k)); }
  const falta = [...pt].filter(k => !en.has(k)).concat([...en].filter(k => !pt.has(k)));
  ok(falta.length === 0, `i18n: ${pt.size} chaves iguais em pt e en (incl. papeis e motivos)`, falta.join(','));
  const p = await abrir('&fixture=papeis&lang=en'); await p.locator('.btn-filtros').first().click(); await p.waitForTimeout(500); await escolher(p, 'fapergs'); await p.waitForTimeout(500);
  const bt = await p.locator('#f-papel button').allInnerTexts(); ok(bt.join('|') === 'All|Developed|Funded|Partnered|Platform', 'en: opcoes de papel', bt.join('|'));
  await p.context().close();
}
await b.close(); console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo'); process.exit(falhas ? 1 : 0);
