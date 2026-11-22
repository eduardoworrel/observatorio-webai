#!/usr/bin/env node
// Arrastar o grafo e sair do painel (para a tabela, para fora da janela) nao seleciona texto; fora do gesto a selecao normal continua funcionando.
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const WEB = path.resolve(arg('web', path.join(raiz, 'web')));
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
let falhas = 0; const ok = (c, m, x = '') => { console.log((c ? 'ok    ' : 'FALHA ') + m + (c || !x ? '' : '  ' + x)); if (!c) falhas++; };
for (const aba of ['modelos', 'datasets', 'benchmarks']) for (const [w, h, rot] of [[1440, 900, 'desktop'], [390, 844, 'celular']]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 600 })).newPage();
  await p.goto(pathToFileURL(path.join(WEB, 'index.html')).href + '?prefetch=0#' + aba); await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0, null, { timeout: 60000 }); await p.waitForTimeout(2000);
  const r = await p.evaluate(() => { const e = document.querySelector('#ceu').getBoundingClientRect(), t = document.querySelector('#tb').getBoundingClientRect(); return { x: e.left + e.width / 2, y: e.top + e.height / 2, tx: t.left + t.width / 2, ty: Math.min(t.top + 60, innerHeight - 40) }; });
  await p.mouse.move(r.x, r.y); await p.mouse.down();
  const alvos = [[r.tx, r.ty], [r.tx, r.ty + 25], [w - 2, r.ty], [w + 300, r.ty - 80], [w + 300, h + 300], [r.tx, r.ty]];
  let cursor = null; for (const [x, y] of alvos) { await p.mouse.move(x, y, { steps: 12 }); }
  cursor = await p.evaluate(() => getComputedStyle(document.querySelector('#tb')).cursor + '|' + document.documentElement.classList.contains('arrastando-grafo'));
  await p.mouse.up(); await p.waitForTimeout(300);
  const sel = await p.evaluate(() => ({ s: String(getSelection()).length, cls: document.documentElement.classList.contains('arrastando-grafo') }));
  ok(sel.s === 0 && !sel.cls, `${aba}/${rot}: arrastar do painel ate a tabela e alem da janela nao seleciona texto (selecao ${sel.s} caracteres) e a classe do gesto sai`);
  ok(/grabbing\|true/.test(cursor), `${aba}/${rot}: durante o gesto o cursor segue grabbing mesmo sobre a tabela (${cursor})`);
  // fora do gesto a selecao normal funciona (so desktop)
  if (w > 600) { const t = await p.evaluate(() => { const e = document.querySelector('#tb tbody tr td'); const rg = document.createRange(); rg.selectNodeContents(e); getSelection().removeAllRanges(); getSelection().addRange(rg); return String(getSelection()).length; }); ok(t > 0, `${aba}/${rot}: fora do gesto o texto da tabela continua selecionavel`); }
  // soltar fora da janela nao deixa preso
  await p.mouse.move(r.x, r.y); await p.mouse.down(); await p.mouse.move(w + 200, h + 200, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(200);
  ok(!(await p.evaluate(() => document.documentElement.classList.contains('arrastando-grafo'))), `${aba}/${rot}: soltar fora da janela termina o arrasto`);
  await p.context().close();
}
await b.close(); console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo'); process.exit(falhas ? 1 : 0);
