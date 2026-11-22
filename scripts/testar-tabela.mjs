#!/usr/bin/env node
// Caixa da tabela com altura fixa e rolagem interna: a altura nao muda com zoom/pan; a roda sobre a tabela rola as linhas e, no fim, passa para a pagina ate o rodape.
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const WEB = path.resolve(arg('web', path.join(raiz, 'web')));
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
let falhas = 0; const ok = (c, m, x = '') => { console.log((c ? 'ok    ' : 'FALHA ') + m + (c || !x ? '' : '  ' + x)); if (!c) falhas++; };
for (const aba of ['modelos', 'datasets', 'benchmarks']) for (const [w, h] of [[1440, 900], [2000, 1100], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 600 }); const p = await ctx.newPage();
  await p.goto(pathToFileURL(path.join(WEB, 'index.html')).href + '?prefetch=0#' + aba); await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0, null, { timeout: 60000 }); await p.waitForTimeout(2500);
  const alt = () => p.evaluate(() => { const e = document.querySelector('.home-average-scroll'); return { h: Math.round(e.getBoundingClientRect().height), sh: e.scrollHeight, y: Math.round(scrollY), H: document.documentElement.scrollHeight }; });
  const a0 = await alt();
  const box = await p.evaluate(() => { const r = document.querySelector('#ceu').getBoundingClientRect(); return { x: r.left + r.width / 2, y: Math.min(r.top + r.height / 2, innerHeight - 80) }; });
  await p.mouse.move(box.x, box.y); for (let i = 0; i < 12; i++) { await p.mouse.wheel(0, i % 2 ? 100 : -100); await p.waitForTimeout(40); }
  for (let i = 0; i < 6; i++) { await p.mouse.down(); await p.mouse.move(box.x + 40 * (i % 3), box.y + 30 * (i % 2), { steps: 4 }); await p.mouse.up(); }
  await p.waitForTimeout(900); await p.keyboard.press('Escape'); await p.waitForTimeout(500); const a1 = await alt();
  ok(a0.h === a1.h && a0.H === a1.H, `${aba}/${w}x${h}: a caixa da tabela mantem a altura (${a0.h} -> ${a1.h}) e a pagina a dela (${a0.H} -> ${a1.H}) depois de zoom e pan`);
  ok(a0.sh > a0.h || aba === 'benchmarks', `${aba}/${w}x${h}: as linhas rolam dentro da caixa (conteudo ${a0.sh} px em caixa de ${a0.h} px)`);
  // roda sobre a tabela: rola ate o fim e continua para a pagina
  await p.evaluate(() => { const e = document.querySelector('.home-average-scroll'); e.scrollIntoView({ block: 'center', behavior: 'instant' }); }); await p.waitForTimeout(300);
  const tb = await p.evaluate(() => { const r = document.querySelector('.home-average-scroll').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 200) }; });
  await p.mouse.move(tb.x, tb.y); const y0 = await p.evaluate(() => scrollY);
  for (let i = 0; i < 80; i++) { await p.mouse.wheel(0, 600); await p.waitForTimeout(15); } await p.waitForTimeout(500);
  const f = await p.evaluate(() => { const e = document.querySelector('.home-average-scroll'); return { st: Math.round(e.scrollTop), max: e.scrollHeight - e.clientHeight, y: Math.round(scrollY), maxY: document.documentElement.scrollHeight - innerHeight }; });
  ok((f.st >= f.max - 2 || a0.sh <= a0.h) && f.y > y0 + 100, `${aba}/${w}x${h}: a roda rola a tabela ate o fim (${f.st}/${f.max}) e depois a pagina (scrollY ${y0} -> ${f.y}, maximo ${f.maxY})`);
  await ctx.close();
}
await b.close(); console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo'); process.exit(falhas ? 1 : 0);
