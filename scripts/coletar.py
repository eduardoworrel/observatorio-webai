#!/usr/bin/env python3
"""Coletor do Mapa WebAI (versao 0.2).

Consulta a API publica do Hugging Face (sem token), aplica as regras de SPEC.md e grava
data/*.json e web/data.js. Nenhum LLM le ou decide nada: tudo e regra.

Uso:  python3 scripts/coletar.py [--fresh] [--so a,b] [--max-candidatos 150]
Limite da API anonima: 500 chamadas por janela de 5 min; o coletor le o cabecalho de limite e espera.
"""
import argparse, datetime, hashlib, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = "https://huggingface.co/api"
HOJE = datetime.date.today().isoformat()
UA = "mapa-webai-coletor/0.2 (leitura publica)"
TAREFAS = {"text-generation", "image-text-to-text", "any-to-any", "text2text-generation"}
NAVEGADOR = ("onnx", "mlc", "litert")
EXPAND = ["tags", "downloads", "likes", "pipeline_tag", "lastModified", "safetensors", "createdAt", "gguf"]
MAX_B = 12.0           # corte de parametros (bilhoes)
CORTE_GGUF_GB = 4.0    # corte do GGUF via wllama (ver SPEC.md, regra G)
PAUSA = 0.55
REMOVIDOS = set()  # sha256(id em minusculas) de data/remocoes.json (SPEC 1.0, secao 8)


class _Excl(set):
    """Contas ignoradas: lista local .excluir (fora do Git) e remocoes por pedido (hash, versionadas)."""
    def __contains__(self, x):
        return set.__contains__(self, x) or hashlib.sha256(str(x).lower().encode()).hexdigest() in REMOVIDOS


EXCLUIR = _Excl()   # preenchido em main() a partir de .excluir e data/remocoes.json
estado = {"rede": 0, "cache": 0, "restante": 500, "reset": 0}


# ---------- rede ----------
def _cache(url, sufixo):
    return os.path.join(RAIZ, ".cache", hashlib.sha1(url.encode()).hexdigest() + sufixo)


def _esperar_limite():
    if estado["restante"] <= 8 and estado["reset"] > 0:
        print(f"  limite quase no fim; espero {estado['reset'] + 1}s", file=sys.stderr)
        time.sleep(estado["reset"] + 1)
        estado["restante"] = 500


def _baixar(url, texto=False):
    for tentativa in range(7):
        try:
            _esperar_limite()
            time.sleep(PAUSA)
            estado["rede"] += 1
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60) as r:
                rl = r.headers.get("ratelimit") or ""
                m = re.search(r"r=(\d+);t=(\d+)", rl)
                if m:
                    estado["restante"], estado["reset"] = int(m.group(1)), int(m.group(2))
                corpo = r.read().decode("utf8", "ignore")
                link = r.headers.get("link") or ""
            return (corpo if texto else json.loads(corpo)), link
        except urllib.error.HTTPError as e:
            if e.code in (404, 403, 401):
                return None, ""
            espera = int(e.headers.get("Retry-After") or 0) or int(re.search(r"t=(\d+)", e.headers.get("ratelimit") or "t=0").group(1)) or (8 * (tentativa + 1))
            print(f"  HTTP {e.code}; espero {espera + 1}s", file=sys.stderr)
            time.sleep(espera + 1)
            estado["restante"] = 500
        except Exception as e:
            print(f"  erro {e}; tentativa {tentativa + 1}", file=sys.stderr)
            time.sleep(4 * (tentativa + 1))
    return None, ""


def get(url, texto=False):
    c = _cache(url, ".json")
    if os.path.exists(c):
        estado["cache"] += 1
        d = json.load(open(c))
        return d["d"], d["l"]
    d, l = _baixar(url, texto)
    os.makedirs(os.path.dirname(c), exist_ok=True)
    if d is not None:
        json.dump({"d": d, "l": l}, open(c, "w"))
    return d, l


def paginar(url, max_paginas=12):
    saida = []
    for _ in range(max_paginas):
        d, link = get(url)
        if not isinstance(d, list):
            break
        saida += d
        m = re.search(r'<([^>]+)>;\s*rel="next"', link or "")
        if not m or len(d) == 0:
            break
        url = m.group(1)
    return saida


def listar(max_paginas=1, **params):
    q = [(k, v) for k, v in params.items()] + [("expand[]", x) for x in EXPAND]
    return paginar(f"{API}/models?" + urllib.parse.urlencode(q), max_paginas)


def texto(url):
    d, _ = get(url, texto=True)
    return d if isinstance(d, str) else ""


# ---------- regras ----------
TOK_FMT = re.compile(r"^(q\d\w*|iq\d\w*|\d+bit|k|m|s|l|xl|xs|int\d|bf16|fp16|f16|f32|onnx|mlc|gguf|litert|litertlm|web|webgpu|wasm|mobile|qat|opt|quantized|awq|gptq|mxfp4|nvfp4|imatrix|i1|\d+k|ekv\d+)$")


