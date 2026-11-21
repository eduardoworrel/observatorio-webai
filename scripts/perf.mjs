#!/usr/bin/env node
// Medicao de desempenho do mapa estrelado, dirigindo o Chrome por CDP.
// Uso: node scripts/perf.mjs [--n 500,1000,2000,4000] [--dpr 2] [--rotulo antes] [--saida ref/perf-antes.json]
// Dados com menos modelos que os reais: amostra dos reais. Com mais: copias SINTETICAS (nome com "~", id "sintetico/...").
// Os dados sinteticos existem so dentro da pagina em teste; nada e gravado em data/.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.dirname(aqui);
const require = createRequire(import.meta.url);
const pw = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');   // npm i playwright-core, ou PLAYWRIGHT_CORE=<caminho>
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const NS = arg('n', '500,1000,2000,4000').split(',').map(Number);
const DPR = Number(arg('dpr', '2'));
const VW = Number(arg('vw', '1440')), VH = Number(arg('vh', '900'));
const ROTULO = arg('rotulo', 'medida');
const Q = arg('q', '');   // parametros da URL (por exemplo ?fixture=relacoes&agrupar=instituicao)
const ABA = arg('aba', '');   // datasets ou benchmarks: troca de aba antes de medir (dados reais da aba, sem sinteticos)
const SAIDA = arg('saida', path.join(raiz, 'ref', `perf-${ROTULO}.json`));
const CHROME = process.env.CHROME || undefined;
const URL_PAGINA = pathToFileURL(path.resolve(arg('web', path.join(raiz, 'web')), 'index.html')).href;

const pct = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const resumo = a => a.length ? { n: a.length, media: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2), p95: +pct(a, 0.95).toFixed(2), max: +Math.max(...a).toFixed(2), fps: +(1000 / (a.reduce((x, y) => x + y, 0) / a.length)).toFixed(1) } : null;

const initScript = (N) => `
(function(){
  var N=${N}, dados=null;
  Object.defineProperty(window,'MAPA_DADOS',{configurable:true,get:function(){return dados;},set:function(v){
    var base=v.modelos, out=[];
    if(N<=base.length){ var step=base.length/N; for(var i=0;i<N;i++) out.push(base[Math.floor(i*step)]); }
    else { out=base.slice(); var k=0; while(out.length<N){ var m=JSON.parse(JSON.stringify(base[k%base.length])); m.id='sintetico/'+out.length+'-'+m.nome; m.nome=m.nome+'~'+out.length; out.push(m); k++; } }
    v.modelos=out; dados=v; }});
  window.__p={frames:[],on:false,last:null,long:[],ev:{}};
  (function loop(t){ var p=window.__p; if(p.on){ if(p.last!=null) p.frames.push(t-p.last); p.last=t; } requestAnimationFrame(loop); })(0);
  window.__p.raf=[]; var rafOrig=window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame=function(cb){ return rafOrig(function(t){ var s=performance.now(); cb(t); if(window.__p.on) window.__p.raf.push(performance.now()-s); }); };
  try{ new PerformanceObserver(function(l){ l.getEntries().forEach(function(e){ window.__p.long.push(e.duration); }); }).observe({type:'longtask',buffered:true}); }catch(e){}
  // duracao do tratamento de cada evento de ponteiro: captura no inicio, borbulha no fim
  var t0={}; ['pointerdown','pointermove','pointerup','wheel','click'].forEach(function(tp){
    window.addEventListener(tp,function(){ t0[tp]=performance.now(); },true);
    window.addEventListener(tp,function(){ var d=performance.now()-t0[tp]; (window.__p.ev[tp]=window.__p.ev[tp]||[]).push(d); },false);
  });
})();`;

async function metricas(cdp) {
  const { metrics } = await cdp.send('Performance.getMetrics');
  const m = {}; metrics.forEach(x => { m[x.name] = x.value; }); return m;
}
const clicar = (p, sel) => p.evaluate(s => document.querySelector(s).click(), sel);
const comecar = p => p.evaluate(() => { const q = window.__p; q.frames = []; q.last = null; q.on = true; });
const parar = p => p.evaluate(() => { const q = window.__p; q.on = false; return q.frames.slice(1); });
const limparEv = p => p.evaluate(() => { window.__p.ev = {}; window.__p.raf = []; });
const lerRaf = p => p.evaluate(() => window.__p.raf.slice());
const lerEv = p => p.evaluate(() => window.__p.ev);

