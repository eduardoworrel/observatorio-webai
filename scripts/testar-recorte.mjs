#!/usr/bin/env node
// Recorte opcional "Em portugues (global)": desligado por padrao, separado de Brasil | Mundo | Tudo, fora das contagens quando desligado,
// marcado no painel quando ligado, estado na legenda das exportacoes, sem o campo recorte_pt o controle some. Numeros calculados direto dos dados (oraculo).
// Uso: node scripts/testar-recorte.mjs
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const WEB = path.join(raiz, 'web');
let falhas = 0; const ok = (c, m, x = '') => { console.log((c ? 'ok    ' : 'FALHA ') + m + (c || !x ? '' : '  ' + x)); if (!c) falhas++; };
const ctx0 = { window: {} }; vm.createContext(ctx0); vm.runInContext(fs.readFileSync(path.join(WEB, 'data.js'), 'utf8'), ctx0);
const D = ctx0.window.MAPA_DADOS, ms = D.modelos, f = n => n.toLocaleString('pt-BR');
const rec = ms.filter(m => m.recorte_pt === true), sem = ms.filter(m => m.recorte_pt !== true);
const O = { n: ms.length, rec: rec.length, sem: sem.length, br: sem.filter(m => m.escopo === 'br').length, mundo: sem.filter(m => m.escopo === 'mundo').length, recMundo: rec.filter(m => m.escopo === 'mundo').length, mundoFoto: D.foto.mundo.modelos };
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
async function abrir(q, { sem: semCampo = false, w = 1280, h = 900 } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, acceptDownloads: true }); const p = await ctx.newPage();
  if (semCampo) await p.addInitScript(() => { let d = null; Object.defineProperty(window, 'MAPA_DADOS', { configurable: true, get() { return d; }, set(v) { (v.modelos || []).forEach(m => { delete m.recorte_pt; }); d = v; } }); });
  await p.goto(pathToFileURL(path.join(WEB, 'index.html')).href + '?prefetch=0&exp=1' + q); await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0, null, { timeout: 60000 }); await p.waitForTimeout(1200); return p;
}
const ligadas = p => p.evaluate(() => window.__obs.estrelas.filter(s => s.on).length);
const resumo = p => p.locator('#resumo-recorte').innerText();
const esperar = async (p, fn) => { for (let i = 0; i < 40; i++) { if (await fn()) return true; await p.waitForTimeout(150); } return false; };
ok(O.rec > 0 && O.recMundo === O.rec, `dados: ${O.rec} modelos de recorte, todos com escopo Mundo`);
ok(O.mundo === O.mundoFoto, `a foto dos dados (Mundo ${f(O.mundoFoto)}) exclui o recorte: ${f(O.mundo)} modelos de Mundo sem ele`);
{
  const p = await abrir('');
  const chip = p.locator('#chip-rec');
  ok(await chip.count() === 1 && await chip.getAttribute('aria-pressed') === 'false', 'chip "Em português (global)" na barra, desligado por padrão');
  ok((await chip.innerText()).replace(/\s+/g, ' ').includes('Em português (global) · ' + O.rec), `chip mostra a contagem (${O.rec})`, await chip.innerText());
  ok(await p.evaluate(() => !document.querySelector('#gaveta-filtros').contains(document.querySelector('#chip-rec'))), 'o chip fica na barra principal, fora da gaveta');
  await esperar(p, async () => (await ligadas(p)) === O.sem);
  ok(await ligadas(p) === O.sem && /^/.test(await resumo(p)), `desligado: ${f(O.sem)} modelos no grafo (${f(O.n)} - ${O.rec})`, String(await ligadas(p)));
  ok(new RegExp('^' + f(O.sem).replace(/\./g, '\\.') + ' ').test(await resumo(p)), 'desligado: a tabela conta só os modelos fora do recorte', await resumo(p));
  ok(await p.evaluate(() => !window.__obs.estrelas.some(s => s.on && s.m.recorte_pt === true)), 'desligado: nenhum modelo de recorte no grafo');
  const foto = await p.locator('#foto').innerText(); ok(new RegExp('Mundo[\\s\\S]*?de ' + f(O.mundoFoto).replace(/\./g, '\\.')).test(foto) && !/em português \(global\)/.test(foto), `desligado: Mundo ${f(O.mundoFoto)}, sem menção ao recorte`, foto.slice(0, 160));
  ok(/modelos/.test(await p.locator('#rodape').innerText()) && (await p.locator('#rodape').innerText()).includes(f(O.sem)), `rodapé: ${f(O.sem)} modelos`, await p.locator('#rodape').innerText());
  await p.locator('#f-escopo [data-escopo=mundo]').click(); await esperar(p, async () => (await ligadas(p)) === O.mundo);
  ok(await ligadas(p) === O.mundo, `Mundo desligado: ${f(O.mundo)} modelos`, String(await ligadas(p)));
  await p.locator('#f-escopo [data-escopo=todos]').click(); await p.waitForTimeout(600);
  // ligar
  await chip.click(); await esperar(p, async () => (await ligadas(p)) === O.n);
  ok(await ligadas(p) === O.n && await p.locator('#chip-rec').getAttribute('aria-pressed') === 'true', `ligado: ${f(O.n)} modelos no grafo`, String(await ligadas(p)));
  ok(await p.evaluate(() => window.__obs.estrelas.filter(s => s.on && s.m.recorte_pt === true).length) === O.rec, `ligado: os ${O.rec} modelos de recorte entram no grafo`);
  await esperar(p, async () => new RegExp('^' + f(O.n).replace(/\./g, '\\.') + ' ').test(await resumo(p)));
  ok(new RegExp('^' + f(O.n).replace(/\./g, '\\.') + ' ').test(await resumo(p)) && new RegExp(O.rec + ' em português \\(global\\)').test(await resumo(p)), 'ligado: a tabela conta todos e diz quantos são do recorte', await resumo(p));
  const foto2 = await p.locator('#foto').innerText(); ok(new RegExp('\\+ ' + O.rec + ' em português \\(global\\)').test(foto2) && new RegExp('de ' + f(O.mundoFoto).replace(/\./g, '\\.')).test(foto2), `ligado: "Mundo ${f(O.mundoFoto)} + ${O.rec} em português"`, foto2.slice(0, 220));
  const br = await p.evaluate(() => ({ ok: true })); await p.locator('#f-escopo [data-escopo=br]').click(); await esperar(p, async () => (await ligadas(p)) === O.br);
  ok(await ligadas(p) === O.br, `ligado, Brasil: continua ${f(O.br)} (o recorte é do Mundo)`, String(await ligadas(p)));
  await p.locator('#f-escopo [data-escopo=todos]').click(); await p.waitForTimeout(600);
  const capa = await p.locator('#capa .capa-rot').innerText(); ok(new RegExp(f(O.br).replace(/\./g, '\\.')).test(capa), 'capa do Brasil não muda com o recorte', capa);
  // painel do modelo
  const id = rec[0].id; await p.evaluate(i => window.__obs.abrir('modelos', { t: 'm', id: i }), id); await p.waitForTimeout(1500);
  const dr = await p.locator('#drawer').innerText(); ok(/Em português · feito fora do Brasil/.test(dr), 'painel: rótulo "Em português · feito fora do Brasil"', dr.slice(0, 200));
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  const semRot = ms.find(m => m.recorte_pt !== true && m.escopo === 'mundo').id; await p.evaluate(i => window.__obs.abrir('modelos', { t: 'm', id: i }), semRot); await p.waitForTimeout(1200);
  ok(!/feito fora do Brasil/.test(await p.locator('#drawer').innerText()), 'painel: modelo comum não leva o rótulo'); await p.keyboard.press('Escape');
  // exportacao
  for (const ligado of [true, false]) {
    if (!ligado) { await p.locator('#chip-rec').click(); await esperar(p, async () => (await ligadas(p)) === O.sem); }
    await p.locator('#exp-tabela').click(); const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('[role=menuitem]', { hasText: 'HTML' }).first().click()]);
    const txt = fs.readFileSync(await dl.path(), 'utf8');
    ok(ligado ? new RegExp('Em português \\(global\\): incluído \\(' + O.rec + '\\)').test(txt) : /Em português \(global\): desligado/.test(txt), `exportação (${ligado ? 'ligado' : 'desligado'}): a legenda traz o estado do recorte`, (txt.match(/Em português \(global\)[^<]{0,40}/) || [''])[0]);
  }
  await p.locator('#chip-rec').click(); await esperar(p, async () => (await ligadas(p)) === O.n); await p.locator('#limpar').click(); await esperar(p, async () => (await ligadas(p)) === O.sem);
  ok(await p.evaluate(() => window.__obs.estado.recorte === false), 'Limpar filtros desliga o recorte');
  await p.context().close();
}
{ const p = await abrir('&recorte=1'); await esperar(p, async () => (await ligadas(p)) === O.n); ok(await ligadas(p) === O.n, 'link com recorte=1 abre com o recorte ligado'); await p.context().close(); }
{ const p = await abrir('', { sem: true }); ok(await p.locator('#chip-rec').count() === 0 && await p.locator('#rec-slot').isHidden(), 'sem o campo recorte_pt, o controle some');
  ok(await ligadas(p) === O.n, `sem o campo, nenhum modelo some (${f(O.n)})`, String(await ligadas(p))); await p.context().close(); }
for (const [w, h] of [[390, 844], [768, 1024], [1280, 800], [1920, 1080]]) for (const lang of ['pt', 'en']) {
  const p = await abrir('&lang=' + lang, { w, h });
  const m = await p.evaluate(() => { const bar = document.querySelector('#filtros-modelos'), r = e => e.getBoundingClientRect(), c = document.querySelector('#chip-rec'); const fora = [...bar.querySelectorAll('button,input,.segmented,#chip-rec,#chip-exp')].filter(e => e.offsetParent && (r(e).right > r(bar).right + 1 || r(e).left < r(bar).left - 1)).length; return { sw: bar.scrollWidth, cw: bar.clientWidth, fora, h: Math.round(r(c).height), docw: document.documentElement.scrollWidth, iw: innerWidth }; });
  ok(m.sw <= m.cw + 1 && m.fora === 0 && m.docw <= m.iw + 1 && m.h <= 48, `${w}px ${lang}: a barra com os dois chips cabe sem rolagem e o chip fica em uma linha (${m.h}px)`, JSON.stringify(m));
  await p.context().close();
}
await b.close(); console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo'); process.exit(falhas ? 1 : 0);
