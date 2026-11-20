#!/usr/bin/env node
// Gestos de roda sinteticos no mapa: trackpad, pinca e roda de mouse. Reporta o fator de escala total de cada um.
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto(pathToFileURL(path.join(raiz, 'web', 'index.html')).href);
await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0);
const zoom = () => p.evaluate(() => window.__obs.estado.zoom);
const reset = async () => { await p.evaluate(() => document.querySelector('[data-sky-reset]').click()); await p.waitForTimeout(500); };
const gesto = (nome, eventos, esperaMs, ctrl, modo = 0) => p.evaluate(async ([ev, ctrl, modo, esp]) => {
  const el = document.querySelector('#ceu'), r = el.getBoundingClientRect(), t0 = performance.now(); let prevented = 0;
  for (const [d, atraso] of ev) { const e = new WheelEvent('wheel', { deltaY: d, deltaMode: modo, ctrlKey: ctrl, clientX: r.left + r.width * 0.3, clientY: r.top + r.height * 0.4, bubbles: true, cancelable: true }); el.dispatchEvent(e); if (e.defaultPrevented) prevented++; await new Promise(res => setTimeout(res, atraso)); }
  await new Promise(res => setTimeout(res, esp)); return { prevented, total: ev.length, ms: Math.round(performance.now() - t0) };
}, [eventos, ctrl, modo, esperaMs]);
const rnd = (a, c) => a + Math.random() * (c - a);
const casos = [
  ['trackpad, 60 eventos de deltaY 4 a 12 em 0,5 s (zoom in)', () => Array.from({ length: 60 }, () => [-rnd(4, 12), 8]), false, 0, '1,3 a 1,8'],
  ['trackpad, mesmo gesto para o outro lado (zoom out)', () => Array.from({ length: 60 }, () => [rnd(4, 12), 8]), false, 0, '0,55 a 0,77'],
  ['pinca, 30 eventos com ctrlKey e delta 1 a 3', () => Array.from({ length: 30 }, () => [-rnd(1, 3), 16]), true, 0, '1,3 a 2'],
  ['roda de mouse, 5 cliques de deltaY 100', () => Array.from({ length: 5 }, () => [-100, 120]), false, 0, '~1,6'],
  ['roda de mouse em linhas (deltaMode 1), 5 cliques de 3 linhas', () => Array.from({ length: 5 }, () => [-3, 120]), false, 1, '~1,6'],
  ['evento isolado de trackpad com delta enorme (200 px)', () => [[-200, 0]], false, 0, '<= 1,1 (um passo ou limite por evento)'],
];
for (const [nome, gen, ctrl, modo, meta] of casos) {
  await reset(); const z0 = await zoom(); const r = await gesto(nome, gen(), 700, ctrl, modo); const z1 = await zoom();
  console.log(`${nome}: fator ${(z1 / z0).toFixed(2)} (meta ${meta}); preventDefault em ${r.prevented}/${r.total}; gesto de ${r.ms} ms`);
}
// parar o gesto: o zoom nao pode continuar depois
await reset(); await gesto('x', Array.from({ length: 30 }, () => [-8, 8]), 0, false); const a = await zoom(); await p.waitForTimeout(600); const c = await zoom(); await p.waitForTimeout(600);
console.log(`depois de parar: ${a.toFixed(3)} -> ${c.toFixed(3)} -> ${(await zoom()).toFixed(3)} (estabiliza em ~0,6 s)`);
// limites
await reset(); await gesto('x', Array.from({ length: 400 }, () => [-12, 2]), 800, false); const zmax = await zoom();
await gesto('x', Array.from({ length: 800 }, () => [12, 2]), 800, false); const zmin = await zoom();
console.log(`limites: maximo ${zmax.toFixed(2)} (8), minimo ${zmin.toFixed(2)} (0,8)`);
// botoes e teclado: passo fixo de 1,2
await reset(); await p.evaluate(() => document.querySelector('[data-sky-zoom=in]').click()); await p.waitForTimeout(100); console.log(`botao +: fator ${(await zoom()).toFixed(2)} (1,20)`);
await b.close();
