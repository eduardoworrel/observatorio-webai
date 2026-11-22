#!/usr/bin/env node
// Drawer de detalhes: abre para cada tipo de entidade, omite campo ausente, papeis do credito, foco preso e devolvido, Esc e clique fora,
// navegacao entre relacionados com voltar, copiar link e link direto, sem rolagem da pagina, carga lazy com skeleton, desempenho, i18n, contraste.
// Uso: node scripts/testar-drawer.mjs [--web web]
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const WEB = path.resolve(arg('web', path.join(raiz, 'web')));
const URL0 = pathToFileURL(path.join(WEB, 'index.html')).href + '?prefetch=0';
let falhas = 0; const ok = (c, m, x = '') => { console.log((c ? 'ok    ' : 'FALHA ') + m + (c || !x ? '' : '  ' + x)); if (!c) falhas++; };
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
const novo = async (o = {}) => {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', ...o }); const p = await ctx.newPage(); const erros = [];
  p.on('pageerror', e => erros.push(e.message)); p.erros = erros;
  await p.addInitScript(l => { try { localStorage.setItem('observatorio-lang', l); } catch (e) {} }, o.lang || 'pt');
  await p.goto(URL0 + (o.hash || '')); await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0, null, { timeout: 60000 }); await p.waitForTimeout(800); p.ctx = ctx; return p;
};
const abrir = async (p, tab, sel, ms = 400) => { await p.evaluate(([a, s]) => window.__obs.abrir(a, s), [tab, sel]); await p.waitForFunction(([a, s]) => { const d = document.querySelector('#drawer'), o = window.__obs.estado; return d.classList.contains('on') && !d.hidden && o.tab === a && o.sel && o.sel.id === s.id && d.querySelector('h2'); }, [tab, sel], { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(ms); };
const info = p => p.evaluate(() => { const d = document.querySelector('#drawer'), h = d.querySelector('h2'); return { on: d.classList.contains('on'), hidden: d.hidden, titulo: h ? h.textContent : '', tid: h ? h.id : '', lab: d.getAttribute('aria-labelledby'), voltar: !document.querySelector('.dr-voltar').hidden, sel: window.__obs.estado.sel, texto: d.innerText, dentro: d.contains(document.activeElement), dd: [...d.querySelectorAll('dd')].map(x => x.textContent.trim()) }; });
const TIPOS = [['modelo', 'modelos', { t: 'm', id: 'Qwen/Qwen3-0.6B' }, 'Qwen3-0.6B'], ['modelo sem versao', 'modelos', { t: 'm', id: 'c2d-usp/MoP_llama_3_30_percent_compression_2_epochs' }, 'MoP_llama'], ['publicador', 'modelos', { t: 'p', id: 'Qwen' }, 'Qwen'], ['instituicao', 'modelos', { t: 'i', id: 'usp' }, 'Universidade de São Paulo'], ['laboratorio', 'modelos', { t: 'l', id: 'c2d-poli-usp' }, 'Centro de Ciência de Dados'], ['dataset', 'datasets', { t: 'm', id: 'nilc-nlp/assin' }, 'assin'], ['benchmark', 'benchmarks', { t: 'm', id: 'assin' }, 'ASSIN']];

// 1. abre para cada tipo; papel de dialogo; titulo rotulado; sem texto "N/D" solto; sem dd vazio
{
  const p = await novo();
  for (const [nome, tab, sel, tit] of TIPOS) {
    await abrir(p, tab, sel, 700); const r = await info(p);
    ok(r.on && !r.hidden && r.titulo.includes(tit), `abre: ${nome} (${r.titulo.slice(0, 40)})`);
    ok(r.lab === r.tid && r.tid, `${nome}: aria-labelledby aponta para o titulo`);
    ok(!/\bN\/D\b|undefined|null|NaN/.test(r.texto) && !r.dd.some(v => v === '' || v === '—'), `${nome}: sem N/D, undefined nem valor vazio solto`);
    const role = await p.evaluate(() => { const d = document.querySelector('#drawer'); return [d.getAttribute('role'), d.getAttribute('aria-modal')]; }); ok(role[0] === 'dialog' && role[1] === 'true', `${nome}: role=dialog, aria-modal`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(350);
  }
  ok(p.erros.length === 0, 'sem erros de JavaScript', p.erros.join(' | ')); await p.ctx.close();
}

// 2. campo ausente = secao omitida (modelo sem licenca, sem parametros, sem builds; dataset sem likes)
{
  const p = await novo();
  await p.evaluate(() => { const m = window.__obs.estado && null; });
  const r = await p.evaluate(async () => {
    const out = {}; const A = window.__obs;
    const D = window.MAPA_DADOS, m = D.modelos.find(x => x.id === 'Qwen/Qwen3-0.6B'); const bak = { l: m.licenca, p: m.parametros_b, a: m.atualizado };
    m.licenca = null; m.parametros_b = null; m.atualizado = null; A.abrir('modelos', { t: 'm', id: m.id }); await new Promise(r => setTimeout(r, 300));
    out.rotulos = [...document.querySelectorAll('#drawer .dr-tile dt')].map(e => e.textContent.trim()); Object.assign(m, { licenca: bak.l, parametros_b: bak.p, atualizado: bak.a });
    return out;
  });
  ok(!r.rotulos.includes('Licença') && !r.rotulos.includes('Parâmetros') && !r.rotulos.includes('Atualizado em') && r.rotulos.length >= 2, 'campos ausentes (licença, parâmetros, atualização) somem junto com o rótulo', r.rotulos.join(','));
  await abrir(p, 'modelos', { t: 'm', id: 'c2d-usp/MoP_llama_3_30_percent_compression_2_epochs' }); const t2 = await info(p);
  ok(!/Versões para o navegador/.test(t2.texto) && !/Download no navegador/.test(t2.texto), 'modelo sem versão: sem seção de versões nem tamanho de download');
  ok(/Ainda não/.test(t2.texto), 'modelo sem versão: selo "Ainda não"'); await p.ctx.close();
}

// 3. situacao, origem com motivo, maturidade e papeis do credito (campos novos lidos com tolerancia)
{
  const p = await novo();
  const r = await p.evaluate(async () => {
    const D = window.MAPA_DADOS, A = window.__obs, m = D.modelos.find(x => x.id === 'nicholasKluge/TeenyTinyLlama-160m'); const o = {};
    m.origem_motivo = 'financiador:fapergs'; m.maturidade = 'experimental'; m.sinais_maturidade = ['cartao_vazio'];
    m.creditos = [{ tipo: 'inst', id: 'fapergs', papel: 'financiador' }, 'inst:usp:desenvolvedor', 'lab:c2d-poli-usp:parceiro', 'inst:escavador:plataforma'];
    A.abrir('modelos', { t: 'm', id: m.id }); await new Promise(r => setTimeout(r, 300)); const d = document.querySelector('#drawer');
    o.selos = [...d.querySelectorAll('.dr-selo')].map(e => e.textContent.trim().replace(/\s+/g, ' ')); o.papeis = [...d.querySelectorAll('.dr-relg.papel h4')].map(e => e.textContent.trim()); o.cls = [...d.querySelectorAll('.dr-relg.papel')].map(e => e.className.replace(/.*(p-[a-z]+).*/, '$1'));
    o.fin = [...d.querySelectorAll('.dr-relg.p-financiador .dr-go-t')].map(e => e.textContent); o.dev = [...d.querySelectorAll('.dr-relg.p-desenvolvedor .dr-go-t')].map(e => e.textContent);
    const i = D.modelos.filter(x => x.nome.startsWith('TeenyTinyLlama')).slice(0, 13); i.forEach(x => { x.creditos = [{ tipo: 'inst', id: 'fapergs', papel: 'financiador' }]; }); o.n = D.modelos.filter(x => (x.creditos || []).some(c => (c && c.papel === 'financiador') || (typeof c === 'string' && /^inst:fapergs:financiador$/.test(c)))).length;   // creditos em objeto (fixture do teste) ou em texto 'inst:ID:papel' (dados reais)
    A.abrir('modelos', { t: 'i', id: 'fapergs' }); await new Promise(r => setTimeout(r, 300)); o.inst = [...d.querySelectorAll('.dr-tiles-papel .dr-tile')].map(e => e.textContent.trim().replace(/\s+/g, ' '));
    return o;
  });
  ok(r.selos.some(s => /financiado por FAPERGS/.test(s)), 'motivo de origem: "financiado por FAPERGS" a partir do código', r.selos.join(' | '));
  ok(r.selos.some(s => /Experimental/.test(s)), 'selo de maturidade (experimental)');
  ok(['Desenvolvido por', 'Financiado por', 'Em parceria com', 'Plataforma'].every(x => r.papeis.includes(x)), 'papéis do crédito com rótulo próprio: desenvolvido, financiado, parceria, plataforma', r.papeis.join(','));
  ok(new Set(r.cls).size === r.cls.length, 'cada papel tem estilo e ícone distintos', r.cls.join(','));
  ok(r.fin.length === 1 && r.fin[0] === 'FAPERGS' && !r.dev.includes('FAPERGS'), 'financiador nunca aparece como autoria', r.fin + ' / ' + r.dev);
  ok(r.inst.some(s => s.includes(String(r.n)) && /financiados/.test(s)), `instituição: contagem separada por papel ("${r.n} modelos financiados")`, r.inst.join(' | '));
  await p.ctx.close();
}

// 4. foco, Esc, clique fora, Tab preso, foco devolvido
{
  const p = await novo();
  await p.focus('#tb tbody tr'); const id0 = await p.evaluate(() => document.activeElement.dataset.id); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  let r = await info(p); ok(r.on && r.dentro, 'ao abrir, o foco vai para dentro do drawer');
  let fora = 0; for (let i = 0; i < 25; i++) { await p.keyboard.press('Tab'); if (!(await info(p)).dentro) fora++; } ok(fora === 0, 'Tab não sai do drawer (25 toques)');
  fora = 0; for (let i = 0; i < 25; i++) { await p.keyboard.press('Shift+Tab'); if (!(await info(p)).dentro) fora++; } ok(fora === 0, 'Shift+Tab não sai do drawer (25 toques)');
  await p.keyboard.press('Escape'); await p.waitForTimeout(450); r = await info(p); const af = await p.evaluate(() => document.activeElement.dataset.id);
  ok(!r.on && r.hidden && r.sel == null, 'Esc fecha e limpa a seleção'); ok(af === id0, 'o foco volta à linha que abriu o drawer', af + ' vs ' + id0);
  await abrir(p, 'modelos', { t: 'p', id: 'Qwen' }); await p.mouse.click(60, 450); await p.waitForTimeout(450); r = await info(p); ok(!r.on && r.hidden, 'clique fora (no escurecimento) fecha');
  await abrir(p, 'modelos', { t: 'p', id: 'Qwen' }); await p.click('#drawer-x'); await p.waitForTimeout(450); ok(!(await info(p)).on, 'botão fechar fecha');
  await p.ctx.close();
}

// 5. navegacao entre relacionados com voltar e destaque no grafo; setas
{
  const p = await novo();
  await abrir(p, 'modelos', { t: 'm', id: 'Qwen/Qwen3-0.6B' }); let r = await info(p);
  ok(!r.voltar, 'sem histórico: o botão voltar não aparece');
  await p.click('#drawer .dr-relg .dr-go[data-ir^="pub:"]'); await p.waitForTimeout(300); r = await info(p);
  ok(r.titulo === 'Qwen' && r.sel && r.sel.t === 'p' && r.voltar, 'chip do publicador navega dentro do drawer e a seleção (destaque no grafo) acompanha', JSON.stringify(r.sel));
  ok(await p.evaluate(() => document.activeElement.id === 'drawer-titulo'), 'após navegar, o foco vai para o novo título');
  await p.click('#drawer .dr-row'); await p.waitForTimeout(300); r = await info(p); ok(r.sel && r.sel.t === 'm' && r.voltar, 'item da lista abre o modelo', r.titulo);
  await p.click('.dr-voltar'); await p.waitForTimeout(300); r = await info(p); ok(r.titulo === 'Qwen' && r.sel.t === 'p', 'voltar retorna ao publicador');
  await p.keyboard.press('Alt+ArrowLeft'); await p.waitForTimeout(300); r = await info(p); ok(r.titulo === 'Qwen3-0.6B' && !r.voltar && r.sel.t === 'm' && r.sel.id === 'Qwen/Qwen3-0.6B', 'Alt+← volta ao modelo original e o botão some');
  await abrir(p, 'modelos', { t: 'p', id: 'Qwen' }); await p.focus('#drawer .dr-row'); await p.keyboard.press('ArrowDown'); ok(await p.evaluate(() => document.activeElement.classList.contains('dr-row') && document.activeElement !== document.querySelector('#drawer .dr-row')), 'setas ↓ andam pela lista de modelos');
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  // entre abas: dataset -> benchmark e voltar
  await abrir(p, 'datasets', { t: 'm', id: 'nilc-nlp/assin2' }, 600); const bt = await p.$('#drawer .dr-go[data-ir^="benchmarks:"]');
  if (bt) { await bt.click(); await p.waitForTimeout(1200); r = await info(p); ok(/ASSIN/i.test(r.titulo) && await p.evaluate(() => window.__obs.estado.tab === 'benchmarks'), 'dataset -> benchmark troca de aba e abre o item', r.titulo); await p.click('.dr-voltar'); await p.waitForFunction(() => document.querySelector('#drawer h2')?.textContent === 'assin2', null, { timeout: 8000 }).catch(() => {}); r = await info(p); ok(r.titulo === 'assin2' && await p.evaluate(() => window.__obs.estado.tab === 'datasets'), 'voltar retorna ao dataset na aba de origem', r.titulo); } else ok(false, 'dataset sem chip de benchmark para testar');
  await p.ctx.close();
}

// 6. copiar link e link direto
{
  const p = await novo({ permissions: ['clipboard-read', 'clipboard-write'] });
  await abrir(p, 'modelos', { t: 'm', id: 'Qwen/Qwen3-0.6B' }); await p.evaluate(() => { window.__copiado = null; const w = navigator.clipboard.writeText.bind(navigator.clipboard); navigator.clipboard.writeText = t => { window.__copiado = t; return w(t).catch(() => {}); }; });
  await p.click('.dr-copiar'); await p.waitForTimeout(300); const link = await p.evaluate(() => window.__copiado);
  ok(link && /#modelos&d=m:Qwen%2FQwen3-0\.6B$/.test(link), 'copiar link: URL com hash do item', link);
  ok(await p.evaluate(() => document.querySelector('.dr-aviso').textContent.length > 0), 'avisa que o link foi copiado (região live)'); await p.ctx.close();
  const q = await novo({ hash: '#modelos&d=p:Qwen' }); await q.waitForTimeout(500); const r = await info(q); ok(r.on && r.titulo === 'Qwen' && r.sel.t === 'p', 'link direto abre o item (#aba&d=tipo:id)', r.titulo); await q.ctx.close();
  const q2 = await novo({ hash: '#datasets&d=m:nilc-nlp/assin' }); await q2.waitForTimeout(1500); const r2 = await info(q2); ok(r2.on && r2.titulo === 'assin', 'link direto de dataset abre na aba certa', r2.titulo); await q2.ctx.close();
}

// 7. rolagem: a pagina nao rola, o corpo do drawer rola
{
  const p = await novo(); await p.evaluate(() => scrollTo(0, 300)); await p.waitForTimeout(200); const y0 = await p.evaluate(() => scrollY);
  await abrir(p, 'modelos', { t: 'm', id: 'Qwen/Qwen3-0.6B' }, 600);
  await p.mouse.move(1200, 500); for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 500); await p.waitForTimeout(40); }
  const a = await p.evaluate(() => ({ y: scrollY, c: document.querySelector('#drawer-corpo').scrollTop, d: document.querySelector('#drawer').scrollTop }));
  ok(a.y === y0 && a.c > 200 && a.d === 0, `roda sobre o drawer: só o corpo rola (página ${y0}->${a.y}, corpo ${a.c})`);
  await p.mouse.move(100, 500); for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 500); await p.waitForTimeout(40); }
  ok(await p.evaluate(y => scrollY === y, y0), 'roda sobre o escurecimento não rola a página');
  await p.mouse.move(1200, 500); for (let i = 0; i < 30; i++) { await p.mouse.wheel(0, 900); await p.waitForTimeout(15); } ok(await p.evaluate(y => scrollY === y, y0), 'chegando ao fim do corpo, a rolagem não passa para a página');
  await p.ctx.close();
}

