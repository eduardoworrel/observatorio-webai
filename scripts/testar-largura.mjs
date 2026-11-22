#!/usr/bin/env node
// Layout em telas largas: a partir de 1600 px o ceu ocupa todo o espaco a esquerda (fixo, ate o rodape) e a coluna de conteudo
// (tabela e rodape) fica ancorada na borda direita, com largura clamp(900px, 48vw, 1100px). Abaixo de 1600 px o layout nao muda.
// Uso: node scripts/testar-largura.mjs [--web web] [--cap pasta]
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const WEB = path.resolve(arg('web', path.join(raiz, 'web'))), CAP = arg('cap', '');
if (CAP) fs.mkdirSync(CAP, { recursive: true });
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
let falhas = 0; const ok = (c, m, x = '') => { console.log((c ? 'ok    ' : 'FALHA ') + m + (c || !x ? '' : '  ' + x)); if (!c) falhas++; };
const colW = w => Math.min(1100, Math.max(900, 0.48 * w)), M = 32, T = 2;
// diferenca de luminosidade entre as duas margens de uma coluna x (linhas y0..y1): fracao de linhas com salto (borda reta)
const salto = (png, x, y0, y1) => png.evaluate(async ([src, x, y0, y1]) => {
  const im = new Image(); im.src = src; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const g = c.getContext('2d'); g.drawImage(im, 0, 0); const k = im.width / innerWidth, X = Math.round(x * k), n = Math.round(y1 * k) - Math.round(y0 * k);
  const L = (px, py) => { const d = g.getImageData(px, py, 1, 1).data; return 0.3 * d[0] + 0.6 * d[1] + 0.1 * d[2]; };
  let r = 0; for (let y = Math.round(y0 * k); y < Math.round(y1 * k); y += 2) { const a = (L(X - 6, y) + L(X - 4, y)) / 2, d = (L(X + 3, y) + L(X + 5, y)) / 2; if (Math.abs(a - d) > 14) r++; }
  return r / (n / 2);
}, ['data:image/png;base64,' + png.__b64, x, y0, y1]);
for (const esq of ['light', 'dark']) for (const [w, h] of [[1280, 900], [1440, 900], [1920, 1080], [2560, 1440], [3440, 1440]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: esq }); const p = await ctx.newPage();
  await p.goto(pathToFileURL(path.join(WEB, 'index.html')).href + '?prefetch=0'); await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0, null, { timeout: 60000 }); await p.waitForTimeout(1200);
  const rot = `${esq}/${w}x${h}`;
  const geo = () => p.evaluate(() => { const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width }; };
    return { cw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth, tab: r('#tabela'), foot: r('.site-footer'), stage: r('.sky-stage'), ceu: r('#ceu'), rc: r('.right-col'), sy: scrollY, sh: document.documentElement.scrollHeight }; });
  const g0 = await geo();
  ok(g0.sw <= g0.cw, `${rot}: sem overflow horizontal`, `${g0.sw} > ${g0.cw}`);
  if (w >= 1600) {
    const cw = colW(w);
    ok(Math.abs(g0.tab.r - (g0.cw - M)) <= T, `${rot}: a tabela encosta na borda direita (menos a margem de ${M} px)`, `direita ${g0.tab.r.toFixed(0)} esperado ${g0.cw - M}`);
    ok(Math.abs(g0.tab.w - (cw - 2 * M)) <= T, `${rot}: largura da coluna segue clamp(900, 48vw, 1100): ${g0.tab.w.toFixed(0)} px`, `esperado ${cw - 2 * M}`);
    ok(g0.stage.l <= 1 && g0.ceu && g0.ceu.r >= g0.cw - cw - 1 - 24 && g0.ceu.r <= g0.cw - cw + 1, `${rot}: o ceu ocupa todo o espaco a esquerda da coluna`, JSON.stringify(g0.ceu));
    ok(Math.abs(g0.stage.t - 86) <= 1 && Math.abs(g0.stage.b - h) <= 1, `${rot}: o ceu tem a altura da janela`, `${g0.stage.t}..${g0.stage.b}`);
    // rolar ate o fim: rodape alinhado a tabela e ceu ainda inteiro ao lado
    await p.evaluate(() => scrollTo(0, 1e7)); await p.waitForTimeout(700); const g1 = await geo();
    ok(Math.abs(g1.foot.l - g1.tab.l) <= T && Math.abs(g1.foot.r - g1.tab.r) <= T, `${rot}: rodape com a mesma posicao horizontal e largura da tabela`, `rodape ${g1.foot.l.toFixed(0)}-${g1.foot.r.toFixed(0)} tabela ${g1.tab.l.toFixed(0)}-${g1.tab.r.toFixed(0)}`);
    ok(g1.sy > 0 && g1.foot.b <= h + 1 && g1.foot.t < h && Math.abs(g1.stage.b - h) <= 1 && g1.ceu.t >= 80 && g1.ceu.b >= h - 250, `${rot}: ao fim da pagina o ceu segue visivel ao lado do rodape`, `${JSON.stringify(g1.stage)} rodape ${g1.foot.t}`);
    const shot = await p.screenshot(); const sp = { __b64: shot.toString('base64'), evaluate: p.evaluate.bind(p) };
    const xs = Math.round(g1.ceu.r);
    const s1 = await salto(sp, xs, 100, h - 10);
    ok(s1 < 0.15, `${rot}: sem borda reta na divisa do ceu (${(s1 * 100).toFixed(0)}% das linhas com salto)`);
    const fa = await salto(sp, Math.round(g1.foot.l), Math.round(g1.foot.t) + 8, Math.round(g1.foot.b) - 8);
    // faixa vazia: o fundo (gradiente) e o grafo estendem-se ate a coluna, sem cor chapada de pagina
    const vazia = await p.evaluate(async src => { const im = new Image(); im.src = src; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, im.width, im.height).data; const k = im.width / innerWidth; const cols = []; for (let x = 0; x < im.width / 1; x += 1) { let s = 0; for (let y = Math.round(100 * k); y < im.height - 20; y += 6) { const o = (y * im.width + x) * 4; s += d[o] + d[o + 1] + d[o + 2]; } cols.push(s); } return cols.length; }, 'data:image/png;base64,' + sp.__b64);
    ok(vazia > 0, `${rot}: captura do fim lida`);
    if (CAP) fs.writeFileSync(path.join(CAP, `${w >= 3000 ? 'ultrawide' : 'desktop'}-${w}-${esq}-fim.png`), shot);
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500);
    for (const aba of ['modelos', 'datasets', 'benchmarks']) {
      await p.evaluate(a => { const t = document.querySelector(`[data-tab=${a}]`); if (t && !t.hidden) t.click(); }, aba); await p.waitForTimeout(900);
      const gg = await geo(); ok(gg.sw <= gg.cw, `${rot}/${aba}: sem overflow horizontal`);
      if (CAP && (w === 1920 || w === 3440)) await p.screenshot({ path: path.join(CAP, `${w >= 3000 ? 'ultrawide' : 'desktop'}-${w}-${esq}-${aba}.png`) });
    }
  } else {
    ok(g0.stage.r < g0.tab.l && g0.stage.position !== 'fixed', `${rot}: abaixo de 1600 px o layout em duas colunas segue como antes`, JSON.stringify([g0.stage, g0.tab]));
    ok(!(await p.evaluate(() => getComputedStyle(document.querySelector('.sky-stage')).position === 'fixed')), `${rot}: ceu continua sticky (nao fixo)`);
  }
  await ctx.close();
}
await b.close(); console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo'); process.exit(falhas ? 1 : 0);
