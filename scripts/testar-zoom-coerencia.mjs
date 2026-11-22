#!/usr/bin/env node
// Durante um zoom continuo (roda, pinca, botoes), tudo o que e desenhado acompanha a camera em cada quadro: estrelas, ancoras dos rotulos e das linhas-guia,
// rotulos no DOM; nenhum elemento fica parado em relacao ao resto; 0 trocas de rotulo durante o gesto.
// Uso: node scripts/testar-zoom-coerencia.mjs [--web web]
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const WEB = path.resolve(arg('web', path.join(raiz, 'web')));
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
let falhas = 0; const ok = (c, m, x = '') => { console.log((c ? 'ok    ' : 'FALHA ') + m + (c || !x ? '' : '  ' + x)); if (!c) falhas++; };
for (const aba of ['modelos', 'datasets', 'benchmarks']) for (const modo of ['roda', 'pinca', 'botoes']) {
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.goto(pathToFileURL(path.join(WEB, 'index.html')).href + '?prefetch=0#' + aba); await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0, null, { timeout: 60000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { window.__r = []; window.__stop = false; (function f() {
    const G = window.__obs.grupos, rot = G.filter(g => g.el.classList.contains('has-label')); let maxErr = 0, comb = 0;
    rot.forEach(g => { if (g.cl) { comb++; let sx = 0, sy = 0; g.cl.forEach(q => { sx += q.px; sy += q.py; }); maxErr = Math.max(maxErr, Math.hypot(g.ax - sx / g.cl.length, g.ay - sy / g.cl.length)); } else maxErr = Math.max(maxErr, Math.hypot(g.ax - g.px, g.ay - g.py)); });
    const r = document.querySelector('#ceu').getBoundingClientRect(); const S = window.__obs.estado;
    window.__r.push({ z: S.zoom, err: maxErr, n: rot.length, ids: rot.map(g => g.id).join('|') });
    if (!window.__stop) requestAnimationFrame(f); })(); });
  const box = await p.evaluate(() => { const r = document.querySelector('#ceu').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }); await p.mouse.move(box.x, box.y);
  for (let i = 0; i < 24; i++) { if (modo === 'botoes') await p.evaluate(() => document.querySelector('[data-sky-zoom="in"]').click()); else if (modo === 'pinca') await p.evaluate(([x, y]) => document.querySelector('#ceu').dispatchEvent(new WheelEvent('wheel', { deltaY: -8, ctrlKey: true, clientX: x, clientY: y, bubbles: true, cancelable: true })), [box.x, box.y]); else await p.mouse.wheel(0, -100); await p.waitForTimeout(30); }
  await p.evaluate(() => window.__stop = true); const r = await p.evaluate(() => window.__r);
  const mover = r.filter(x => x.z !== r[0].z); const err = Math.max(...mover.map(x => x.err)), trocas = new Set(mover.map(x => x.ids)).size - 1;
  ok(err <= 1.5 && trocas <= 0, `${aba}/${modo}: ancoras de rotulo e linhas-guia seguem a camera (erro maximo ${err.toFixed(1)} px em ${mover.length} quadros em movimento), trocas de rotulo no gesto ${Math.max(0, trocas)}`);
  await p.context().close();
}
await b.close(); console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo'); process.exit(falhas ? 1 : 0);