def toks(nome):
    return [x for x in re.split(r"[-_.]", nome.lower()) if x]


def stem(nome):
    t = toks(nome)
    while len(t) > 1 and TOK_FMT.match(t[-1]):
        t.pop()
    return "-".join(t)


def formatos(rid, tags):
    t = set(tags)
    nome = rid.split("/")[-1].lower()
    tk = toks(nome)
    f = []
    if "onnx" in t or "onnx" in tk:
        f.append("onnx")
    if "mlc-llm" in t or (tk and tk[-1] == "mlc"):
        f.append("mlc")
    if t & {"litert", "tflite", "litert-lm"} or "litert" in nome or "litertlm" in nome:
        f.append("litert")
    if "gguf" in t:
        f.append("gguf")
    return f


def licenca(tags):
    return next((t[8:] for t in tags if t.startswith("license:")), None)


def base_primaria(tags):
    b = [t for t in tags if t.startswith("base_model:") and t.count(":") == 1]
    if b:
        return b[0].split(":", 1)[1]
    b = [t.split(":")[-1] for t in tags if t.startswith("base_model:")]
    return b[0] if b else None


def familia(rid, tags):
    nome = (base_primaria(tags) or rid).split("/")[-1]
    m = re.match(r"[A-Za-z]+(?:[-_]?\d+(?:\.\d+)?)?", nome)
    return (m.group(0) if m else nome).rstrip("-_")


def e_build_de(nome_modelo, nome_cand):
    m, c = toks(nome_modelo), toks(nome_cand)
    return len(c) > len(m) and c[: len(m)] == m and all(TOK_FMT.match(x) for x in c[len(m):])


def marca_pt(tags, rid):
    return "pt" in tags or bool(re.search(r"pt-?br|portugu|brasil|brazil", rid, re.I))


def e_adaptador(x):
    """LoRA/PEFT: so o adaptador, sem pesos completos; nao e um modelo que rode sozinho."""
    t = x.get("tags", [])
    return "peft" in t or "lora" in t or any(k.startswith("base_model:adapter:") for k in t)


def e_puro(x):
    return bool(formatos(x["id"], x.get("tags", []))) and any(t.startswith("base_model:") for t in x.get("tags", []))


def params_b(x):
    for k in ("safetensors", "gguf"):
        v = (x.get(k) or {}).get("total")
        if v:
            return round(v / 1e9, 2)
    return None


# ---------- tamanho ----------
def arquivos(rid):
    arv, _ = get(f"{API}/models/{rid}/tree/main?recursive=true")
    if not isinstance(arv, list):
        return None
    return [(x["path"], (x.get("lfs") or {}).get("size", x.get("size", 0))) for x in arv if x.get("type") == "file"]


def tamanho(fmt, rid):
    arqs = arquivos(rid)
    if arqs is None:
        return None, None
    if fmt == "onnx":
        g = {}
        for p, s in arqs:
            if ".onnx" not in p:
                continue
            m = re.search(r"_(q4f16|q4f32|q4|int4|bnb4|q8f16|uint8|int8|quantized|fp16|q2f16)\.onnx", p)
            k = m.group(1) if m else "base"
            g[k] = g.get(k, 0) + s
        for v in ["q4f16", "q4", "int4", "bnb4", "q4f32", "q2f16", "q8f16", "uint8", "int8", "quantized", "fp16"]:
            if v in g:
                return round(g[v] / 1e9, 2), v
        if "base" in g:
            return round(g["base"] / 1e9, 2), "unico"
    elif fmt == "mlc":
        s = sum(s for p, s in arqs if p.startswith("params_shard_"))
        m = re.search(r"(q\d+f\d+_\d+)", rid)
        return (round(s / 1e9, 2), m.group(1) if m else "mlc") if s else (None, None)
    elif fmt == "litert":
        c = [(p, s) for p, s in arqs if p.endswith((".litertlm", ".task", ".tflite"))]
        pref = [x for x in c if re.search(r"int4|4bit|web", x[0], re.I)] or c
        if pref:
            p, s = min(pref, key=lambda x: x[1])
            return round(s / 1e9, 2), p
    elif fmt == "gguf":
        grupos = {}
        for p, s in arqs:
            if not p.endswith(".gguf") or re.search(r"mmproj|imatrix", p, re.I):
                continue
            chave = re.sub(r"-\d{5}-of-\d{5}", "", p)   # partes de um mesmo modelo somam
            grupos[chave] = grupos.get(chave, 0) + s
        q4 = [x for x in grupos.items() if re.search(r"q4_k_m", x[0], re.I)] or [x for x in grupos.items() if re.search(r"q4|iq4", x[0], re.I)]
        if q4:
            p, s = min(q4, key=lambda x: x[1])
            return round(s / 1e9, 2), p
        # sem Q4 no repositorio: a variante mais leve entre as que existem (so conta se couber no corte)
        if grupos:
            p, s = min(grupos.items(), key=lambda x: x[1])
            return round(s / 1e9, 2), p
    return None, None


