#!/usr/bin/env node
// Avatar: as iniciais so existem no DOM sem URL, com a imagem quebrada ou antes de qualquer imagem existir (sem texto durante a carga);
// com a imagem carregada saem do DOM e nenhum texto aparece sob a transparencia. Imagens sinteticas servidas por interceptacao de rede.
// Uso: node scripts/testar-avatar.mjs [--web web]
import { createRequire } from 'module';
import path from 'path';
import os from 'os';
import zlib from 'zlib';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const WEB = path.resolve(arg('web', path.join(raiz, 'web')));
let falhas = 0; const ok = (c, m, x = '') => { console.log((c ? 'ok    ' : 'FALHA ') + m + (c || !x ? '' : '  ' + x)); if (!c) falhas++; };
const crc = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return b => { let c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }; })();
const chunk = (tp, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(tp), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const png = (w, h, f) => { const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b, a] = f(x, y), o = y * (w * 4 + 1) + 1 + x * 4; raw[o - (x === 0 ? 1 : 0) + (x === 0 ? 0 : 0)] = raw[o]; raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a; } const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6; return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]); };
const IMG = {
  transp: png(64, 64, () => [0, 0, 0, 0]),                                            // totalmente transparente
  parcial: png(64, 64, (x, y) => (x < 32 ? [220, 30, 30, 255] : [30, 30, 220, 90])),  // metade opaca, metade translucida
  opaca: png(64, 64, () => [20, 160, 60, 255])
};
const U = n => 'https://cdn-avatars.huggingface.co/v1/production/uploads/' + n + '.png';
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
for (const esq of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: 900, height: 600 }, colorScheme: esq }); const p = await ctx.newPage();
  await p.route('https://cdn-avatars.huggingface.co/**', r => { const u = r.request().url(); const k = /transp|parcial|opaca/.exec(u); if (k) return setTimeout(() => r.fulfill({ status: 200, contentType: 'image/png', body: IMG[k[0]] }), 150); return r.fulfill({ status: 404, body: 'x' }); });
  await p.goto(pathToFileURL(path.join(WEB, "index.html")).href + '?prefetch=0'); await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0 && window.Avatar, null, { timeout: 60000 });
  await p.evaluate(m => {
    window.MAPA_AVATARES = Object.assign(window.MAPA_AVATARES || {}, m);
    const c = document.createElement('div'); c.id = 'teste-av'; c.style.cssText = 'position:fixed;left:20px;top:20px;z-index:999;display:flex;gap:16px;padding:20px;background:var(--paper)';
    c.innerHTML = ['t-transp', 't-parcial', 't-opaca', 't-quebrada', 't-sem'].map(n => '<span data-n="' + n + '" style="display:inline-block">' + Avatar.html(n, 'dr-av') + '</span>').join(''); document.body.appendChild(c); Avatar.hidratar(c);
  }, { 't-transp': U('transp'), 't-parcial': U('parcial'), 't-opaca': U('opaca'), 't-quebrada': U('quebrada') });
  const est = n => p.evaluate(n => { const a = document.querySelector('#teste-av [data-n="' + n + '"] .av'); return { ini: !!a.querySelector('.ini'), img: !!a.querySelector('img'), estado: a.dataset.estado, texto: a.textContent.trim() }; }, n);
  await p.waitForTimeout(30);
  const cedo = await est('t-transp'); ok(!cedo.ini && !cedo.texto, `${esq}: enquanto a imagem carrega o circulo e neutro e sem texto`, JSON.stringify(cedo));
  const sem0 = await est('t-sem'); ok(sem0.ini && sem0.texto.length > 0, `${esq}: sem URL no mapa as iniciais existem desde o inicio`);
  await p.waitForTimeout(1200);
  for (const n of ['t-transp', 't-parcial', 't-opaca']) { const e = await est(n); ok(e.img && !e.ini && e.texto === '', `${esq}: ${n} com imagem carregada: sem no de iniciais no DOM`, JSON.stringify(e)); }
  const q = await est('t-quebrada'); ok(!q.img && q.ini, `${esq}: URL quebrada: imagem removida e iniciais presentes`, JSON.stringify(q));
  const s = await est('t-sem'); ok(!s.img && s.ini, `${esq}: sem URL: so iniciais`);
  // pixels: nenhum texto sob a transparencia (o circulo da imagem transparente e uniforme)
  const fundoUniforme = async n => { const el = await p.$('#teste-av [data-n="' + n + '"] .av'); const buf = await el.screenshot(); return buf; };
  const px = await p.evaluate(async () => {
    const el = document.querySelector('#teste-av [data-n="t-transp"] .av'), r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, bg: getComputedStyle(el).backgroundColor, bgi: getComputedStyle(el).backgroundImage };
  });
  ok(px.bgi === 'none', `${esq}: fundo do circulo e cor solida (sem gradiente)`, px.bgi);
  const png1 = await p.screenshot({ clip: { x: px.x + px.w * 0.2, y: px.y + px.h * 0.2, width: px.w * 0.6, height: px.h * 0.6 } });
  const dec = await p.evaluate(async b64 => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; const set = new Set(); for (let i = 0; i < d.length; i += 4) set.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]); return set.size; }, png1.toString('base64'));
  ok(dec <= 2, `${esq}: o centro do avatar transparente mostra so o fundo neutro (cores distintas: ${dec})`);
  const tam = await p.evaluate(() => [...document.querySelectorAll('#teste-av .av')].map(a => { const r = a.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height) + ':' + getComputedStyle(a).borderRadius; }));
  ok(new Set(tam).size === 1, `${esq}: tamanho e recorte consistentes (${tam[0]})`);
  const attrs = await p.evaluate(() => { const i = document.querySelector('#teste-av img'); return { rp: i.referrerPolicy, alt: i.alt, lz: i.loading }; });
  ok(attrs.rp === 'no-referrer' && attrs.alt === '' && attrs.lz === 'lazy', `${esq}: no-referrer, alt vazio e lazy`);
  fs.mkdirSync(path.join(os.tmpdir(), 'observatorio-capturas'), { recursive: true });
  await p.screenshot({ path: path.join(os.tmpdir(), 'observatorio-capturas', `avatar-sintetico-${esq}.png`), clip: { x: 0, y: 0, width: 520, height: 140 } });
  await ctx.close();
}
await b.close(); console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo'); process.exit(falhas ? 1 : 0);
