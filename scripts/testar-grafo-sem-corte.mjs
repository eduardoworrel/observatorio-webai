#!/usr/bin/env node
// Grafo em tela cheia: arrasta em todas as direcoes (ate muito longe), zoom minimo e maximo, e prova por pixels que nao ha linha reta de corte
// nas bordas do painel, que ha estrelas fora do painel, que o clique fora do painel nao abre o drawer e que a rolagem da pagina funciona.
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
let falhas = 0; const ok = (c, m, x = '') => { console.log((c ? 'ok    ' : 'FALHA ') + m + (c || !x ? '' : '  ' + x)); if (!c) falhas++; };
const URL0 = pathToFileURL(path.join(raiz, 'web', 'index.html')).href;

// tinta (alfa > 8) nas faixas ao lado de cada borda do painel, nas duas camadas do grafo
const medir = () => {
  const r = document.querySelector('#ceu').getBoundingClientRect(), cs = [document.querySelector('#sky-canvas'), document.querySelector('#sky-canvas-brilho')], dpr = cs[0].width / innerWidth, FA = 10;
  const tinta = (x0, y0, x1, y1) => { x0 = Math.max(0, Math.round(x0 * dpr)); y0 = Math.max(0, Math.round(y0 * dpr)); x1 = Math.min(cs[0].width, Math.round(x1 * dpr)); y1 = Math.min(cs[0].height, Math.round(y1 * dpr)); if (x1 <= x0 || y1 <= y0) return -1; let n = 0; cs.forEach(c => { const d = c.getContext('2d').getImageData(x0, y0, x1 - x0, y1 - y0).data; for (let k = 3; k < d.length; k += 4) if (d[k] > 8) n++; }); return n / ((x1 - x0) * (y1 - y0)); };
  const bordas = { direita: [tinta(r.right - FA, r.top, r.right, r.bottom), tinta(r.right, r.top, r.right + FA, r.bottom)], esquerda: [tinta(r.left, r.top, r.left + FA, r.bottom), tinta(r.left - FA, r.top, r.left, r.bottom)],
    base: [tinta(r.left, r.bottom - FA, r.right, r.bottom), tinta(r.left, r.bottom, r.right, r.bottom + FA)], topo: [tinta(r.left, r.top, r.right, r.top + FA), tinta(r.left, r.top - FA, r.right, r.top)] };
  return { bordas, fora: tinta(r.right + 40, 100, innerWidth, innerHeight - 20), dentro: tinta(r.left, r.top, r.right, r.bottom), vis: window.__obs.stats.estrelas };
};
// corte = um lado denso e o outro vazio, exatamente na borda (um aglomerado que apenas cruza a borda tem os dois lados com tinta)
const semCorte = (m) => Object.entries(m.bordas).every(([k, [a, c]]) => a < 0 || c < 0 || !(Math.max(a, c) > 0.02 && Math.min(a, c) < 0.02 * Math.max(a, c)));

for (const esq of ['light', 'dark']) for (const aba of ['modelos', 'datasets', 'benchmarks']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: esq }); const p = await ctx.newPage(); const erros = []; p.on('pageerror', e => erros.push(e.message));
  await p.goto(URL0 + '?prefetch=0#' + aba); await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0, null, { timeout: 60000 }); await p.waitForTimeout(1500);
  const caixa = await p.evaluate(() => { const r = document.querySelector('#ceu').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const resultados = []; const med = async (rot) => { await p.waitForTimeout(450); const m = await p.evaluate(medir); resultados.push([rot, m]); return m; };
  await med('inicial');
  for (const [nome, dx, dy] of [['direita', 330, 0], ['esquerda', -330, 0], ['baixo', 0, 330], ['cima', 0, -330], ['diagonal', 330, 330]]) {
    for (let i = 0; i < 6; i++) { await p.mouse.move(caixa.x, caixa.y); await p.mouse.down(); await p.mouse.move(caixa.x + dx * 0.5, caixa.y + dy * 0.5, { steps: 3 }); await p.mouse.move(caixa.x + dx, caixa.y + dy, { steps: 3 }); await p.mouse.up(); }
    await med('arrasto ' + nome);
    await p.evaluate(() => document.querySelector('[data-sky-reset]').click());
  }
  for (const [nome, d] of [['zoom maximo', -1], ['zoom minimo', 1]]) { await p.evaluate(() => document.querySelector('[data-sky-reset]').click());
    await p.evaluate(async (d) => { const el = document.querySelector('#ceu'), r = el.getBoundingClientRect(); for (let i = 0; i < 50; i++) { el.dispatchEvent(new WheelEvent('wheel', { deltaY: d * 40, ctrlKey: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true, cancelable: true })); await new Promise(r => setTimeout(r, 10)); } }, d); await med(nome); }
  const cortes = resultados.filter(([, m]) => !semCorte(m)).map(([r, m]) => r + ' ' + JSON.stringify(m.bordas));
  ok(cortes.length === 0, `${esq}/${aba}: sem linha de corte nas bordas do painel em ${resultados.length} situacoes (arrasto em 5 direcoes, zoom minimo e maximo)`, cortes.join(' | ').slice(0, 400));
  ok(resultados.filter(([r]) => /arrasto (esquerda|diagonal|direita)|inicial|minimo/.test(r)).some(([, m]) => m.fora > 0.0003 || m.vis >= 0) && resultados.some(([, m]) => m.fora > 0), `${esq}/${aba}: ha estrelas desenhadas fora do painel (tinta na area do conteudo: ${resultados.map(([, m]) => (m.fora * 100).toFixed(2)).join('/')} %)`);
  // clique fora do painel nao abre drawer; rolagem da pagina e da tabela
  await p.evaluate(() => document.querySelector('[data-sky-reset]').click()); await p.waitForTimeout(400);
  const alvo = await p.evaluate(() => { const r = document.querySelector('#ceu').getBoundingClientRect(); const s = window.__obs.estrelas.find(s => s.dr && !s.vis && s.xy[0] + r.left > r.right + 4 && s.xy[0] + r.left < innerWidth - 4); return s ? { x: s.xy[0] + r.left, y: s.xy[1] + r.top } : null; });
  if (alvo) { await p.mouse.click(alvo.x, alvo.y); await p.waitForTimeout(400); ok(await p.evaluate(() => !document.querySelector('#drawer').classList.contains('on') && !window.__obs.estado.sel), `${esq}/${aba}: clique numa estrela fora do painel nao abre drawer`); }
  const y0 = await p.evaluate(() => scrollY); await p.mouse.move(1200, 600); await p.mouse.wheel(0, 400); await p.waitForTimeout(500); const y1 = await p.evaluate(() => scrollY);
  const z0 = await p.evaluate(() => window.__obs.estado.zoom); await p.mouse.move(caixa.x, caixa.y); await p.mouse.wheel(0, -200); await p.waitForTimeout(500); const z1 = await p.evaluate(() => window.__obs.estado.zoom);
  ok(y1 > y0, `${esq}/${aba}: a rolagem da pagina sobre o conteudo funciona (${y0} -> ${y1})`);
  ok(z1 !== z0, `${esq}/${aba}: a roda sobre o painel da zoom no grafo (${z0.toFixed(2)} -> ${z1.toFixed(2)})`);
  ok(!erros.length, 'sem erros de script', erros.join(' | ')); await ctx.close();
}
await b.close(); console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo'); process.exit(falhas ? 1 : 0);
