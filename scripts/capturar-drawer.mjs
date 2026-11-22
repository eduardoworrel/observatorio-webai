#!/usr/bin/env node
// Capturas do drawer por tipo de entidade (desktop/celular, claro/escuro, PT/EN).
// Uso: node scripts/capturar-drawer.mjs --web web --saida capturas --rot depois
import { createRequire } from 'module';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const WEB = path.resolve(arg('web', path.join(raiz, 'web')));
const SAIDA = path.resolve(arg('saida', path.join(os.tmpdir(), 'observatorio-capturas')));
const ROT = arg('rot', 'depois'); const COMPLETO = process.argv.includes('--completo');
fs.mkdirSync(SAIDA, { recursive: true });
const ITENS = [['modelo', 'modelos', { t: 'm', id: 'Qwen/Qwen3-0.6B' }], ['modelo-sem-build', 'modelos', { t: 'm', id: 'c2d-usp/MoP_llama_3_30_percent_compression_2_epochs' }], ['publicador', 'modelos', { t: 'p', id: 'Qwen' }], ['instituicao', 'modelos', { t: 'i', id: 'usp' }], ['laboratorio', 'modelos', { t: 'l', id: 'c2d-poli-usp' }], ['dataset', 'datasets', { t: 'm', id: 'nilc-nlp/assin' }], ['benchmark', 'benchmarks', { t: 'm', id: 'assin' }]];
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
const combos = COMPLETO ? [['light', 'pt', 1440, 900, 'desktop'], ['dark', 'pt', 1440, 900, 'desktop'], ['light', 'en', 1440, 900, 'desktop'], ['dark', 'en', 1440, 900, 'desktop'], ['light', 'pt', 390, 844, 'celular'], ['dark', 'pt', 390, 844, 'celular'], ['light', 'en', 390, 844, 'celular'], ['dark', 'en', 390, 844, 'celular']] : [['light', 'pt', 1440, 900, 'desktop'], ['dark', 'pt', 1440, 900, 'desktop'], ['light', 'pt', 390, 844, 'celular'], ['dark', 'en', 390, 844, 'celular']];
for (const [esq, lang, w, h, disp] of combos) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: esq, hasTouch: w < 600, reducedMotion: 'reduce' }); const p = await ctx.newPage();
  await p.addInitScript(l => { try { localStorage.setItem('observatorio-lang', l); } catch (e) {} }, lang);
  await p.goto(pathToFileURL(path.join(WEB, 'index.html')).href + '?prefetch=0'); await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0, null, { timeout: 60000 }); await p.waitForTimeout(1200);
  for (const [nome, tab, sel] of ITENS) {
    const ok = await p.evaluate(([tab, sel]) => new Promise(r => { if (!window.__obs.abrir) return r(false); window.__obs.abrir(tab, sel); setTimeout(() => r(true), 50); }), [tab, sel]);
    if (!ok) continue;
    await p.waitForTimeout(1200);   // builds e avatares lazy
    await p.waitForFunction(() => [...document.querySelectorAll('#drawer .av')].filter(e => { const r = e.getBoundingClientRect(); return e.offsetParent && r.top < innerHeight && r.bottom > 0; }).every(e => e.dataset.estado === 'img' || e.dataset.estado === 'ini'), null, { timeout: 10000 }).catch(() => {}); await p.waitForTimeout(400);
    if (!(await p.evaluate(() => document.querySelector('#drawer-corpo').children.length))) { console.log('vazio', nome); await p.keyboard.press('Escape'); continue; }
    const f = `${ROT}-${nome}-${disp}-${esq}-${lang}.png`; await p.screenshot({ path: path.join(SAIDA, f) }); console.log(f);
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  }
  await ctx.close();
}
await b.close();
