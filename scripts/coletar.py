#!/usr/bin/env python3
"""Coletor do Observatorio (SPEC.md secao 9 e SPEC_0.2_coleta.md).

Consulta a API publica do Hugging Face (sem token), aplica as regras da SPEC e grava data/*.json e web/data.js.
Nenhum LLM le ou decide nada: tudo e regra. Candidatos: data/entidades/publicador/*.json (curados; a classificacao
de pais e natureza vem da entidade), seed/publishers.json e a descoberta automatica.

Modos (um e obrigatorio):
  --novos        so publicadores que ainda nao estao nos dados, cuja entidade curada mudou ou cuja coleta passou de --dias dias;
                 o resultado e MESCLADO nos dados existentes
  --tudo         atualizacao completa (todos os candidatos, mais a descoberta de independentes do mundo)
  --so a,b       so estes publicadores (mescla)
  --normalizar   so reordena os derivados existentes na ordem estavel (sem rede)
Opcoes:
  --dry-run      lista o que seria coletado, sem nenhuma chamada de rede e sem gravar
  --previa       (com --dry-run) uma consulta por publicador, so da lista de modelos, para estimar o que entra no corte
  --dias N       --novos: coleta mais velha que N dias e refeita (padrao 30)
  --cache-dias N validade do cache de respostas e dos checkpoints (padrao 3); --fresh apaga o cache
  --sem-descoberta  nao busca candidatos novos por termos em portugues
Cada publicador coletado vira um checkpoint em .cache/publicadores/: se a coleta for interrompida, rode de novo e ela continua.
Limite da API anonima: 500 chamadas por janela de 5 min; o coletor conta as chamadas e espera.
Variaveis de teste: COLETOR_RAIZ, COLETOR_API, COLETOR_PAUSA.
"""
import argparse, collections, datetime, hashlib, html as H, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

