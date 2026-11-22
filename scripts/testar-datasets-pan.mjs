#!/usr/bin/env node
// Pan e roda na tab Datasets (e nas outras): latencia do primeiro movimento apos o pointerdown, tarefas longas durante o gesto, p95 por quadro,
// e roda sobre o painel (grade de posicoes, com e sem tarefas longas artificiais): sempre zoom, nunca rolagem da pagina.
// Uso: node scripts/testar-datasets-pan.mjs [--web web] [--q "&fixture=camadas2"] [--tabs datasets,modelos,benchmarks]
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const CPU = Number(arg('cpu', '1'));
const WEB = path.resolve(arg('web', path.join(raiz, 'web'))), Q = arg('q', ''), TABS = arg('tabs', 'datasets,modelos,benchmarks').split(',');
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
let falhas = 0; const ok = (c, m, x = '') => { console.log((c ? 'ok    ' : 'FALHA ') + m + (c || !x ? '' : '  ' + x)); if (!c) falhas++; };
const TROCA = process.argv.includes('--troca');   // abre em Modelos, troca de tab por clique e arrasta logo depois
for (const aba of TABS) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }); const p = await ctx.newPage(); if (CPU > 1) { const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU }); }
  await p.goto(pathToFileURL(path.join(WEB, 'index.html')).href + '?prefetch=0' + Q + (TROCA ? '' : '#' + aba)); await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0, null, { timeout: 90000 }); await p.waitForTimeout(TROCA ? 800 : 3000);
  if (TROCA) { await p.click('#tab-' + aba); await p.waitForTimeout(Number(arg('apos', '300'))); }
  await p.evaluate(() => { window.__lt = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask', buffered: false }); } catch (e) {}
    window.__fr = []; let ult = performance.now(); (function f(t) { window.__fr.push(t - ult); ult = t; requestAnimationFrame(f); })(performance.now()); });
  const box = await p.evaluate(() => { const r = document.querySelector('#ceu').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  // latencia do primeiro movimento da camera depois do pointerdown
  const lat = [];
  for (let k = 0; k < 4; k++) {
    await p.evaluate(() => document.querySelector('[data-sky-reset]').click()); await p.waitForTimeout(500);
    await p.evaluate(() => { window.__t0 = null; window.__mov = null; const S = window.__obs.estado; window.__p0 = [S.panX, S.panY]; const el = document.querySelector('#ceu'); el.addEventListener('pointerdown', () => { window.__t0 = performance.now(); }, { once: true, capture: true });
      (function sonda() { const S = window.__obs.estado; if (window.__t0 && !window.__mov && (S.panX !== window.__p0[0] || S.panY !== window.__p0[1])) { requestAnimationFrame(() => { window.__mov = performance.now() - window.__t0; }); return; } requestAnimationFrame(sonda); })(); });
    await p.mouse.move(box.x, box.y); await p.mouse.down(); await p.mouse.move(box.x + 6, box.y + 4); await p.mouse.move(box.x + 40, box.y + 20, { steps: 8 });
    await p.waitForFunction(() => window.__mov != null, null, { timeout: 15000 }).catch(() => {}); lat.push(await p.evaluate(() => window.__mov));
    for (let i = 0; i < 20; i++) { await p.mouse.move(box.x + 40 + i * 12, box.y + 20 + i * 6); await p.waitForTimeout(16); }
    await p.mouse.up(); await p.waitForTimeout(700);
  }
  const m = await p.evaluate(() => { const f = window.__fr.slice(5).sort((a, c) => a - c); return { p95: f[Math.floor(f.length * 0.95)], max: f[f.length - 1], lt: window.__lt.filter(x => x[1] > 50).length, ltMax: Math.max(0, ...window.__lt.map(x => x[1])) }; });
  console.log(`   ${aba}: primeiro movimento ${lat.map(x => x == null ? 'nunca' : Math.round(x)).join(', ')} ms; tarefas longas >50 ms: ${m.lt} (maior ${m.ltMax} ms); intervalo entre quadros p95 ${m.p95.toFixed(1)} ms`);
  ok(lat.every(x => x != null && x <= 150), `${aba}: primeiro movimento <= 150 ms depois do pointerdown (medido ${lat.map(x => Math.round(x)).join(', ')})`);
  // roda sobre o painel: grade de posicoes; sem e com tarefas longas artificiais
  const r = await p.evaluate(() => { const e = document.querySelector('#ceu').getBoundingClientRect(); return { x: e.left, y: e.top, w: e.width, h: e.height }; });
  const rodar = async (travar) => { let acertos = 0, total = 0;
    for (const fx of [0.1, 0.3, 0.5, 0.7, 0.9]) for (const fy of [0.1, 0.35, 0.6, 0.85]) for (const pinca of [false, true]) {
      await p.evaluate(() => document.querySelector('[data-sky-reset]').click()); await p.waitForTimeout(60);
      const z0 = await p.evaluate(() => window.__obs.estado.zoom), y0 = await p.evaluate(() => scrollY);
      await p.mouse.move(r.x + r.w * fx, r.y + r.h * fy);
      if (travar) await p.evaluate(() => { const t = performance.now(); while (performance.now() - t < 250); });
      if (pinca) await p.evaluate(([x, y]) => document.querySelector('#ceu').dispatchEvent(new WheelEvent('wheel', { deltaY: -12, ctrlKey: true, clientX: x, clientY: y, bubbles: true, cancelable: true })), [r.x + r.w * fx, r.y + r.h * fy]); else await p.mouse.wheel(0, -120);
      await p.waitForTimeout(travar ? 120 : 160); const z1 = await p.evaluate(() => window.__obs.estado.zoom), y1 = await p.evaluate(() => scrollY); total++; if (z1 !== z0 && y1 === y0) acertos++; }
    return [acertos, total]; };
  const [a1, t1] = await rodar(false); ok(a1 === t1, `${aba}: roda/pinca sobre o painel virou zoom sem rolar a pagina em ${a1} de ${t1} posicoes`);
  const [a2, t2] = await rodar(true); ok(a2 === t2, `${aba}: o mesmo com a thread ocupada por tarefas de 250 ms: ${a2} de ${t2}`);
  // nos limites do zoom a roda continua sendo do grafo (a pagina nao rola)
  await p.evaluate(() => document.querySelector('[data-sky-reset]').click()); await p.waitForTimeout(200);
  for (const d of [120, -120]) { await p.mouse.move(r.x + r.w / 2, r.y + r.h / 2); for (let i = 0; i < 60; i++) await p.mouse.wheel(0, d); await p.waitForTimeout(600); const y0 = await p.evaluate(() => scrollY); for (let i = 0; i < 12; i++) { await p.mouse.wheel(0, d); await p.waitForTimeout(30); } await p.waitForTimeout(300); const y1 = await p.evaluate(() => scrollY), z = await p.evaluate(() => window.__obs.estado.zoom);
    ok(y1 === y0 && y0 === 0, `${aba}: roda no limite do zoom (${z.toFixed(2)}x) nao rola a pagina (scrollY ${y0} -> ${y1})`); }
  await ctx.close();
}
await b.close(); console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo'); process.exit(falhas ? 1 : 0);
