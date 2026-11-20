#!/usr/bin/env python3
"""Confere data/*.json contra SPEC.md (versao 0.2). Sai com codigo 1 se algo estiver errado."""
import json, os, re, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
L = lambda n: json.load(open(os.path.join(R, "data", n + ".json")))
erros = []
err = erros.append
pubs = L("publicadores")["publicadores"]; mods = L("modelos")["modelos"]
const = L("constelacoes")["constelacoes"]; foto = L("foto")
ISO = re.compile(r"^\d{4}-\d{2}-\d{2}$"); URL = re.compile(r"^https://")
CORTE = 4.0
def fontes(o, nome):
    if not o.get("fontes"): err(f"{nome}: sem fontes")
    for f in o.get("fontes", []):
        if not URL.match(f.get("url", "")) or not ISO.match(f.get("acessado", "")): err(f"{nome}: fonte invalida {f}")
def evid(e, nome):
    if not e or not URL.match(e.get("url", "")) or not ISO.match(e.get("acessado", "")) or not e.get("trecho"): err(f"{nome}: evidencia incompleta")
ids = set()
for p in pubs:
    n = "publicador " + p["id"]
    fontes(p, n)
    if p["id"] in ids: err("publicador repetido " + p["id"])
    ids.add(p["id"])
    if p["classe_pais"] not in ("br_evidencia", "nao_classificado", "fora_br"): err(n + ": classe_pais")
    if p["natureza"] not in ("independente", "instituicao", "empresa", "nao_classificada"): err(n + ": natureza")
    if p["escopo"] == "br":
        if p["classe_pais"] != "br_evidencia": err(n + ": escopo br sem classe br_evidencia")
        evid(p.get("evidencia_pais"), n + " (pais)")
    if p["natureza"] != "nao_classificada" and p["escopo"] == "br": evid(p.get("evidencia_natureza"), n + " (natureza)")
mid = set()
for m in mods:
    n = "modelo " + m["id"]
    if m["id"] in mid: err("modelo repetido " + m["id"])
    mid.add(m["id"]); fontes(m, n)
    if m["publicador"] not in ids: err(n + ": publicador desconhecido")
    nav = [b for b in m["builds"] if b["formato"] in ("onnx", "mlc", "litert")]
    esperado = "oficial" if any(b["oficial"] for b in nav) else "comunidade" if nav else "sem_build"
    if m["status"] != esperado: err(f"{n}: status {m['status']} != {esperado}")
    gg = [b for b in m["builds"] if b["formato"] == "gguf"]
    if m["gguf"] != bool(gg): err(n + ": gguf incoerente")
    if m["gguf_wllama"] and (m["gguf_gb"] is None or m["gguf_gb"] > CORTE): err(n + ": gguf_wllama acima do corte")
    if m["gguf_wllama"] and not gg: err(n + ": gguf_wllama sem build gguf")
    via = "nativo" if nav else ("gguf" if m["gguf_wllama"] else "nenhum")
    if m["via"] != via: err(f"{n}: via {m['via']} != {via}")
    if m["gb_navegador"] is not None and m["gb_navegador"] <= 0: err(n + ": gb invalido")
    if m.get("parametros_b") and m["parametros_b"] > foto["corte_parametros_b"]: err(n + ": acima do corte de parametros")
    if not ISO.match(m.get("atualizado") or ""): err(n + ": data de atualizacao ausente")
    if not m["url"].startswith("https://huggingface.co/"): err(n + ": url")
for c in const:
    for i in c["modelos"]:
        if i not in mid: err("constelacao com modelo desconhecido " + i)
for esc in ("brasil", "mundo"):
    c = foto[esc]
    if c["nativo_oficial"] + c["nativo_comunidade"] + c["so_gguf_wllama"] + c["nenhum"] != c["modelos"]: err("foto " + esc + " nao soma")
    if c["nativo_mais_gguf"] != c["so_nativo"] + c["so_gguf_wllama"]: err("foto " + esc + ": nativo_mais_gguf")
DOM = {"geral", "vestibular_educacao", "juridico", "saude", "codigo", "matematica", "extracao_classificacao", "cultura_lingua", "outros"}
if os.path.exists(os.path.join(R, "data", "datasets.json")):
    dss = L("datasets")["datasets"]; bms = L("benchmarks")["benchmarks"]; fc = L("foto_camadas")
    dids = set()
    for d in dss:
        n = "dataset " + d["id"]
        if d["id"].lower() in dids: err("dataset repetido " + d["id"])
        dids.add(d["id"].lower()); fontes(d, n)
        if d["escopo"] not in ("br", "pt"): err(n + ": escopo")
        if d["escopo"] == "br" and d["publicador"] not in ids and d["publicador"] not in {x["id"] for x in foto["descartados"]}: err(n + ": escopo br com publicador desconhecido")
        if d["id"].split("/")[0] != d["publicador"]: err(n + ": publicador")
        if d["tamanho_bytes"] is not None and d["tamanho_bytes"] <= 0: err(n + ": tamanho invalido")
        if d["escopo"] == "pt" and not d["benchmarks"] and not d.get("pt"): err(n + ": escopo pt sem idioma pt nem benchmark")
        if not URL.match(d["fontes"][0]["url"]): err(n + ": url")
    bid = set()
    for b in bms:
        n = "benchmark " + b["id"]
        if b["id"] in bid: err("benchmark repetido " + b["id"])
        bid.add(b["id"]); fontes(b, n)
        if not b["dominio"] or any(x not in DOM for x in b["dominio"]): err(n + ": dominio")
        if b["n_datasets"] > len(b["datasets"]): err(n + ": n_datasets")
        for f in b["fontes"]:
            if not f.get("trecho"): err(n + ": fonte sem trecho")
    for d in dss:
        for x in d["benchmarks"]:
            if x not in bid: err(f"dataset {d['id']}: benchmark desconhecido {x}")
    if fc["datasets"]["total"] != len(dss) or fc["benchmarks"]["total"] != len(bms): err("foto_camadas nao soma")
    if sum(fc["datasets"]["por_escopo"].values()) != len(dss): err("foto_camadas: escopos nao somam")
if erros:
    print("\n".join(erros[:60])); print(len(erros), "erros"); sys.exit(1)
print(f"ok: {len(pubs)} publicadores, {len(mods)} modelos, {len(const)} constelacoes" + (f", {len(dss)} datasets, {len(bms)} benchmarks" if os.path.exists(os.path.join(R, "data", "datasets.json")) else ""))
