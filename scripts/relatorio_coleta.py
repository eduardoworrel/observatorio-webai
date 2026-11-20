#!/usr/bin/env python3
"""Relatorio da coleta: compara data/ antes e depois e aponta o que o mantenedor deve revisar antes de publicar.

    python3 scripts/relatorio_coleta.py                    # data/ atual contra o ultimo commit (git HEAD)
    python3 scripts/relatorio_coleta.py --antes REF        # contra outro commit, ramo ou tag
    python3 scripts/relatorio_coleta.py --antes PASTA      # contra uma pasta com publicadores.json, modelos.json e foto.json
    python3 scripts/relatorio_coleta.py --urls             # confere se as URLs de evidencia dos publicadores novos ainda respondem (rede)

Imprime e grava em .relatorios/ (ignorado pelo Git). So leitura dos dados; nenhum modelo de linguagem.
"""
import argparse, collections, datetime, json, os, subprocess, sys, urllib.request

RAIZ_PADRAO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARQS = {"publicadores": "publicadores", "modelos": "modelos", "foto": None, "datasets": None, "benchmarks": None}
QUEDA_PUB, QUEDA_TOTAL = 0.30, 0.10   # queda relativa que vira anomalia (publicador com 3+ modelos; total)


def _json(texto):
    try:
        return json.loads(texto)
    except ValueError:
        return {}


def carregar(raiz, ref):
    """Le publicadores, modelos e foto de uma pasta, de um ref do Git ou do data/ atual (ref None)."""
    saida = {}
    for n in ARQS:
        if ref is None:
            c = os.path.join(raiz, "data", n + ".json")
            t = open(c, encoding="utf-8").read() if os.path.exists(c) else "{}"
        elif os.path.isdir(ref):
            c = os.path.join(ref, n + ".json")
            t = open(c, encoding="utf-8").read() if os.path.exists(c) else "{}"
        else:
            r = subprocess.run(["git", "show", f"{ref}:data/{n}.json"], cwd=raiz, capture_output=True, text=True)
            t = r.stdout if r.returncode == 0 else "{}"
        saida[n] = _json(t)
    return {"pubs": {p["id"]: p for p in saida["publicadores"].get("publicadores", [])},
            "mods": {m["id"]: m for m in saida["modelos"].get("modelos", [])},
            "foto": saida["foto"],
            "ds": {x["id"]: x for x in saida["datasets"].get("datasets", [])},
            "bench": {x["id"]: x for x in saida["benchmarks"].get("benchmarks", [])}}


def _cont(pubs, mods):
    por_pub = collections.Counter(m["publicador"] for m in mods.values())
    c = {"escopo": collections.Counter(), "classe": collections.Counter(), "natureza_br": collections.Counter(), "modelos_escopo": collections.Counter()}
    for p in pubs.values():
        c["escopo"][p["escopo"]] += 1
        c["classe"][p["classe_pais"]] += 1
        if p["escopo"] == "br":
            c["natureza_br"][p["natureza"]] += 1
    for m in mods.values():
        c["modelos_escopo"][m["escopo"]] += 1
    return c, por_pub


