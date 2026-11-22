#!/usr/bin/env node
// Antes e depois do avatar com transparencia real (litert-community: ~89% transparente), no drawer do modelo e na coluna "Portado por".
// Uso: node scripts/capturar-avatar.mjs --antes <web antigo> --depois <web novo> --saida <pasta>
import { createRequire } from 'module';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { pathToFileURL } from 'url';
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const SAIDA = arg('saida', path.join(os.tmpdir(), 'observatorio-capturas')); fs.mkdirSync(SAIDA, { recursive: true });
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
for (const [rot, web] of [['antes', arg('antes')], ['depois', arg('depois')]]) for (const esq of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: esq, deviceScaleFactor: 2 }); const p = await ctx.newPage();
  await p.goto(pathToFileURL(path.join(web, 'index.html')).href + '?prefetch=0'); await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0, null, { timeout: 60000 }); await p.waitForTimeout(800);
  await p.evaluate(() => window.__obs.abrir('modelos', { t: 'm', id: 'cnmoro/gliclass-edge-v3.0-onnx' })); await p.waitForTimeout(500);
  await p.waitForFunction(() => { const a = document.querySelector('#drawer .av[data-autor="litert-community"]'); return a && (a.classList.contains('com-img') || a.querySelector('img')?.complete); }, null, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(800);
  const el = await p.$('#drawer .av[data-autor="litert-community"]'); const r = el ? await el.evaluate(e => { const q = (e.closest('li, p, .portador-dr') || e.parentElement).getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height, ini: !!e.querySelector('.ini'), img: !!e.querySelector('img') }; }) : null;
  console.log(rot, esq, JSON.stringify(r));
  if (r) await p.screenshot({ path: path.join(SAIDA, `avatar-${rot}-transparente-${esq}.png`), clip: { x: Math.max(0, r.x - 12), y: Math.max(0, r.y - 12), width: Math.min(420, r.w + 24), height: r.h + 24 } });
  await ctx.close();
}
await b.close();