// 8. carga lazy com skeleton; desempenho
{
  const p = await novo();
  const r = await p.evaluate(async () => {
    const o = {}; o.antes = !!window.MAPA_DETALHES; let lt = 0; try { new PerformanceObserver(l => { lt += l.getEntries().length; }).observe({ entryTypes: ['longtask'] }); } catch (e) {}
    const t0 = performance.now(); window.__obs.abrir('modelos', { t: 'm', id: 'Qwen/Qwen3-0.6B' }); o.ms = performance.now() - t0; o.skel = !!document.querySelector('#drawer .dr-skel'); o.busy = !!document.querySelector('#drawer [aria-busy="true"]');
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); o.ate2raf = performance.now() - t0;
    for (let i = 0; i < 80 && !document.querySelector('#drawer .dr-vers'); i++) await new Promise(r => setTimeout(r, 100)); o.versoes = !!document.querySelector('#drawer .dr-vers'); o.skelDepois = !!document.querySelector('#drawer .dr-skel');
    o.lt = lt; return o;
  });
  ok(!r.antes && r.skel && r.busy, 'builds ainda não carregados: skeleton com aria-busy', JSON.stringify(r));
  ok(r.versoes && !r.skelDepois, 'ao chegar os dados, o skeleton dá lugar às versões');
  ok(r.ms < 100, `abre em menos de 100 ms (${r.ms.toFixed(1)} ms)`); ok(r.lt === 0, `sem long task na abertura (${r.lt})`);
  const t2 = await p.evaluate(() => { const o = []; for (const [tab, s] of [['modelos', { t: 'p', id: 'Qwen' }], ['modelos', { t: 'i', id: 'usp' }], ['modelos', { t: 'm', id: 'Qwen/Qwen3-8B' }]]) { const t0 = performance.now(); window.__obs.abrir(tab, s); o.push(performance.now() - t0); } return o; });
  ok(t2.every(x => x < 100), 'publicador, instituição e modelo grande: render < 100 ms', t2.map(x => x.toFixed(1)).join(', ')); await p.ctx.close();
}