async function cenario(browser, N) {
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: DPR });
  const page = await ctx.newPage();
  await page.addInitScript(initScript(N));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  const r = { n: N };
  const t0 = Date.now();
  await page.goto(URL_PAGINA + Q, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__obs && window.__obs.estrelas.length > 0 && window.__obs.stats.estrelas > 0, null, { timeout: 120000 });
  await page.waitForTimeout(600);
  r.carga = await page.evaluate(() => ({ pronto_ms: Math.round(performance.now()), tarefas_longas: window.__p.long.filter(d => d > 50).length, maior_tarefa_ms: Math.round(Math.max(0, ...window.__p.long)), soma_tarefas_longas_ms: Math.round(window.__p.long.reduce((a, b) => a + b, 0)) }));
  r.carga.parede_ms = Date.now() - t0;
  if (ABA) { await page.evaluate(h => { location.hash = h; }, '#' + ABA); await page.waitForTimeout(1500); await page.waitForFunction(() => window.__obs.stats.estrelas > 0); }
  const m0 = await metricas(cdp);
  r.memoria = { heap_mb: +(m0.JSHeapUsedSize / 1048576).toFixed(1), nos_dom: m0.Nodes };
  r.modelos = await page.evaluate(() => window.__obs.modelos);

  const caixa = await (await page.$('#ceu')).boundingBox();
  const cx = caixa.x + caixa.width / 2, cy = caixa.y + caixa.height / 2;

  // repouso (cintilar)
  await limparEv(page);
  await page.mouse.move(cx + 400, cy - 300);
  let a = await metricas(cdp); await comecar(page); await page.waitForTimeout(3000); let f = await parar(page); let b = await metricas(cdp);
  r.repouso = { raf_ms: resumo(await lerRaf(page)), quadro: resumo(f), ocupacao_thread_principal_pct: +(100 * (b.TaskDuration - a.TaskDuration) / (b.Timestamp - a.Timestamp)).toFixed(1) };

  // arrasto
  await page.mouse.move(cx, cy); await limparEv(page);
  a = await metricas(cdp); await comecar(page);
  await page.mouse.down();
  for (let i = 0; i < 90; i++) { await page.mouse.move(cx + 140 * Math.sin(i / 9), cy + 100 * Math.cos(i / 9)); await page.waitForTimeout(10); }
  await page.mouse.up(); f = await parar(page); b = await metricas(cdp);
  let ev = await lerEv(page);
  r.arrasto = { raf_ms: resumo(await lerRaf(page)), quadro: resumo(f), tratamento_evento_ms: resumo(ev.pointermove || []), ocupacao_pct: +(100 * (b.TaskDuration - a.TaskDuration) / (b.Timestamp - a.Timestamp)).toFixed(1) };
  await clicar(page, '[data-sky-reset]'); await page.waitForTimeout(300);

  // zoom pela roda
  await page.mouse.move(cx, cy); await limparEv(page); await comecar(page);
  for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, i < 20 ? -100 : 100); await page.waitForTimeout(16); }
  f = await parar(page); ev = await lerEv(page);
  r.zoom_roda = { raf_ms: resumo(await lerRaf(page)), quadro: resumo(f), tratamento_evento_ms: resumo(ev.wheel || []) };
  await clicar(page, '[data-sky-reset]'); await page.waitForTimeout(300);

  // zoom pelos botoes
  await limparEv(page); await comecar(page);
  for (let i = 0; i < 8; i++) { await clicar(page, '[data-sky-zoom=in]'); await page.waitForTimeout(80); }
  for (let i = 0; i < 8; i++) { await clicar(page, '[data-sky-zoom=out]'); await page.waitForTimeout(80); }
  f = await parar(page); ev = await lerEv(page);
  r.zoom_botoes = { raf_ms: resumo(await lerRaf(page)), quadro: resumo(f), tratamento_clique_ms: resumo(ev.click || []) };
  await clicar(page, '[data-sky-reset]'); await page.waitForTimeout(400);

  // hover (hit-test): movimentos de ponteiro sem botao
  await limparEv(page);
  for (let i = 0; i < 240; i++) { await page.mouse.move(caixa.x + 20 + (i * 37) % (caixa.width - 40), caixa.y + 20 + (i * 53) % (caixa.height - 40)); }
  ev = await lerEv(page);
  r.hover = { tratamento_ms: resumo(ev.pointermove || []) };

  // hit-test isolado (funcao de busca da estrela sob o ponteiro), 3000 consultas
  r.hit_test = await page.evaluate(() => { const o = window.__obs, b = document.querySelector('#ceu').getBoundingClientRect(), d = []; if (!o.achar) return null; for (let i = 0; i < 3000; i++) { const x = (i * 37.7) % b.width, y = (i * 53.3) % b.height, t = performance.now(); o.achar(x, y); d.push(performance.now() - t); } d.sort((a, c) => a - c); return { media_ms: +(d.reduce((a, c) => a + c, 0) / d.length).toFixed(4), p95_ms: +d[Math.floor(d.length * 0.95)].toFixed(4), max_ms: +d[d.length - 1].toFixed(4) }; });

  // clique em estrela (abre o drawer) e fecha
  const alvos = await page.evaluate(() => { const b = document.querySelector('#ceu').getBoundingClientRect(); return window.__obs.estrelas.filter(s => s.vis).slice(0, 4000).filter((s, i) => i % 40 === 0).slice(0, 25).map(s => [b.left + s.xy[0], b.top + s.xy[1]]); });
  await limparEv(page);
  for (const [x, y] of alvos) { await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.up(); await page.keyboard.press('Escape'); await page.waitForTimeout(40); }
  ev = await lerEv(page);
  r.clique = { pointerup_ms: resumo(ev.pointerup || []), pointerdown_ms: resumo(ev.pointerdown || []) };

  // conferencia: nada foi removido
  await clicar(page, '[data-sky-reset]'); await page.waitForTimeout(500);
  r.contagem = await page.evaluate(() => {
    const o = window.__obs, S = o.estado;
    return { modelos_dados: o.modelos, estrelas_no_indice: o.estrelas.length, estrelas_desenhadas: o.stats.estrelas, linhas_desenhadas: o.stats.linhas,
      constelacoes_dados: new Set(o.estrelas.map(s => s.g.id)).size, rotulos_dom: document.querySelectorAll('.sky-model').length, escopo: S.escopo };
  });
  r.tela = { heap_mb_final: +((await metricas(cdp)).JSHeapUsedSize / 1048576).toFixed(1) };
  await ctx.close();
  return r;
}

