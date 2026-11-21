#!/usr/bin/env python3
"""Gera web/data.js, data-builds.js, data-datasets.js e data-benchmarks.js a partir de data/*.json (mesmo formato que o coletor grava)."""
import json, os, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(R, "scripts"))
L = lambda n: json.load(open(os.path.join(R, "data", n + ".json"), encoding="utf-8"))
import coletar
pacote = {n: L(n)[n] for n in ("publicadores", "modelos", "constelacoes", "familias")}
meta = L("modelos")["meta"]
ds = L("datasets")["datasets"] if os.path.exists(os.path.join(R, "data", "datasets.json")) else []
bs = L("benchmarks")["benchmarks"] if os.path.exists(os.path.join(R, "data", "benchmarks.json")) else []
rl = L("relacoes") if os.path.exists(os.path.join(R, "data", "relacoes.json")) else {"instituicoes": [], "laboratorios": [], "vinculos": [], "hierarquia": []}
fc = L("foto_camadas") if os.path.exists(os.path.join(R, "data", "foto_camadas.json")) else {}
for rel, conteudo in coletar.arquivos_web(meta, L("foto"), pacote, ds, bs, fc, rl).items():
    with open(os.path.join(R, rel), "w", encoding="utf-8") as f:
        f.write(conteudo)
print("web/data*.js gerados:", len(pacote["modelos"]), "modelos,", len(ds), "datasets,", len(bs), "benchmarks")
