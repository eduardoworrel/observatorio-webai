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
        if d["escopo"] not in ("br", "mundo"): err(n + ": escopo (so br ou mundo; o idioma e o atributo pt)")
        if d["escopo"] == "br" and d["publicador"] not in ids and d["publicador"] not in {x["id"] for x in foto["descartados"]}: err(n + ": escopo br com publicador desconhecido")
        if d["id"].split("/")[0] != d["publicador"]: err(n + ": publicador")
        if d["tamanho_bytes"] is not None and d["tamanho_bytes"] <= 0: err(n + ": tamanho invalido")
        if d["escopo"] == "mundo" and not d["benchmarks"] and not d.get("pt") and d["publicador"] not in {p["id"] for p in pubs if p["escopo"] == "mundo"}: err(n + ": escopo mundo sem idioma pt, benchmark nem publicador do mundo no mapa")
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
    if sum(fc["datasets"]["pt"].values()) != len(dss) or sum(fc["datasets"]["por_downloads"].values()) != len(dss): err("foto_camadas: pt ou downloads nao somam")
if os.path.exists(os.path.join(R, "data", "relacoes.json")):
    rl = L("relacoes")
    iids = {i["id"] for i in rl["instituicoes"]}; lids = {l["id"] for l in rl["laboratorios"]}; pids = {p["id"] for p in pubs}
    nos = {"inst": iids, "lab": lids, "pub": pids}
    for m in mods:
        if m.get("familia_tarefa") not in ("gerador", "codificador"): err(f"modelo {m['id']}: familia_tarefa")
        for c in m.get("creditos", []):
            t, i, papel = (c.split(":") + ["", ""])[:3]
            if i not in nos.get(t, set()): err(f"modelo {m['id']}: credito desconhecido {c}")
            if papel not in ("desenvolvedor", "financiador", "parceiro", "plataforma"): err(f"modelo {m['id']}: credito sem papel valido {c}")
    for v in rl["vinculos"]:
        for x in (v["de"], v["para"]):
            t, _, i = x.partition(":")
            if i not in nos.get(t, set()): err(f"vinculo com no desconhecido {x}")
        if v["tipo"] not in ("conta_oficial", "membro", "pesquisador", "projeto", "relacionado", "mesma_organizacao"): err("vinculo: tipo " + v["tipo"])
        if not URL.match(v["fonte"].get("url", "")) or not ISO.match(v["fonte"].get("acessado", "")) or not v["fonte"].get("trecho"): err(f"vinculo {v['de']} -> {v['para']}: fonte incompleta")
    pai = {i["id"]: i.get("parte_de") for i in rl["instituicoes"]}
    for i in rl["instituicoes"]:
        x, vistos = i["id"], set()
        while pai.get(x):
            if pai[x] in vistos or pai[x] == i["id"]: err("ciclo em parte_de: " + i["id"]); break
            vistos.add(pai[x]); x = pai[x]
        if i["parte_de"] and i["parte_de"] not in iids: err(f"instituicao {i['id']}: parte_de desconhecida")
        for l in i["labs"]:
            if l not in lids: err(f"instituicao {i['id']}: lab desconhecido {l}")
        for p in i["publicadores"]:
            if p not in pids: err(f"instituicao {i['id']}: publicador desconhecido {p}")
        fontes(i, "instituicao " + i["id"])
    for l in rl["laboratorios"]:
        if l["instituicao"] not in iids: err(f"laboratorio {l['id']}: instituicao desconhecida")
        fontes(l, "laboratorio " + l["id"])
    def percorre(n, antes=()):
        if n["tipo"] == "instituicao" and n["id"] not in iids: err("hierarquia: instituicao " + n["id"])
        if n["tipo"] == "laboratorio" and n["id"] not in lids: err("hierarquia: laboratorio " + n["id"])
        if n["tipo"] == "publicador" and n["id"] not in pids: err("hierarquia: publicador " + n["id"])
        for f in n["filhos"]:
            percorre(f)
    for n in rl["hierarquia"]: percorre(n)
    for p in pubs:
        for k in ("instituicoes", "labs", "relacionados"):
            if k not in p: err(f"publicador {p['id']}: falta {k}")
        for i in p.get("instituicoes", []):
            if i not in iids: err(f"publicador {p['id']}: instituicao {i}")
        for l in p.get("labs", []):
            if l not in lids: err(f"publicador {p['id']}: lab {l}")
        for q in p.get("relacionados", []):
            if q not in pids: err(f"publicador {p['id']}: relacionado {q}")
    for l in rl["laboratorios"]:
        if l.get("pais") != next((i["pais"] for i in rl["instituicoes"] if i["id"] == l["instituicao"]), None): err(f"laboratorio {l['id']}: pais diferente da instituicao")
    if sum(foto.get("instituicoes_por_pais", {}).values()) != len(rl["instituicoes"]): err("foto instituicoes_por_pais nao soma")
    fp = foto.get("por_familia_tarefa", {})
    for esc in ("brasil", "mundo"):
        if sum(fp[f][esc]["modelos"] for f in ("gerador", "codificador")) != foto[esc]["modelos"]: err("foto por familia nao soma: " + esc)
    ms = foto["sem_maior_publicador"]
    if ms["id"] and ms["brasil"]["modelos"] + ms["modelos"] != foto["brasil"]["modelos"]: err("foto sem_maior_publicador nao soma")
if any("maturidade" in m for m in mods):
    for m in mods:
        if m.get("maturidade") not in ("experimental", "documentado", "indeterminado"): err(f"modelo {m['id']}: maturidade")
        if "sinais_maturidade" not in m or (m["maturidade"] == "indeterminado") != ("readme_indisponivel" in m["sinais_maturidade"]): err(f"modelo {m['id']}: sinais_maturidade incoerentes")
    fm = foto.get("maturidade")
    if not fm: err("foto sem maturidade")
    else:
        for esc in ("brasil", "mundo"):
            if sum(fm[esc].values()) != foto[esc]["modelos"]: err("foto maturidade nao soma: " + esc)
            for f in ("gerador", "codificador"):
                pass
        if sum(v["total"] for v in fm["builds"].values()) != len(mods): err("foto maturidade builds nao soma")
if erros:
    print("\n".join(erros[:60])); print(len(erros), "erros"); sys.exit(1)
print(f"ok: {len(pubs)} publicadores, {len(mods)} modelos, {len(const)} constelacoes" + (f", {len(dss)} datasets, {len(bms)} benchmarks" if os.path.exists(os.path.join(R, "data", "datasets.json")) else "") + (f", {len(rl['instituicoes'])} instituicoes, {len(rl['vinculos'])} vinculos" if os.path.exists(os.path.join(R, "data", "relacoes.json")) else ""))
