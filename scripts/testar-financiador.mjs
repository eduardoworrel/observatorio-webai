#!/usr/bin/env node
// Financiador e credito, nao afiliacao: dois grupos que so compartilham um financiador nao ficam mais proximos do que dois sem vinculo;
// o controle (mesma instituicao como parceira/afiliacao) fica mais perto, entao o teste distingue. Trabalha numa copia temporaria de web/ com dados de teste
// injetados antes de relacoes.js (nada e gravado em data/). Uso: node scripts/testar-financiador.mjs [--web web]
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const WEB = path.resolve(arg('web', path.join(raiz, 'web')));
let falhas = 0; const ok = (c, m, x = '') => { console.log((c ? 'ok    ' : 'FALHA ') + m + (c || !x ? '' : '  ' + x)); if (!c) falhas++; };
const prelude = papel => `(function(){var D=window.MAPA_DADOS||{};var usados={};(D.instituicoes||[]).concat(D.laboratorios||[]).forEach(function(e){(e.publicadores||[]).forEach(function(p){usados[p]=1;});});
(D.publicadores||[]).forEach(function(p){(p.relacionados||[]).forEach(function(q){usados[p.id]=1;usados[q]=1;});});(D.vinculos&&D.vinculos.linhas||[]).forEach(function(l){var m=/^pub:(.*)$/.exec(l[0]),n=/^pub:(.*)$/.exec(l[1]);if(m)usados[m[1]]=1;if(n)usados[n[1]]=1;});
var cont={};(D.modelos||[]).forEach(function(m){if(m.maturidade==='e'||m.recorte_pt===true)return;cont[m.publicador]=(cont[m.publicador]||0)+1;});var livres=Object.keys(cont).filter(function(p){return !usados[p];}).sort(function(a,b){return cont[b]-cont[a]||(a<b?-1:1);});
var A=livres[4],B=livres[24];window.__teste={A:A,B:B};
if('${papel}'!=='nenhum'){D.instituicoes=(D.instituicoes||[]).concat([{id:'inst-teste',nome:'Instituicao de teste',publicadores:[A,B]}]);
var col=D.vinculos.colunas.slice();D.vinculos.linhas=D.vinculos.linhas.concat([A,B].map(function(p){return ['pub:'+p,'inst:inst-teste','${papel}','https://exemplo.invalid'];}));}})();\n`;
const b = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
const medir = async papel => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fin-')); fs.cpSync(WEB, tmp, { recursive: true });
  const rp = path.join(tmp, 'relacoes.js'); fs.writeFileSync(rp, prelude(papel) + fs.readFileSync(rp, 'utf8'));
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.goto(pathToFileURL(path.join(tmp, 'index.html')).href + '?prefetch=0'); await p.waitForFunction(() => window.__obs && window.__obs.stats.estrelas > 0 && window.__obs.grupos.every(g => g.u !== undefined), null, { timeout: 60000 }); await p.waitForTimeout(800);
  const r = await p.evaluate(() => { const G = window.__obs.grupos, t = window.__teste, ga = G.find(g => g.id === t.A), gb = G.find(g => g.id === t.B); return ga && gb ? { A: t.A, B: t.B, d: Math.hypot(ga.x - gb.x, ga.y - gb.y), R: ga.R + gb.R, pos: G.map(g => g.id + ':' + g.x.toFixed(1) + ',' + g.y.toFixed(1)).join('|') } : null; });
  await p.context().close(); fs.rmSync(tmp, { recursive: true, force: true }); return r;
};
const sem = await medir('nenhum'), fin = await medir('financiador'), par = await medir('conta_oficial');
ok(sem && fin && par, 'os dois grupos de teste existem no mapa', JSON.stringify({ sem: !!sem, fin: !!fin, par: !!par }));
console.log(`   ${sem.A} e ${sem.B}: distancia sem vinculo ${sem.d.toFixed(0)}, so financiador ${fin.d.toFixed(0)}, mesma instituicao (afiliacao) ${par.d.toFixed(0)} (soma dos raios ${sem.R.toFixed(0)})`);
ok(fin.d >= sem.d - 1e-6, 'dois grupos que so compartilham um financiador nao ficam mais proximos do que dois sem vinculo');
ok(fin.pos === sem.pos, 'o financiador nao muda o layout (mesmas posicoes que sem vinculo)');
ok(par.d < sem.d, 'controle: a mesma instituicao como afiliacao aproxima os grupos (o teste distingue)');
await b.close(); console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo'); process.exit(falhas ? 1 : 0);