// 9. i18n EN completo; movimento reduzido; celular
{
  const p = await novo({ lang: 'en' }); await abrir(p, 'modelos', { t: 'm', id: 'Qwen/Qwen3-0.6B' }, 600); let r = await info(p);
  ok(/Browser versions/.test(r.texto) && /Related/.test(r.texto) && /Open on Hugging Face/.test(r.texto) && /Downloads, 30 days/.test(r.texto) && !/Versões|Relacionados|Abrir no/.test(r.texto), 'EN: modelo todo em inglês');
  for (const [, tab, sel] of TIPOS.slice(2)) { await abrir(p, tab, sel, 500); r = await info(p); const chaves = r.texto.match(/\b[a-z]{1,4}_[a-z_]{2,}\b/g); ok(!chaves && !/Fontes e evid|Principais|Instituição|Laboratório\b/.test(r.texto.replace(/Laboratory/g, '')), `EN: ${sel.t}/${tab} sem chave de tradução nem texto em português`, (chaves || []).join(',')); }
  await p.ctx.close();
  const q = await novo({ reducedMotion: 'reduce' }); await abrir(q, 'modelos', { t: 'p', id: 'Qwen' }, 200); ok(await q.evaluate(() => getComputedStyle(document.querySelector('#drawer')).transitionDuration === '0s'), 'prefers-reduced-motion: sem transição'); await q.ctx.close();
  const m = await novo({ viewport: { width: 390, height: 844 }, hasTouch: true }); await abrir(m, 'modelos', { t: 'm', id: 'Qwen/Qwen3-0.6B' }, 800);
  const g = await m.evaluate(() => { const r = document.querySelector('#drawer').getBoundingClientRect(); return { w: r.width, top: r.top, h: r.height, vh: innerHeight, sw: document.documentElement.scrollWidth }; });
  ok(g.w === 390 && g.top < 40 && g.h > g.vh * 0.9, 'celular: bottom sheet quase em tela cheia', JSON.stringify(g)); ok(g.sw <= 390, 'celular: sem rolagem horizontal', String(g.sw));
  await m.ctx.close();
  const w = await novo(); await abrir(w, 'modelos', { t: 'm', id: 'Qwen/Qwen3-0.6B' }, 500); const lw = await w.evaluate(() => document.querySelector('#drawer').getBoundingClientRect().width); ok(lw >= 420 && lw <= 520, `desktop: largura confortável (${lw}px)`); await w.ctx.close();
}

