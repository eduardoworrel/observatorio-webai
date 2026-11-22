#!/usr/bin/env node
// Filtros da barra principal: Experimentais (padrao oculto, reversivel em um clique, fora da gaveta), contagens que batem com a fixture,
// "Roda no navegador?" (Sim | Com limitacoes | Ainda nao), barra sem quebra feia em 390/768/1280/1920, i18n pt/en completo e exportacao com o estado do filtro.
// Usa a fixture web/fixtures/maturidade.js (?fixture=maturidade). Sem a fixture, o filtro Experimentais nao aparece.
// Uso: node scripts/testar-filtros.mjs [--web web]
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath, pathToFileURL } from 'url';
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const WEB = path.resolve(arg('web', path.join(raiz, 'web')));
let falhas = 0; const ok = (c, m, x = '') => { console.log((c ? 'ok    ' : 'FALHA ') + m + (c || !x ? '' : '  ' + x)); if (!c) falhas++; };
const url = q => pathToFileURL(path.join(WEB, 'index.html')).href + '?prefetch=0' + q;
const nums = s => (s.match(/[\d.]+/g) || []).map(x => +x.replace(/\./g, ''));
// oraculo independente do app: conta direto nos dados (data.js + fixture), sem usar o codigo da interface. Os numeros esperados saem dos dados, nao de literais.
const O = (() => {
  const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(WEB, 'data.js'), 'utf8'), ctx); vm.runInContext(fs.readFileSync(path.join(WEB, 'fixtures', 'maturidade.js'), 'utf8'), ctx);
  const ms = ctx.window.MAPA_DADOS.modelos.filter(m => m.recorte_pt !== true), ct = f => { const o = { e: 0, d: 0, i: 0, n: 0 }; ms.filter(f).forEach(m => { o[m.maturidade]++; o.n++; }); return o; };
  const por = {}; ms.filter(m => m.escopo === 'br').forEach(m => por[m.publicador] = (por[m.publicador] || 0) + 1);
  const maior = Object.keys(por).sort((a, c) => por[c] - por[a] || (a < c ? -1 : 1))[0], br = ms.filter(m => m.escopo === 'br'), mu = ms.filter(m => m.escopo === 'mundo');
  const via = lista => ({ sim: lista.filter(m => m.via === 'nativo').length, lim: lista.filter(m => m.via === 'gguf').length, nao: lista.filter(m => m.via !== 'nativo' && m.via !== 'gguf').length });
  const oc = ms.filter(m => m.maturidade !== 'e'), nat = l => l.filter(m => m.via === 'nativo').length;
  return { n: ms.length, todos: ct(() => true), br: ct(m => m.escopo === 'br'), maior: ct(m => m.publicador === maior), maiorId: maior, maiorN: por[maior], brN: br.length, muVis: mu.filter(m => m.maturidade !== 'e').length, muExp: mu.filter(m => m.maturidade === 'e').length,
    brVis: br.filter(m => m.maturidade !== 'e').length, brNatVis: nat(br.filter(m => m.maturidade !== 'e')), maiorVis: ms.filter(m => m.publicador === maior && m.maturidade !== 'e').length,
    semMaiorN: br.filter(m => m.publicador !== maior).length, semMaiorVis: br.filter(m => m.publicador !== maior && m.maturidade !== 'e').length, viaOc: via(oc), viaTodos: via(ms), nOc: oc.length, semCampo: ms.length };
})();
const f = n => n.toLocaleString('pt-BR'), re = n => new RegExp('^' + f(n).replace(/\./g, '\\.') + ' '), reN = n => f(n).replace(/\./g, '\\.');
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
async function abrir(q, w = 1280, h = 900, extra = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, acceptDownloads: true, ...extra }); const p = await ctx.newPage();
  if (/semmaturidade/.test(q)) await p.addInitScript(() => { let d = null; Object.defineProperty(window, 'MAPA_DADOS', { configurable: true, get() { return d; }, set(v) { (v.modelos || []).forEach(m => { delete m.maturidade; delete m.sinais_maturidade; }); delete v.dicionario_maturidade; delete v.contrato_maturidade; if (v.foto) { delete v.foto.maturidade; delete v.foto.regra_maturidade; } d = v; } }); });   // simula dados sem os campos de maturidade
  await p.goto(url(q)); await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0, null, { timeout: 60000 }); await p.waitForTimeout(1200); return p;
}
const resumo = p => p.locator('#resumo-recorte').innerText();
const esperaResumo = async (p, f) => { for (let i = 0; i < 40; i++) { if (f(await resumo(p))) return; await p.waitForTimeout(150); } };

