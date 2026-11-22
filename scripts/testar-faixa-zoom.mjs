#!/usr/bin/env node
// Faixa de zoom efetiva: pixels por unidade do mundo no zoom minimo e maximo (o que importa para ver e clicar cada estrela), e o tamanho aparente
// do afastamento entre estrelas vizinhas de um grupo no zoom maximo. Uso: node scripts/testar-faixa-zoom.mjs [--web web] [--ref 1.0]
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const WEB = path.resolve(arg('web', path.join(raiz, 'web'))), MINPX = Number(arg('minpx', '0'));
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
// referencia: main publicada (d897037), px por unidade do mundo no zoom maximo, 1440x900 e 390x844, escopo Tudo e tarefa Todas (padrao)
const MAIN = { desktop: { modelos: 1.717, datasets: 1.102, benchmarks: 13.202 }, celular: { modelos: 1.058, datasets: 0.608, benchmarks: 7.276 } };
let falhas = 0; const ok = (c, m, x = '') => { console.log((c ? 'ok    ' : 'FALHA ') + m + (c || !x ? '' : '  ' + x)); if (!c) falhas++; };
for (const [w, h, rot] of [[1440, 900, 'desktop'], [390, 844, 'celular']]) for (const aba of ['modelos', 'datasets', 'benchmarks']) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await p.goto(pathToFileURL(path.join(WEB, 'index.html')).href + '?prefetch=0#' + aba); await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0, null, { timeout: 60000 }); await p.waitForTimeout(2500);
  const med = () => p.evaluate(() => { const r = document.querySelector('#ceu').getBoundingClientRect(), RAD = Math.min(r.width, r.height) / 2 - 8, G = window.__obs.grupos, z = window.__obs.estado.zoom;
    const g = G.slice().sort((a, c) => c.ms.length - a.ms.length)[0], pxu = g.k * 2 * RAD * 0.82 * z;
    const sc = 2 * RAD * 0.82 * z; let ext = 0; G.forEach(gg => { ext = Math.max(ext, (Math.hypot(gg.u - 0.5, gg.v - 0.5) + gg.R * gg.k) * sc); });
    return { rad: RAD, zoom: z, enquadra: ext / RAD, pxPorUnidade: pxu, passoEstrela: 12 * pxu, raioMaiorGrupo: g.R * pxu }; });
  await p.evaluate(() => document.querySelector('[data-sky-reset]').click()); await p.waitForTimeout(600);
  for (let i = 0; i < 70; i++) { await p.evaluate(() => document.querySelector('[data-sky-zoom="in"]').click()); await p.waitForTimeout(25); } await p.waitForTimeout(900); const mx = await med();
  const proximo = () => p.evaluate(() => { const o = window.__obs, st = document.querySelector('#ceu').getBoundingClientRect(); const vis = o.estrelas.filter(s => s.vis && s.xy[0] > 30 && s.xy[0] < st.width - 30 && s.xy[1] > 30 && s.xy[1] < st.height - 30);
    vis.sort((a, c) => Math.hypot(a.xy[0] - st.width / 2, a.xy[1] - st.height / 2) - Math.hypot(c.xy[0] - st.width / 2, c.xy[1] - st.height / 2)); const s = vis[0]; return s ? { id: s.m ? s.m.id : s.id, x: st.left + s.xy[0], y: st.top + s.xy[1], xy: s.xy.slice() } : null; });
  const cp0 = await proximo();
  if (cp0) {
    const cc = await p.evaluate(() => { const r = document.querySelector('#ceu').getBoundingClientRect(); return [r.left + r.width / 2 + 90, r.top + r.height / 2 + 90]; });
    await p.mouse.move(cc[0], cc[1]); await p.mouse.down(); await p.mouse.move(cc[0] + 40, cc[1] + 20, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(900);
    const dep = await p.evaluate(id => { const s = window.__obs.estrelas.find(q => (q.m ? q.m.id : q.id) === id); return s ? s.xy.slice() : null; }, cp0.id);
    ok(dep && Math.abs(dep[0] - cp0.xy[0] - 40) < 4 && Math.abs(dep[1] - cp0.xy[1] - 20) < 4, `${rot}/${aba}: no zoom maximo o arrasto de 40,20 px move a estrela do mesmo tanto`, `moveu ${dep ? (dep[0] - cp0.xy[0]).toFixed(1) + ',' + (dep[1] - cp0.xy[1]).toFixed(1) : 'sumiu'}`);
    const cp = await proximo(); await p.mouse.move(cp.x, cp.y); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(500);
    const sel = await p.evaluate(() => { const s = window.__obs.estado.sel; return s && s.id; }); ok(sel === cp.id, `${rot}/${aba}: no zoom maximo o clique na estrela mais proxima do centro seleciona esse no (${cp.id.slice(0, 40)})`, `selecionou ${sel}`);
  } else ok(false, `${rot}/${aba}: nenhuma estrela visivel no zoom maximo para clicar`);
  for (let i = 0; i < 80; i++) { await p.evaluate(() => document.querySelector('[data-sky-zoom="out"]').click()); await p.waitForTimeout(25); } await p.waitForTimeout(900); const mn = await med();
  console.log(`   ${rot}/${aba}: zoom ${mn.zoom.toFixed(2)}..${mx.zoom.toFixed(2)}; px por unidade do mundo ${mn.pxPorUnidade.toFixed(3)}..${mx.pxPorUnidade.toFixed(3)}; passo entre estrelas no maximo ${mx.passoEstrela.toFixed(1)} px; raio do maior grupo ${mn.raioMaiorGrupo.toFixed(0)}..${mx.raioMaiorGrupo.toFixed(0)} px`);
  ok(mx.passoEstrela / mx.rad >= (aba === 'benchmarks' ? 0.07 : 0.30), `${rot}/${aba}: no zoom maximo o passo entre estrelas e ${mx.passoEstrela.toFixed(1)} px (${(100 * mx.passoEstrela / mx.rad).toFixed(1)}% do raio do painel; minimo ${aba === 'benchmarks' ? 7 : 30}%; a main publicada tem 7,4% em modelos; o limite e absoluto, nao depende do tamanho do layout ou do numero de nos)`);
  ok(mx.pxPorUnidade >= 0.98 * MAIN[rot][aba], `${rot}/${aba} (Tudo + Todas): px por unidade no zoom maximo ${mx.pxPorUnidade.toFixed(3)} >= main publicada ${MAIN[rot][aba]}`);
  ok(mn.enquadra <= 1.0, `${rot}/${aba}: no zoom minimo o mundo todo cabe no painel (extensao ${(100 * mn.enquadra).toFixed(0)}% do raio)`);
  await p.context().close();
}
await b.close(); console.log(falhas ? `\n${falhas} falha(s)` : '\nmedido'); process.exit(falhas ? 1 : 0);
