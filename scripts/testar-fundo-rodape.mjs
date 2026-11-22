#!/usr/bin/env node
// (A) Com a pagina rolada ate o fim, o fundo/grafo sob a coluna da direita nao tem lixo grafico: sem descontinuidade vertical em nenhuma coluna da janela.
// (B) Zoom (roda) no painel com a pagina no rodape nao muda scrollY nem a altura do documento nem zera a tabela.
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const WEB = path.resolve(arg('web', path.join(raiz, 'web')));
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
let falhas = 0; const ok = (c, m, x = '') => { console.log((c ? 'ok    ' : 'FALHA ') + m + (c || !x ? '' : '  ' + x)); if (!c) falhas++; };
for (const esq of ['light', 'dark']) for (const aba of ['modelos', 'datasets', 'benchmarks']) for (const [w, h, dpr] of [[2000, 1100, 2], [1920, 1080, 1]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, colorScheme: esq }); const p = await ctx.newPage();
  await p.goto(pathToFileURL(path.join(WEB, 'index.html')).href + '?prefetch=0#' + aba); await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0, null, { timeout: 60000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => window.scrollTo({ top: 1e6, behavior: 'instant' })); await p.waitForTimeout(1200);
  // (A) tinta do canvas do grafo por coluna: nenhuma coluna da janela pode ficar vazia/saltar de densidade de forma abrupta
  const A = await p.evaluate(() => { const cs = [document.querySelector('#sky-canvas'), document.querySelector('#sky-canvas-brilho')], W = cs[0].width, H = cs[0].height, col = new Float32Array(32);
    cs.forEach(c => { const d = c.getContext('2d').getImageData(0, 0, W, H).data; for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 8) col[Math.floor(x / W * 32)]++; });
    return Array.from(col); });
  const med = [...A].sort((x, y) => x - y)[16], saltos = A.map((v, i) => i && Math.abs(v - A[i - 1]) > 0.7 * Math.max(med, 1) * 3 ? i : -1).filter(i => i >= 0);
  const regioes = A.filter(v => v === 0).length;
  ok(regioes === 0 || med === 0 || A.slice(12).every(v => v > 0 || A.slice(0, 12).every(q => q === 0)), `${esq}/${aba}/${w}x${h}@${dpr}: o canvas do grafo tem tinta em toda a largura (colunas vazias ${regioes} de 32), sem cortar na regiao da coluna da direita`);
  // (B) zoom no painel no rodape
  const r0 = await p.evaluate(() => { const e = document.querySelector('#ceu').getBoundingClientRect(); return { x: e.left + e.width / 2, y: e.top + e.height / 2, vis: e.bottom > 0 && e.top < innerHeight }; });
  const e0 = await p.evaluate(() => ({ y: Math.round(scrollY), H: document.documentElement.scrollHeight, linhas: document.querySelectorAll('#tb tbody tr').length, tb: document.querySelector('.home-average-scroll').scrollTop }));
  if (r0.vis) { await p.mouse.move(r0.x, Math.min(Math.max(r0.y, 100), h - 100)); for (const d of [100, 100, 100, -100, -100, -100, -100, 100]) { for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, d); await p.waitForTimeout(30); } await p.waitForTimeout(250); } await p.waitForTimeout(700); }
  const e1 = await p.evaluate(() => ({ y: Math.round(scrollY), H: document.documentElement.scrollHeight, linhas: document.querySelectorAll('#tb tbody tr').length, tb: document.querySelector('.home-average-scroll').scrollTop }));
  ok(Math.abs(e1.y - e0.y) <= 2 && e1.H >= e0.H - 2 && e1.tb === e0.tb, `${esq}/${aba}/${w}x${h}@${dpr}: zoom no rodape: scrollY ${e0.y} -> ${e1.y}, altura ${e0.H} -> ${e1.H}, scrollTop da tabela ${e0.tb} -> ${e1.tb}, linhas ${e0.linhas} -> ${e1.linhas} (painel visivel: ${r0.vis})`);
  await ctx.close();
}
await b.close(); console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo'); process.exit(falhas ? 1 : 0);
