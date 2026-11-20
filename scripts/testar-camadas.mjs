#!/usr/bin/env node
// Teste das abas (Modelos, Datasets, Benchmarks), dos filtros e das exportacoes, em Chrome sem tela.
// Uso: node scripts/testar-camadas.mjs      (PLAYWRIGHT_CORE e CHROME opcionais; usa a fixture sintetica ?fixture=1)
// Confere: abas ocultas sem dados; hash e teclado; filtros iguais na constelacao e na tabela; arquivos exportados
// (PNG, SVG, HTML do grafico e da tabela) com contagem de itens igual a contagem filtrada; SVG renderiza em <img>; HTML abre fora do site.
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
const pagina = pathToFileURL(path.join(raiz, 'web', 'index.html')).href;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'obs-exp-'));
let falhas = 0;
const ok = (c, msg, det = '') => { console.log((c ? 'ok    ' : 'FALHA ') + msg + (det ? '  ' + det : '')); if (!c) falhas++; };
const abrir = async (q = '') => {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage(); const erros = []; p.on('pageerror', e => erros.push(e.message));
  await p.goto(pagina + q); await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0); await p.waitForTimeout(900);
  return { p, ctx, erros };
};
const filtradas = p => p.evaluate(() => window.__obs.estrelas.filter(s => s.on).length);
const linhasTabela = p => p.evaluate(() => (window.__obs.estado.noCirculo || []).length);
async function baixar(p, botao, item) {
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.evaluate(s => document.querySelector(s).click(), botao);
  const [d] = await Promise.all([p.waitForEvent('download'), p.locator('.pop [role=menuitem]', { hasText: item }).click()]);
  const f = path.join(tmp, d.suggestedFilename()); await d.saveAs(f); return f;
}

// 1) sem dados de datasets e benchmarks: abas extras ocultas
{ const { p, ctx } = await abrir(); ok(await p.evaluate(() => document.querySelector('#tabs').hidden), 'sem as chaves de datasets e benchmarks, as abas ficam ocultas'); await ctx.close(); }

// 2) com a fixture: abas, hash, teclado
{ const { p, ctx, erros } = await abrir('?fixture=1');
  ok(await p.evaluate(() => !document.querySelector('#tabs').hidden && document.querySelectorAll('#tabs [role=tab]:not([hidden])').length === 3), 'tres abas visiveis com a fixture');
  ok(await p.evaluate(() => document.querySelector('#tabs').getAttribute('role') === 'tablist' && document.querySelector('#tab-modelos').getAttribute('aria-selected') === 'true'), 'tablist com aria-selected');
  await p.focus('#tab-modelos'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => location.hash === '#datasets' && document.activeElement.id === 'tab-datasets' && window.__obs.estado.tab === 'datasets'), 'seta direita ativa Datasets, move o foco e grava #datasets');
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => window.__obs.estado.tab === 'modelos'), 'seta cicla de Benchmarks para Modelos');
  await ctx.close();
  const h = await abrir('?fixture=1#benchmarks'); ok(await h.p.evaluate(() => window.__obs.estado.tab === 'benchmarks' && document.querySelector('#tab-benchmarks').getAttribute('aria-selected') === 'true'), 'abrir com #benchmarks mostra a aba Benchmarks');
  ok(!erros.length && !h.erros.length, 'sem erros de script', erros.concat(h.erros).join(' | ')); await h.ctx.close(); }

