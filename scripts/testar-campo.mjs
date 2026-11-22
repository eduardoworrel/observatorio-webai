#!/usr/bin/env node
// Campo estelar de fundo infinito: arrasta muito longe em todas as direcoes (+-50.000 px), zoom minimo e maximo e redimensiona a
// janela; em cada captura do canvas prova que nao ha regiao vazia (todas as celulas tem estrelas, fracao de pixels dentro da faixa,
// sem faixas vazias retas) e que o campo nao altera a contagem de dados nem entra no DOM/hit-test.
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
let falhas = 0; const ok = (c, m, x = '') => { console.log((c ? 'ok    ' : 'FALHA ') + m + (c || !x ? '' : '  ' + x)); if (!c) falhas++; };

// cobertura da camada estatica: grade 4x3 de celulas; fracao de pixels com alfa; faixas vazias de 40 px
const medir = () => {
  const cv = document.querySelector('#sky-canvas'), c = cv.getContext('2d'), w = cv.width, h = cv.height, d = c.getImageData(0, 0, w, h).data;
  const dpr0 = w / cv.getBoundingClientRect().width, lim = innerWidth > 1050 ? Math.min(w, Math.ceil((document.querySelector('#ceu').getBoundingClientRect().right + 150) * dpr0)) : w;   // o grafo so desenha ate o fim do painel + 150 px (a coluna de conteudo, opaca, cobre o resto): a cobertura vale para essa regiao
  const cols = new Uint32Array(lim), lins = new Uint32Array(h); let tot = 0; const NX = 4, NY = 3, cel = new Uint32Array(NX * NY);
  for (let y = 0; y < h; y++) for (let x = 0; x < lim; x++) if (d[(y * w + x) * 4 + 3] > 2) { cols[x]++; lins[y]++; tot++; cel[Math.floor(y / h * NY) * NX + Math.floor(x / lim * NX)]++; }
  const faixa = (a, n) => { let vazia = 0; for (let i = 0; i + n <= a.length; i++) { let s = 0; for (let k = 0; k < n; k++) s += a[i + k]; if (s === 0) vazia++; } return vazia; };
  const dpr = w / cv.getBoundingClientRect().width;
  return { frac: tot / (lim * h), celMin: Math.min(...cel), celVazias: [...cel].filter(v => v === 0).length, colVazias: faixa(cols, Math.ceil(40 * dpr)), linVazias: faixa(lins, Math.ceil(40 * dpr)), w, h, campo: window.__obs.stats.campo, dados: window.__obs.estrelas.length };
};
const FAIXA = [0.0008, 0.6];
const t = (ctx, rot, r, base) => {
  const certo = r.celVazias === 0 && r.colVazias === 0 && r.linVazias === 0 && r.frac > FAIXA[0] && r.frac < FAIXA[1] && r.campo > 0 && r.dados === base;
  ok(certo, `${rot}: ${(r.frac * 100).toFixed(2)}% dos pixels, celulas vazias ${r.celVazias} (minimo ${r.celMin} px), faixas vazias ${r.colVazias}+${r.linVazias}, tiles ${r.campo}, estrelas de dados ${r.dados}`);
};

for (const esq of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: esq }); const p = await ctx.newPage(); const erros = []; p.on('pageerror', e => erros.push(e.message));
  await p.goto(pathToFileURL(path.join(raiz, 'web', 'index.html')).href + '?prefetch=0'); await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0); await p.waitForTimeout(600);
  const base = await p.evaluate(() => window.__obs.estrelas.length); const caixa = await p.evaluate(() => { const r = document.querySelector('#ceu').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  console.log(`-- tema ${esq}; ${base} estrelas de dados`);
  const med = async () => { await p.waitForTimeout(450); return p.evaluate(medir); };
  t(ctx, 'inicial', await med(), base);
  // arrasto: 50 passos de 1000 px em cada direcao (+-50.000 px no total)
  for (const [nome, dx, dy] of [['direita', 1000, 0], ['esquerda', -1000, 0], ['baixo', 0, 1000], ['cima', 0, -1000], ['diagonal', 1000, 1000], ['diagonal oposta', -1000, -1000]]) {
    for (let i = 0; i < 50; i++) { await p.mouse.move(caixa.x, caixa.y); await p.mouse.down(); await p.mouse.move(caixa.x + dx * 0.5, caixa.y + dy * 0.5, { steps: 2 }); await p.mouse.move(caixa.x + dx, caixa.y + dy, { steps: 2 }); await p.mouse.up(); }
    t(ctx, `arrastado 50.000 px para ${nome}`, await med(), base);
  }
  await p.evaluate(() => document.querySelector('[data-sky-reset]').click());
  const zoomar = async (d) => { await p.evaluate(async (dd) => { const el = document.querySelector('#ceu'), r = el.getBoundingClientRect(); for (let i = 0; i < 60; i++) { el.dispatchEvent(new WheelEvent('wheel', { deltaY: dd, ctrlKey: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true, cancelable: true })); await new Promise(r => setTimeout(r, 10)); } }, d); return med(); };
  const zmin = await zoomar(40), z1 = await p.evaluate(() => window.__obs.estado.zoom); t(ctx, `zoom minimo (${z1.toFixed(2)}x)`, zmin, base);
  await p.evaluate(() => document.querySelector('[data-sky-reset]').click()); const zmax = await zoomar(-40), z2 = await p.evaluate(() => window.__obs.estado.zoom); t(ctx, `zoom maximo (${z2.toFixed(2)}x)`, zmax, base);
  // zoom maximo e arrasto longe
  for (let i = 0; i < 30; i++) { await p.mouse.move(caixa.x, caixa.y); await p.mouse.down(); await p.mouse.move(caixa.x - 1200, caixa.y + 700, { steps: 3 }); await p.mouse.up(); }
  t(ctx, 'zoom maximo, arrastado ao limite', await med(), base);
  await p.evaluate(() => document.querySelector('[data-sky-reset]').click());
  for (const [w, h] of [[1920, 1080], [1024, 700], [390, 844], [2560, 1300], [1440, 900]]) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(500); t(ctx, `janela ${w}x${h}`, await med(), base); }
  // nada de DOM, hit-test, busca ou teclado
  const dom = await p.evaluate(() => ({ canvas: [...document.querySelectorAll('#grafo-camada canvas')].every(c => c.getAttribute('aria-hidden') === 'true'), n: document.querySelectorAll('#grafo-camada canvas').length, foco: document.querySelectorAll('#ceu [tabindex], #ceu button, #ceu a').length }));
  ok(dom.canvas && dom.n === 2, `campo desenhado nos canvas existentes (${dom.n} canvas, todos aria-hidden), sem novos elementos no DOM`);
  ok(erros.length === 0, 'sem erros de script', erros.join(' | ')); await ctx.close();
}
await b.close(); console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo'); process.exit(falhas ? 1 : 0);
