#!/usr/bin/env python3
"""Gera web/data.js a partir de data/*.json (mesmo formato que o coletor grava)."""
import json, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
L = lambda n: json.load(open(os.path.join(R, "data", n + ".json"), encoding="utf-8"))
pacote = {n: L(n)[n] for n in ("publicadores", "modelos", "constelacoes", "familias")}
meta = L("modelos")["meta"]
with open(os.path.join(R, "web", "data.js"), "w", encoding="utf-8") as f:
    f.write("window.MAPA_DADOS=" + json.dumps(dict(meta=meta, foto=L("foto"), **pacote), ensure_ascii=False, separators=(",", ":")) + ";")
print("web/data.js gerado:", len(pacote["modelos"]), "modelos")