// ---- sem os campos: o filtro nao aparece e nada muda
{
  const p = await abrir('&semmaturidade=1');
  ok(await p.locator('#exp-slot').isHidden() && !(await p.locator('#chip-exp').count()), 'sem o campo maturidade o chip Experimentais nao aparece');
  ok(re(O.n).test(await resumo(p)), `sem o campo, nenhum modelo some (${f(O.n)} no recorte)`, await resumo(p));
  ok(await p.locator('#metodo-corpo h3').count() === 3, 'sem o campo, a pagina de metodo nao fala de Experimentais');
  await p.context().close();
}

// ---- com a fixture
const p = await abrir('&fixture=maturidade');
const M = await p.evaluate(() => { const D = window.MAPA_DADOS, c = (f) => { const o = { e: 0, d: 0, i: 0 }; D.modelos.filter(m => m.recorte_pt !== true).filter(f).forEach(m => o[m.maturidade]++); return o; }; return { todos: c(() => true), br: c(m => m.escopo === 'br'), mundo: c(m => m.escopo === 'mundo'), maior: c(m => m.publicador === 'g-assismoraes'), n: D.modelos.length }; });
ok(M.todos.e + M.todos.d + M.todos.i === O.n, `fixture cobre todos os ${f(O.n)} modelos dos dados`, JSON.stringify(M.todos));
ok(M.todos.e === O.todos.e && M.todos.d === O.todos.d && M.todos.i === O.todos.i, `fixture: ${f(O.todos.e)} experimentais, ${f(O.todos.d)} documentados, ${f(O.todos.i)} indeterminados`, JSON.stringify(M.todos));
ok(M.br.e === O.br.e && M.br.d === O.br.d && M.br.i === O.br.i, `fixture: Brasil ${O.br.e}/${O.br.d}/${O.br.i}`, JSON.stringify(M.br));
ok(M.maior.e === O.maior.e && M.maior.d === O.maior.d && M.maior.i === O.maior.i, `fixture: ${O.maiorId} ${O.maior.e}/${O.maior.d}/${O.maior.i}`, JSON.stringify(M.maior));