# ---------- indice de builds de navegador ----------
def indice_navegador(orgs, max_pag):
    idx = {}
    def add(x):
        if x["id"].split("/")[0] in EXCLUIR:
            return
        f = [k for k in formatos(x["id"], x.get("tags", [])) if k in NAVEGADOR]
        if f:
            idx.setdefault(stem(x["id"].split("/")[-1]), {})[x["id"]] = x
    for org in orgs:
        print(f"  indice: {org}", file=sys.stderr)
        for x in listar(max_paginas=max_pag, author=org, limit=100):
            add(x)
    for filtro in ("transformers.js", "mlc-llm", "litert"):
        for tarefa in ("text-generation", "image-text-to-text"):
            print(f"  indice: filtro {filtro} / {tarefa}", file=sys.stderr)
            for x in listar(max_paginas=8, filter=filtro, pipeline_tag=tarefa, sort="downloads", direction=-1, limit=100):
                add(x)
    return idx


# ---------- publicadores: pais e natureza ----------
HOST_BR = re.compile(r"https?://([a-z0-9.-]+\.br)(?:[/:\s\"')>]|$)", re.I)
EMAIL_BR = re.compile(r"[\w.+-]+@([a-z0-9.-]+\.br)\b", re.I)
BIO_BR = re.compile(r"\b(brasil|brazil|brasileir[oa]s?|brazilian)\b|🇧🇷", re.I)
AFIL_BR = re.compile(r"(universidade|university|instituto|institute|federal|laborat[oó]rio|laboratory|empresa|company|startup|grupo de pesquisa|research group)", re.I)
INST = re.compile(r"(universidade|university|instituto|institute|laborat[oó]rio|laboratory|grupo de pesquisa|research group|\bufg\b|\busp\b|unicamp|unesp|ufrgs|ufmg|ufrj|\bpuc\b|\blncc\b|embrapa|fiocruz|\.edu\.br|\.gov\.br|\.org\.br)", re.I)
EMP = re.compile(r"(\bltda\b|\bs\.a\.|startup|\bempresa\b|\bcompany\b|\binc\.?\b|\btechnologies\b|\bai labs?\b)", re.I)


CIDADES_BR = re.compile(r"(s[ãa]o paulo|rio de janeiro|bras[ií]lia|belo horizonte|porto alegre|curitiba|recife|salvador|fortaleza|goi[âa]nia|campinas|florian[óo]polis|manaus|bel[ée]m|vit[óo]ria|jo[ãa]o pessoa|s[ãa]o carlos|uberl[âa]ndia|niter[óo]i|santa maria|bauru|ribeir[ãa]o preto|cuiab[áa]|campo grande|teresina|aracaju|macei[óo]|natal,)|,\s*br\b|\bbr\b$", re.I)


def github(pid, html_):
    import html as H
    h = H.unescape(html_)
    m = re.search(r'"github"\s*:\s*"([^"]+)"', h) or re.search(r"github\.com/(?!huggingface\b|sponsors|orgs)([A-Za-z0-9_-]+)", h)
    if not m:
        return None
    user = m.group(1)
    t = texto(f"https://github.com/{user}")
    if not t:
        return None
    loc = re.search(r'itemprop="homeLocation"[^>]*>.*?<span class="p-label">([^<]+)</span>', t, re.S)
    org = re.search(r'<span class="p-org">\s*<div[^>]*>([^<]*)</div>', t, re.S)
    bio = re.search(r'<div class="p-note user-profile-bio[^>]*>\s*<div[^>]*>(.*?)</div>', t, re.S)
    return {"usuario": user, "url": f"https://github.com/{user}", "local": H.unescape(loc.group(1)).strip() if loc else "",
            "empresa": H.unescape(org.group(1)).strip() if org else "", "bio": re.sub(r"<[^>]+>", "", H.unescape(bio.group(1))).strip() if bio else ""}


def perfil(pid):
    html_ = texto(f"https://huggingface.co/{pid}")
    home = re.search(r'(?:&quot;|")homepage(?:&quot;|")\s*:\s*(?:&quot;|")([^&"]*)', html_)
    det = re.search(r'(?:&quot;|")details(?:&quot;|")\s*:\s*(?:&quot;|")(.*?)(?:&quot;|")', html_)
    import html as H
    return {"homepage": H.unescape(home.group(1)) if home else "", "bio": H.unescape(det.group(1)) if det else "", "html": html_}


def info_publicador(pid):
    u, _ = get(f"{API}/users/{pid}/overview")
    if u:
        return {"tipo": "pessoa", "nome": u.get("fullname") or pid, "n_modelos": u.get("numModels"), "n_membros": None, "verificado": False}
    o, _ = get(f"{API}/organizations/{pid}/overview")
    if o:
        return {"tipo": "grupo", "nome": o.get("fullname") or pid, "n_modelos": o.get("numModels"), "n_membros": o.get("numUsers"), "verificado": bool(o.get("isVerified"))}
    if listar(author=pid, limit=1):
        return {"tipo": "grupo", "nome": pid, "n_modelos": None, "n_membros": None, "verificado": False}
    return None