// 10. contraste >= 4,5:1 (claro e escuro) em todo texto do drawer
const CONTRASTE = () => {
  const parse = s => { const m = /rgba?\(([^)]+)\)/.exec(s); if (!m) return null; const v = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; };
  const over = (f, bg) => [0, 1, 2].map(i => f[i] * f[3] + bg[i] * (1 - f[3])).concat([1]);
  const fundo = el => { const pilha = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c[3] > 0) { pilha.push(c); if (c[3] === 1) break; } } let bg = [255, 255, 255, 1]; if (pilha.length && pilha[pilha.length - 1][3] < 1) bg = [getComputedStyle(document.documentElement).colorScheme === 'dark' ? 47 : 255, 255, 255, 1]; for (let i = pilha.length - 1; i >= 0; i--) bg = over(pilha[i], bg); return bg; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ruins = []; const d = document.querySelector('#drawer'); const w = document.createTreeWalker(d, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const n = w.currentNode; if (!n.textContent.trim()) continue; const el = n.parentElement; if (!el || el.closest('.dr-sr') || el.offsetParent === null) continue; const cs = getComputedStyle(el); if (cs.visibility === 'hidden') continue;
    const bg = fundo(el), fg = over(parse(cs.color), bg), a = lum(fg), b2 = lum(bg), r = (Math.max(a, b2) + 0.05) / (Math.min(a, b2) + 0.05); if (r < 4.5) ruins.push(el.className + ':' + n.textContent.trim().slice(0, 24) + ':' + r.toFixed(2)); }
  return ruins;
};
for (const esq of ['light', 'dark']) {
  const p = await novo({ colorScheme: esq }); const ruins = [];
  for (const [nome, tab, sel] of TIPOS) { await abrir(p, tab, sel, 500); await p.evaluate(() => document.querySelectorAll('#drawer details').forEach(d => d.open = true)); (await p.evaluate(CONTRASTE)).forEach(x => ruins.push(nome + ' ' + x)); await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  ok(ruins.length === 0, `contraste >= 4,5:1 (${esq}): todo o texto de todos os tipos`, ruins.slice(0, 6).join(' | ')); await p.ctx.close();
}
await b.close(); console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo'); process.exit(falhas ? 1 : 0);