// chip: padrao oculto, fora da gaveta, reversivel em um clique
const chip = () => p.locator('#chip-exp');
ok((await chip().innerText()).replace(/\s+/g, ' ').trim() === `Experimentais ocultos · ${O.todos.e} mostrar`, `chip na barra: "Experimentais ocultos · ${O.todos.e} mostrar"`, await chip().innerText());
ok(await p.evaluate(() => !document.querySelector('#gaveta-filtros').contains(document.querySelector('#chip-exp')) && document.querySelector('#filtros-modelos').contains(document.querySelector('#chip-exp'))), 'o chip esta na barra principal, fora da gaveta');
ok(await chip().getAttribute('aria-pressed') === 'false' && await p.evaluate(() => window.__obs.estado.mostrarExp === false), 'padrao: experimentais ocultos');
await esperaResumo(p, s => re(O.nOc).test(s));
let r = await resumo(p); ok(re(O.nOc).test(r) && new RegExp(reN(O.todos.e) + ' experimentais ocultos').test(r), `tabela: ${f(O.nOc)} modelos (${f(O.n)} - ${f(O.todos.e)}) e aviso dos ocultos`, r);
ok(await p.evaluate(n => window.__obs.estrelas.filter(s => s.on).length === n, O.nOc), `grafo: ${f(O.nOc)} estrelas (re-layout com o recorte)`);
ok(await p.evaluate(() => !window.__obs.estrelas.some(s => s.on && s.m.maturidade === 'e')), 'nenhum experimental aparece no grafo');
{ const cr = await p.locator('#capa .capa-rot').innerText(); ok(new RegExp(reN(O.brVis) + ' de ' + reN(O.brN)).test(cr) && new RegExp(reN(O.br.e) + ' experimentais ocultos').test(cr), `capa: "Brasil ${f(O.brVis)} de ${f(O.brN)}, ${f(O.br.e)} experimentais ocultos"`, cr); }
let cn = nums(await p.locator('#capa .capa-nums').innerText()); ok(cn[0] === O.brNatVis && cn[1] === O.brVis, `capa: ${O.brNatVis} de ${O.brVis} rodam no navegador`, String(cn));
const nota = await p.locator('#capa .capa-nota').innerText(); ok(new RegExp(Math.round(100 * O.maiorVis / O.brVis) + '%').test(nota) && new RegExp(O.maiorVis + ' de ' + O.brVis).test(nota) && new RegExp(O.maior.e + ' dos seus ' + O.maiorN).test(nota) && /ocultos/.test(nota), `nota do maior publicador: ${Math.round(100 * O.maiorVis / O.brVis)}% (${O.maiorVis} de ${O.brVis}), ${O.maior.e} dos ${O.maiorN} ocultos`, nota);
await p.locator('#capa [data-sem="1"]').click(); await p.waitForTimeout(200);
const rs = await p.locator('#capa .capa-rot').innerText(); ok(new RegExp(O.semMaiorVis + ' de ' + O.semMaiorN).test(rs) && new RegExp((O.semMaiorN - O.semMaiorVis) + ' experimentais ocultos').test(rs), `sem o maior publicador: ${O.semMaiorVis} de ${O.semMaiorN}, ${O.semMaiorN - O.semMaiorVis} ocultos`, rs);
await p.locator('#capa [data-sem="0"]').click();
// contagens do "Mundo" na foto
{ const ft = await p.locator('#foto').innerText(); ok(new RegExp('Mundo[\\s\\S]*?(\\d+) de ' + reN(O.muVis)).test(ft), `inventario do mundo exclui os ${O.muExp} experimentais (de ${f(O.muVis)})`, ft.slice(0, 200)); }
ok(new RegExp(reN(O.todos.e) + ' experimentais ocultos').test(await p.locator('#caveat').innerText()), `nota de rodape diz que ha ${O.todos.e} experimentais ocultos`);

// filtro de build com experimentais ocultos
const via = async v => { await p.locator(`#f-via [data-via="${v}"]`).click(); await p.waitForTimeout(700); await esperaResumo(p, s => !/^0 /.test(s)); return await resumo(p); };
const truth = await p.evaluate(() => { const D = window.MAPA_DADOS, c = (ocultar) => { const o = { sim: 0, lim: 0, nao: 0 }; D.modelos.filter(m => m.recorte_pt !== true && !(ocultar && m.maturidade === 'e')).forEach(m => { if (m.via === 'nativo') o.sim++; else if (m.via === 'gguf') o.lim++; else o.nao++; }); return o; }; return { oculto: c(true), visivel: c(false) }; });
ok(truth.oculto.sim === O.viaOc.sim && truth.oculto.lim === O.viaOc.lim && truth.oculto.nao === O.viaOc.nao, `verdade na fixture (ocultos): ${O.viaOc.sim} / ${O.viaOc.lim} / ${O.viaOc.nao}`, JSON.stringify(truth.oculto));
await esperaResumo(p, s => re(O.nOc).test(s));
r = await via('nativo'); ok(re(O.viaOc.sim).test(r), `"Sim": ${O.viaOc.sim} modelos`, r);
r = await via('gguf'); ok(re(O.viaOc.lim).test(r), `"Com limitações": ${O.viaOc.lim} modelos (so GGUF)`, r);
r = await via('nenhum'); ok(re(O.viaOc.nao).test(r), `"Ainda não": ${f(O.viaOc.nao)} modelos`, r);
ok(await p.evaluate(() => window.__obs.estrelas.filter(s => s.on).every(s => s.m.via !== 'nativo' && s.m.via !== 'gguf')), '"Ainda não": o grafo so tem modelos sem versao para o navegador');
r = await via('todos');
// com a dica visivel e title
ok((await p.locator('#f-build-dica').innerText()).length > 10 && !!(await p.locator('#f-via [data-via="gguf"]').getAttribute('title')), 'cada opcao tem dica (visivel e title)');

