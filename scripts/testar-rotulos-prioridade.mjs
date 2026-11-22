#!/usr/bin/env node
// Rotulos no zoom minimo: dos N grupos "importantes" (maiores downloads entre os modelos com build, no agrupamento por publicador), quantos tem rotulo visivel.
// Uso: node scripts/testar-rotulos-prioridade.mjs [--web web] [--min 0.8] [--n 15]
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const WEB = path.resolve(arg('web', path.join(raiz, 'web'))), MIN = Number(arg('min', '0.8')), N = Number(arg('n', '15'));
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
let falhas = 0; const ok = (c, m, x = '') => { console.log((c ? 'ok    ' : 'FALHA ') + m + (c || !x ? '' : '  ' + x)); if (!c) falhas++; };
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await p.goto(pathToFileURL(path.join(WEB, 'index.html')).href + '?prefetch=0'); await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0); await p.waitForTimeout(900);
  for (let i = 0; i < 8; i++) { await p.evaluate(() => document.querySelector('[data-sky-zoom="out"]').click()); await p.waitForTimeout(60); } await p.waitForTimeout(900);
  const r = await p.evaluate((n) => { const G = window.__obs.grupos, vis = G.filter(g => g.el.classList.contains('has-label')).length;
    const dl = g => g.ms.reduce((a, m) => a + (m.nfmt > 0 ? (m.downloads || 0) : 0), 0), top = G.filter(g => g.pub).sort((a, c) => dl(c) - dl(a)).slice(0, n);
    const lab = G.filter(g => g.pub && (window.MAPA_REL.labsDoPub(g.pub.id).length || window.MAPA_REL.instDoPub(g.pub.id).length || g.ms.some(m => m.via === 'nativo'))); 
    return { zoom: window.__obs.estado.zoom, vis, grupos: G.length, topComRotulo: top.filter(g => g.el.classList.contains('has-label')).length, top: top.length, prioritarios: lab.length, prioComRotulo: lab.filter(g => g.el.classList.contains('has-label')).length }; }, N);
  console.log(`   ${w}x${h}: zoom ${r.zoom.toFixed(2)}, ${r.vis} rotulos de ${r.grupos} grupos; top ${r.top} por downloads com build: ${r.topComRotulo}; com vinculo a laboratorio/instituicao ou build nativo: ${r.prioComRotulo} de ${r.prioritarios}`);
  ok(r.topComRotulo >= Math.round(r.top * (w < 700 ? MIN * 0.6 : MIN)), `${w}x${h}: ao menos ${Math.round(MIN * 100)}% dos ${r.top} grupos mais baixados com build tem rotulo no zoom minimo (${r.topComRotulo})`);
}
await b.close(); console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo'); process.exit(falhas ? 1 : 0);