// 3) filtros e exportacoes em cada aba
async function aba(nome, aplicar, descricao) {
  const { p, ctx } = await abrir('?fixture=1#' + nome); await p.waitForTimeout(500);
  const total = await filtradas(p); await aplicar(p); await p.waitForTimeout(700);
  const n = await filtradas(p), linhas = await linhasTabela(p), esmaecidas = await p.evaluate(() => window.__obs.estrelas.filter(s => !s.on).length);
  const nTexto = await p.evaluate(() => +(document.querySelector('#resumo-recorte').textContent.match(/[\d.]+/) || ['0'])[0].replace(/\./g, ''));
  ok(n > 0 && n < total + 1 && linhas === n && nTexto === n, `${nome}: ${descricao}: constelacao (${n} acesas, ${esmaecidas} esmaecidas), tabela (${linhas}) e contador (${nTexto}) coincidem`);
  const tab = path.join(tmp, nome + '.'); void tab;
  // tabela
  const th = await baixar(p, '#exp-tabela', 'HTML'); const q = await b.newPage(); await q.goto(pathToFileURL(th).href);
  const rt = await q.evaluate(() => ({ linhas: document.querySelectorAll('table tbody tr').length, credito: document.body.textContent.includes('CC BY 4.0'), semRede: !document.querySelector('link[rel=stylesheet],script[src],img[src^=http]') }));
  ok(rt.linhas === n && rt.credito && rt.semRede, `${nome}: HTML da tabela abre fora do site, tem ${rt.linhas} linhas (= ${n}), credito e licenca, sem dependencias externas`);
  await q.close();
  const ts = await baixar(p, '#exp-tabela', 'SVG'); const svgT = fs.readFileSync(ts, 'utf8');
  const nl = (svgT.match(/<text /g) || []).length;
  ok(fs.statSync(ts).size > 0 && nl > n, `${nome}: SVG da tabela gerado (${nl} textos para ${n} linhas)`);
  const tp = await baixar(p, '#exp-tabela', 'PNG'); const png = fs.readFileSync(tp);
  ok(png.slice(1, 4).toString() === 'PNG' && png.readUInt32BE(16) > 100, `${nome}: PNG da tabela valido (${png.readUInt32BE(16)}x${png.readUInt32BE(20)})`);
  // grafico
  const gh = await baixar(p, '#exp-grafico', 'HTML'); const q2 = await b.newPage(); await q2.goto(pathToFileURL(gh).href);
  const rg = await q2.evaluate(() => ({ estrelas: document.querySelectorAll('figure svg title').length - 1, itens: document.querySelectorAll('details table tbody tr').length, credito: document.body.textContent.includes('CC BY 4.0'), semRede: !document.querySelector('link[rel=stylesheet],script[src],img[src^=http]'), filtros: document.querySelector('p.f').textContent }));
  ok(rg.estrelas === n && rg.itens === n && rg.credito && rg.semRede, `${nome}: HTML do grafico abre fora do site: ${rg.estrelas} estrelas e ${rg.itens} itens na lista (= ${n}); filtros: ${rg.filtros.slice(0, 70)}`);
  await q2.close();
  const gs = await baixar(p, '#exp-grafico', 'SVG'); const svg = fs.readFileSync(gs, 'utf8');
  const q3 = await b.newPage(); const img = await q3.evaluate(async s => new Promise(r => { const i = new Image(); i.onload = () => r([i.naturalWidth, i.naturalHeight]); i.onerror = () => r(null); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s); }), svg);
  ok(img && img[0] > 100, `${nome}: SVG do grafico renderiza em <img> (${img && img.join('x')})`); await q3.close();
  const gp = await baixar(p, '#exp-grafico', 'PNG'); const png2 = fs.readFileSync(gp); ok(png2.slice(1, 4).toString() === 'PNG', `${nome}: PNG do grafico valido (${png2.readUInt32BE(16)}x${png2.readUInt32BE(20)})`);
  await p.screenshot({ path: path.join(tmp, nome + '.png') });
  await ctx.close();
}
await aba('datasets', async p => { await p.selectOption('#filtros-datasets select[data-k=escopo]', 'br'); await p.selectOption('#filtros-datasets select[data-k=licenca]', 'cc-by-4.0'); }, 'filtro br + licenca cc-by-4.0');
await aba('benchmarks', async p => { await p.selectOption('#filtros-benchmarks select[data-k=dominio]', 'conhecimento'); }, 'filtro de dominio');
await aba('modelos', async p => { await p.click('[data-via=nativo]'); await p.selectOption('#f-fmt', 'multi'); }, 'nativo + mais de um formato');

// 4) limpar restaura
{ const { p, ctx } = await abrir('?fixture=1#datasets'); const total = await filtradas(p);
  await p.selectOption('#filtros-datasets select[data-k=idioma]', 'fr'); await p.waitForTimeout(400); const parcial = await filtradas(p);
  await p.click('#limpar'); await p.waitForTimeout(500);
  ok(parcial < total && (await filtradas(p)) === total && (await linhasTabela(p)) === total, `limpar filtros volta de ${parcial} para ${total} itens`); await ctx.close(); }
fs.rmSync(tmp, { recursive: true, force: true });
await b.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