// mostrar: reversivel em um clique
await chip().click(); await esperaResumo(p, s => re(O.n).test(s));
ok((await chip().innerText()).replace(/\s+/g, ' ').trim() === 'Experimentais visíveis ocultar', 'chip mostrando: "Experimentais visíveis"', await chip().innerText());
r = await resumo(p); ok(re(O.n).test(r) && !/ocultos/.test(r), `mostrando: ${f(O.n)} modelos, sem aviso de ocultos`, r);
ok(/experimentais visíveis/.test(await p.locator('#capa .capa-rot').innerText()), 'capa diz "experimentais visíveis"');
cn = nums(await p.locator('#capa .capa-nums').innerText()); { const natBr = await p.evaluate(() => window.MAPA_DADOS.modelos.filter(m => m.escopo === 'br' && m.via === 'nativo').length); ok(cn[0] === natBr && cn[1] === O.brN, `capa mostrando: ${natBr} de ${f(O.brN)}`, String(cn)); }
ok(new RegExp(Math.round(100 * O.maiorN / O.brN) + '%').test(await p.locator('#capa .capa-nota').innerText()), `nota do maior publicador volta a ${Math.round(100 * O.maiorN / O.brN)}%`);
ok(await p.evaluate(n => window.__obs.estrelas.filter(s => s.on).length === n, O.n), `grafo: ${f(O.n)} estrelas com experimentais visiveis`);
r = await via('nativo'); ok(re(O.viaTodos.sim).test(r), `mostrando, "Sim": ${O.viaTodos.sim}`, r); r = await via('gguf'); ok(re(O.viaTodos.lim).test(r), `mostrando, "Com limitações": ${O.viaTodos.lim}`, r); r = await via('nenhum'); ok(re(O.viaTodos.nao).test(r), `mostrando, "Ainda não": ${f(O.viaTodos.nao)}`, r); await via('todos');
// exportacao: estado do filtro na legenda (tabela em HTML)
for (const mostrar of [true, false]) {
  if (!mostrar) { await chip().click(); await esperaResumo(p, s => re(O.nOc).test(s)); }
  await p.locator('#exp-tabela').click(); const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('[role=menuitem]', { hasText: 'HTML' }).first().click()]);
  const txt = fs.readFileSync(await dl.path(), 'utf8');
  ok(mostrar ? /Experimentais: visíveis/.test(txt) : new RegExp('Experimentais: ocultos \\(' + reN(O.todos.e) + '\\)').test(txt), `exportacao (${mostrar ? 'mostrando' : 'oculto'}): a legenda traz o estado do filtro`, (txt.match(/Experimentais[^<]{0,40}/) || [''])[0]);
  ok(/rodam no navegador/.test(txt) && !/nativo/i.test(txt), 'exportacao: vocabulario "rodam no navegador", sem "nativo"');
}
// o limpar volta ao padrao (experimentais ocultos)
await chip().click(); await esperaResumo(p, s => re(O.n).test(s)); await p.locator('#limpar').click(); await esperaResumo(p, s => re(O.nOc).test(s));
ok(await p.evaluate(() => window.__obs.estado.mostrarExp === false), 'Limpar filtros volta ao padrao (experimentais ocultos)');