EMAIL_ANY = re.compile(r"[\w.+-]+@[\w-]+(\.[\w-]+)+")


def sem_pii(t):
    """Privacidade (SPEC 1.0, secao 7): nenhum e-mail entra nos dados; fica so o dominio."""
    return EMAIL_ANY.sub(lambda m: "[e-mail omitido, dominio " + m.group(0).split("@", 1)[1] + "]", t) if isinstance(t, str) else t


def evidencias(pid, info, seed_ev, modelos_top):
    """Reune evidencias de pais e de natureza. Cada uma com tipo, url, trecho, regra e data."""
    ev = {"pais": None, "natureza": None, "sinais_inst": [], "sinais_emp": []}
    s = seed_ev.get(pid)
    if s:  # evidencia curada: so vale se a pagina responder e o padrao aparecer
        t = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", re.sub(r"(?s)<(script|style).*?</\1>", " ", texto(s["url"]) if s.get("url") else "")))
        m = re.search(s["regex"], t, re.I) if t and s.get("regex") else None
        if m:
            trecho = t[m.start(): m.end() + 80]
            reg = {"tipo": "institucional", "url": s["url"], "trecho": trecho, "acessado": HOJE, "regra": "seed verificado: pagina respondeu e o padrao apareceu"}
            if s.get("pais") == "br":
                ev["pais"] = dict(reg)
            ev["natureza"] = dict(reg, classe=s["natureza"])
    p = perfil(pid)
    url_p = f"https://huggingface.co/{pid}"
    h = HOST_BR.search(p["homepage"]) if p["homepage"] else None
    if h and not ev["pais"]:
        ev["pais"] = {"tipo": "perfil", "url": url_p, "trecho": "site declarado no perfil: " + p["homepage"], "acessado": HOJE, "regra": "E1: site com dominio .br"}
    if p["bio"] and BIO_BR.search(p["bio"]) and not ev["pais"]:
        ev["pais"] = {"tipo": "perfil", "url": url_p, "trecho": p["bio"][:200], "acessado": HOJE, "regra": "E2: descricao do perfil cita Brasil"}
    gh = github(pid, p["html"]) if not ev["pais"] or True else None
    if gh and not ev["pais"] and (BIO_BR.search(gh["local"]) or CIDADES_BR.search(gh["local"])):
        ev["pais"] = {"tipo": "perfil", "url": gh["url"], "trecho": "localizacao no GitHub vinculado ao perfil do Hugging Face: " + gh["local"], "acessado": HOJE, "regra": "E4: GitHub vinculado declara local no Brasil"}
    if gh and not ev["pais"] and gh["bio"] and BIO_BR.search(gh["bio"]):
        ev["pais"] = {"tipo": "perfil", "url": gh["url"], "trecho": "descricao no GitHub vinculado: " + gh["bio"][:160], "acessado": HOJE, "regra": "E4b: GitHub vinculado cita Brasil"}
    for fonte in (p["bio"], p["homepage"]) + ((gh["empresa"], gh["bio"]) if gh else ()):
        if INST.search(fonte or ""):
            ev["sinais_inst"].append(fonte[:120])
        if EMP.search(fonte or ""):
            ev["sinais_emp"].append(fonte[:120])
    for mid in modelos_top[:3]:
        url_c = f"https://huggingface.co/{mid}/raw/main/README.md"
        t = texto(url_c)
        if not t:
            continue
        if not ev["pais"]:
            m = HOST_BR.search(t) or EMAIL_BR.search(t)
            if m:
                ev["pais"] = {"tipo": "cartao", "url": f"https://huggingface.co/{mid}", "trecho": re.sub(r"\s+", " ", t[max(0, m.start() - 60): m.end() + 60]), "acessado": HOJE,
                              "regra": "E3a: cartao do modelo com endereco .br"}
            else:
                for linha in t.splitlines()[:400]:
                    if BIO_BR.search(linha) and AFIL_BR.search(linha) and not re.search(r"portugu", linha, re.I):
                        ev["pais"] = {"tipo": "cartao", "url": f"https://huggingface.co/{mid}", "trecho": linha.strip()[:200], "acessado": HOJE,
                                      "regra": "E3b: cartao com afiliacao e Brasil na mesma linha", "revisar": True}
                        break
        for linha in t.splitlines()[:400]:
            if INST.search(linha) and re.search(r"(brasil|brazil|\.br)", linha, re.I):
                ev["sinais_inst"].append(linha.strip()[:120])
                break
    ev["sinais_inst"] = [sem_pii(x) for x in ev["sinais_inst"]]
    ev["sinais_emp"] = [sem_pii(x) for x in ev["sinais_emp"]]
    for k in ("pais",):
        if ev[k]:
            ev[k]["trecho"] = sem_pii(ev[k]["trecho"])
    # natureza
    if not ev["natureza"]:
        if ev["sinais_inst"]:
            ev["natureza"] = {"classe": "instituicao", "tipo": "perfil/cartao", "url": url_p, "trecho": ev["sinais_inst"][0], "acessado": HOJE, "regra": "N1: vinculo institucional declarado (universidade, instituto, dominio edu/gov.br)"}
        elif ev["sinais_emp"]:
            ev["natureza"] = {"classe": "empresa", "tipo": "perfil/cartao", "url": url_p, "trecho": ev["sinais_emp"][0], "acessado": HOJE, "regra": "N2: perfil declara empresa"}
        elif info["tipo"] == "pessoa" or (info["tipo"] == "grupo" and not info["verificado"] and (info["n_membros"] or 99) <= 5):
            ev["natureza"] = {"classe": "independente", "tipo": "perfil", "url": url_p, "trecho": "nenhum vinculo institucional ou de empresa declarado no perfil nem nos cartoes lidos (" + ("pessoa" if info["tipo"] == "pessoa" else "grupo pequeno") + ")",
                              "acessado": HOJE, "regra": "N3: ausencia de vinculo declarado (nao prova que nao exista)"}
    if ev["natureza"]:
        ev["natureza"]["trecho"] = sem_pii(ev["natureza"]["trecho"])
    return ev


