#!/usr/bin/env node
// (celular: painel de ~360 px, so cabem ~15 rotulos; a meta de importantes vale para os 15 primeiros)
// Rotulos no zoom padrao e no minimo, nas 3 abas, desktop e celular: fracao de grupos com rotulo, fracao dos 30 mais importantes com rotulo,
// pares de grupos ligados com algum rotulo faltando e sobreposicoes de rotulos (gerais e entre ligados).
// Uso: node scripts/testar-rotulos-sobreposicao.mjs [--web web] [--top 1] [--ligados 1]
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const WEB = path.resolve(arg('web', path.join(raiz, 'web'))), TOP = Number(arg('top', '0.9')), LIG = Number(arg('ligados', '0.8'));
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
let falhas = 0; const ok = (c, m, x = '') => { console.log((c ? 'ok    ' : 'FALHA ') + m + (c || !x ? '' : '  ' + x)); if (!c) falhas++; };
for (const [w, h, rot] of [[1440, 900, 'desktop'], [390, 844, 'celular']]) for (const aba of ['modelos', 'datasets', 'benchmarks']) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await p.goto(pathToFileURL(path.join(WEB, 'index.html')).href + '?prefetch=0#' + aba); await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0, null, { timeout: 60000 }); await p.waitForTimeout(2500);
  const medir = () => p.evaluate(() => {
    const G = window.__obs.grupos, rot0 = G.filter(g => g.el.classList.contains('has-label')), citados = new Set(); rot0.forEach(g => (g.clIds || []).forEach(i => citados.add(i))), lab = g => g.el.classList.contains('has-label') || citados.has(g.id), nL = G.filter(g => g.el.classList.contains('has-label')).length;   // rotulo composto conta para os grupos que ele cita
    const imp = G.slice().sort((a, c) => c.imp - a.imp || (a.id < c.id ? -1 : 1)).slice(0, window.innerWidth >= 700 ? 30 : 15), topL = imp.filter(lab).length;
    const R = window.MAPA_REL, porId = {}; G.forEach(g => porId[g.id] = g); const pares = [];
    if (R && G.length && G[0].pub) { const ps = {}; G.forEach(g => { if (g.pub) ps[g.pub.id] = g; }); const arestas = R.pares.slice(); R.inst.concat(R.lab).forEach(e => { const l = (e.publicadores || []).filter(x => ps[x]); for (let a = 0; a < l.length; a++) for (let c = a + 1; c < l.length; c++) arestas.push([l[a], l[c]]); }); arestas.forEach(([a, c]) => { if (ps[a] && ps[c]) pares.push([ps[a], ps[c]]); }); }
    const rects = rot0.map(g => { const r = g.nome_el.getBoundingClientRect(); return { id: g.id, x0: r.left, x1: r.right, y0: r.top, y1: r.bottom }; });
    const sob = (a, c) => a.x0 < c.x1 - 1 && a.x1 > c.x0 + 1 && a.y0 < c.y1 - 1 && a.y1 > c.y0 + 1; let sg = 0, sl = 0; const idx = {}; rects.forEach(r => idx[r.id] = r);
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) if (sob(rects[i], rects[j])) sg++;
    pares.forEach(([a, c]) => { if (idx[a.id] && idx[c.id] && sob(idx[a.id], idx[c.id])) sl++; });
    const faltam = pares.filter(([a, c]) => !(lab(a) || lab(c))).length;   // meta: ao menos um rotulo (individual ou composto) por par ligado
    return { grupos: G.length, rotulos: nL, top: imp.length, topL, pares: pares.length, faltam, sobrepGeral: sg, sobrepLigados: sl };
  });
  await p.evaluate(() => document.querySelector('[data-sky-reset]').click()); await p.waitForTimeout(1200); const pad = await medir();
  for (let i = 0; i < 8; i++) { await p.evaluate(() => document.querySelector('[data-sky-zoom="out"]').click()); await p.waitForTimeout(60); } await p.waitForTimeout(1200); const min = await medir();
  console.log(`   ${rot}/${aba}: padrao ${pad.rotulos}/${pad.grupos} rotulos (${Math.round(100 * pad.rotulos / Math.max(1, pad.grupos))}%), top ${pad.topL}/${pad.top}, ligados com rotulo faltando ${pad.faltam}/${pad.pares}, sobreposicoes ${pad.sobrepGeral}; minimo ${min.rotulos}/${min.grupos}, top ${min.topL}/${min.top}, ligados faltando ${min.faltam}/${min.pares}`);
  ok(pad.sobrepGeral === 0 && pad.sobrepLigados === 0 && min.sobrepGeral === 0, `${rot}/${aba}: nenhuma sobreposicao de rotulos (padrao ${pad.sobrepGeral}, minimo ${min.sobrepGeral}; entre ligados ${pad.sobrepLigados})`);
  const metaTop = rot === 'desktop' ? TOP : 0.7;   // celular: rotulos de ate 190 px num painel de 360 px
  ok(pad.topL >= Math.floor(pad.top * metaTop), `${rot}/${aba}: ${pad.topL} dos ${pad.top} grupos mais importantes tem rotulo no zoom padrao (meta >= ${Math.round(metaTop * 100)}%)`);
  if (rot === 'desktop' && aba === 'modelos' && pad.pares) ok(pad.faltam === 0, `${rot}/${aba}: pares ligados com ao menos um rotulo (individual ou composto) no zoom padrao: ${pad.pares - pad.faltam} de ${pad.pares} (meta: todos)`);
  await p.context().close();
}
await b.close(); console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo'); process.exit(falhas ? 1 : 0);