// painel do modelo
await chip().click(); await esperaResumo(p, s => re(O.n).test(s));
const idExp = await p.evaluate(() => window.MAPA_DADOS.modelos.find(m => m.maturidade === 'e' && m.via === 'nenhum' && (m.sinais_maturidade || []).includes(0)).id);
const idDoc = await p.evaluate(() => window.MAPA_DADOS.modelos.find(m => m.maturidade === 'd').id);
await p.locator('#busca').fill(idExp.split('/').pop()); await p.waitForTimeout(700);
await p.locator(`#tb tr[data-id="${idExp.replace(/"/g, '\\"')}"]`).first().click(); await p.waitForTimeout(500);
let dr = await p.locator('#drawer').innerText();
ok(/Experimental/.test(dr) && /Cartão padrão do Hugging Face, sem descrição própria/.test(dr) && /Classificação do cartão, não um juízo sobre quem publicou/.test(dr), 'painel: experimental com sinal em frase simples e a ressalva neutra', dr.slice(0, 300));
ok(!/maturidade/i.test(dr), 'painel: nao usa a palavra "maturidade"');
await p.keyboard.press('Escape');
await p.locator('#busca').fill(idDoc.split('/').pop()); await p.waitForTimeout(700);
await p.locator(`#tb tr[data-id="${idDoc.replace(/"/g, '\\"')}"]`).first().click(); await p.waitForTimeout(500);
dr = await p.locator('#drawer').innerText(); ok(/Documentado/.test(dr) && /descrição própria/.test(dr), 'painel: documentado', dr.slice(0, 200));
// pagina de metodo e legenda: vocabulario
const vocab = await p.evaluate(() => ({ metodo: document.querySelector('#metodo').innerText, legenda: document.querySelector('#legenda').innerText, bar: document.querySelector('#filtros-modelos').innerText, capa: document.querySelector('#capa').innerText, foto: document.querySelector('#foto').innerText, tabela: document.querySelector('#tb thead').innerText }));
const proib = /\b(nativo|nativa|build|builds|runtime|formato|formatos)\b/i;
for (const k of ['legenda', 'bar', 'capa', 'foto', 'tabela']) ok(!proib.test(vocab[k]), `vocabulario simples em ${k} (sem nativo/build/runtime/formato)`, (vocab[k].match(proib) || [''])[0]);
ok(/Experimentais/.test(vocab.metodo) && /Roda no navegador\?/.test(vocab.metodo), 'metodo: explica "Roda no navegador?" e "Experimentais"');
await p.context().close();

// ---- barra sem quebra feia em 390/768/1280/1920, pt e en, claro e escuro
for (const [w, h] of [[390, 844], [768, 1024], [1280, 800], [1920, 1080]]) for (const lang of ['pt', 'en']) {
  const q = await abrir(`&fixture=maturidade&lang=${lang}`, w, h, { colorScheme: w === 768 ? 'dark' : 'light' });
  const m = await q.evaluate(() => {
    const bar = document.querySelector('#filtros-modelos'), r = e => e.getBoundingClientRect(), lh = e => parseFloat(getComputedStyle(e).lineHeight) || parseFloat(getComputedStyle(e).fontSize) * 1.3;
    const unha = [...bar.querySelectorAll('#f-via button, #f-escopo button, #f-tarefa button, #chip-exp .ce-t, #chip-exp b, .f-build-q, .btn-filtros')].filter(e => e.offsetParent).map(e => ({ n: (e.textContent || '').trim().slice(0, 24), quebra: r(e).height > lh(e) * 1.6 + 8 }));
    const fora = [...bar.querySelectorAll('button, input, .segmented, #chip-exp')].filter(e => e.offsetParent).filter(e => r(e).right > r(bar).right + 1 || r(e).left < r(bar).left - 1).map(e => e.id || e.textContent.trim().slice(0, 20));
    const chip = r(document.querySelector('#chip-exp'));
    return { sw: bar.scrollWidth, cw: bar.clientWidth, h: Math.round(r(bar).height), quebras: unha.filter(x => x.quebra).map(x => x.n), fora, chipH: Math.round(chip.height), docw: document.documentElement.scrollWidth, iw: innerWidth };
  });
  ok(m.sw <= m.cw + 1 && m.fora.length === 0 && m.docw <= m.iw + 1, `${w}px ${lang}: a barra cabe sem rolagem horizontal (altura ${m.h}px)`, JSON.stringify(m));
  ok(m.quebras.length === 0, `${w}px ${lang}: nenhum botao da barra quebra linha`, JSON.stringify(m.quebras));
  ok(m.chipH <= 48, `${w}px ${lang}: o chip Experimentais fica em uma linha (${m.chipH}px)`);
  await q.context().close();
}

