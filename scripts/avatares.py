#!/usr/bin/env python3
"""Resolve o endereco (URL) do avatar publico no Hugging Face de quem portou o build (autor do build em destaque de cada modelo).

Guarda so a URL em data/avatares.json (nunca a imagem). A API publica nao exige token:
  GET https://huggingface.co/api/users/<nome>/avatar          -> {"avatarUrl": "..."}  (404 se nao for usuario)
  GET https://huggingface.co/api/organizations/<nome>/avatar  -> idem para organizacoes
Quem esta em "ocultar" (pedido por PR ou issue) ou tem ocultar_avatar nas entidades de publicador nao e consultado e passa a ver iniciais.
Uso: python3 scripts/avatares.py [--refazer]
"""
import json, os, sys, time, urllib.error, urllib.request, datetime
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARQ = os.path.join(RAIZ, "data", "avatares.json")
PERMITIDO = ("https://huggingface.co/avatars/", "https://cdn-avatars.huggingface.co/")

def portador(m):
    """Autor do build em destaque (ou do primeiro build); None sem build."""
    bs = m.get("builds") or []
    if not bs: return None
    b = next((x for x in bs if x.get("destaque")), bs[0])
    return b.get("autor")

def ocultos_das_entidades():
    pasta = os.path.join(RAIZ, "data", "entidades", "publicador"); out = set()
    for n in sorted(os.listdir(pasta)) if os.path.isdir(pasta) else []:
        try: e = json.load(open(os.path.join(pasta, n), encoding="utf-8"))
        except Exception: continue
        if isinstance(e, dict) and e.get("ocultar_avatar") is True and e.get("id"): out.add(e["id"])
    return out

def consulta(url):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "observatorio-webai (avatar publico)"}), timeout=20) as r:
            return json.load(r).get("avatarUrl")
    except urllib.error.HTTPError as e:
        if e.code == 404: return None
        raise

def main():
    refazer = "--refazer" in sys.argv
    atual = json.load(open(ARQ, encoding="utf-8")) if os.path.exists(ARQ) else {"spec": "1.0", "ocultar": [], "avatares": {}}
    modelos = json.load(open(os.path.join(RAIZ, "data", "modelos.json"), encoding="utf-8"))["modelos"]
    ocultar = {x.lower() for x in atual.get("ocultar", [])} | {x.lower() for x in ocultos_das_entidades()}
    autores = sorted({a for m in modelos for a in [portador(m)] if a}, key=str.lower)
    av = {k: v for k, v in atual.get("avatares", {}).items() if k.lower() not in ocultar}
    novos = 0
    for a in autores:
        if a.lower() in ocultar or (a in av and not refazer): continue
        url = None
        for caminho in ("users", "organizations"):
            try: url = consulta(f"https://huggingface.co/api/{caminho}/{a}/avatar")
            except Exception as e: print("aviso:", a, caminho, e); url = None
            time.sleep(0.12)
            if url: break
        if url and url.startswith(PERMITIDO): av[a] = url; novos += 1
    atual["avatares"] = dict(sorted(av.items(), key=lambda kv: kv[0].lower())); atual["gerado_em"] = datetime.date.today().isoformat()
    json.dump(atual, open(ARQ, "w", encoding="utf-8"), ensure_ascii=False, indent=1); open(ARQ, "a").write("\n")
    print(f"{len(autores)} autores de build; {len(av)} com avatar ({novos} novos); {len(ocultar)} ocultos")

if __name__ == "__main__": main()
