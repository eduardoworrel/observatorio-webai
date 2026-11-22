#!/usr/bin/env node
// Proximidade de publicadores ligados (relacionados, mesma instituicao ou laboratorio): distancia media entre os grupos ligados,
// em relacao a distancia media entre todos os pares de grupos (menor = mais perto), nos agrupamentos por publicador e por familia; determinismo e tempo de montagem.
// Uso: node scripts/testar-proximidade.mjs [--web web] [--max-razao 0.6]
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const WEB = path.resolve(arg('web', path.join(raiz, 'web'))); const MAXR = Number(arg('max-razao', '0.2')), MAXF = Number(arg('max-razao-familia', '0.4'));
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
let falhas = 0; const ok = (c, m, x = '') => { console.log((c ? 'ok    ' : 'FALHA ') + m + (c || !x ? '' : '  ' + x)); if (!c) falhas++; };
const coletar = async () => { const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.goto(pathToFileURL(path.join(WEB, 'index.html')).href + '?prefetch=0'); await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0); await p.waitForTimeout(800);
  const out = {};
  for (const modo of ['publicador', 'familia']) {
    const t0 = Date.now(); await p.click(`#f-agrupar [data-modo=${modo}]`); await p.waitForFunction(m => window.__obs.grupos.length > 0 && window.__obs.grupos.every(g => g.u !== undefined), modo); await p.waitForTimeout(700);
    out[modo] = await p.evaluate(() => { const D = window.MAPA_DADOS, R = window.MAPA_REL, G = window.__obs.grupos, pubs = {}; G.forEach(g => g.ms.forEach(m => { (pubs[m.publicador] = pubs[m.publicador] || new Set()).add(g.id); }));
      const arestas = R.pares.slice(); R.inst.concat(R.lab).forEach(e => { const ps = (e.publicadores || []).filter(x => pubs[x]); for (let a = 0; a < ps.length; a++) for (let c = a + 1; c < ps.length; c++) arestas.push([ps[a], ps[c]]); });
      const byId = {}; G.forEach(g => byId[g.id] = g); const d = (a, c) => Math.hypot(a.u - c.u, a.v - c.v); let s = 0, n = 0;
      arestas.forEach(([a, c]) => { for (const ga of pubs[a] || []) for (const gc of pubs[c] || []) if (ga !== gc) { s += d(byId[ga], byId[gc]); n++; } });
      let st = 0, nt = 0; for (let i = 0; i < G.length; i++) for (let j = i + 1; j < G.length; j++) { st += d(G[i], G[j]); nt++; }
      const nm = pubs['neuralmind'] && pubs['Jurema-br'] ? d(byId[[...pubs['neuralmind']][0]], byId[[...pubs['Jurema-br']][0]]) : null;
      return { ligados: s / Math.max(n, 1), todos: st / Math.max(nt, 1), pares: n, grupos: G.length, neuralmindJurema: nm, pos: G.map(g => g.id + ':' + g.x.toFixed(2) + ',' + g.y.toFixed(2)).join('|') }; });
    out[modo].ms = Date.now() - t0; }
  await p.context().close(); return out; };
const A = await coletar(), B = await coletar();
for (const modo of ['publicador', 'familia']) { const r = A[modo], razao = r.ligados / r.todos, lim = modo === 'publicador' ? MAXR : MAXF;
  ok(razao <= lim, `${modo}: distancia media entre grupos ligados = ${(razao * 100).toFixed(0)}% da distancia media geral (${r.pares} pares; meta <= ${(MAXR * 100).toFixed(0)}%)${r.neuralmindJurema != null ? `; NeuralMind a Jurema: ${(r.neuralmindJurema / r.todos * 100).toFixed(0)}% da media` : ''}`);
  ok(r.pos === B[modo].pos, `${modo}: layout deterministico (mesma entrada, mesmas posicoes em duas cargas)`);
  console.log(`   montagem ${r.ms} ms (inclui o clique e a espera de 0,7 s)`); }
await b.close(); console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo'); process.exit(falhas ? 1 : 0);