def comparar(a, d):
    r = {}
    r["pubs_novos"] = sorted(set(d["pubs"]) - set(a["pubs"]), key=str.lower)
    r["pubs_removidos"] = sorted(set(a["pubs"]) - set(d["pubs"]), key=str.lower)
    r["mods_novos"] = sorted(set(d["mods"]) - set(a["mods"]), key=str.lower)
    r["mods_removidos"] = sorted(set(a["mods"]) - set(d["mods"]), key=str.lower)
    r["status"] = [(i, a["mods"][i]["status"], d["mods"][i]["status"], a["mods"][i]["via"], d["mods"][i]["via"])
                   for i in sorted(set(a["mods"]) & set(d["mods"]), key=str.lower)
                   if (a["mods"][i]["status"], a["mods"][i]["via"]) != (d["mods"][i]["status"], d["mods"][i]["via"])]
    r["classe_mudou"] = [(i, (a["pubs"][i]["classe_pais"], a["pubs"][i]["natureza"]), (d["pubs"][i]["classe_pais"], d["pubs"][i]["natureza"]))
                         for i in sorted(set(a["pubs"]) & set(d["pubs"]), key=str.lower)
                         if (a["pubs"][i]["classe_pais"], a["pubs"][i]["natureza"]) != (d["pubs"][i]["classe_pais"], d["pubs"][i]["natureza"])]
    ca, pa = _cont(a["pubs"], a["mods"])
    cd, pd = _cont(d["pubs"], d["mods"])
    r["cont"] = (ca, cd)
    an = []
    for i, p in d["pubs"].items():
        if pd.get(i, 0) == 0:
            an.append(f"publicador sem modelos nos dados: {i}")
    for i, p in a["pubs"].items():
        antes, depois = pa.get(i, 0), pd.get(i, 0)
        if i in d["pubs"] and antes >= 3 and depois < antes * (1 - QUEDA_PUB):
            an.append(f"queda de modelos em {i}: {antes} -> {depois}")
    ta, td = len(a["mods"]), len(d["mods"])
    if ta and td < ta * (1 - QUEDA_TOTAL):
        an.append(f"queda do total de modelos: {ta} -> {td}")
    for i in r["pubs_removidos"]:
        if a["pubs"][i]["classe_pais"] == "br_evidencia":
            an.append(f"publicador do Brasil saiu do mapa (evidencia que parou de responder ou sem modelos no corte): {i}")
    antes_desc = {y["id"] for y in a["foto"].get("descartados", [])}
    novos = [x for x in d["foto"].get("descartados", []) if x["id"] not in antes_desc]
    novos_desc = [x["id"] for x in novos]
    for x in novos:
        an.append(f"publicador fora do mapa: {x['id']}: {x['motivo']}")
    for i in r["classe_mudou"]:
        an.append(f"classe/natureza mudou em {i[0]}: {i[1]} -> {i[2]}")
    r["ds_novos"] = sorted(set(d["ds"]) - set(a["ds"]), key=str.lower)
    r["ds_removidos"] = sorted(set(a["ds"]) - set(d["ds"]), key=str.lower)
    r["bench_novos"] = sorted(set(d["bench"]) - set(a["bench"]))
    r["bench_removidos"] = sorted(set(a["bench"]) - set(d["bench"]))
    for i, b in d["bench"].items():
        if b["n_datasets"] < len(b["datasets"]):
            an.append(f"benchmark {i}: {len(b['datasets']) - b['n_datasets']} dataset(s) nao encontrado(s) ou fechado(s) na coleta")
    if a["ds"] and len(d["ds"]) < len(a["ds"]) * (1 - QUEDA_TOTAL):
        an.append(f"queda do total de datasets: {len(a['ds'])} -> {len(d['ds'])}")
    r["novos_descartados"] = novos_desc
    r["anomalias"] = an
    return r


def checar_urls(d, ids):
    ruins = []
    for i in ids:
        ev = (d["pubs"][i].get("evidencia_pais") or {})
        u = ev.get("url")
        if not u or not u.startswith("https://"):
            continue
        try:
            urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "observatorio-relatorio"}), timeout=20).read(1)
        except Exception as e:
            ruins.append(f"evidencia de pais de {i} nao respondeu ({u}): {e}")
    return ruins