const browser = await pw.chromium.launch({ executablePath: CHROME, args: ['--enable-precise-memory-info'] });
const todos = [];
for (const N of NS) {
  process.stderr.write(`[perf] ${ROTULO}: ${N} nos...\n`);
  todos.push(await cenario(browser, N));
}
await browser.close();
fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
fs.writeFileSync(SAIDA, JSON.stringify({ rotulo: ROTULO, dpr: DPR, viewport: VW + 'x' + VH, data: new Date().toISOString(), nota: 'N maior que os modelos reais usa copias sinteticas (nome com ~); so existem na pagina de teste', resultados: todos }, null, 1));
for (const r of todos) {
  console.log(`\n== ${r.n} nos (${r.modelos} modelos) ==`);
  console.log(`carga: pronto em ${r.carga.pronto_ms} ms; tarefas longas >50ms: ${r.carga.tarefas_longas} (maior ${r.carga.maior_tarefa_ms} ms); heap ${r.memoria.heap_mb} MB; nos DOM ${r.memoria.nos_dom}`);
  console.log(`repouso: quadro media ${r.repouso.quadro?.media} ms, p95 ${r.repouso.quadro?.p95} ms; thread principal ${r.repouso.ocupacao_thread_principal_pct}%; rAF ${JSON.stringify(r.repouso.raf_ms)}`);
  for (const k of ['arrasto', 'zoom_roda', 'zoom_botoes']) console.log(`${k}: quadro media ${r[k].quadro?.media} ms, p95 ${r[k].quadro?.p95} ms (${r[k].quadro?.fps} fps), max ${r[k].quadro?.max} ms; evento ${JSON.stringify(r[k].tratamento_evento_ms || r[k].tratamento_clique_ms)}; rAF ${JSON.stringify(r[k].raf_ms)}; thread ${r[k].ocupacao_pct ?? ''}`);
  console.log(`hover: media ${r.hover.tratamento_ms?.media} ms, p95 ${r.hover.tratamento_ms?.p95} ms`);
  console.log(`hit-test isolado: ${JSON.stringify(r.hit_test)}`);
  console.log(`clique: pointerup media ${r.clique.pointerup_ms?.media} ms, p95 ${r.clique.pointerup_ms?.p95} ms`);
  console.log(`contagem: ${JSON.stringify(r.contagem)}`);
}
