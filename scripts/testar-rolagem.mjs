#!/usr/bin/env node
// Rolagem ate o fim da pagina e de volta: o conjunto do painel (que filtra a tabela) nao pode depender da rolagem, entao a altura do documento
// nao pode encolher nem a pagina saltar para o inicio da tabela; o grafo continua desenhado ate o fim e nao ha faixa branca embaixo.
// Uso: node scripts/testar-rolagem.mjs [--web web]
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const WEB = path.resolve(arg('web', path.join(raiz, 'web')));
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
let falhas = 0; const ok = (c, m, x = '') => { console.log((c ? 'ok    ' : 'FALHA ') + m + (c || !x ? '' : '  ' + x)); if (!c) falhas++; };
for (const esq of ['light', 'dark']) for (const aba of ['modelos', 'datasets', 'benchmarks']) for (const [w, h, rot] of [[1440, 900, 'desktop'], [390, 844, 'celular']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: esq, hasTouch: w < 600 }); const p = await ctx.newPage();
  await p.goto(pathToFileURL(path.join(WEB, 'index.html')).href + '?prefetch=0#' + aba); await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0, null, { timeout: 60000 }); await p.waitForTimeout(1500);
  const est = () => p.evaluate(() => ({ y: Math.round(scrollY), H: document.documentElement.scrollHeight, linhas: document.querySelectorAll('#tb tbody tr').length, vis: window.__obs.estrelas.filter(s => s.vis).length }));
  const a0 = await est(); await p.mouse.move(w * 0.75, w < 600 ? h * 0.95 : h * 0.5);
  for (let i = 0; i < 40; i++) { await p.mouse.wheel(0, 900); await p.waitForTimeout(25); }   // ate o fim e alem
  await p.waitForTimeout(800); const fim = await est();
  const strip = await p.evaluate(() => { const c = document.createElement('canvas'); return null; });
  await p.mouse.wheel(0, -300); await p.waitForTimeout(500); const volta = await est();
  for (let i = 0; i < 40; i++) { await p.mouse.wheel(0, -900); await p.waitForTimeout(25); } await p.waitForTimeout(600); const cima = await est();
  const pix = await p.evaluate(async () => { const cv = document.querySelector('#sky-canvas'), c = cv.getContext('2d'), d = c.getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let k = 3; k < d.length; k += 4) if (d[k] > 8) n++; return n / (cv.width * cv.height); });
  ok(fim.H >= a0.H * 0.9 && fim.linhas === a0.linhas && fim.vis === a0.vis, `${esq}/${aba}/${rot}: ao fim da pagina a altura (${a0.H} -> ${fim.H}), as linhas (${a0.linhas} -> ${fim.linhas}) e as estrelas do painel (${a0.vis} -> ${fim.vis}) nao mudam`);
  ok(volta.y > fim.y - 600 && volta.y < fim.y && volta.y > 100, `${esq}/${aba}/${rot}: rolar para cima 300 px sai de ${fim.y} para ${volta.y} (sem salto para o inicio da tabela)`);
  ok(cima.y < 50, `${esq}/${aba}/${rot}: volta ao topo normalmente (${cima.y})`);
  await ctx.close();
}
await b.close(); console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo'); process.exit(falhas ? 1 : 0);