// ---- i18n pt/en completo: mesmas chaves nos dois idiomas (app.js + filtros.js) e nenhuma chave crua na tela
{
  const app = fs.readFileSync(path.join(WEB, 'app.js'), 'utf8'), ia = app.indexOf('    pt: {\n'), ie = app.indexOf('    en: {\n'), ifim = app.indexOf('  var S = {');
  const chaves = txt => new Set([...txt.matchAll(/(?:^|[,{\s])([A-Za-z_][\w]*): '/g)].map(m => m[1]));
  const pt = chaves(app.slice(ia, ie)), en = chaves(app.slice(ie, ifim));
  const ctx = { window: { MAPA_DADOS: { modelos: [] } } }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(WEB, 'filtros.js'), 'utf8'), ctx);
  const F = ctx.window.MAPA_FILTROS; for (const g of [F.exp.textos, F.roda.textos, F.papel.textos, F.rec.textos]) { Object.keys(g.pt).forEach(k => pt.add(k)); Object.keys(g.en).forEach(k => en.add(k)); }
  const falta = [...pt].filter(k => !en.has(k)).concat([...en].filter(k => !pt.has(k)).map(k => '(so en) ' + k));
  ok(falta.length === 0 && pt.size > 300, `i18n: ${pt.size} chaves iguais em pt e en`, falta.join(', '));
  const usadas = new Set([...app.matchAll(/\bt\('([a-z_0-9]+)'\)/g)].map(m => m[1]).concat([...fs.readFileSync(path.join(WEB, 'filtros.js'), 'utf8').matchAll(/\bt\('([a-z_0-9]+)'\)/g)].map(m => m[1]), [...fs.readFileSync(path.join(WEB, 'index.html'), 'utf8').matchAll(/data-i18n(?:-ph|-aria)?="([a-z_0-9]+)"/g)].map(m => m[1])));
  const semTexto = [...usadas].filter(k => !pt.has(k)); ok(semTexto.length === 0, 'i18n: toda chave usada diretamente existe', semTexto.join(', '));
  for (const lang of ['pt', 'en']) {
    const q = await abrir(`&fixture=maturidade&lang=${lang}`);
    const cru = await q.evaluate(() => { const t = document.body.innerText; return (t.match(/\b(?:exp|mat|dica|capa|leg|inv|roda|v|m\d)_[a-z_]+\b/g) || []); });
    ok(cru.length === 0, `i18n ${lang}: nenhuma chave crua na tela`, cru.join(','));
    const texto = await q.evaluate(() => document.querySelector('#filtros-modelos').innerText + ' ' + document.querySelector('#capa').innerText);
    ok(lang === 'pt' ? /Roda no navegador\?/.test(texto) && /Experimentais ocultos/.test(texto) : /Runs in the browser\?/.test(texto) && /Experimental hidden/.test(texto) && !/Experimentais|navegador/.test(texto), `i18n ${lang}: barra e capa no idioma certo`, texto.slice(0, 160));
    await q.context().close();
  }
}
await b.close(); console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo'); process.exit(falhas ? 1 : 0);