# ---------- coleta de modelos ----------
def modelos_do_publicador(pid):
    lista = [x for x in listar(max_paginas=10, author=pid, limit=100) if x.get("pipeline_tag") in TAREFAS and not e_adaptador(x)]
    normais = [x for x in lista if not e_puro(x)]
    nomes = [x["id"].split("/")[-1] for x in normais]
    puros = [x for x in lista if e_puro(x)]
    extras = [x for x in puros if not any(e_build_de(n, x["id"].split("/")[-1]) for n in nomes)]
    ordem = {x["id"]: i for i, x in enumerate(lista)}
    saida, fora = [], 0
    for x in sorted(normais + extras, key=lambda x: ordem[x["id"]]):
        p = params_b(x)
        if p and p > MAX_B:
            fora += 1
            continue
        saida.append(x)
    return saida, puros, fora


def construir(x, pub, escopo, idx, puros_do_pub, ev_extra=None):
    rid, tags, nome = x["id"], x.get("tags", []), x["id"].split("/")[-1]
    m = {"id": rid, "nome": nome, "publicador": pub, "escopo": escopo, "familia": familia(rid, tags), "tarefa": x.get("pipeline_tag"), "licenca": licenca(tags),
         "parametros_b": params_b(x), "downloads": x.get("downloads"), "atualizado": (x.get("lastModified") or "")[:10], "idioma_pt": marca_pt(tags, rid),
         "url": f"https://huggingface.co/{rid}", "base": base_primaria(tags), "formatos_proprios": formatos(rid, tags), "builds": []}
    if ev_extra:
        m.update(ev_extra)
    vistos = set()
    def add(repo, autor, f, atualizado, downloads, proprio=False, tag_org=False):
        if (repo, f) in vistos:
            return
        vistos.add((repo, f))
        m["builds"].append({"repo": repo, "autor": autor, "formato": f, "oficial": autor == pub, "runtime_org": tag_org, "url": f"https://huggingface.co/{repo}",
                            "atualizado": (atualizado or "")[:10], "downloads": downloads, "proprio": proprio})
    for f in m["formatos_proprios"]:
        add(rid, pub, f, x.get("lastModified"), x.get("downloads"), proprio=True)
    for y in puros_do_pub:   # repositorios de formato do proprio publicador
        if e_build_de(nome, y["id"].split("/")[-1]):
            for f in formatos(y["id"], y.get("tags", [])):
                add(y["id"], pub, f, y.get("lastModified"), y.get("downloads"))
    for cid, y in idx.get(stem(nome), {}).items():
        if cid == rid or not e_build_de(nome, cid.split("/")[-1]) and stem(cid.split("/")[-1]) != stem(nome):
            continue
        for f in formatos(cid, y.get("tags", [])):
            if f in NAVEGADOR:
                add(cid, cid.split("/")[0], f, y.get("lastModified"), y.get("downloads"), tag_org=cid.split("/")[0] in ("onnx-community", "mlc-ai", "litert-community"))
    # GGUF de terceiros: relacao declarada no cartao (base_model quantized)
    if params_b(x) is None or params_b(x) <= MAX_B:
        for y in paginar(f"{API}/models?" + urllib.parse.urlencode([("filter", f"base_model:quantized:{rid}"), ("limit", 100)] + [("expand[]", k) for k in ("tags", "downloads", "lastModified")]), 2):
            if "gguf" in y.get("tags", []):
                add(y["id"], y["id"].split("/")[0], "gguf", y.get("lastModified"), y.get("downloads"))
    # tamanhos: um repositorio por formato de navegador; ate 3 candidatos GGUF
    por_fmt = {}
    for b in sorted(m["builds"], key=lambda b: (not b["oficial"], not b["runtime_org"], -(b.get("downloads") or 0))):
        por_fmt.setdefault(b["formato"], []).append(b)
    for f in NAVEGADOR:
        if f in por_fmt:
            b = por_fmt[f][0]
            b["gb"], b["variante"] = tamanho(f, b["repo"])
            b["destaque"] = True
    gg = por_fmt.get("gguf", [])
    gg_ok = None
    for b in gg[:3]:
        b["gb"], b["variante"] = tamanho("gguf", b["repo"])
        b["destaque"] = True
        if b["gb"] is not None and b["gb"] <= CORTE_GGUF_GB and (gg_ok is None or b["gb"] < gg_ok["gb"]):
            gg_ok = b
    nav = [b for b in m["builds"] if b["formato"] in NAVEGADOR]
    m["status"] = "oficial" if any(b["oficial"] for b in nav) else "comunidade" if nav else "sem_build"
    m["gguf"] = bool(gg)
    m["gguf_wllama"] = gg_ok is not None
    m["gguf_gb"] = gg_ok["gb"] if gg_ok else None
    m["gguf_origem"] = ("oficial" if gg_ok["oficial"] else "comunidade") if gg_ok else None
    m["gguf_grande"] = bool(gg) and gg_ok is None and any(b.get("gb") for b in gg[:3])
    m["via"] = "nativo" if nav else ("gguf" if gg_ok else "nenhum")
    gbs = [b["gb"] for f in NAVEGADOR for b in por_fmt.get(f, [])[:1] if b.get("gb")]
    m["gb_navegador"] = min(gbs) if gbs else (m["gguf_gb"] if gg_ok else None)
    m["formatos_navegador"] = sorted({b["formato"] for b in nav})
    m["fontes"] = [{"rotulo": "Modelo no Hugging Face", "url": m["url"], "acessado": HOJE}] + \
        [{"rotulo": f"Build {b['formato']} ({'do publicador' if b['oficial'] else 'da comunidade'})", "url": b["url"], "acessado": HOJE}
         for b in m["builds"] if b.get("destaque") and not b.get("proprio")][:8]
    return m


