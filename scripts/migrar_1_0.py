#!/usr/bin/env python3
"""Migracao 0.2 -> 1.0 (idempotente; preserva as informacoes).

1. Grava um arquivo curado por publicador em data/entidades/publicador/<id>.json a partir de data/publicadores.json
   (campos curaveis: classe, natureza, evidencias, links, fontes; campos derivados ficam so nos arquivos gerados).
2. Omite e-mails que o coletor 0.2 guardou em trechos de evidencia (fica so o dominio) em data/*.json.
3. Marca versao_spec 1.0 no meta dos arquivos gerados.

    python3 scripts/migrar_1_0.py [--seco]
"""
import json, os, re, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EMAIL = re.compile(r"[\w.+-]+@[\w-]+(\.[\w-]+)+")
omit = lambda m: "[e-mail omitido, dominio " + m.group(0).split("@", 1)[1] + "]"
TIPO = {"perfil": "perfil_oficial", "cartao": "cartao_modelo", "institucional": "site_institucional", "curadoria": "perfil_oficial", "perfil/cartao": None}

def tipo_de(t, url):
    if TIPO.get(t):
        return TIPO[t]
    return "cartao_modelo" if re.match(r"https://huggingface\.co/[^/]+/[^/]+", url) else "perfil_oficial"

def ev(e, com_classe=False, natureza=None):
    o = {}
    if com_classe: o["classe"] = e.get("classe") or natureza
    o.update(tipo=tipo_de(e["tipo"], e["url"]), url=e["url"], acessado=e["acessado"], trecho=EMAIL.sub(omit, e["trecho"])[:240].strip() or "sem trecho")
    if e.get("regra"): o["regra"] = e["regra"][:120]
    if e.get("revisar"): o["revisar"] = True
    return o

def curado(p):
    o = {"spec": "1.0", "entidade": "publicador", "id": p["id"], "nome": p["nome"], "tipo": p["tipo"], "natureza": p["natureza"], "classe_pais": p["classe_pais"]}
    if p["classe_pais"] == "br_evidencia": o["pais"] = "BR"
    if p.get("evidencia_pais") and p["classe_pais"] != "nao_classificado": o["evidencia_pais"] = ev(p["evidencia_pais"])
    if p["natureza"] != "nao_classificada":
        e = p.get("evidencia_natureza") or {"tipo": "curadoria", "url": p["url"], "trecho": "natureza da lista curada (seed); vinculo nao conferido pelo coletor", "acessado": p["fontes"][0]["acessado"], "regra": "lista curada (seed)"}
        o["evidencia_natureza"] = ev(e, True, p["natureza"])
    if p["tipo"] == "pessoa": o["origem_cadastro"] = "coletor"
    links = {"hf": p["url"]}
    if (p.get("evidencia_pais") or {}).get("tipo") == "institucional": links["oficial"] = p["evidencia_pais"]["url"]
    o["links"] = links
    o["fontes"] = [{"tipo": "perfil_oficial", "url": f["url"], "acessado": f["acessado"], "rotulo": f["rotulo"][:100]} for f in p["fontes"]]
    o["status"] = "ativo"
    return o

def main():
    seco = "--seco" in sys.argv
    pubs = json.load(open(f"{R}/data/publicadores.json"))["publicadores"]
    os.makedirs(f"{R}/data/entidades/publicador", exist_ok=True)
    for p in pubs:
        if not seco:
            json.dump(curado(p), open(f"{R}/data/entidades/publicador/{p['id']}.json", "w"), ensure_ascii=False, indent=2); open(f"{R}/data/entidades/publicador/{p['id']}.json", "a").write("\n")
    print(len(pubs), "publicadores curados")
    for n in ("publicadores", "familias", "constelacoes", "modelos", "foto"):
        f = f"{R}/data/{n}.json"; t = open(f, encoding="utf-8").read(); t2 = EMAIL.sub(omit, t).replace('"versao_spec": "0.2"', '"versao_spec": "1.0"')
        if t2 != t:
            print("atualizado", n, "(e-mail omitido)" if EMAIL.search(t) else "(versao_spec)")
            if not seco: open(f, "w", encoding="utf-8").write(t2)

if __name__ == "__main__":
    main()
