#!/usr/bin/env node
// Zoom sem piscar: aproxima ao maximo e afasta em sequencia (roda, botoes, arrasto, vai e volta rapido) nas tres abas, em claro e escuro.
// Prova: (1) nenhum quadro em branco (canvas com tinta e quadros reais do compositor com conteudo); (2) os rotulos nao trocam de lado,
// e a troca de rotulos por quadro fica dentro do limite (o layout e estavel; so entra/sai o que de fato entra/sai da janela).
// Uso: node scripts/testar-zoom-piscar.mjs [--web web] [--rapido]
import { createRequire } from 'module';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const DPR = Number(arg('dpr', '1'));
const QX = arg('q', '');
const WEB = path.resolve(arg('web', path.join(raiz, 'web')));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const srv = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html'; const f = path.join(WEB, u);
  if (!f.startsWith(WEB) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${srv.address().port}/`;
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
let falhas = 0; const ok = (c, m, x = '') => { console.log((c ? 'ok    ' : 'FALHA ') + m + (c || !x ? '' : '  ' + x)); if (!c) falhas++; };
const med = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

for (const esq of ['light', 'dark']) for (const aba of ['modelos', 'datasets', 'benchmarks']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: DPR, colorScheme: esq }); const p = await ctx.newPage(); const erros = []; p.on('pageerror', e => erros.push(e.message));
  await p.goto(base + '?prefetch=0' + QX + '#' + aba); await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0, null, { timeout: 60000 }); await p.waitForTimeout(1200);
  // quadros reais do compositor (screencast), da area do ceu
  const cdp = await ctx.newCDPSession(p); const quadros = [];
  cdp.on('Page.screencastFrame', async e => { quadros.push(e.data); try { await cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId }); } catch (x) {} });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 60, maxWidth: 720, maxHeight: 450, everyNthFrame: 1 });
  await p.evaluate(() => {
    const cs = [document.querySelector('#sky-canvas'), document.querySelector('#sky-canvas-brilho')], mini = document.createElement('canvas'); mini.width = 96; mini.height = 72; const mx = mini.getContext('2d', { willReadFrequently: true });
    window.__fr = []; const amostra = () => { const o = {}; cs.forEach((c, i) => { mx.clearRect(0, 0, 96, 72); mx.drawImage(c, 0, 0, 96, 72); const d = mx.getImageData(0, 0, 96, 72).data; let n = 0; for (let k = 3; k < d.length; k += 4) if (d[k] > 8) n++; o['c' + i] = n; });
      const ls = [...document.querySelectorAll('.sky-model.has-label')]; o.pos = {}; ls.forEach(l => { o.pos[l.dataset.g] = l.firstChild.style.transform + '|' + l.firstChild.style.left + '|' + l.firstChild.style.top; }); o.vis = window.__obs.stats.estrelas; window.__fr.push(o); requestAnimationFrame(amostra); };
    requestAnimationFrame(amostra); });
  const box = await p.evaluate(() => { const r = document.querySelector('#ceu').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await p.mouse.move(box.x, box.y);
  for (let i = 0; i < 40; i++) { await p.mouse.wheel(0, -120); await p.waitForTimeout(30); }                       // zoom in ate o maximo (roda)
  await p.waitForTimeout(300);
  for (let i = 0; i < 5; i++) { await p.mouse.move(box.x, box.y); await p.mouse.down(); await p.mouse.move(box.x - 140, box.y + 70, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(120); }   // arrasto
  for (let i = 0; i < 20; i++) { await p.mouse.wheel(0, 120); await p.waitForTimeout(30); }                           // zoom out
  await p.waitForTimeout(300);
  for (let i = 0; i < 6; i++) { await p.click('[data-sky-zoom="in"]', { timeout: 500 }).catch(() => p.keyboard.press('+')); await p.waitForTimeout(80); }   // botoes
  for (let i = 0; i < 30; i++) { await p.mouse.wheel(0, i % 2 ? 120 : -120); await p.waitForTimeout(40); }            // vai e volta rapido
  await p.waitForTimeout(500);
  await cdp.send('Page.stopScreencast');
  const fr = await p.evaluate(() => window.__fr), zmax = await p.evaluate(() => window.__obs.estado.zoom);
  const m = med(fr.map(f => f.c0 + f.c1)); let brancos = 0, lado = 0, ap = 0, de = 0, maxTroca = 0, prev = null;
  fr.forEach(f => { if (f.vis >= 2 && f.c0 + f.c1 === 0) brancos++; if (prev) { let t = 0; for (const k in f.pos) { if (!(k in prev.pos)) { ap++; t++; } else if (f.pos[k] !== prev.pos[k]) { lado++; t++; } } for (const k in prev.pos) if (!(k in f.pos)) { de++; t++; } maxTroca = Math.max(maxTroca, t); } prev = f; });
  // analise dos quadros do compositor: fracao de pixels de conteudo na area do ceu
  const q = await p.evaluate(async (qs) => { const out = []; for (const d of qs) { const bmp = await createImageBitmap(await (await fetch('data:image/jpeg;base64,' + d)).blob()); const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(bmp, 0, 0);
      const W = bmp.width, H = bmp.height, im = x.getImageData(0, Math.round(H * 0.1), Math.round(W * 0.48), Math.round(H * 0.7)), dd = im.data, n = dd.length / 4; const lum = new Uint8Array(n); for (let i = 0; i < n; i++) lum[i] = (dd[i * 4] * 3 + dd[i * 4 + 1] * 6 + dd[i * 4 + 2]) / 10;
      const sorted = [...lum.filter((_, i) => i % 7 === 0)].sort((a, b) => a - b), mid = sorted[sorted.length >> 1]; let dif = 0; for (let i = 0; i < n; i++) if (Math.abs(lum[i] - mid) > 28) dif++; out.push(dif / n); } return out; }, quadros);
  const mq = med(q), vazios = q.filter(v => v < 0.0025).length; if (vazios) console.log('   conteudo dos quadros vazios:', q.map((v, i) => [i, v]).filter(x => x[1] < 0.0025).map(x => x[0] + ':' + (x[1] * 100).toFixed(1) + '%').join(' '));
  console.log(`-- ${esq} / ${aba}: ${fr.length} quadros de pagina, ${quadros.length} quadros do compositor, zoom final ${zmax.toFixed(1)}x`);
  ok(brancos === 0 && vazios === 0, `sem quadros em branco (canvas: ${brancos}; compositor: ${vazios} de ${q.length}, conteudo tipico ${(mq * 100).toFixed(1)}%)`);
  ok(ap + de + lado <= Math.max(60, 4 * fr.length), `troca de rotulos por quadro dentro do limite: ${ap + de} entradas/saidas e ${lado} trocas de lado em ${fr.length} quadros (${((ap + de + lado) / fr.length).toFixed(2)} por quadro, maximo ${maxTroca})`);
  ok(!erros.length, 'sem erros de script', erros.join(' | ')); await ctx.close();
}

// Gesto continuo programado: durante o gesto, nenhum rotulo entra, sai ou troca de lado; ao fim, um unico re-layout (com crossfade)
for (const esq of ['light', 'dark']) for (const aba of ['modelos', 'datasets', 'benchmarks']) for (const modo of ['botoes', 'roda', 'pinca']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: DPR, colorScheme: esq }); const p = await ctx.newPage();
  await p.goto(base + '?prefetch=0' + QX + '#' + aba); await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0, null, { timeout: 60000 }); await p.waitForTimeout(1200);
  await p.evaluate(() => { const cs = [document.querySelector('#sky-canvas'), document.querySelector('#sky-canvas-brilho')], mini = document.createElement('canvas'); mini.width = 96; mini.height = 72; const mx = mini.getContext('2d', { willReadFrequently: true });
    window.__fr = []; window.__stop = false; const amostra = () => { const o = { t: performance.now() }; cs.forEach((c, i) => { mx.clearRect(0, 0, 96, 72); mx.drawImage(c, 0, 0, 96, 72); const d = mx.getImageData(0, 0, 96, 72).data; let n = 0; for (let k = 3; k < d.length; k += 4) if (d[k] > 8) n++; o['c' + i] = n; });
      o.pos = {}; document.querySelectorAll('.sky-model.has-label').forEach(l => { o.pos[l.dataset.g] = l.firstChild.style.transform; }); o.vis = window.__obs.stats.estrelas; window.__fr.push(o); if (!window.__stop) requestAnimationFrame(amostra); }; requestAnimationFrame(amostra); });
  const box = await p.evaluate(() => { const r = document.querySelector('#ceu').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await p.mouse.move(box.x, box.y);
  const fim = await p.evaluate(async ([modo, bx, by]) => { const el = document.querySelector('#ceu'), t0 = performance.now(); let ultimo = t0;
    const roda = (d, c) => el.dispatchEvent(new WheelEvent('wheel', { deltaY: d, ctrlKey: c, clientX: bx, clientY: by, bubbles: true, cancelable: true }));
    for (let i = 0; i < 36; i++) { const dir = i < 18 ? 1 : -1;   // aproxima e depois afasta, continuo
      if (modo === 'botoes') document.querySelector('[data-sky-zoom="' + (dir > 0 ? 'in' : 'out') + '"]').click(); else roda(-dir * (modo === 'pinca' ? 6 : 60), modo === 'pinca');
      ultimo = performance.now(); await new Promise(r => setTimeout(r, 45)); }
    return ultimo; }, [modo, box.x, box.y]);
  await p.waitForTimeout(900); const fr = await p.evaluate(() => { window.__stop = true; return window.__fr; });
  const churn = (a, c) => { let t = 0; for (const k in c.pos) { if (!(k in a.pos)) t++; else if (c.pos[k] !== a.pos[k]) t++; } for (const k in a.pos) if (!(k in c.pos)) t++; return t; };
  let durante = 0, depois = 0, brancos = 0; for (let i = 1; i < fr.length; i++) { const ch = churn(fr[i - 1], fr[i]); if (fr[i].t <= fim + 120) durante += ch; else if (ch > 0) depois++; if (fr[i].vis >= 2 && fr[i].c0 + fr[i].c1 === 0 && fr[i].t < fim + 120) brancos++; }
  ok(durante === 0 && depois <= 2 && brancos === 0, `${esq}/${aba}/${modo}: ${durante} rotulos entrando/saindo/trocando de lado durante o gesto (meta 0), ${depois} re-layout ao final (max 2), ${brancos} quadros em branco`);
  await ctx.close();
}
await b.close(); srv.close(); console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo'); process.exit(falhas ? 1 : 0);