def descobrir_candidatos(excluir, termos, max_pag):
    cont = {}
    consultas = [dict(filter="pt")] + [dict(search=t) for t in termos]
    for q in consultas:
        for ordem in ("downloads", "likes"):
            for x in listar(max_paginas=max_pag, pipeline_tag="text-generation", sort=ordem, direction=-1, limit=100, **q):
                a = x["id"].split("/")[0]
                if a not in excluir and marca_pt(x.get("tags", []), x["id"]):
                    cont.setdefault(a, set()).add(x["id"])
    return sorted(cont.items(), key=lambda kv: -len(kv[1]))


def contar(ms):
    c = {"modelos": len(ms), "nativo_oficial": 0, "nativo_comunidade": 0, "so_gguf_wllama": 0, "gguf_grande_sem_nativo": 0, "nenhum": 0}
    for m in ms:
        if m["via"] == "nativo":
            c["nativo_oficial" if m["status"] == "oficial" else "nativo_comunidade"] += 1
        elif m["via"] == "gguf":
            c["so_gguf_wllama"] += 1
        else:
            c["nenhum"] += 1
            if m["gguf_grande"]:
                c["gguf_grande_sem_nativo"] += 1
    c["so_nativo"] = c["nativo_oficial"] + c["nativo_comunidade"]
    c["nativo_mais_gguf"] = c["so_nativo"] + c["so_gguf_wllama"]
    return c


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fresh", action="store_true")
    ap.add_argument("--so", help="so estes publicadores (teste)")
    ap.add_argument("--max-candidatos", type=int, default=150)
    a = ap.parse_args()
    if a.fresh:
        import shutil
        shutil.rmtree(os.path.join(RAIZ, ".cache"), ignore_errors=True)
    seed = json.load(open(os.path.join(RAIZ, "seed", "publishers.json")))
    # contas a ignorar por pedido do operador: arquivo local .excluir (uma por linha), fora do Git
    caminho_ex = os.path.join(RAIZ, ".excluir")
    if os.path.exists(caminho_ex):
        EXCLUIR.update(l.strip() for l in open(caminho_ex) if l.strip())
    caminho_rm = os.path.join(RAIZ, "data", "remocoes.json")
    if os.path.exists(caminho_rm):
        REMOVIDOS.update(i["sha256"] for i in json.load(open(caminho_rm)).get("itens", []))
    seed_ev = json.load(open(os.path.join(RAIZ, "seed", "evidencias.json")))
    orgs_rt = seed["runtime_orgs"]
    print("indice de builds de navegador", file=sys.stderr)
    idx = indice_navegador(orgs_rt, max_pag=40)

    mundo = seed["mundo"]
    excluir = _Excl(set(mundo) | set(orgs_rt) | set(EXCLUIR))
    candidatos = {}
    for p in [x for x in seed["br"] if x not in EXCLUIR]:
        candidatos[p] = {"origem": "lista inicial", "achados": []}
    if not a.so:
        print("descoberta de candidatos brasileiros", file=sys.stderr)
        for pid, ids in descobrir_candidatos(excluir, seed["termos_busca"], 3)[: a.max_candidatos]:
            candidatos.setdefault(pid, {"origem": "busca na API", "achados": []})["achados"] = sorted(ids)[:5]
    else:
        candidatos = {p: v for p, v in candidatos.items() if p in a.so.split(",")}

    pubs, modelos, descartados = [], [], []
    for pid, c in candidatos.items():
        print(f"[candidato] {pid}", file=sys.stderr)
        info = info_publicador(pid)
        if not info:
            descartados.append({"id": pid, "origem": c["origem"], "motivo": "nao encontrado na API"})
            continue
        top = c["achados"] or [x["id"] for x in listar(author=pid, sort="downloads", direction=-1, limit=5)]
        ev = evidencias(pid, info, seed_ev, top)
        if not ev["pais"]:
            descartados.append({"id": pid, "origem": c["origem"], "motivo": "sem evidencia publica de ser do Brasil (nao classificado)", "modelos_vistos": c["achados"][:3]})
            continue
        xs, puros, fora = modelos_do_publicador(pid)
        ms = [construir(x, pid, "br", idx, puros) for x in xs]
        if not ms:
            descartados.append({"id": pid, "origem": c["origem"], "motivo": f"evidencia ok, mas nenhum modelo de linguagem de ate {MAX_B:g}B (fora do corte: {fora})"})
            continue
        nat = (ev["natureza"] or {}).get("classe", "nao_classificada")
        pubs.append({"id": pid, "nome": info["nome"], "tipo": info["tipo"], "classe_pais": "br_evidencia", "evidencia_pais": ev["pais"],
                     "natureza": nat, "evidencia_natureza": ev["natureza"], "escopo": "br", "n_modelos_hf": info["n_modelos"], "n_membros": info["n_membros"],
                     "url": f"https://huggingface.co/{pid}", "origem_lista": c["origem"], "modelos_fora_do_corte": fora,
                     "fontes": [{"rotulo": "Perfil no Hugging Face", "url": f"https://huggingface.co/{pid}", "acessado": HOJE}], "n_modelos_mapeados": len(ms)})
        modelos += ms

    if not a.so:
        for pid in mundo:
            print(f"[mundo] {pid}", file=sys.stderr)
            info = info_publicador(pid)
            if not info:
                descartados.append({"id": pid, "origem": "lista mundo", "motivo": "nao encontrado na API"})
                continue
            xs, puros, fora = modelos_do_publicador(pid)
            ms = [construir(x, pid, "mundo", idx, puros) for x in xs]
            if not ms:
                descartados.append({"id": pid, "origem": "lista mundo", "motivo": f"nenhum modelo de ate {MAX_B:g}B (fora do corte: {fora})"})
                continue
            pubs.append({"id": pid, "nome": info["nome"], "tipo": info["tipo"], "classe_pais": "fora_br",
                         "evidencia_pais": {"tipo": "curadoria", "url": f"https://huggingface.co/{pid}", "trecho": "grande publicador internacional da lista curada; sem pagina institucional conferida pelo coletor", "acessado": HOJE, "regra": "lista curada (seed), confianca baixa"},
                         "natureza": "empresa" if pid in seed.get("empresas_mundo", []) else "instituicao" if pid in seed.get("instituicoes_mundo", []) else "nao_classificada",
                         "evidencia_natureza": None, "escopo": "mundo", "n_modelos_hf": info["n_modelos"], "n_membros": info["n_membros"], "url": f"https://huggingface.co/{pid}",
                         "origem_lista": "lista mundo", "modelos_fora_do_corte": fora,
                         "fontes": [{"rotulo": "Perfil no Hugging Face", "url": f"https://huggingface.co/{pid}", "acessado": HOJE}], "n_modelos_mapeados": len(ms)})
            modelos += ms
        # independentes do mundo: pessoas com mais repositorios de navegador entre os mais baixados
        conta = {}
        for stem_, repos in idx.items():
            for rid_, y in repos.items():
                au = rid_.split("/")[0]
                if au not in excluir and y.get("pipeline_tag") in TAREFAS and not e_adaptador(y) and not any(au == p["id"] for p in pubs):
                    conta.setdefault(au, []).append(y)
        achados = 0
        for au, ys in sorted(conta.items(), key=lambda kv: -sum(y.get("downloads") or 0 for y in kv[1])):
            info = info_publicador(au)
            if not info or info["tipo"] != "pessoa" or (info["n_modelos"] or 0) < 3:
                continue
            print(f"[mundo-indep] {au}", file=sys.stderr)
            ys = sorted(ys, key=lambda y: -(y.get("downloads") or 0))[:8]
            ms = [construir(y, au, "mundo", idx, [], {"conversao_de": base_primaria(y.get("tags", []))}) for y in ys]
            pubs.append({"id": au, "nome": info["nome"], "tipo": "pessoa", "classe_pais": "nao_classificado", "evidencia_pais": None, "natureza": "independente",
                         "evidencia_natureza": {"classe": "independente", "tipo": "perfil", "url": f"https://huggingface.co/{au}", "trecho": "conta de pessoa no Hugging Face; vinculo nao conferido", "acessado": HOJE, "regra": "N3 (pessoa)"},
                         "escopo": "mundo", "n_modelos_hf": info["n_modelos"], "n_membros": None, "url": f"https://huggingface.co/{au}", "origem_lista": "descoberta por builds de navegador",
                         "modelos_fora_do_corte": 0, "fontes": [{"rotulo": "Perfil no Hugging Face", "url": f"https://huggingface.co/{au}", "acessado": HOJE}], "n_modelos_mapeados": len(ms)})
            modelos += ms
            achados += 1
            if achados >= 8:
                break

    # constelacoes e familias
    const, fams = [], {}
    for p in pubs:
        ms = [m for m in modelos if m["publicador"] == p["id"]]
        por_fam = {}
        for m in ms:
            por_fam.setdefault(m["familia"].lower(), []).append(m["id"])
        arestas = [[l[k], l[k + 1], f] for f, l in por_fam.items() for k in range(len(l) - 1)]
        const.append({"id": p["id"], "nome": p["nome"], "escopo": p["escopo"], "modelos": [m["id"] for m in ms], "arestas": arestas})
    for m in modelos:
        f = fams.setdefault(m["familia"].lower(), {"id": m["familia"].lower(), "nome": m["familia"], "modelos": [], "publicadores": []})
        f["modelos"].append(m["id"])
        if m["publicador"] not in f["publicadores"]:
            f["publicadores"].append(m["publicador"])

    pub_by = {p["id"]: p for p in pubs}
    br = [m for m in modelos if m["escopo"] == "br"]
    mu = [m for m in modelos if m["escopo"] == "mundo"]
    nat = lambda ms, n: [m for m in ms if pub_by[m["publicador"]]["natureza"] == n]
    foto = {"data": HOJE, "regra_gguf": f"GGUF conta se a menor variante Q4 (ou a mais leve, se nao ha Q4) somar ate {CORTE_GGUF_GB:g} GB",
            "corte_parametros_b": MAX_B, "chamadas_rede": estado["rede"], "chamadas_cache": estado["cache"],
            "brasil": contar(br), "mundo": contar(mu),
            "brasil_independentes": contar(nat(br, "independente")), "brasil_instituicoes": contar(nat(br, "instituicao")), "brasil_empresas": contar(nat(br, "empresa")), "brasil_natureza_nao_classificada": contar(nat(br, "nao_classificada")),
            "maior_publicador_br": (lambda c: {"id": c[0][0], "modelos": c[0][1]} if c else None)(sorted(((p, sum(1 for m in br if m["publicador"] == p)) for p in set(m["publicador"] for m in br)), key=lambda x: -x[1])),
            "publicadores": {"brasil": len(set(m["publicador"] for m in br)), "mundo": len(set(m["publicador"] for m in mu)),
                             "brasil_por_natureza": {n: sum(1 for p in pubs if p["escopo"] == "br" and p["natureza"] == n) for n in ("independente", "instituicao", "empresa", "nao_classificada")}},
            "candidatos": {"avaliados": len(candidatos), "classificados_brasil": sum(1 for p in pubs if p["escopo"] == "br"), "descartados": len([d for d in descartados if d["id"] in candidatos]),
                           "descartados_por_motivo": {}},
            "descartados": descartados,
            "ressalvas": ["Build existe nao quer dizer que roda: nao ha execucao neste mapa.",
                          "GGUF via wllama conta a parte, com corte de tamanho; ONNX, MLC e LiteRT sao nativos de navegador.",
                          "Builds nativos de terceiros sao achados por regra de nome no indice das organizacoes de runtime e das buscas por tag; podem faltar os de nomes fora do padrao.",
                          "Modelos de linguagem ate %gB, todos os de cada publicador classificado; publicador sem evidencia de ser do Brasil fica fora do mapa." % MAX_B]}
    for d in foto["descartados"]:
        if d["id"] in candidatos:
            k = d["motivo"].split(" (")[0].split(",")[0]
            foto["candidatos"]["descartados_por_motivo"][k] = foto["candidatos"]["descartados_por_motivo"].get(k, 0) + 1
    meta = {"coletado_em": HOJE, "fonte": "Hugging Face API publica", "versao_spec": "1.0"}
    pacote = {"publicadores": pubs, "modelos": modelos, "constelacoes": const, "familias": list(fams.values())}
    for nome, obj in pacote.items():
        json.dump({"meta": meta, nome: obj}, open(os.path.join(RAIZ, "data", nome + ".json"), "w"), ensure_ascii=False, indent=1)
    json.dump(foto, open(os.path.join(RAIZ, "data", "foto.json"), "w"), ensure_ascii=False, indent=1)
    with open(os.path.join(RAIZ, "web", "data.js"), "w") as f:
        f.write("window.MAPA_DADOS=" + json.dumps(dict(meta=meta, foto=foto, **pacote), ensure_ascii=False, separators=(",", ":")) + ";")
    print(json.dumps({k: foto[k] for k in ("brasil", "mundo", "publicadores", "candidatos")}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
