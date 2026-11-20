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
if erros:
    print("\n".join(erros[:60])); print(len(erros), "erros"); sys.exit(1)
print(f"ok: {len(pubs)} publicadores, {len(mods)} modelos, {len(const)} constelacoes")