def texto(r, a, d, antes_nome, chamadas=None, urls_ruins=()):
    L = []
    ap = L.append
    ap(f"Relatorio da coleta, {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')} (antes: {antes_nome})")
    if chamadas is not None:
        ap(f"Chamadas de rede nesta coleta: {chamadas}")
    ap("")
    ap(f"Publicadores: {len(a['pubs'])} -> {len(d['pubs'])}; modelos: {len(a['mods'])} -> {len(d['mods'])}")
    ap("")
    ap(f"== Publicadores novos ({len(r['pubs_novos'])})")
    for i in r["pubs_novos"]:
        p = d["pubs"][i]
        ap(f"  {i}  [{p['escopo']}, {p['classe_pais']}, {p['natureza']}]  {sum(1 for m in d['mods'].values() if m['publicador'] == i)} modelo(s)")
    ap(f"== Publicadores removidos ({len(r['pubs_removidos'])})")
    for i in r["pubs_removidos"]:
        ap(f"  {i}")
    ap(f"== Modelos adicionados ({len(r['mods_novos'])})")
    for i in r["mods_novos"]:
        m = d["mods"][i]
        ap(f"  {i}  [{m['tarefa']}, {m.get('parametros_b')} B, status {m['status']}, via {m['via']}]")
    ap(f"== Modelos removidos ({len(r['mods_removidos'])})")
    for i in r["mods_removidos"]:
        ap(f"  {i}")
    ap(f"== Datasets novos ({len(r['ds_novos'])}); removidos ({len(r['ds_removidos'])}); total {len(a['ds'])} -> {len(d['ds'])}")
    for i in r["ds_novos"][:60]:
        x = d["ds"][i]
        ap(f"  + {i}  [{x['escopo']}, {x['downloads']} downloads]")
    if len(r["ds_novos"]) > 60:
        ap(f"  ... e mais {len(r['ds_novos']) - 60} (lista completa: diff de data/datasets.json)")
    for i in r["ds_removidos"][:60]:
        ap(f"  - {i}")
    ap(f"== Benchmarks novos ({len(r['bench_novos'])}): " + ", ".join(r["bench_novos"]) + f"; removidos ({len(r['bench_removidos'])}): " + ", ".join(r["bench_removidos"]))
    ap(f"== Mudancas de status de build ({len(r['status'])})")
    for i, s0, s1, v0, v1 in r["status"]:
        ap(f"  {i}: status {s0} -> {s1}; via {v0} -> {v1}")
    ca, cd = r["cont"]
    ap("== Contagens (antes -> depois)")
    for rot, k in (("publicadores por escopo", "escopo"), ("publicadores por classe", "classe"), ("publicadores do Brasil por natureza", "natureza_br"), ("modelos por escopo", "modelos_escopo")):
        chaves = sorted(set(ca[k]) | set(cd[k]))
        ap(f"  {rot}: " + "; ".join(f"{c} {ca[k][c]} -> {cd[k][c]}" for c in chaves))
    fa, fd = a["foto"], d["foto"]
    for esc in ("brasil", "mundo"):
        if fa.get(esc) and fd.get(esc):
            ap(f"  foto {esc}: " + "; ".join(f"{k} {fa[esc][k]} -> {fd[esc][k]}" for k in ("modelos", "so_nativo", "so_gguf_wllama", "nativo_mais_gguf", "nenhum")))
    ap(f"== Anomalias para revisar ({len(r['anomalias']) + len(urls_ruins)})")
    for x in list(r["anomalias"]) + list(urls_ruins):
        ap(f"  - {x}")
    if not r["anomalias"] and not urls_ruins:
        ap("  nenhuma")
    return "\n".join(L) + "\n"


def gerar(raiz=RAIZ_PADRAO, antes=None, chamadas=None, urls=False, quieto=False):
    if antes is None:
        snap = os.path.join(raiz, ".relatorios", "antes")
        tem_git = subprocess.run(["git", "rev-parse", "--verify", "-q", "HEAD:data/publicadores.json"], cwd=raiz, capture_output=True).returncode == 0
        antes = "HEAD" if tem_git else (snap if os.path.isdir(snap) else None)
    a = carregar(raiz, antes) if antes else {"pubs": {}, "mods": {}, "foto": {}}
    d = carregar(raiz, None)
    r = comparar(a, d)
    ruins = checar_urls(d, r["pubs_novos"]) if urls else []
    t = texto(r, a, d, antes or "(sem referencia)", chamadas, ruins)
    pasta = os.path.join(raiz, ".relatorios")
    os.makedirs(pasta, exist_ok=True)
    caminho = os.path.join(pasta, "coleta-" + datetime.datetime.now().strftime("%Y%m%d-%H%M%S") + ".txt")
    with open(caminho, "w", encoding="utf-8") as f:
        f.write(t)
    if not quieto:
        print(t + f"(gravado em {os.path.relpath(caminho, raiz)})")
    return caminho


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--antes")
    ap.add_argument("--urls", action="store_true")
    ap.add_argument("--raiz", default=os.environ.get("COLETOR_RAIZ") or RAIZ_PADRAO)
    x = ap.parse_args()
    gerar(os.path.abspath(x.raiz), x.antes, urls=x.urls)
