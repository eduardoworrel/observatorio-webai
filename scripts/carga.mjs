#!/usr/bin/env node
// Mede a carga da pagina servida por HTTP local (com gzip): primeiro conteudo visivel, mapa interativo, bytes iniciais e
// tempo para abrir as abas Datasets e Benchmarks (cache frio e quente), opcionalmente com rede simulada.
// Uso: node scripts/carga.mjs [--web web] [--rede 4g|3g|nenhuma] [--rodadas 3] [--q "?prefetch=0"]
import { createRequire } from 'module';
import fs from 'fs';
import http from 'http';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const WEB = path.resolve(arg('web', path.join(raiz, 'web'))), REDE = arg('rede', 'nenhuma'), RODADAS = +arg('rodadas', '3'), Q = arg('q', '?prefetch=0');
const REDES = { '4g': { latency: 60, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 }, '3g': { latency: 300, downloadThroughput: 400e3 / 8, uploadThroughput: 400e3 / 8 } };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html'; const f = path.join(WEB, u);
  if (!f.startsWith(WEB) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  const corpo = fs.readFileSync(f), gz = /gzip/.test(req.headers['accept-encoding'] || '') && /\.(js|html|css|svg)$/.test(f);
  const dados = gz ? zlib.gzipSync(corpo, { level: 6 }) : corpo;
  res.writeHead(200, Object.assign({ 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'content-length': dados.length, 'cache-control': 'max-age=3600' }, gz ? { 'content-encoding': 'gzip' } : {})); res.end(dados);
});
await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${srv.address().port}/`;
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
const mediana = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const init = () => { window.__t = {}; (function poll() { if (window.__obs && window.__obs.stats.estrelas > 0 && !window.__t.interativo) window.__t.interativo = Math.round(performance.now()); if (!window.__t.interativo) requestAnimationFrame(poll); })(); new PerformanceObserver(l => l.getEntries().forEach(e => { if (e.name === 'first-contentful-paint') window.__t.fcp = Math.round(e.startTime); })).observe({ type: 'paint', buffered: true }); };

async function visita(ctx, esperarAbas) {
  const p = await ctx.newPage(); await p.addInitScript(init); const cdp = await ctx.newCDPSession(p); await cdp.send('Network.enable');
  if (REDE !== 'nenhuma') await cdp.send('Network.emulateNetworkConditions', Object.assign({ offline: false }, REDES[REDE]));
  let bytes = 0; const marcas = []; cdp.on('Network.loadingFinished', e => marcas.push([e.requestId, e.encodedDataLength]));
  await p.goto(base + Q, { waitUntil: 'commit' });
  await p.waitForFunction(() => window.__t && window.__t.interativo, null, { timeout: 120000 }); await p.waitForTimeout(400);
  const t = await p.evaluate(() => Object.assign({}, window.__t, window.__carga ? { carga: window.__carga.t } : {}));
  bytes = marcas.reduce((a, m) => a + m[1], 0);
  const r = { fcp: t.fcp, interativo: t.interativo, loader: t.carga ? t.carga.html : null, bytes };
  if (esperarAbas) for (const aba of ['datasets', 'benchmarks']) {
    const esperado = aba === 'datasets' ? 1000 : 5; const t0 = Date.now();
    await p.evaluate(a => document.querySelector('#tab-' + a).click(), aba);
    await p.waitForFunction(([a, n]) => window.__obs.estado.tab === a && window.__obs.estrelas.length >= n && (!document.querySelector('#carga-camada') || document.querySelector('#carga-camada').hidden), [aba, esperado], { timeout: 180000 });
    r[aba] = Date.now() - t0; await p.evaluate(() => document.querySelector('#tab-modelos').click()); await p.waitForFunction(() => window.__obs.estado.tab === 'modelos' && window.__obs.estrelas.length > 1000); await p.waitForTimeout(300);
  }
  await p.close(); return r;
}
const resumo = { frio: [], quente: [] };
for (let i = 0; i < RODADAS; i++) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  resumo.frio.push(await visita(ctx, true));       // cache vazio
  resumo.quente.push(await visita(ctx, true));     // mesma sessao: arquivos no cache HTTP
  await ctx.close();
}
const linha = (nome, v) => `${nome}: primeiro conteudo ${mediana(v.map(x => x.fcp))} ms; tela de carregamento ${mediana(v.map(x => x.loader).filter(x => x != null)) || '-'} ms; mapa interativo ${mediana(v.map(x => x.interativo))} ms; bytes recebidos ate o mapa ${(mediana(v.map(x => x.bytes)) / 1e3).toFixed(0)} KB; aba Datasets ${mediana(v.map(x => x.datasets))} ms; aba Benchmarks ${mediana(v.map(x => x.benchmarks))} ms`;
console.log(`web=${path.relative(raiz, WEB) || 'web'} rede=${REDE} rodadas=${RODADAS} q=${Q}`); console.log(linha('cache frio  ', resumo.frio)); console.log(linha('cache quente', resumo.quente));
await b.close(); srv.close();
