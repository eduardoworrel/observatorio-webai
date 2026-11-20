#!/usr/bin/env python3
"""Gera web/data.js a partir de data/*.json (mesmo formato que o coletor grava)."""
import json, os, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(R, "scripts"))
L = lambda n: json.load(open(os.path.join(R, "data", n + ".json"), encoding="utf-8"))
import coletar
pacote = {n: L(n)[n] for n in ("publicadores", "modelos", "constelacoes", "familias")}
meta = L("modelos")["meta"]
ds = L("datasets")["datasets"] if os.path.exists(os.path.join(R, "data", "datasets.json")) else []
bs = L("benchmarks")["benchmarks"] if os.path.exists(os.path.join(R, "data", "benchmarks.json")) else []
fc = L("foto_camadas") if os.path.exists(os.path.join(R, "data", "foto_camadas.json")) else {}
with open(os.path.join(R, "web", "data.js"), "w", encoding="utf-8") as f:
    f.write("window.MAPA_DADOS=" + json.dumps(dict(meta=meta, foto=L("foto"), **pacote, datasets=coletar.compactar_datasets(ds), benchmarks=bs, foto_camadas=fc, contrato_camadas=1), ensure_ascii=False, separators=(",", ":")) + ";")
print("web/data.js gerado:", len(pacote["modelos"]), "modelos,", len(ds), "datasets,", len(bs), "benchmarks")