RAIZ = os.path.abspath(os.environ.get("COLETOR_RAIZ") or os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
API = os.environ.get("COLETOR_API") or "https://huggingface.co/api"
HOJE = datetime.date.today().isoformat()
UA = "observatorio-coletor/1.0 (leitura publica)"
TAREFAS = {"text-generation", "image-text-to-text", "any-to-any", "text2text-generation"}
NAVEGADOR = ("onnx", "mlc", "litert")
EXPAND = ["tags", "downloads", "likes", "pipeline_tag", "lastModified", "safetensors", "createdAt", "gguf"]
MAX_B = 12.0           # corte de parametros (bilhoes)
CORTE_GGUF_GB = 4.0    # corte do GGUF via wllama (ver SPEC_0.2, regra G)
PAUSA = float(os.environ.get("COLETOR_PAUSA") or 0.55)
JANELA_S, JANELA_MAX = 300, 480   # a API anonima aceita 500 chamadas por 5 min; ficamos abaixo
CACHE_DIAS = 3.0
MAX_INDEP_MUNDO = 8
REMOVIDOS = set()  # sha256(id em minusculas) de data/remocoes.json (SPEC 1.0, secao 8)


class _Excl(set):
    """Contas ignoradas: lista local .excluir (fora do Git) e remocoes por pedido (hash, versionadas)."""
    def __contains__(self, x):
        return set.__contains__(self, x) or hashlib.sha256(str(x).lower().encode()).hexdigest() in REMOVIDOS


EXCLUIR = _Excl()   # preenchido em main() a partir de .excluir e data/remocoes.json
estado = {"rede": 0, "cache": 0, "restante": 500, "reset": 0, "falhas": 0}
_janela = collections.deque()


def log(*a):
    print(*a, file=sys.stderr, flush=True)


# ---------- rede ----------
def _cache(url, sufixo):
    return os.path.join(RAIZ, ".cache", hashlib.sha1(url.encode()).hexdigest() + sufixo)


def _esperar_limite():
    if estado["restante"] <= 8 and estado["reset"] > 0:
        log(f"  limite quase no fim; espero {estado['reset'] + 1}s")
        time.sleep(estado["reset"] + 1)
        estado["restante"] = 500
    agora = time.time()
    while _janela and agora - _janela[0] > JANELA_S:
        _janela.popleft()
    if len(_janela) >= JANELA_MAX:
        espera = _janela[0] + JANELA_S - agora + 1
        log(f"  {len(_janela)} chamadas nos ultimos 5 min; espero {int(espera)}s")
        time.sleep(max(espera, 1))
        _janela.clear()


def _baixar(url, texto=False):
    for tentativa in range(7):
        try:
            _esperar_limite()
            time.sleep(PAUSA)
            estado["rede"] += 1
            _janela.append(time.time())
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
            log(f"  HTTP {e.code}; espero {espera + 1}s")
            time.sleep(espera + 1)
            estado["restante"] = 500
            _janela.clear()
        except Exception as e:
            log(f"  erro {e}; tentativa {tentativa + 1}")
            time.sleep(4 * (tentativa + 1))
    estado["falhas"] += 1   # a unidade em curso nao vira checkpoint nem entra nos dados
    return None, ""


def _atomico(caminho, conteudo):
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    tmp = caminho + f".tmp{os.getpid()}"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(conteudo)
    os.replace(tmp, caminho)


def get(url, texto=False):
    c = _cache(url, ".json")
    if os.path.exists(c) and (time.time() - os.path.getmtime(c)) < CACHE_DIAS * 86400:
        estado["cache"] += 1
        d = json.load(open(c))
        return d["d"], d["l"]
    d, l = _baixar(url, texto)
    if d is not None:
        _atomico(c, json.dumps({"d": d, "l": l}))
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
    """Filtro de relevancia (SPEC.md secao 9): modelos de linguagem, sem adaptadores, ate MAX_B bilhoes de parametros.
    Repositorios que so mudam o formato de um modelo do mesmo publicador viram build dele (regra R), nao modelo novo."""
    todos = listar(max_paginas=10, author=pid, limit=100)
    outra = [x for x in todos if x.get("pipeline_tag") not in TAREFAS]
    sem_tarefa = [x for x in outra if not x.get("pipeline_tag")]
    adapt = [x for x in todos if x.get("pipeline_tag") in TAREFAS and e_adaptador(x)]
    lista = [x for x in todos if x.get("pipeline_tag") in TAREFAS and not e_adaptador(x)]
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
    estado["filtro"] = {"listados": len(todos), "outra_tarefa": len(outra) - len(sem_tarefa), "sem_tarefa": len(sem_tarefa), "adaptadores": len(adapt), "acima_do_corte": fora,
                        "so_formato_de_outro": len(puros) - len(extras), "no_corte": len(saida)}
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
    m["builds"].sort(key=lambda b: (b["formato"], b["repo"]))   # ordem estavel: a mesma API da o mesmo arquivo
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
    return sorted(cont.items(), key=lambda kv: (-len(kv[1]), kv[0].lower()))


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


# ---------- candidatos ----------
def carregar_json(caminho, padrao=None):
    try:
        with open(caminho, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return padrao


def carregar_curados():
    """Publicadores curados (data/entidades/publicador/*.json), ja validados por validar.py. Arquivados, exemplos e removidos ficam fora."""
    pasta = os.path.join(RAIZ, "data", "entidades", "publicador")
    saida = {}
    for nome in sorted(os.listdir(pasta)) if os.path.isdir(pasta) else []:
        if not nome.endswith(".json"):
            continue
        e = carregar_json(os.path.join(pasta, nome))
        if not isinstance(e, dict) or e.get("entidade") != "publicador" or not e.get("id"):
            log(f"  aviso: {nome} ignorado (nao e um publicador valido)")
            continue
        if e.get("status") == "arquivado" or e.get("exemplo") or e["id"] in EXCLUIR:
            continue
        saida[e["id"]] = e
    return saida


def escopo_de(ent):
    return "br" if ent["classe_pais"] == "br_evidencia" else "mundo"


def assinatura(c):
    e = c.get("curado") or {}
    nucleo = [c["escopo"], c.get("tipo"), e.get("classe_pais"), e.get("natureza"), e.get("nome"), e.get("tipo"), e.get("evidencia_pais"), e.get("evidencia_natureza")]
    return hashlib.sha1(json.dumps(nucleo, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:16]


def candidatos_locais(seed, curados, exist):
    """Candidatos sem rede. Entidade curada tem precedencia sobre o sinal automatico (SPEC 1.0, secao 6)."""
    cands = {}
    def add(pid, origem, escopo, tipo=None):
        if pid in EXCLUIR:
            return None
        return cands.setdefault(pid.lower(), {"id": pid, "origem": origem, "escopo": escopo, "tipo": tipo, "curado": None, "achados": []})
    for pid in seed["br"]:
        add(pid, "lista inicial", "br")
    for pid in seed["mundo"]:
        add(pid, "lista mundo", "mundo", "fora_br")
    for pid, ent in curados.items():
        c = cands.get(pid.lower()) or add(pid, "entidade curada", "mundo")
        c["id"], c["curado"], c["escopo"] = pid, ent, escopo_de(ent)
        c["tipo"] = ent["classe_pais"]
    for k, p in exist["pubs"].items():   # independentes do mundo achados antes por builds de navegador seguem sendo atualizados
        if k not in cands and p.get("origem_lista") == "descoberta por builds de navegador" and p["id"] not in EXCLUIR:
            add(p["id"], p["origem_lista"], "mundo", "indep")
    return cands


def carregar_existente():
    pubs = (carregar_json(os.path.join(RAIZ, "data", "publicadores.json"), {}) or {}).get("publicadores", [])
    mods = (carregar_json(os.path.join(RAIZ, "data", "modelos.json"), {}) or {}).get("modelos", [])
    foto = carregar_json(os.path.join(RAIZ, "data", "foto.json"), {}) or {}
    return {"pubs": {p["id"].lower(): p for p in pubs}, "modelos": mods, "desc": {d["id"].lower(): d for d in foto.get("descartados", [])}}


def _chk(pid):
    return os.path.join(RAIZ, ".cache", "publicadores", re.sub(r"[^A-Za-z0-9._-]", "_", pid) + ".json")


def idade_dias(iso):
    try:
        return (datetime.date.today() - datetime.date.fromisoformat(iso[:10])).days
    except (TypeError, ValueError):
        return None


def diverge(ent, p):
    """A entidade curada difere do que esta nos dados (classe, natureza, nome, tipo ou evidencia)?"""
    for k in ("classe_pais", "natureza", "nome", "tipo"):
        if ent.get(k) and ent[k] != p.get(k):
            return True
    for k in ("evidencia_pais", "evidencia_natureza"):
        e, q = ent.get(k), p.get(k)
        if e and q and (e.get("url"), e.get("trecho")) != (q.get("url"), q.get("trecho")):
            return True
    return False


def situacao(c, exist, dias):
    k = c["id"].lower()
    p, d = exist["pubs"].get(k), exist["desc"].get(k)
    if not p and not d:
        return "novo"
    if p and c.get("curado") and diverge(c["curado"], p):
        return "alterado"
    if c.get("curado") and not p and d and not d["motivo"].startswith("sem modelos no corte"):
        return "alterado"   # estava fora por falta de evidencia ou de achado na API; agora ha entidade curada
    data = (p["fontes"][0]["acessado"] if p and p.get("fontes") else None) or (d or {}).get("coletado_em")
    if not data and os.path.exists(_chk(c["id"])):
        data = datetime.date.fromtimestamp(os.path.getmtime(_chk(c["id"]))).isoformat()
    ida = idade_dias(data) if data else None
    if ida is not None and ida > dias:
        return "vencido"
    return "em dia"


# ---------- uma unidade = um publicador ----------
class Ctx:
    def __init__(self, seed, seed_ev):
        self.seed, self.seed_ev, self._idx = seed, seed_ev, None

    @property
    def idx(self):
        if self._idx is None:
            log("indice de builds de navegador")
            self._idx = indice_navegador(self.seed["runtime_orgs"], max_pag=40)
        return self._idx


def _perfil_fonte(pid):
    return [{"rotulo": "Perfil no Hugging Face", "url": f"https://huggingface.co/{pid}", "acessado": HOJE}]


def _pub(pid, nome, tipo, classe, ev_pais, nat, ev_nat, escopo, info, origem, fora, n):
    return {"id": pid, "nome": nome, "tipo": tipo, "classe_pais": classe, "evidencia_pais": ev_pais, "natureza": nat, "evidencia_natureza": ev_nat,
            "escopo": escopo, "n_modelos_hf": info["n_modelos"], "n_membros": info["n_membros"], "url": f"https://huggingface.co/{pid}",
            "origem_lista": origem, "modelos_fora_do_corte": fora, "fontes": _perfil_fonte(pid), "n_modelos_mapeados": n}


def _sem_modelos(pid, c, fora, escopo):
    f = estado.get("filtro") or {}
    det = f"{f.get('listados', 0)} listados: {fora} acima de {MAX_B:g} B, {f.get('outra_tarefa', 0)} de outra tarefa, {f.get('sem_tarefa', 0)} sem tarefa declarada, {f.get('adaptadores', 0)} adaptadores"
    d = {"id": pid, "origem": c["origem"], "motivo": f"sem modelos no corte ({det})", "coletado_em": HOJE}
    if escopo == "mundo":
        d["escopo"] = "mundo"
    return d


def _independentes_do_mundo(pid, idx, params=True):
    ys = [y for repos in idx.values() for rid, y in repos.items()
          if rid.split("/")[0].lower() == pid.lower() and y.get("pipeline_tag") in TAREFAS and not e_adaptador(y)]
    dentro = [y for y in ys if not (params_b(y) and params_b(y) > MAX_B)]
    return sorted(dentro, key=lambda y: (-(y.get("downloads") or 0), y["id"].lower()))[:MAX_INDEP_MUNDO], len(ys) - len(dentro)


def unidade(c, ctx):
    """Coleta um publicador e devolve o registro {pub, modelos, descartado}. Nao grava nada."""
    pid, ent = c["id"], c.get("curado")
    r0, f0 = estado["rede"], estado["falhas"]
    estado.pop("filtro", None)
    reg = {"v": 1, "id": pid, "coletado_em": HOJE, "assinatura": assinatura(c), "pub": None, "modelos": [], "descartado": None}
    info = info_publicador(pid)
    if not info:
        reg["descartado"] = {"id": pid, "origem": c["origem"], "motivo": "nao encontrado na API", "coletado_em": HOJE}
    elif ent:
        reg.update(_unidade_curada(c, ent, info, ctx))
    elif c["escopo"] == "br":
        reg.update(_unidade_br_auto(c, info, ctx))
    elif c["tipo"] == "indep":
        reg.update(_unidade_indep(c, info, ctx))
    else:
        reg.update(_unidade_mundo(c, info, ctx))
    reg["filtro"] = estado.pop("filtro", None)
    reg["chamadas"] = estado["rede"] - r0
    reg["incompleto"] = estado["falhas"] > f0
    return reg


def _unidade_curada(c, ent, info, ctx):
    pid, classe, escopo = c["id"], ent["classe_pais"], c["escopo"]
    if classe == "br_evidencia":
        ev_pais = ent.get("evidencia_pais")
    elif classe == "fora_br":
        ev_pais = ent.get("evidencia_pais") or {"tipo": "curadoria", "url": f"https://huggingface.co/{pid}", "trecho": "publicador internacional da lista curada; sem pagina institucional conferida pelo coletor", "acessado": HOJE, "regra": "lista curada (seed), confianca baixa"}
    else:
        ev_pais = None
    if classe == "nao_classificado":   # fora do Brasil no mapa: como os independentes do mundo, ate 8 repositorios de navegador
        ys, fora = _independentes_do_mundo(pid, ctx.idx)
        if ys:
            ms = [construir(y, pid, "mundo", ctx.idx, [], {"conversao_de": base_primaria(y.get("tags", []))}) for y in ys]
        else:
            xs, puros, fora = modelos_do_publicador(pid)
            xs = sorted(xs, key=lambda x: (-(x.get("downloads") or 0), x["id"].lower()))[:MAX_INDEP_MUNDO]
            ms = [construir(x, pid, "mundo", ctx.idx, puros) for x in xs]
    else:
        xs, puros, fora = modelos_do_publicador(pid)
        ms = [construir(x, pid, escopo, ctx.idx, puros) for x in xs]
    if not ms:
        return {"descartado": _sem_modelos(pid, c, fora, escopo)}
    pub = _pub(pid, ent.get("nome") or info["nome"], ent.get("tipo") or info["tipo"], classe, ev_pais, ent["natureza"], ent.get("evidencia_natureza"), escopo, info, c["origem"], fora, len(ms))
    return {"pub": pub, "modelos": ms}


def _unidade_br_auto(c, info, ctx):
    pid = c["id"]
    top = c["achados"] or [x["id"] for x in listar(author=pid, sort="downloads", direction=-1, limit=5)]
    ev = evidencias(pid, info, ctx.seed_ev, top)
    if not ev["pais"]:
        return {"descartado": {"id": pid, "origem": c["origem"], "motivo": "sem evidencia publica de ser do Brasil (nao classificado)", "modelos_vistos": c["achados"][:3], "coletado_em": HOJE}}
    xs, puros, fora = modelos_do_publicador(pid)
    ms = [construir(x, pid, "br", ctx.idx, puros) for x in xs]
    if not ms:
        return {"descartado": _sem_modelos(pid, c, fora, "br")}
    nat = (ev["natureza"] or {}).get("classe", "nao_classificada")
    return {"pub": _pub(pid, info["nome"], info["tipo"], "br_evidencia", ev["pais"], nat, ev["natureza"], "br", info, c["origem"], fora, len(ms)), "modelos": ms}


def _unidade_mundo(c, info, ctx):
    pid, seed = c["id"], ctx.seed
    xs, puros, fora = modelos_do_publicador(pid)
    ms = [construir(x, pid, "mundo", ctx.idx, puros) for x in xs]
    if not ms:
        return {"descartado": _sem_modelos(pid, c, fora, "mundo")}
    ev = {"tipo": "curadoria", "url": f"https://huggingface.co/{pid}", "trecho": "grande publicador internacional da lista curada; sem pagina institucional conferida pelo coletor", "acessado": HOJE, "regra": "lista curada (seed), confianca baixa"}
    nat = "empresa" if pid in seed.get("empresas_mundo", []) else "instituicao" if pid in seed.get("instituicoes_mundo", []) else "nao_classificada"
    return {"pub": _pub(pid, info["nome"], info["tipo"], "fora_br", ev, nat, None, "mundo", info, c["origem"], fora, len(ms)), "modelos": ms}


def _unidade_indep(c, info, ctx):
    pid = c["id"]
    if info["tipo"] != "pessoa" or (info["n_modelos"] or 0) < 3:
        return {"descartado": {"id": pid, "origem": c["origem"], "motivo": "independente do mundo sem os criterios (pessoa com 3 modelos ou mais)", "escopo": "mundo", "coletado_em": HOJE}}
    ys, fora = _independentes_do_mundo(pid, ctx.idx)
    ms = [construir(y, pid, "mundo", ctx.idx, [], {"conversao_de": base_primaria(y.get("tags", []))}) for y in ys]
    if not ms:
        return {"descartado": _sem_modelos(pid, c, fora, "mundo")}
    ev_nat = {"classe": "independente", "tipo": "perfil", "url": f"https://huggingface.co/{pid}", "trecho": "conta de pessoa no Hugging Face; vinculo nao conferido", "acessado": HOJE, "regra": "N3 (pessoa)"}
    return {"pub": _pub(pid, info["nome"], "pessoa", "nao_classificado", None, "independente", ev_nat, "mundo", dict(info, n_membros=None), c["origem"], fora, len(ms)), "modelos": ms}


def descobrir_independentes(ctx, conhecidos):
    """Pessoas com builds de navegador entre os mais baixados (so no --tudo); ate MAX_INDEP_MUNDO novas por coleta."""
    conta = {}
    for repos in ctx.idx.values():
        for rid, y in repos.items():
            au = rid.split("/")[0]
            if au.lower() not in conhecidos and au not in EXCLUIR and y.get("pipeline_tag") in TAREFAS and not e_adaptador(y):
                conta.setdefault(au, []).append(y)
    achados = []
    for au, ys in sorted(conta.items(), key=lambda kv: (-sum(y.get("downloads") or 0 for y in kv[1]), kv[0].lower())):
        info = info_publicador(au)
        if info and info["tipo"] == "pessoa" and (info["n_modelos"] or 0) >= 3:
            achados.append({"id": au, "origem": "descoberta por builds de navegador", "escopo": "mundo", "tipo": "indep", "curado": None, "achados": []})
            if len(achados) >= MAX_INDEP_MUNDO:
                break
    return achados


# ---------- montagem e gravacao (determinista) ----------
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


def mesclar(exist, regs):
    """Mescla os registros coletados nos dados existentes. Ids em remocoes/.excluir saem. Devolve (pubs, modelos, descartados)."""
    pubs, desc = dict(exist["pubs"]), dict(exist["desc"])
    mods = collections.defaultdict(list)
    for m in exist["modelos"]:
        mods[m["publicador"].lower()].append(m)
    for k in [k for k, p in pubs.items() if p["id"] in EXCLUIR] + [k for k, d in desc.items() if d["id"] in EXCLUIR]:
        pubs.pop(k, None), desc.pop(k, None), mods.pop(k, None)
    for r in regs:
        k = r["id"].lower()
        antigo = pubs.get(k)
        pubs.pop(k, None), desc.pop(k, None), mods.pop(k, None)
        if r["pub"]:
            if antigo and r["pub"]["origem_lista"] == "entidade curada" and antigo.get("origem_lista"):
                r["pub"]["origem_lista"] = antigo["origem_lista"]
            pubs[k] = r["pub"]
            mods[k] = r["modelos"]
        elif r["descartado"]:
            desc[k] = r["descartado"]
    ordem = sorted(pubs.values(), key=lambda p: (p["escopo"] != "br", p["id"].lower()))
    pos = {p["id"].lower(): i for i, p in enumerate(ordem)}
    modelos = sorted((m for k, l in mods.items() if k in pos for m in l), key=lambda m: (pos[m["publicador"].lower()], m["id"].lower()))
    return ordem, modelos, sorted(desc.values(), key=lambda d: d["id"].lower())


def montar(pubs, modelos, descartados):
    const, fams = [], {}
    por_pub = collections.defaultdict(list)
    for m in modelos:
        por_pub[m["publicador"]].append(m)
    for p in pubs:
        ms = por_pub[p["id"]]
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
    cand_br = [d for d in descartados if d.get("escopo") != "mundo" and d.get("origem") != "lista mundo"]
    por_motivo = {}
    for d in cand_br:
        k = d["motivo"].split(" (")[0].split(",")[0]
        por_motivo[k] = por_motivo.get(k, 0) + 1
    n_br = sum(1 for p in pubs if p["escopo"] == "br")
    data = max([p["fontes"][0]["acessado"] for p in pubs if p.get("fontes")] or [HOJE])
    foto = {"data": data, "regra_gguf": f"GGUF conta se a menor variante Q4 (ou a mais leve, se nao ha Q4) somar ate {CORTE_GGUF_GB:g} GB",
            "corte_parametros_b": MAX_B,
            "brasil": contar(br), "mundo": contar(mu),
            "brasil_independentes": contar(nat(br, "independente")), "brasil_instituicoes": contar(nat(br, "instituicao")), "brasil_empresas": contar(nat(br, "empresa")), "brasil_natureza_nao_classificada": contar(nat(br, "nao_classificada")),
            "maior_publicador_br": (lambda c: {"id": c[0][0], "modelos": c[0][1]} if c else None)(sorted(((p, sum(1 for m in br if m["publicador"] == p)) for p in set(m["publicador"] for m in br)), key=lambda x: (-x[1], x[0].lower()))),
            "publicadores": {"brasil": len(set(m["publicador"] for m in br)), "mundo": len(set(m["publicador"] for m in mu)),
                             "brasil_por_natureza": {n: sum(1 for p in pubs if p["escopo"] == "br" and p["natureza"] == n) for n in ("independente", "instituicao", "empresa", "nao_classificada")}},
            "candidatos": {"avaliados": n_br + len(cand_br), "classificados_brasil": n_br, "descartados": len(cand_br), "descartados_por_motivo": por_motivo},
            "descartados": descartados,
            "ressalvas": ["Build existe nao quer dizer que roda: nao ha execucao neste mapa.",
                          "GGUF via wllama conta a parte, com corte de tamanho; ONNX, MLC e LiteRT sao nativos de navegador.",
                          "Builds nativos de terceiros sao achados por regra de nome no indice das organizacoes de runtime e das buscas por tag; podem faltar os de nomes fora do padrao.",
                          "Modelos de linguagem ate %gB, todos os de cada publicador classificado; publicador sem evidencia de ser do Brasil fica fora do mapa." % MAX_B]}
    meta = {"coletado_em": data, "fonte": "Hugging Face API publica", "versao_spec": "1.0"}
    return meta, {"publicadores": pubs, "modelos": modelos, "constelacoes": const, "familias": [fams[k] for k in sorted(fams)]}, foto


def gravar(meta, pacote, foto):
    """Grava so o que mudou (diff vazio quando nada muda). Devolve os arquivos alterados."""
    saidas = {os.path.join("data", nome + ".json"): json.dumps({"meta": meta, nome: obj}, ensure_ascii=False, indent=1) for nome, obj in pacote.items()}
    saidas[os.path.join("data", "foto.json")] = json.dumps(foto, ensure_ascii=False, indent=1)
    saidas[os.path.join("web", "data.js")] = "window.MAPA_DADOS=" + json.dumps(dict(meta=meta, foto=foto, **pacote), ensure_ascii=False, separators=(",", ":")) + ";"
    mudou = []
    for rel, conteudo in saidas.items():
        caminho = os.path.join(RAIZ, rel)
        try:
            igual = open(caminho, encoding="utf-8").read() == conteudo
        except OSError:
            igual = False
        if not igual:
            _atomico(caminho, conteudo)
            mudou.append(rel)
    return mudou


def guardar_antes():
    """Copia dos derivados antes de gravar, para o relatorio quando nao ha Git."""
    destino = os.path.join(RAIZ, ".relatorios", "antes")
    os.makedirs(destino, exist_ok=True)
    for n in ("publicadores", "modelos", "foto"):
        origem = os.path.join(RAIZ, "data", n + ".json")
        if os.path.exists(origem):
            with open(origem, "rb") as f, open(os.path.join(destino, n + ".json"), "wb") as g:
                g.write(f.read())


# ---------- execucao ----------
CH_CURADO, CH_AUTO = 5, 12   # chamadas por publicador (media medida em coletas reais: curado com ou sem modelos; descoberto com leitura de perfil e cartoes)


def estimativa(n_curados, n_auto):
    ch = n_curados * CH_CURADO + n_auto * CH_AUTO
    return ch, ch / 100.0   # a API anonima aceita ~100 chamadas por minuto


def main():
    ap = argparse.ArgumentParser(description="Coletor do Observatorio", formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--novos", action="store_true")
    g.add_argument("--tudo", action="store_true")
    g.add_argument("--so", help="so estes publicadores, separados por virgula (mescla)")
    g.add_argument("--normalizar", action="store_true", help="reordena os derivados existentes na ordem estavel, sem rede (uma vez, antes da primeira coleta incremental)")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--previa", action="store_true")
    ap.add_argument("--dias", type=float, default=30)
    ap.add_argument("--cache-dias", type=float, default=3)
    ap.add_argument("--fresh", action="store_true")
    ap.add_argument("--sem-descoberta", action="store_true")
    ap.add_argument("--max-candidatos", type=int, default=150)
    a = ap.parse_args()
    if not (a.novos or a.tudo or a.so or a.normalizar):
        ap.error("escolha um modo: --novos, --tudo ou --so a,b")
    global CACHE_DIAS
    CACHE_DIAS = a.cache_dias
    if a.fresh and not a.dry_run:
        import shutil
        shutil.rmtree(os.path.join(RAIZ, ".cache"), ignore_errors=True)
    seed = carregar_json(os.path.join(RAIZ, "seed", "publishers.json"))
    seed_ev = carregar_json(os.path.join(RAIZ, "seed", "evidencias.json"), {})
    caminho_ex = os.path.join(RAIZ, ".excluir")   # contas a ignorar por pedido do operador (fora do Git)
    if os.path.exists(caminho_ex):
        EXCLUIR.update(l.strip() for l in open(caminho_ex) if l.strip())
    REMOVIDOS.update(i["sha256"] for i in (carregar_json(os.path.join(RAIZ, "data", "remocoes.json"), {}) or {}).get("itens", []))
    exist = carregar_existente()
    if a.normalizar:
        for m in exist["modelos"]:
            m["builds"].sort(key=lambda b: (b["formato"], b["repo"]))
        meta, pacote, foto = montar(*mesclar(exist, []))
        print("normalizado; arquivos alterados:", gravar(meta, pacote, foto) or "nenhum")
        return
    cands = candidatos_locais(seed, carregar_curados(), exist)
    modo = "--so" if a.so else "--novos" if a.novos else "--tudo"

    def selecionar():
        if a.so:
            pedidos = {x.strip().lower() for x in a.so.split(",") if x.strip()}
            for x in sorted(pedidos - set(cands)):
                log(f"aviso: {x} nao e candidato (nem lista, nem entidade curada); ignorado")
            return [(c, "pedido") for k, c in cands.items() if k in pedidos]
        sit = [(c, situacao(c, exist, a.dias)) for c in cands.values()]
        return [(c, s) for c, s in sit if a.tudo or s != "em dia"]

    if not a.dry_run and not a.sem_descoberta and not a.so:   # descoberta por busca na API: so adiciona candidatos
        excl = _Excl(set(seed["mundo"]) | set(seed["runtime_orgs"]) | set(EXCLUIR))
        log("descoberta de candidatos brasileiros")
        for pid, ids in descobrir_candidatos(excl, seed["termos_busca"], 3)[: a.max_candidatos]:
            c = cands.setdefault(pid.lower(), {"id": pid, "origem": "busca na API", "escopo": "br", "tipo": None, "curado": None, "achados": []})
            if not c["curado"] and c["escopo"] == "br":
                c["achados"] = sorted(ids)[:5]
    alvos = selecionar()

    if a.dry_run:
        ncur = sum(1 for c, _ in alvos if c["curado"])
        print(f"{modo} --dry-run (sem chamadas de rede, nada gravado)")
        print(f"candidatos: {len(cands)} (curados: {sum(1 for c in cands.values() if c['curado'])}); a coletar: {len(alvos)}; em dia: {len(cands) - len(alvos)}")
        for c, s in sorted(alvos, key=lambda x: (x[1], x[0]["id"].lower())):
            e = c["curado"]
            print(f"  {s:9} {c['origem']:34} {(e['classe_pais'] + ' / ' + e['natureza']) if e else 'classificacao automatica':32} {c['id']}")
            if a.previa:
                xs, _, fora = modelos_do_publicador(c["id"])
                print(f"            previa: {len(xs)} modelo(s) no corte" + (f", {fora} acima de {MAX_B:g} B" if fora else "") + (": " + ", ".join(x["id"].split("/")[-1] for x in xs[:5]) + (" ..." if len(xs) > 5 else "") if xs else ""))
        ch, mi = estimativa(ncur, len(alvos) - ncur)
        print(f"estimativa: ~{ch} chamadas, ~{mi:.0f} min na API anonima, mais o indice de builds (~170 chamadas) se o cache expirou. Nao inclui a descoberta por busca.")
        return
    if not alvos and not any(p["id"] in EXCLUIR for p in exist["pubs"].values()):
        print(f"{modo}: nada a coletar ({len(cands)} candidatos em dia). Nenhum arquivo alterado.")
        return

    ctx = Ctx(seed, seed_ev)
    regs, n, t_ini, gastos = [], len(alvos), time.time(), []
    log(f"{modo}: {n} publicador(es) a coletar")
    try:
        for i, (c, sit) in enumerate(alvos, 1):
            pid = c["id"]
            reg, chk = None, _chk(pid)
            if not a.fresh and os.path.exists(chk) and (time.time() - os.path.getmtime(chk)) < CACHE_DIAS * 86400:
                r = carregar_json(chk)
                if r and r.get("v") == 1 and not r.get("incompleto") and r.get("assinatura") == assinatura(c):
                    reg = r
                    log(f"[{i}/{n}] {pid}: checkpoint de {r['coletado_em']} reaproveitado")
            if reg is None:
                t0 = time.time()
                reg = unidade(c, ctx)
                if reg["incompleto"]:
                    log(f"[{i}/{n}] {pid}: falha de rede durante a coleta; nao entra nos dados (rode de novo)")
                    continue
                _atomico(chk, json.dumps(reg, ensure_ascii=False))
                gastos.append(time.time() - t0)
                resto = (sum(gastos) / len(gastos)) * (n - i)
                alvo = "coletado" if reg["pub"] else "descartado: " + reg["descartado"]["motivo"]
                log(f"[{i}/{n}] {pid} ({sit}; {c['origem']}): {alvo}; {len(reg['modelos'])} modelo(s), {reg['chamadas']} chamadas, {time.time() - t0:.0f}s; restam ~{resto / 60:.1f} min")
                if os.environ.get("COLETOR_ESPERA_TESTE"):
                    time.sleep(float(os.environ["COLETOR_ESPERA_TESTE"]))
            regs.append(reg)
        if a.tudo and not a.so and not a.sem_descoberta:   # pessoas do mundo achadas por builds de navegador
            conhecidos = set(cands) | set(exist["pubs"]) | set(exist["desc"])
            for c in descobrir_independentes(ctx, conhecidos):
                reg = unidade(c, ctx)
                if not reg["incompleto"]:
                    _atomico(_chk(c["id"]), json.dumps(reg, ensure_ascii=False))
                    regs.append(reg)
    except KeyboardInterrupt:
        log(f"interrompido: {len(regs)} publicador(es) ja estao em .cache/publicadores/; rode o mesmo comando para continuar")
        sys.exit(130)

    guardar_antes()
    pubs, modelos, desc = mesclar(exist, regs)
    meta, pacote, foto = montar(pubs, modelos, desc)
    mudou = gravar(meta, pacote, foto)
    resumo = {k: foto[k] for k in ("brasil", "mundo", "publicadores", "candidatos") if k != "candidatos"}
    log(f"coleta concluida em {(time.time() - t_ini) / 60:.1f} min; chamadas de rede: {estado['rede']}, do cache: {estado['cache']}")
    print(json.dumps({"coletados": len(regs), "arquivos_alterados": mudou, **{k: foto[k] for k in ("brasil", "mundo")}}, ensure_ascii=False, indent=1))
    if mudou:
        try:
            import relatorio_coleta
            relatorio_coleta.gerar(RAIZ, None, chamadas=estado["rede"])
        except Exception as e:   # o relatorio nunca impede a coleta
            log(f"relatorio nao gerado: {e}")


if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    main()
