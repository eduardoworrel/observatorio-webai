#!/usr/bin/env python3
"""Coletor do Observatorio (SPEC.md secao 9 e SPEC_0.2_coleta.md).

Consulta a API publica do Hugging Face (sem token), aplica as regras da SPEC e grava data/*.json e web/data.js.
Nenhum LLM le ou decide nada: tudo e regra. Candidatos: data/entidades/publicador/*.json (curados; a classificacao
de pais e natureza vem da entidade), seed/publishers.json e a descoberta automatica.

Modos (um e obrigatorio):
  --novos        so publicadores que ainda nao estao nos dados, cuja entidade curada mudou ou cuja coleta passou de --dias dias;
                 o resultado e MESCLADO nos dados existentes
  --tudo         atualizacao completa (todos os candidatos, mais a descoberta de independentes do mundo); quem deixou de ser candidato sai dos dados
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
TAREFAS_GERADOR = {"text-generation", "image-text-to-text", "any-to-any", "text2text-generation"}
TAREFAS_CODIFICADOR = {"fill-mask", "feature-extraction", "sentence-similarity", "text-classification", "token-classification", "question-answering", "zero-shot-classification", "text-ranking"}
TAREFAS = TAREFAS_GERADOR | TAREFAS_CODIFICADOR


def familia_tarefa(tarefa):
    """gerador ou codificador, pela tarefa (SPEC.md secao 9.3)."""
    return "gerador" if tarefa in TAREFAS_GERADOR else "codificador"
NAVEGADOR = ("onnx", "mlc", "litert")
EXPAND = ["tags", "downloads", "likes", "pipeline_tag", "lastModified", "safetensors", "createdAt", "gguf"]
MAX_B = 12.0           # corte de parametros (bilhoes)
CORTE_GGUF_GB = 4.0    # corte do GGUF via wllama (ver SPEC_0.2, regra G)
PAUSA = float(os.environ.get("COLETOR_PAUSA") or 0.55)
JANELA_S, JANELA_MAX = 300, 480   # a API anonima aceita 500 chamadas por 5 min; ficamos abaixo
CACHE_DIAS = 3.0
MAX_INDEP_MUNDO = 8
REGRA_FILTRO = 2   # versao da regra de relevancia dos modelos (SPEC.md secao 9.3); mudou: todos os publicadores sao recoletados
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


FAM_IGNORAR = {"base", "large", "small", "tiny", "mini", "medium", "micro", "nano", "xs", "xl", "xxl", "xlarge", "xxlarge", "cased", "uncased"}
FAM_PARAR = {"instruct", "chat", "it", "sft", "dpo", "orpo", "gguf", "onnx", "mlc", "lora", "merged", "quantized", "awq", "gptq", "exl2", "mlx", "fp16", "bf16", "fp32", "int4", "int8"}


def _familia_antiga(rid, tags):
    nome = (base_primaria(tags) or rid).split("/")[-1]
    m = re.match(r"[A-Za-z]+(?:[-_]?\d+(?:\.\d+)?)?", nome)
    return (m.group(0) if m else nome).rstrip("-_")


def familia(rid, tags):
    """Familia pelo nome do modelo-base (SPEC.md regra F). Nome mais numero de versao (Qwen2.5, Llama-3.1) formam a familia; tamanho
    (7B, 460m) e variante (base, large, cased) nao separam familias; depois de uma variante, as palavras seguintes do nome entram (bert-base-portuguese-cased: bert-portuguese)."""
    nome = (base_primaria(tags) or rid).split("/")[-1]
    tokens = [t for t in re.split(r"[-_]", nome) if t]
    if not tokens or not re.fullmatch(r"[A-Za-z]+(\d+(\.\d+)?)?", tokens[0]):
        return _familia_antiga(rid, tags)
    if re.fullmatch(r"[A-Za-z]+\d+(\.\d+)?", tokens[0]):   # versao colada ao nome (Qwen2.5, gpt2, LFM3)
        return tokens[0]
    if len(tokens) > 1 and re.fullmatch(r"\d+(\.\d+)?", tokens[1]):   # versao separada (Llama-3.1, gemma-2)
        return tokens[0] + "-" + tokens[1]
    saida, qual = [tokens[0]], False
    for t in tokens[1:]:
        tl = t.lower()
        if tl in FAM_IGNORAR:
            qual = True
        elif qual and len(saida) == 1 and len(t) > 1 and t.isalpha() and tl not in FAM_PARAR:   # uma palavra depois da variante
            saida.append(t)
        else:
            break
    return "-".join(saida)


def e_build_de(nome_modelo, nome_cand):
    m, c = toks(nome_modelo), toks(nome_cand)
    return len(c) > len(m) and c[: len(m)] == m and all(TOK_FMT.match(x) for x in c[len(m):])


# ---------- idiomas e foco no portugues do Brasil (SPEC 9.7) ----------
ISO639_1 = set("aa ab ae af ak am an ar as av ay az ba be bg bh bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu".split()) | {"por"}
FOCO_PT_BR = re.compile(
    r"(?:fine-?tuned|adapted|trained|specialized|designed|built|optimi[sz]ed|pre-?trained|developed)\b[^.\n]{0,60}\b(?:brazilian portuguese|portugu[eê]s (?:do )?brasil(?:eiro)?|pt-br)\b"
    r"|(?:modelo|model)\b[^.\n]{0,40}\b(?:para|for)\b[^.\n]{0,20}\b(?:portugu[eê]s (?:do )?brasil(?:eiro)?|brazilian portuguese)\b"
    r"|(?:treinado|ajustado|adaptado|especializado|desenvolvido|otimizado)\b[^.\n]{0,60}\bportugu[eê]s (?:do )?brasil(?:eiro)?\b", re.I)


def idiomas_tags(tags):
    """Idiomas declarados nas tags do cartao (ISO 639-1 e 'por'); pt-BR conta como pt."""
    out = set()
    for t in tags:
        t = t.lower()
        if t in ("pt-br", "pt_br", "por"):
            out.add("pt")
        elif t in ISO639_1:
            out.add(t)
    return sorted(out)


PT_EUROPEU_ID = re.compile(r"pt[-_]?pt\b|ptpt|portugal|europe", re.I)
PT_EUROPEU_CARTAO = re.compile(r"european portuguese|portugu[eê]s europeu|portugu[eê]s de portugal|\bpt-pt\b", re.I)
PT_BR_ID = re.compile(r"(?<![a-z])(?:pt[-_]?br|brazil|brasil)", re.I)
ALVO_ARTIGO = re.compile(r"\bour (?:efforts|work|models?|corpus|datasets?|resources?|study)\b[^.]{0,100}\b(?:mainly|primarily|specifically|mostly)\b[^.]{0,40}\bBrazilian Portuguese\b", re.I)
LINHA_CODIGO = re.compile(r"source code|c[oó]digo[- ]fonte|developed by|desenvolvido por", re.I)
BR_GITHUB = {}   # login do GitHub (minusculas) -> publicador do Brasil que o liga no proprio perfil do Hugging Face (preenchido em main)


def carregar_br_github(pubs_br):
    for pid in pubs_br:
        h = perfil(pid)["html"]
        import html as H
        m = re.search(r'"github"\s*:\s*"([^"]+)"', H.unescape(h)) or re.search(r"github\.com/(?!huggingface\b|sponsors|orgs)([A-Za-z0-9_-]+)", H.unescape(h))
        if m:
            BR_GITHUB[m.group(1).lower()] = pid


def dev_br_do_cartao(rid):
    """Condicao 2 por cartao: a linha do codigo-fonte do cartao aponta para um repositorio de GitHub que o perfil de um publicador do Brasil declara como seu."""
    for linha in texto(f"https://huggingface.co/{rid}/raw/main/README.md").splitlines():
        if LINHA_CODIGO.search(linha):
            for login in re.findall(r"github\.com/([A-Za-z0-9_-]+)", linha):
                if login.lower() in BR_GITHUB:
                    return {"publicador": BR_GITHUB[login.lower()], "trecho": sem_pii(re.sub(r"\s+", " ", linha).strip())[:240]}
    return None


def foco_pt_br(rid, tags, idiomas):
    """Condicao 3 do escopo Brasil (SPEC 9.8). Devolve {"criterio", "trecho", "url"?} ou None. Portugues unico NAO basta:
    exclui o portugues europeu (nome, tag ou cartao com ptpt, pt-PT, European Portuguese, portugues europeu, Portugal no nome) e exige
    (a) variante explicita no nome ou nas tags (ptbr, pt-BR, Brazilian, brasil), ou
    (b) declaracao literal do portugues do Brasil como alvo no cartao, ou
    (c) declaracao literal no artigo (arXiv) que as tags do modelo citam ("our efforts are mainly concerned with Brazilian Portuguese").
    Idiomas: so pt, ou pt e en. Multilingue que apenas inclui o portugues nao conta."""
    if "pt" not in idiomas or not set(idiomas) <= {"pt", "en"}:
        return None
    nome = rid.split("/")[-1]
    if PT_EUROPEU_ID.search(nome) or any(t.lower() == "pt-pt" for t in tags):
        return None
    if PT_BR_ID.search(nome) or any(t.lower() in ("pt-br", "pt_br") for t in tags):
        return {"criterio": "variante_explicita", "trecho": nome}
    cartao = texto(f"https://huggingface.co/{rid}/raw/main/README.md")
    if PT_EUROPEU_CARTAO.search(cartao):
        return None
    for linha in cartao.splitlines():
        if FOCO_PT_BR.search(linha):
            return {"criterio": "declaracao", "trecho": sem_pii(re.sub(r"\s+", " ", linha).strip())[:240]}
    for t in tags:
        if t.startswith("arxiv:"):
            h = texto(f"https://arxiv.org/html/{t[6:]}")
            txt = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", re.sub(r"(?s)<(script|style).*?</\1>", "", h)))
            m = ALVO_ARTIGO.search(txt)
            if m:
                return {"criterio": "artigo", "trecho": txt[max(0, m.start() - 20):m.end()][:240].strip(), "url": f"https://arxiv.org/abs/{t[6:]}"}
    return None


# ---------- conversao fiel: build do modelo original, nao modelo novo (SPEC 0.2, regra C) ----------
CONV_CHAVE = {"gguf", "ggufs", "awq", "gptq", "exl2", "mlx", "onnx", "mlc", "litert", "litertlm", "quantized"}
FMT_EXTRA = CONV_CHAVE | {"4bit", "8bit", "bnb", "imatrix", "i1", "fp8", "int4", "int8"}
REF_HF = re.compile(r"([A-Za-z0-9][A-Za-z0-9_.-]*)/([A-Za-z0-9][A-Za-z0-9_.-]*)")


def _tok_fmt(t):
    return bool(TOK_FMT.match(t)) or t in FMT_EXTRA or bool(re.fullmatch(r"i?q\d.*|\d+bit|w\d+a\d+|f\d+", t))


def nome_sem_formato(nome):
    saida, ant = [], False
    for t in toks(nome):
        f = _tok_fmt(t) or (ant and t.isdigit())   # q8_0: o 0 pertence a marca
        if not f:
            saida.append(t)
        ant = f
    return saida


def classificar_conversao(x, pub):
    """Decide, por regra objetiva, se um repositorio e conversao fiel (formato ou quantizacao) de OUTRO modelo.
    Devolve None (nao parece conversao) ou {"grau", "original", "trecho"} com grau:
      declarado  : a tag base_model:quantized:X do cartao, ou base_model:X cujo nome, sem marcas de formato, e o de X;
      inferido   : o nome sem marcas de formato e o de um repositorio X que o texto do cartao cita (id ou link), X existe e e de outra conta;
      nao_determinado : o nome tem marca de conversao e nada disso se confirmou (o repositorio continua como esta)."""
    rid, tags = x["id"], x.get("tags", [])
    nome = rid.split("/")[-1]
    tk = toks(nome)
    if not (set(tk) & CONV_CHAVE):
        return None
    if any(re.match(r"base_model:(finetune|adapter|merge):", t) for t in tags):
        return None   # a propria tag diz que e derivado, nao conversao
    n = nome_sem_formato(nome)
    for t in tags:
        m = re.match(r"base_model:quantized:(.+)$", t)
        if m and m.group(1).lower() != rid.lower():
            return {"grau": "declarado", "original": m.group(1), "trecho": t}
    b = base_primaria(tags)
    if b and b.lower() != rid.lower() and nome_sem_formato(b.split("/")[-1]) == n:
        return {"grau": "declarado", "original": b, "trecho": "base_model:" + b}
    cartao = texto(f"https://huggingface.co/{rid}/raw/main/README.md")
    for linha in cartao.splitlines():
        for a, nm in REF_HF.findall(re.sub(r"https?://(?:www\.)?huggingface\.co/", "", linha)):
            if a.lower() in ("datasets", "spaces", "models", "huggingface", "blog", "docs", "collections", "organizations"):
                continue
            ref = nome_sem_formato(nm)
            if ref and (ref == n or n == toks(a) + ref):
                d, _ = get(f"{API}/models/{a}/{nm}")
                if isinstance(d, dict) and d.get("id") and d["id"].lower() != rid.lower():
                    return {"grau": "inferido", "original": d["id"], "trecho": sem_pii(re.sub(r"\s+", " ", linha).strip())[:240]}
    return {"grau": "nao_determinado", "original": None, "trecho": None}


def recalcular_builds(m):
    """Resumo de builds do modelo (status, GGUF, via, gb), sem rede, a partir dos builds ja medidos."""
    por_fmt = {}
    for b in sorted(m["builds"], key=lambda b: (not b["oficial"], not b["runtime_org"], -(b.get("downloads") or 0))):
        por_fmt.setdefault(b["formato"], []).append(b)
    gg = por_fmt.get("gguf", [])
    gg_ok = None
    for b in gg[:3]:
        if b.get("gb") is not None and b["gb"] <= CORTE_GGUF_GB and (gg_ok is None or b["gb"] < gg_ok["gb"]):
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
    m["fontes"] = [f for f in m["fontes"] if not f["rotulo"].startswith("Build ")] + \
        [{"rotulo": f"Build {b['formato']} ({'do publicador' if b['oficial'] else 'da comunidade'})", "url": b["url"], "acessado": HOJE}
         for b in m["builds"] if b.get("destaque") and not b.get("proprio")][:8]


def reatribuir_conversoes(pubs, modelos):
    """Conversao fiel nao e modelo novo: vira build do original (autor do build = quem converteu) e sai da lista de modelos.
    Original fora do mapa: a conversao de um publicador do Brasil sai (nao e modelo brasileiro); a de publicador do mundo continua (regra existente).
    Devolve (modelos, relatorio)."""
    por_id = {m["id"].lower(): m for m in modelos}
    mover, rel = [], {"movidos": [], "sem_original_no_mapa": [], "nao_determinado": []}
    for m in modelos:
        c = m.get("conversao")
        if not c:
            continue
        if c["grau"] == "nao_determinado":
            rel["nao_determinado"].append({"id": m["id"], "publicador": m["publicador"], "escopo": m["escopo"]})
            continue
        o = por_id.get(c["original"].lower())
        if o is not None and o is not m:
            for b in m["builds"]:
                if not b.get("proprio"):
                    continue
                if any(x["repo"] == b["repo"] and x["formato"] == b["formato"] for x in o["builds"]):
                    continue
                nb = dict(b, autor=m["publicador"], oficial=m["publicador"] == o["publicador"], proprio=False, runtime_org=False, grau=c["grau"], trecho=c["trecho"])
                o["builds"].append(nb)
            o["builds"].sort(key=lambda b: (b["formato"], b["repo"]))
            recalcular_builds(o)
            mover.append(m["id"])
            rel["movidos"].append({"id": m["id"], "para": o["id"], "porter": m["publicador"], "grau": c["grau"], "escopo_antes": m["escopo"], "escopo_original": o["escopo"]})
        elif m["escopo"] == "br" and c["original"].split("/")[0].lower() != m["publicador"].lower():   # original proprio fora do mapa: continua modelo do publicador
            mover.append(m["id"])
            rel["sem_original_no_mapa"].append({"id": m["id"], "original": c["original"], "publicador": m["publicador"], "grau": c["grau"]})
    sai = set(mover)
    saida = [m for m in modelos if m["id"] not in sai]
    cont = collections.Counter(m["publicador"] for m in saida)
    for p in pubs:
        p["n_modelos_mapeados"] = cont.get(p["id"], 0)
    for m in saida:
        m.pop("conversao", None)
    return saida, rel


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
        for tarefa in (("text-generation", "image-text-to-text", "feature-extraction", "fill-mask", "text-classification", "token-classification", "sentence-similarity") if filtro == "transformers.js" else ("text-generation", "image-text-to-text")):
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
        return {"tipo": "pessoa", "nome": u.get("fullname") or pid, "n_modelos": u.get("numModels"), "n_membros": None, "verificado": False, "orgs": [o.get("name") for o in u.get("orgs") or [] if o.get("name")]}
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
# ---------- tarefa inferida (SPEC.md secao 9.3, item 1) ----------
ARQ_CAUSAL = {"llama", "mistral", "mixtral", "gemma", "gemma2", "gemma3", "gemma3_text", "qwen", "qwen2", "qwen2_moe", "qwen3", "qwen3_moe", "phi", "phi3", "phimoe", "gpt2", "gpt_neo", "gpt_neox",
              "gptj", "gpt_bigcode", "opt", "bloom", "falcon", "stablelm", "olmo", "olmo2", "smollm3", "granite", "granitemoe", "mamba", "mamba2", "deepseek_v2", "deepseek_v3", "cohere", "cohere2",
              "starcoder2", "internlm2", "lfm2", "glm", "glm4", "baichuan", "yi", "mpt", "codegen", "xglm", "openelm", "nemotron", "exaone", "rwkv", "jamba", "persimmon", "bitnet", "ministral"}
ARQ_SEQ2SEQ = {"t5", "mt5", "umt5", "longt5", "bart", "mbart", "pegasus", "led", "ul2", "flan-t5", "byt5", "m2m_100", "marian"}
TAGS_CAUSAL = {"text-generation", "text-generation-inference", "conversational", "causal-lm"}
TAGS_SEQ2SEQ = {"text2text-generation", "seq2seq"}
ARQ_CODIFICADOR = {"bert", "roberta", "deberta", "deberta-v2", "electra", "albert", "distilbert", "xlm-roberta", "camembert", "mpnet", "modernbert", "xlm", "flaubert", "ernie", "megatron-bert", "nomic_bert", "xlm-roberta-xl"}
TAGS_CODIFICADOR = {"fill-mask", "feature-extraction", "sentence-similarity", "text-classification", "token-classification", "question-answering", "zero-shot-classification", "text-ranking"}
VISAO_AUDIO_TAG = re.compile(r"^(image-classification|object-detection|automatic-speech-recognition|text-to-image|text-to-speech|image-segmentation|open_clip|clip|vit|whisper|wav2vec2|audio-classification|image-to-text)$")
NAO_LINGUAGEM_NOME = re.compile(r"reward|\bclip\b|classif|\bner\b|sentiment|whisper|wav2vec|detect", re.I)


def inferir_tarefa(x):
    """Tarefa de modelo sem pipeline_tag, por regra e so com campos da listagem (tags, nome, safetensors/gguf). Devolve (tarefa, regra) ou None.
    Exige tamanho conhecido; exclui adaptadores, visao e audio; separa geradores (arquitetura causal ou sequencia-para-sequencia) de codificadores (encoders, embedding, reranqueamento)."""
    if x.get("pipeline_tag") or e_adaptador(x):
        return None
    tags = {t.lower() for t in x.get("tags", [])}
    nome = x["id"].split("/")[-1]
    if not params_b(x):
        return None   # sem safetensors.total nem gguf.total nao ha como confirmar que e um modelo de pesos de linguagem dentro do corte
    if any(VISAO_AUDIO_TAG.match(t) for t in tags) or re.search(r"\bclip\b|whisper|wav2vec", nome, re.I):
        return None
    cod = tags & TAGS_CODIFICADOR
    if cod:
        return sorted(cod)[0], "tag de tarefa de codificador (" + sorted(cod)[0] + ") + pesos medidos"
    if "sentence-transformers" in tags:
        return "feature-extraction", "biblioteca de embeddings de sentencas + pesos medidos"
    if tags & TAGS_SEQ2SEQ:
        return "text2text-generation", "tag de tarefa de texto para texto + pesos medidos"
    if NAO_LINGUAGEM_NOME.search(nome) and not tags & ARQ_CODIFICADOR:
        return None
    if tags & ARQ_SEQ2SEQ:
        return "text2text-generation", "arquitetura sequencia-para-sequencia (" + sorted(tags & ARQ_SEQ2SEQ)[0] + ") + pesos medidos"
    if tags & ARQ_CODIFICADOR:
        return "feature-extraction", "arquitetura de codificador (" + sorted(tags & ARQ_CODIFICADOR)[0] + ") + pesos medidos"
    if tags & TAGS_CAUSAL or tags & ARQ_CAUSAL:
        if re.search(r"embed", nome, re.I):
            return "feature-extraction", "arquitetura de linguagem com nome de embedding + pesos medidos"
        if re.search(r"rerank", nome, re.I):
            return "text-ranking", "arquitetura de linguagem com nome de reranqueamento + pesos medidos"
        if tags & TAGS_CAUSAL:
            return "text-generation", "tag de geracao de texto + pesos medidos"
        return "text-generation", "arquitetura de linguagem causal (" + sorted(tags & ARQ_CAUSAL)[0] + ") + pesos medidos"
    return None


def modelos_do_publicador(pid):
    """Filtro de relevancia (SPEC.md secao 9): modelos de linguagem, sem adaptadores, ate MAX_B bilhoes de parametros.
    Repositorios que so mudam o formato de um modelo do mesmo publicador viram build dele (regra R), nao modelo novo."""
    todos = listar(max_paginas=10, author=pid, limit=100)
    for x in todos:
        r = inferir_tarefa(x)
        if r:
            x["pipeline_tag"], x["tarefa_inferida"], x["regra_tarefa"] = r[0], True, r[1]
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
    m = {"id": rid, "nome": nome, "publicador": pub, "escopo": escopo, "familia": familia(rid, tags), "tarefa": x.get("pipeline_tag"), "familia_tarefa": familia_tarefa(x.get("pipeline_tag")), "licenca": licenca(tags),
         "parametros_b": params_b(x), "downloads": x.get("downloads"), "atualizado": (x.get("lastModified") or "")[:10], "idioma_pt": marca_pt(tags, rid),
         "url": f"https://huggingface.co/{rid}", "base": base_primaria(tags), "formatos_proprios": formatos(rid, tags), "builds": []}
    m["idiomas"] = idiomas_tags(tags)
    m["pt"] = "pt" in m["idiomas"]
    if escopo != "br":
        foco = foco_pt_br(rid, tags, m["idiomas"])
        if foco:
            m["foco_pt_br"] = foco
        dev = dev_br_do_cartao(rid) if BR_GITHUB else None
        if dev:
            m["dev_br"] = dev
    if x.get("tarefa_inferida"):
        m["tarefa_inferida"], m["regra_tarefa"] = True, x["regra_tarefa"]
    if ev_extra:
        m.update(ev_extra)
    conv = classificar_conversao(x, pub)
    if conv:
        m["conversao"] = conv
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
    nucleo = [REGRA_FILTRO, c["escopo"], c.get("tipo"), e.get("classe_pais"), e.get("natureza"), e.get("nome"), e.get("tipo"), e.get("evidencia_pais"), e.get("evidencia_natureza"), c.get("achados") if c.get("tipo") == "global_pt" else None]
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
    return {"pubs": {p["id"].lower(): p for p in pubs}, "modelos": mods, "desc": {d["id"].lower(): d for d in foto.get("descartados", [])}, "regra": foto.get("regra_filtro"), "regra_mat": foto.get("regra_maturidade")}


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
    if exist.get("regra") != REGRA_FILTRO and (exist["pubs"] or exist["desc"]):
        return "regra"
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


CURADOS_ID = {}   # id em minusculas -> id dos publicadores curados (preenchido em main)


def _pub(pid, nome, tipo, classe, ev_pais, nat, ev_nat, escopo, info, origem, fora, n):
    d = _pub_base(pid, nome, tipo, classe, ev_pais, nat, ev_nat, escopo, info, origem, fora, n)
    if tipo == "pessoa":   # so as organizacoes curadas de que a conta e membro publico; nenhum nome de pessoa
        d["membro_de"] = sorted({CURADOS_ID[o.lower()] for o in info.get("orgs") or [] if o.lower() in CURADOS_ID and CURADOS_ID[o.lower()] != pid})
    return d


def _pub_base(pid, nome, tipo, classe, ev_pais, nat, ev_nat, escopo, info, origem, fora, n):
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
    elif c["tipo"] == "global_pt":
        reg.update(_unidade_global(c, info, ctx))
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
            xs = [x for x in xs if set(formatos(x["id"], x.get("tags", []))) & set(NAVEGADOR)]
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


# ---------- recorte "Em portugues (global)" (SPEC 9.8) ----------
GLOBAL_PT_MIN_DOWNLOADS = 10000   # downloads em 30 dias (corte escolhido pelo orcamento de peso do data.js; ver SPEC 9.8)
GLOBAL_PT_MIN_LIKES = 100
GLOBAL_PT_ORIGEM = "recorte global em portugues"
GLOBAL_X = {}   # id -> registro da listagem (preenchido na descoberta; a unidade le daqui)


def descobrir_global_pt(cands, exist):
    """Modelos de qualquer origem com portugues declarado nas tags, geradores ou codificadores ate MAX_B, sem adaptadores, com pelo menos
    GLOBAL_PT_MIN_DOWNLOADS downloads em 30 dias ou GLOBAL_PT_MIN_LIKES curtidas; de publicadores que ainda nao estao no mapa. Devolve candidatos por publicador."""
    q = [("filter", "pt"), ("sort", "downloads"), ("direction", -1), ("limit", 100)] + [("expand[]", k) for k in EXPAND]
    todos = paginar(f"{API}/models?" + urllib.parse.urlencode(q), 40)
    globais = {k for k, p in exist["pubs"].items() if p.get("origem_lista") == GLOBAL_PT_ORIGEM}   # reavaliados a cada execucao
    conhecidos = {m["id"].lower() for m in exist["modelos"] if m["publicador"].lower() not in globais}
    pubs_conhecidos = (set(exist["pubs"]) - globais) | {k for k, c in cands.items() if c.get("curado")}   # o recorte aceita tambem contas descartadas por falta de evidencia de pais
    por_pub = collections.defaultdict(list)
    for x in todos:
        pid = x["id"].split("/")[0]
        if x["id"].lower() in conhecidos or pid.lower() in pubs_conhecidos or pid in EXCLUIR:
            continue
        if x.get("pipeline_tag") not in TAREFAS or e_adaptador(x) or "pt" not in idiomas_tags(x.get("tags", [])):
            continue
        p = params_b(x)
        if p is None or p > MAX_B:
            continue
        if (x.get("downloads") or 0) < GLOBAL_PT_MIN_DOWNLOADS and (x.get("likes") or 0) < GLOBAL_PT_MIN_LIKES:
            continue
        GLOBAL_X[x["id"]] = x
        por_pub[pid].append(x["id"])
    return {pid.lower(): {"id": pid, "origem": GLOBAL_PT_ORIGEM, "escopo": "mundo", "tipo": "global_pt", "curado": None, "achados": sorted(ids)} for pid, ids in por_pub.items()}


def _unidade_global(c, info, ctx):
    pid = c["id"]
    xs = [GLOBAL_X[i] for i in c["achados"] if i in GLOBAL_X]
    ms = [construir(x, pid, "mundo", ctx.idx, [], {"recorte_pt": True}) for x in xs]
    if not ms:
        return {"descartado": {"id": pid, "origem": c["origem"], "motivo": "sem modelos no recorte global em portugues", "escopo": "mundo", "coletado_em": HOJE}}
    return {"pub": _pub(pid, info["nome"], info["tipo"], "nao_classificado", None, "nao_classificada", None, "mundo", info, c["origem"], 0, len(ms)), "modelos": ms}


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


def mesclar(exist, regs, remover=()):
    """Mescla os registros coletados nos dados existentes. Ids em remocoes/.excluir saem. Devolve (pubs, modelos, descartados)."""
    pubs, desc = dict(exist["pubs"]), dict(exist["desc"])
    mods = collections.defaultdict(list)
    for m in exist["modelos"]:
        mods[m["publicador"].lower()].append(m)
    for k in [k for k, p in pubs.items() if p["id"] in EXCLUIR] + [k for k, d in desc.items() if d["id"] in EXCLUIR] + list(remover):
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
    marcas = carregar_entidades("familia")   # nome de marca curado (com fonte) para uma familia derivada
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
        f = fams.setdefault(m["familia"].lower(), {"id": m["familia"].lower(), "nome": (marcas.get(m["familia"].lower()) or {}).get("nome") or m["familia"], "modelos": [], "publicadores": []})
        f["modelos"].append(m["id"])
        if m["publicador"] not in f["publicadores"]:
            f["publicadores"].append(m["publicador"])
    pub_by = {p["id"]: p for p in pubs}
    br = [m for m in modelos if m["escopo"] == "br"]
    mu = [m for m in modelos if m["escopo"] == "mundo" and not m.get("recorte_pt")]
    rec = [m for m in modelos if m["escopo"] == "mundo" and m.get("recorte_pt")]
    nat = lambda ms, n: [m for m in ms if pub_by[m["publicador"]]["natureza"] == n]
    cand_br = [d for d in descartados if d.get("escopo") != "mundo" and d.get("origem") != "lista mundo"]
    por_motivo = {}
    for d in cand_br:
        k = d["motivo"].split(" (")[0].split(",")[0]
        por_motivo[k] = por_motivo.get(k, 0) + 1
    n_br = sum(1 for p in pubs if p["escopo"] == "br")
    data = max([p["fontes"][0]["acessado"] for p in pubs if p.get("fontes")] or [HOJE])
    foto = {"data": data, "regra_gguf": f"GGUF conta se a menor variante Q4 (ou a mais leve, se nao ha Q4) somar ate {CORTE_GGUF_GB:g} GB",
            "corte_parametros_b": MAX_B, "regra_filtro": REGRA_FILTRO,
            "brasil": contar(br), "mundo": contar(mu), "recorte_pt": contar(rec), "por_origem_brasil": dict(sorted(collections.Counter(m.get("origem_motivo") for m in br).items())),
            "pt_declarado": {"brasil": sum(1 for m in br if m.get("pt")), "mundo": sum(1 for m in mu if m.get("pt")), "recorte": len(rec)},
            "brasil_independentes": contar(nat(br, "independente")), "brasil_instituicoes": contar(nat(br, "instituicao")), "brasil_empresas": contar(nat(br, "empresa")), "brasil_natureza_nao_classificada": contar(nat(br, "nao_classificada")),
            "maior_publicador_br": (lambda c: {"id": c[0][0], "modelos": c[0][1]} if c else None)(sorted(((p, sum(1 for m in br if m["publicador"] == p)) for p in set(m["publicador"] for m in br)), key=lambda x: (-x[1], x[0].lower()))),
            "publicadores": {"brasil": len(set(m["publicador"] for m in br)), "mundo": len(set(m["publicador"] for m in mu)),
                             "brasil_por_natureza": {n: sum(1 for p in pubs if p["escopo"] == "br" and p["natureza"] == n) for n in ("independente", "instituicao", "empresa", "nao_classificada")}},
            "candidatos": {"avaliados": n_br + len(cand_br), "classificados_brasil": n_br, "descartados": len(cand_br), "descartados_por_motivo": por_motivo},
            "descartados": descartados,
            "ressalvas": ["Build existe nao quer dizer que roda: nao ha execucao neste mapa.",
                          "GGUF via wllama conta a parte, com corte de tamanho; ONNX, MLC e LiteRT sao nativos de navegador.",
                          "Conversao fiel de outro modelo (GGUF, AWQ, ONNX...) e build do original, nao modelo novo; quem converteu e o autor do build.",
                          "Builds nativos de terceiros sao achados por regra de nome no indice das organizacoes de runtime e das buscas por tag; podem faltar os de nomes fora do padrao.",
                          "Modelos de linguagem ate %gB, todos os de cada publicador classificado; publicador sem evidencia de ser do Brasil fica fora do mapa." % MAX_B]}
    por_pub_br = collections.Counter(m["publicador"] for m in br)
    maior = sorted(por_pub_br.items(), key=lambda kv: (-kv[1], kv[0].lower()))[0] if por_pub_br else None
    sem = [m for m in br if not maior or m["publicador"] != maior[0]]
    foto["por_familia_tarefa"] = {f: {"brasil": contar([m for m in br if m["familia_tarefa"] == f]), "mundo": contar([m for m in mu if m["familia_tarefa"] == f]),
                                      "brasil_sem_maior": contar([m for m in sem if m["familia_tarefa"] == f])} for f in ("gerador", "codificador")}
    foto["sem_maior_publicador"] = {"id": maior[0] if maior else None, "modelos": maior[1] if maior else 0, "brasil": contar(sem), "publicadores_brasil": len(por_pub_br) - (1 if maior else 0)}
    def cont_mat(ms):
        c = {"experimental": 0, "documentado": 0, "indeterminado": 0}
        for m in ms:
            c[m.get("maturidade", "indeterminado")] += 1
        return c
    foto["regra_maturidade"] = REGRA_MATURIDADE
    foto["maturidade"] = {"brasil": cont_mat(br), "mundo": cont_mat(mu), "brasil_sem_maior": cont_mat(sem),
                          "por_familia_tarefa": {f: {"brasil": cont_mat([m for m in br if m["familia_tarefa"] == f]), "mundo": cont_mat([m for m in mu if m["familia_tarefa"] == f]),
                                                     "brasil_sem_maior": cont_mat([m for m in sem if m["familia_tarefa"] == f])} for f in ("gerador", "codificador")},
                          "builds": {k: {"total": sum(1 for m in modelos if m.get("maturidade") == k), "com_build_nativo": sum(1 for m in modelos if m.get("maturidade") == k and m["via"] == "nativo"),
                                         "so_gguf_wllama": sum(1 for m in modelos if m.get("maturidade") == k and m["via"] == "gguf")} for k in ("experimental", "documentado", "indeterminado")}}
    meta = {"coletado_em": data, "fonte": "Hugging Face API publica", "versao_spec": "1.0"}
    return meta, {"publicadores": pubs, "modelos": modelos, "constelacoes": const, "familias": [fams[k] for k in sorted(fams)]}, foto


def camadas_atuais():
    """Camadas de datasets e benchmarks como estao em data/ (quando a execucao nao as recoleta)."""
    d = carregar_datasets_existentes()
    b = (carregar_json(os.path.join(RAIZ, "data", "benchmarks.json"), {}) or {}).get("benchmarks", [])
    f = carregar_json(os.path.join(RAIZ, "data", "foto_camadas.json"), {}) or {"datasets": {"total": 0, "por_escopo": {"br": 0, "mundo": 0}, "pt": {"sim": 0, "nao": 0}, "pt_br": 0, "por_downloads": {}, "por_faixa": {}, "downloads_total": 0}, "benchmarks": {"total": 0, "por_dominio": {}, "por_tipo": {}}}
    return d["datasets"], b, f, d["unidades"]


def gravar(meta, pacote, foto, camadas=None, rel=None):
    """Grava so o que mudou (diff vazio quando nada muda). Devolve os arquivos alterados."""
    ds, bs, foto_c, unidades = camadas or camadas_atuais()
    rel = rel or (carregar_json(os.path.join(RAIZ, "data", "relacoes.json"), {}) or {"instituicoes": [], "laboratorios": [], "vinculos": [], "hierarquia": []})
    meta_c = dict(meta, coletado_em=max([r["fontes"][0]["acessado"] for r in ds if r.get("fontes")] or [meta["coletado_em"]]), unidades=unidades)
    saidas = {os.path.join("data", nome + ".json"): json.dumps({"meta": meta, nome: obj}, ensure_ascii=False, indent=1) for nome, obj in pacote.items()}
    saidas[os.path.join("data", "foto.json")] = json.dumps(foto, ensure_ascii=False, indent=1)
    saidas[os.path.join("data", "datasets.json")] = json.dumps({"meta": meta_c, "datasets": ds}, ensure_ascii=False, indent=1)
    saidas[os.path.join("data", "benchmarks.json")] = json.dumps({"meta": meta, "benchmarks": bs}, ensure_ascii=False, indent=1)
    saidas[os.path.join("data", "relacoes.json")] = json.dumps({"meta": dict(meta, assinatura=rel.get("assinatura")), "instituicoes": rel["instituicoes"], "laboratorios": rel["laboratorios"], "vinculos": rel["vinculos"], "hierarquia": rel["hierarquia"]}, ensure_ascii=False, indent=1)
    saidas[os.path.join("data", "foto_camadas.json")] = json.dumps(foto_c, ensure_ascii=False, indent=1)
    saidas.update(arquivos_web(meta, foto, pacote, ds, bs, foto_c, rel))
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


# ---------- camada de datasets e benchmarks (SPEC.md secoes 4.8, 4.9 e 9.5) ----------
EXPAND_DS = ["tags", "downloads", "likes", "lastModified", "description", "gated", "private", "createdAt", "mainSize"]
MIN_DOWNLOADS_DS, MIN_LIKES_DS = 100, 3   # datasets com portugues entre os idiomas, de qualquer publicador: 100 downloads (30 dias) ou 3 curtidas
MIN_DOWNLOADS_MUNDO, MIN_LIKES_MUNDO = 100, 3   # datasets dos publicadores do mundo no mapa: 100 downloads (30 dias) ou 3 curtidas
LINGUAS_PT = ("pt", "pt-br", "por")
DOMINIOS = ("geral", "vestibular_educacao", "juridico", "saude", "codigo", "matematica", "extracao_classificacao", "cultura_lingua", "outros")
COLUNAS_DS = ["id", "publicador", "nome", "descricao", "idiomas", "pt_br", "tarefas", "licenca", "bytes", "faixa", "linhas_faixa", "downloads", "likes", "atualizado", "escopo", "benchmarks", "pt"]
RX_BR_TAG = re.compile(r"(^|[:_-])(pt-?br|brazil|brasil|brazilian|brasileir)", re.I)
RX_MD = [(re.compile(r"!\[[^\]]*\]\([^)]*\)"), " "), (re.compile(r"\[([^\]]*)\]\([^)]*\)"), r"\1"), (re.compile(r"<[^>]+>"), " "), (re.compile(r"https?://\S+"), " "),
         (re.compile(r"[#*_`>|]+"), " "), (re.compile(r"\s+"), " ")]


def faixa_bytes(b):
    if b is None:
        return None
    return "<1MB" if b < 1e6 else "1-100MB" if b < 1e8 else "100MB-1GB" if b < 1e9 else "1-10GB" if b < 1e10 else ">10GB"


def limpar_descricao(t, n=160):
    """Uma linha do cartao: primeira linha de texto corrido, sem marcacao, sem contato pessoal, ate n caracteres."""
    for linha in (t or "").replace("\t", " ").split("\n"):
        l = linha
        for rx, rep in RX_MD:
            l = rx.sub(rep, l)
        l = l.strip(" -:\u2026")
        if len(l) >= 30 and sum(c.isalpha() for c in l) > 0.6 * len(l) and not re.match(r"^(paper|code|dataset (card|summary|description)|table of contents|see the full)", l, re.I):
            l = sem_pii(l)
            return l if len(l) <= n else l[: n - 1].rsplit(" ", 1)[0] + "\u2026"
    return ""


def listar_ds(max_paginas=1, **params):
    q = [(k, v) for k, v in params.items()] + [("expand[]", x) for x in EXPAND_DS]
    return paginar(f"{API}/datasets?" + urllib.parse.urlencode(q), max_paginas)


def e_pt_ds(x):
    return any(t.lower() in {"language:" + l for l in LINGUAS_PT} for t in x.get("tags", []))


def registro_dataset(x, unidade_ds):
    """Registro de um dataset publico, so com metadados publicos da API; None se privado, fechado (gated) ou desabilitado."""
    if x.get("gated") or x.get("private") or x.get("disabled"):
        return None
    tags = x.get("tags", [])
    langs = []
    for t in tags:
        if t.lower().startswith("language:") and t[9:] not in langs:
            langs.append(t[9:])
    langs = sorted(langs, key=lambda l: (l.lower() not in LINGUAS_PT, l.lower()))[:8]
    b = x.get("mainSize")
    nome = x["id"].split("/", 1)[-1]
    return {"id": x["id"], "publicador": x["id"].split("/")[0], "nome": nome, "descricao": limpar_descricao(x.get("description")), "idiomas": langs,
            "pt_br": any(RX_BR_TAG.search(t) for t in tags if not t.startswith(("license:", "size_categories:", "format:", "library:", "region:"))) or RX_BR_TAG.search(nome) is not None and e_pt_ds(x),
            "pt": e_pt_ds(x), "tarefas": [t[16:] for t in tags if t.startswith("task_categories:")][:6], "licenca": next((t[8:] for t in tags if t.startswith("license:")), None),
            "tamanho_bytes": b if isinstance(b, int) and b > 0 else None, "faixa": faixa_bytes(b if isinstance(b, int) and b > 0 else None),
            "linhas_faixa": next((t[16:] for t in tags if t.startswith("size_categories:")), None), "downloads": x.get("downloads") or 0, "likes": x.get("likes") or 0,
            "atualizado": (x.get("lastModified") or "")[:10], "fontes": [{"rotulo": "Dataset no Hugging Face", "url": f"https://huggingface.co/datasets/{x['id']}", "acessado": HOJE}], "u": [unidade_ds]}


def carregar_benchmarks():
    pasta = os.path.join(RAIZ, "data", "entidades", "benchmark")
    saida = {}
    for nome in sorted(os.listdir(pasta)) if os.path.isdir(pasta) else []:
        e = carregar_json(os.path.join(pasta, nome)) if nome.endswith(".json") else None
        if isinstance(e, dict) and e.get("entidade") == "benchmark" and e.get("status") != "arquivado" and not e.get("exemplo") and e.get("id") and e["id"] not in EXCLUIR:
            saida[e["id"]] = e
    return saida


def carregar_datasets_existentes():
    d = carregar_json(os.path.join(RAIZ, "data", "datasets.json"), {}) or {}
    return {"datasets": d.get("datasets", []), "unidades": (d.get("meta") or {}).get("unidades", {})}


def _chk_ds(unid):
    return os.path.join(RAIZ, ".cache", "datasets", re.sub(r"[^A-Za-z0-9._-]", "_", unid) + ".json")


def _sig_ds(unid, bench):
    if unid.startswith("ds:bench:"):
        b = bench.get(unid[9:]) or {}
        return hashlib.sha1(json.dumps(sorted(b.get("datasets", [])), ensure_ascii=False).encode()).hexdigest()[:12]
    return ""


def unidades_ds(br_ids, mundo_ids, bench):
    """Unidades de coleta da camada de datasets: os do idioma, um por publicador do Brasil, um por publicador do mundo no mapa e um por benchmark."""
    return (["ds:pt"] + ["ds:pub:" + p for p in sorted(br_ids, key=str.lower)] + ["ds:mundo:" + p for p in sorted(set(mundo_ids) - set(br_ids), key=str.lower)]
            + ["ds:bench:" + b for b in sorted(bench)])


def situacao_ds(unid, exist_ds, bench, dias):
    e = exist_ds["unidades"].get(unid)
    if not e:
        return "novo"
    if e.get("sig", "") != _sig_ds(unid, bench):
        return "alterado"
    ida = idade_dias(e.get("em"))
    return "vencido" if ida is not None and ida > dias else "em dia"


def coletar_unidade_ds(unid, bench):
    """Coleta uma unidade da camada de datasets. Devolve {registros, ausentes, chamadas, incompleto}."""
    r0, f0 = estado["rede"], estado["falhas"]
    regs, ausentes = {}, []
    def add(x):
        r = registro_dataset(x, unid)
        if r:
            regs[r["id"].lower()] = r
    def paginar_limiar(params, min_dl, min_likes):
        for ordem, limiar in (("downloads", lambda x: (x.get("downloads") or 0) < min_dl), ("likes", lambda x: (x.get("likes") or 0) < min_likes)):
            url = f"{API}/datasets?" + urllib.parse.urlencode(params + [("sort", ordem), ("direction", -1), ("limit", 1000)] + [("expand[]", k) for k in EXPAND_DS])
            for _ in range(8):
                d, link = get(url)
                if not isinstance(d, list) or not d:
                    break
                for x in d:
                    if (x.get("downloads") or 0) >= min_dl or (x.get("likes") or 0) >= min_likes:
                        add(x)
                m = re.search(r'<([^>]+)>;\s*rel="next"', link or "")
                if limiar(d[-1]) or not m:
                    break
                url = m.group(1)
    if unid == "ds:pt":
        for lang in LINGUAS_PT:
            paginar_limiar([("filter", "language:" + lang)], MIN_DOWNLOADS_DS, MIN_LIKES_DS)
    elif unid.startswith("ds:mundo:"):
        paginar_limiar([("author", unid[9:])], MIN_DOWNLOADS_MUNDO, MIN_LIKES_MUNDO)
    elif unid.startswith("ds:pub:"):
        for x in listar_ds(max_paginas=6, author=unid[7:], limit=1000, sort="downloads", direction=-1):
            add(x)
    elif unid.startswith("ds:bench:"):
        for did in (bench.get(unid[9:]) or {}).get("datasets", []):
            pub, nome = did.split("/", 1)
            achou = [x for x in listar_ds(author=pub, search=nome, limit=100) if x["id"].lower() == did.lower()]
            if achou and registro_dataset(achou[0], unid):
                add(achou[0])
            else:
                ausentes.append(did)
    return {"v": 1, "unidade": unid, "coletado_em": HOJE, "registros": sorted(regs.values(), key=lambda r: r["id"].lower()), "ausentes": ausentes,
            "chamadas": estado["rede"] - r0, "incompleto": estado["falhas"] > f0}


def mesclar_ds(exist_ds, resultados, unidades_ativas, bench, remover_inativas):
    """Mescla os registros das unidades coletadas. Cada registro lembra de quais unidades veio (u)."""
    por_id = {r["id"].lower(): dict(r, u=list(r.get("u", []))) for r in exist_ds["datasets"]}
    unidades = dict(exist_ds["unidades"])
    refeitas = {r["unidade"] for r in resultados}
    saem = set(refeitas)
    if remover_inativas:
        saem |= {u for u in unidades if u not in unidades_ativas}
    for k, r in list(por_id.items()):
        r["u"] = [u for u in r["u"] if u not in saem]
        if not r["u"]:
            del por_id[k]
    for u in saem - refeitas:
        unidades.pop(u, None)
    for res in resultados:
        unidades[res["unidade"]] = {"em": res["coletado_em"], "sig": _sig_ds(res["unidade"], bench)}
        for r in res["registros"]:
            k = r["id"].lower()
            if k in por_id:
                por_id[k] = dict(r, u=sorted(set(por_id[k]["u"]) | {res["unidade"]}))
            else:
                por_id[k] = dict(r, u=[res["unidade"]])
    return list(por_id.values()), dict(sorted(unidades.items()))


def montar_camadas(raw, bench, br_ids, mundo_ids=()):
    """Aplica a regra de relevancia (SPEC 9.5) e deriva escopo (pais do publicador), idioma, benchmarks e contagens. Ordem estavel."""
    br = {b.lower() for b in br_ids}
    mundo = {b.lower() for b in mundo_ids}
    por_ds = collections.defaultdict(list)
    for bid, b in sorted(bench.items()):
        for d in b.get("datasets", []):
            por_ds[d.lower()].append(bid)
    mantidos = []
    for r in raw:
        k, em_bench, pub = r["id"].lower(), r["id"].lower() in por_ds, r["publicador"].lower()
        pt_ok = bool(r.get("pt")) and (r["downloads"] >= MIN_DOWNLOADS_DS or r["likes"] >= MIN_LIKES_DS)
        mundo_ok = pub in mundo and (r["downloads"] >= MIN_DOWNLOADS_MUNDO or r["likes"] >= MIN_LIKES_MUNDO)
        if pub in br:
            esc = "br"
        elif em_bench or pt_ok or mundo_ok:
            esc = "mundo"
            if not em_bench and not r["licenca"] and not r["descricao"]:
                continue   # reupload sem metadados minimos
        else:
            continue
        mantidos.append(dict(r, escopo=esc, benchmarks=por_ds.get(k, [])))
    vistos = {}
    for r in sorted(mantidos, key=lambda r: (-r["downloads"], r["id"].lower())):   # duplicata obvia: mesmo nome e mesmo tamanho fora do Brasil
        if r["escopo"] == "mundo" and not r["benchmarks"] and r["tamanho_bytes"]:
            chave = (r["nome"].lower(), r["tamanho_bytes"])
            if chave in vistos:
                r["_dup"] = True
            vistos.setdefault(chave, r["id"])
    final = [r for r in mantidos if not r.get("_dup")]
    final.sort(key=lambda r: (r["escopo"] != "br", -r["downloads"], r["id"].lower()))
    por_id = {r["id"].lower(): r for r in final}
    bs = []
    for bid, b in sorted(bench.items()):
        ds = [por_id[d.lower()] for d in b.get("datasets", []) if d.lower() in por_id]
        o = {k: b[k] for k in ("id", "nome", "sigla", "descricao", "dominio", "idiomas", "tarefas", "tipo", "datasets", "criador", "ano", "links", "fontes") if k in b}
        o.update(n_datasets=len(ds), tamanho_total_bytes=sum(d["tamanho_bytes"] or 0 for d in ds) or None, downloads_total=sum(d["downloads"] for d in ds))
        bs.append(o)
    foto = {"datasets": {"total": len(final), "por_escopo": {e: sum(1 for r in final if r["escopo"] == e) for e in ("br", "mundo")},
                         "pt": {"sim": sum(1 for r in final if r.get("pt")), "nao": sum(1 for r in final if not r.get("pt"))}, "pt_br": sum(1 for r in final if r["pt_br"]),
                         "por_downloads": {k: sum(1 for r in final if lo <= r["downloads"] < hi) for k, lo, hi in (("<100", 0, 100), ("100-999", 100, 1000), ("1000-9999", 1000, 10000), (">=10000", 10000, 10**12))},
                         "por_faixa": dict(sorted(collections.Counter(r["faixa"] or "desconhecido" for r in final).items())), "downloads_total": sum(r["downloads"] for r in final)},
            "benchmarks": {"total": len(bs), "por_dominio": dict(sorted(collections.Counter(d for b in bs for d in b["dominio"]).items())),
                           "por_tipo": dict(sorted(collections.Counter(b["tipo"] for b in bs).items()))}}
    return final, bs, foto


def portador_info(m):
    """Quem portou o modelo para a web: autor do build em destaque (ou do primeiro); papel: proprio | runtime | comunidade."""
    bs = m.get("builds") or []
    if not bs:
        return {}
    b = next((x for x in bs if x.get("destaque")), bs[0])
    papel = "proprio" if (b.get("proprio") or str(b.get("autor", "")).lower() == str(m.get("publicador", "")).lower()) else "runtime" if b.get("runtime_org") else "comunidade"
    return {"portado_por": b.get("autor"), "portado_papel": papel, "portado_url": b.get("url")}


def avatares_web():
    """Enderecos (nunca imagens) dos avatares publicos do Hugging Face; quem pediu para ocultar (data/avatares.json e ocultar_avatar nas entidades) fica de fora."""
    arq = carregar_json(os.path.join(RAIZ, "data", "avatares.json"), {}) or {}
    ocultar = {x.lower() for x in arq.get("ocultar", [])} | {k.lower() for k, e in carregar_entidades("publicador").items() if e.get("ocultar_avatar") is True}
    return {k: v for k, v in sorted((arq.get("avatares") or {}).items(), key=lambda kv: kv[0].lower()) if k.lower() not in ocultar}


def arquivos_web(meta, foto, pacote, ds, bs, foto_c, rel=None):
    """Arquivos de web/: data.js traz o necessario para a aba Modelos; datasets, benchmarks e os builds e fontes de cada modelo
    ficam em arquivos proprios, carregados sob demanda pela interface. window.MAPA_DADOS continua com as mesmas chaves depois de carregados."""
    dump = lambda o: json.dumps(o, ensure_ascii=False, separators=(",", ":"))
    leves, detalhes = [], {}
    for m in compactar_modelos(pacote["modelos"]):
        leves.append(dict({k: v for k, v in m.items() if k not in ("builds", "fontes")}, **portador_info(m)))
        detalhes[m["id"]] = {"builds": m["builds"], "fontes": m["fontes"]}
    partes = {"builds": "data-builds.js", "datasets": "data-datasets.js", "benchmarks": "data-benchmarks.js", "avatares": "data-avatares.js"}
    w = lambda nome: os.path.join("web", nome)
    extras = {w("data-builds.js"): "window.MAPA_DETALHES=" + dump(detalhes) + ";",
              w("data-datasets.js"): "window.MAPA_DADOS.datasets=" + dump(compactar_datasets(ds)) + ";",
              w("data-benchmarks.js"): "window.MAPA_DADOS.benchmarks=" + dump(bs) + ";",
              w("data-avatares.js"): "window.MAPA_AVATARES=" + dump(avatares_web()) + ";"}
    tamanhos = {nome: len(extras[w(arq)].encode("utf-8")) for nome, arq in partes.items()}   # bytes brutos: a interface mostra o progresso real
    nucleo = dict(meta=meta, foto=foto, **dict(pacote, modelos=leves), foto_camadas=foto_c, contrato_camadas=1, dicionario_maturidade=DICIONARIO_MATURIDADE, contrato_maturidade=1, partes=partes, partes_bytes=tamanhos)
    if rel is not None:   # relacoes (instituicoes, laboratorios, vinculos): parte pequena, fica no arquivo inicial
        nucleo.update(instituicoes=rel["instituicoes"], laboratorios=rel["laboratorios"], vinculos=compactar_vinculos(rel["vinculos"]), hierarquia=rel["hierarquia"], contrato_relacoes=1)
    return dict({w("data.js"): "window.MAPA_DADOS=" + dump(nucleo) + ";"}, **extras)


def compactar_datasets(final):
    linhas = [[r["id"], r["publicador"], r["nome"], r["descricao"], r["idiomas"], r["pt_br"], r["tarefas"], r["licenca"], r["tamanho_bytes"], r["faixa"], r["linhas_faixa"],
               r["downloads"], r["likes"], r["atualizado"], r["escopo"], r["benchmarks"], bool(r.get("pt"))] for r in final]
    return {"colunas": COLUNAS_DS, "linhas": linhas}


# ---------- maturidade do cartao (SPEC.md secao 9.7) ----------
REGRA_MATURIDADE = 1   # versao da regra de maturidade; mudou: os cartoes sao reclassificados (o cache guarda o texto classificado)
HF_RAIZ = os.environ.get("COLETOR_HF") or "https://huggingface.co"
MAT_NOMES = {"e": "experimental", "d": "documentado", "i": "indeterminado"}
SINAIS_MAT = ["cartao_padrao_hub", "placeholders_more_info", "cartao_trainer_sem_descricao", "cartao_vazio", "cartao_curto_de_checkpoint", "readme_indisponivel",
              "sem_licenca", "sem_base_model", "sem_idioma", "sem_datasets", "nome_de_checkpoint"]
_MAT_HUB = re.compile(r"model card of a .{0,6}transformers model that has been pushed on the Hub|This model card has been automatically generated", re.I)
_MAT_TRAINER = re.compile(r"generated automatically according to the information the Trainer had access to|generated from a Trainer|^- generated_from_trainer", re.I | re.M)
_MAT_NOME = re.compile(r"(checkpoint|[-_.]step[-_]?\d+|[-_]ckpt|[-_]epoch\d*|[-_]ep\d+|[-_]run\d+|[-_]fold\d+|[-_]tmp\b|[-_]test\b|[-_]v0\.0\.\d+)", re.I)
_MAT_CKPT = re.compile(r"\b(checkpoint|epoch\s*\d+\s*/\s*\d+|step\s*\d+|ckpt)\b", re.I)
_MAT_BOILER = [r"^\s*[-*] \*\*[^*]+\*\*.*$", r"Users \(both direct and downstream\) should be made aware of the risks, biases and limitations of the model\.?", r"for further recommendations\.?",
               r"Use the code below to get started with the model\.?", r"Carbon emissions can be estimated.*", r"This is the model card of a .{0,6}transformers model that has been pushed on the Hub\.?",
               r"This model card has been automatically generated\.?", r"\[More Information Needed\]", r"More information needed",
               r"This model is a fine-tuned version of \[[^\]]*\]\([^)]*\) on an unknown dataset\.?", r"This model is a fine-tuned version of .*? on (the|an) .{0,60}dataset\.?",
               r"It achieves the following results on the evaluation set:", r"The following hyperparameters were used during training:", r"^- [\w_ ./-]+: .*$", r"^#+ .*$",
               r"\*\*BibTeX:\*\*|\*\*APA:\*\*", r"\|.*\|", r"^:?-+:?[ |:-]*$"]


def _mat_yaml(t):
    m = re.match(r"---\n(.*?)\n---", t, re.S)
    return m.group(1) if m else ""


def _mat_proprio(t):
    c = re.sub(r"<!--.*?-->", "", re.sub(r"\A---\n.*?\n---\n", "", t, flags=re.S), flags=re.S)
    for r in _MAT_BOILER:
        c = re.sub(r, "", c, flags=re.M | re.I)
    return len(re.sub(r"[\s`*_>#|\-:.]+", " ", c).strip())


def maturidade(texto, nome=""):
    """Classifica o cartao (README) de um modelo: ('experimental'|'documentado'|'indeterminado', sinais). So olha o texto do cartao;
    nao julga o autor. Conservadora: so e experimental o cartao sem conteudo proprio (padrao do Hub, gerado por Trainer ou vazio) ou
    o cartao curto que se declara checkpoint."""
    if texto is None:
        return "indeterminado", ["readme_indisponivel"]
    y, p, s = _mat_yaml(texto), _mat_proprio(texto), []
    hub = bool(_MAT_HUB.search(texto))
    ph = len(re.findall(r"\[More Information Needed\]", texto)) >= 3
    tr = bool(_MAT_TRAINER.search(texto)) and len(re.findall(r"More information needed", texto, re.I)) >= 2
    corpo = re.sub(r"\A---\n.*?\n---\n", "", texto, flags=re.S)
    if hub:
        s.append("cartao_padrao_hub")
    if ph:
        s.append("placeholders_more_info")
    if tr:
        s.append("cartao_trainer_sem_descricao")
    vazio = p < 30 and not (hub or ph or tr)
    if vazio:
        s.append("cartao_vazio")
    ck = not (hub or ph or tr or vazio) and p < 300 and bool(_MAT_NOME.search(nome.split("/")[-1]) or _MAT_CKPT.search(corpo))
    if ck:
        s.append("cartao_curto_de_checkpoint")
    exp = ((hub or ph or tr) and p < 200) or vazio or ck
    fracos = []
    if not re.search(r"^license:", y, re.M):
        fracos.append("sem_licenca")
    if not re.search(r"^base_model:", y, re.M):
        fracos.append("sem_base_model")
    if not re.search(r"^(language|lang):", y, re.M):
        fracos.append("sem_idioma")
    if not re.search(r"^datasets:", y, re.M):
        fracos.append("sem_datasets")
    if _MAT_NOME.search(nome.split("/")[-1]) and "cartao_curto_de_checkpoint" not in s:
        fracos.append("nome_de_checkpoint")
    return ("experimental" if exp else "documentado"), s + fracos[:3]


def _ler_readme(rid):
    """README do modelo: (texto, codigo). codigo 200 ou o HTTP de erro; (None, 0) em falha de rede (nao e cacheada)."""
    url = f"{HF_RAIZ}/{rid}/raw/main/README.md"
    for tentativa in range(5):
        try:
            _esperar_limite()
            time.sleep(PAUSA)
            estado["rede"] += 1
            _janela.append(time.time())
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60) as r:
                return r.read(2_000_000).decode("utf8", "ignore"), 200
        except urllib.error.HTTPError as e:
            if e.code in (401, 403, 404, 410):
                return None, e.code
            time.sleep(8 * (tentativa + 1))
            _janela.clear()
        except Exception:
            time.sleep(4 * (tentativa + 1))
    return None, 0


def _chk_mat(rid):
    return os.path.join(RAIZ, ".cache", "maturidade", hashlib.sha1(rid.lower().encode()).hexdigest() + ".json")


def pendentes_maturidade(modelos, regra_gravada):
    return [m for m in modelos if not (m.get("maturidade") and regra_gravada == REGRA_MATURIDADE)]


def maturar(modelos, regra_gravada, progresso=True):
    """Preenche maturidade e sinais_maturidade. Cache por modelo (chave: data de atualizacao e versao da regra): so le o README quando precisa."""
    pend = pendentes_maturidade(modelos, regra_gravada)
    n, t0, lidos, falhas = len(pend), time.time(), 0, 0
    for i, m in enumerate(pend, 1):
        chk, c = _chk_mat(m["id"]), None
        if os.path.exists(chk):
            c = carregar_json(chk)
            if not (c and c.get("v") == REGRA_MATURIDADE and c.get("atualizado") == m.get("atualizado")):
                c = None
        if c is None:
            texto, cod = _ler_readme(m["id"])
            if cod == 0:
                falhas += 1
                m["maturidade"], m["sinais_maturidade"] = "indeterminado", ["readme_indisponivel"]
                continue
            lidos += 1
            mat, sin = maturidade(texto, m["id"])
            c = {"v": REGRA_MATURIDADE, "atualizado": m.get("atualizado"), "m": mat, "s": sin, "codigo": cod}
            _atomico(chk, json.dumps(c, ensure_ascii=False))
            if progresso and lidos % 50 == 0:
                resto = (time.time() - t0) / lidos * (n - i)
                log(f"[maturidade {i}/{n}] {lidos} cartoes lidos; restam ~{resto / 60:.1f} min")
        m["maturidade"], m["sinais_maturidade"] = c["m"], c["s"]
    return {"lidos": lidos, "falhas": falhas, "total": n}


def compactar_modelos(modelos):
    """Modelos para web/data.js: maturidade em codigo curto (e, d, i) e sinais como indices do dicionario."""
    inv = {v: k for k, v in MAT_NOMES.items()}
    saida = []
    for m in modelos:
        c = dict(m)
        c["maturidade"] = inv.get(m.get("maturidade"), "i")
        c["sinais_maturidade"] = [SINAIS_MAT.index(x) for x in m.get("sinais_maturidade", []) if x in SINAIS_MAT]
        saida.append(c)
    return saida


DICIONARIO_MATURIDADE = {"maturidade": MAT_NOMES, "sinais": SINAIS_MAT}


# ---------- relacoes: instituicoes, laboratorios, vinculos e hierarquia (SPEC.md secoes 4.10 a 4.12) ----------
def carregar_entidades(tipo):
    pasta = os.path.join(RAIZ, "data", "entidades", tipo)
    saida = {}
    for nome in sorted(os.listdir(pasta)) if os.path.isdir(pasta) else []:
        e = carregar_json(os.path.join(pasta, nome)) if nome.endswith(".json") else None
        if isinstance(e, dict) and e.get("entidade") == tipo and e.get("id") and e.get("status") != "arquivado" and not e.get("exemplo") and e["id"] not in EXCLUIR:
            saida[e["id"]] = e
    return saida


def _contagens(ms):
    return {"n_modelos": len(ms), "n_builds": {"nativo": sum(1 for m in ms if m["via"] == "nativo"), "gguf": sum(1 for m in ms if m["via"] == "gguf")},
            "por_familia_tarefa": {f: sum(1 for m in ms if m["familia_tarefa"] == f) for f in ("gerador", "codificador")}}


def _nomes_extra(e):
    """Campos opcionais da entidade: nome em portugues e apelidos (so entram nos dados quando existem)."""
    return {k: e[k] for k in ("nome_pt", "aliases") if e.get(k)}


def atribuir_origem(modelos, mapa, labs, insts, fonte_cred, excecoes=None):
    """Escopo Brasil do MODELO, por uma destas condicoes (SPEC 9.7), com a evidencia registrada em origem_motivo e origem_fonte:
      publicador   : o publicador esta no Brasil (regra B);
      desenvolvedor: credito de papel desenvolvedor de laboratorio ou instituicao com pais BR e fonte; ou excecao registrada por familia
                     (data/entidades/familia, campo excecao_escopo_br: lista fechada de modelos com a fonte publica);
      financiador  : credito de papel financiador de laboratorio ou instituicao com pais BR e fonte;
      foco_pt_br   : o cartao declara somente portugues, ou declara literalmente o portugues do Brasil como alvo.
    Parceiro e plataforma nao qualificam. O publicador continua sendo atributo proprio do modelo (hospedado por)."""
    def br(chave):
        tipo, _, resto = chave.partition(":")
        eid = resto.rsplit(":", 1)[0]
        if tipo == "inst":
            return insts.get(eid, {}).get("pais") == "BR"
        return insts.get((labs.get(eid) or {}).get("instituicao"), {}).get("pais") == "BR"
    for m in modelos:
        m.pop("origem_motivo", None), m.pop("origem_fonte", None)
        if mapa[m["publicador"]]["escopo"] == "br":
            m["escopo"], m["origem_motivo"] = "br", "publicador"
            continue
        m["escopo"] = "mundo"
        achou = None
        for papel in ("desenvolvedor", "financiador"):
            for c in m["creditos"]:
                if c.rsplit(":", 1)[1] == papel and br(c):
                    f = fonte_cred[(m["id"].lower(), c)]
                    achou = (papel, {"url": f["url"], "trecho": f["trecho"], "credito": c})
                    break
            if achou:
                break
        ex = (excecoes or {}).get(m["id"].lower())
        if not achou and ex:
            achou = ("desenvolvedor", {"url": ex["fonte"]["url"], "trecho": ex["fonte"]["trecho"], "familia": ex["familia"]})
        if not achou and m.get("dev_br"):
            d = m["dev_br"]
            achou = ("desenvolvedor", {"url": m["url"], "trecho": d["trecho"], "credito": "pub:" + d["publicador"]})
        if not achou and m.get("foco_pt_br"):
            f = m["foco_pt_br"]
            achou = ("foco_pt_br", {"url": f.get("url") or m["url"], "trecho": f["trecho"], "criterio": f["criterio"]})
        if achou:
            m["escopo"], m["origem_motivo"], m["origem_fonte"] = "br", achou[0], achou[1]
            m.pop("recorte_pt", None)


def montar_relacoes(pubs, modelos):
    """Deriva instituicoes, laboratorios, arestas e hierarquia das entidades curadas, e completa publicadores e modelos (in loco)."""
    insts, labs, curados = carregar_entidades("instituicao"), carregar_entidades("laboratorio"), carregar_entidades("publicador")
    mapa = {p["id"]: p for p in pubs}
    for m in modelos:
        m.setdefault("familia_tarefa", familia_tarefa(m.get("tarefa")))
        m["familia"] = familia(m["id"], ["base_model:" + m["base"]] if m.get("base") else [])   # a regra F vale para todos os modelos, sem consulta
    # arestas (ids com prefixo); so entre entidades que existem
    arestas = {}
    def aresta(de, para, tipo, fonte):
        arestas.setdefault((tipo, de, para), fonte)
    for pid, e in sorted(curados.items(), key=lambda kv: kv[0].lower()):
        if pid not in mapa:
            continue
        for v in e.get("vinculos") or []:
            al = v["alvo"]
            if (al["tipo"] == "laboratorio" and al["id"] in labs) or (al["tipo"] == "instituicao" and al["id"] in insts):
                aresta("pub:" + pid, ("lab:" if al["tipo"] == "laboratorio" else "inst:") + al["id"], v["relacao"], v["fonte"])
        for r in e.get("relacionados") or []:
            if r["publicador"] in mapa:
                a, b = sorted([pid, r["publicador"]], key=str.lower)
                aresta("pub:" + a, "pub:" + b, "relacionado", r["fonte"])
    for lid, l in labs.items():
        if l["instituicao"] in insts:
            aresta("lab:" + lid, "inst:" + l["instituicao"], "mesma_organizacao", l["vinculo_fonte"])
        for pc in l.get("parceiras") or []:
            if pc["instituicao"] in insts:
                aresta("lab:" + lid, "inst:" + pc["instituicao"], "mesma_organizacao", pc["fonte"])
    for iid, i in insts.items():
        if i.get("parte_de") in insts:
            aresta("inst:" + iid, "inst:" + i["parte_de"], "mesma_organizacao", i["fontes"][0])
    pub_lab, pub_inst, lab_pubs = collections.defaultdict(set), collections.defaultdict(set), collections.defaultdict(set)
    for (tipo, de, para), _ in arestas.items():
        if de.startswith("pub:") and para.startswith("lab:"):
            pub_lab[de[4:]].add(para[4:]); lab_pubs[para[4:]].add(de[4:])
        elif de.startswith("pub:") and para.startswith("inst:"):
            pub_inst[de[4:]].add(para[5:])
    pai = {iid: i["parte_de"] for iid, i in insts.items() if i.get("parte_de") in insts}
    def ancestrais(x):
        out = []
        while x in pai and pai[x] not in out:
            x = pai[x]; out.append(x)
        return out
    por_pub = collections.defaultdict(list)
    for m in modelos:
        por_pub[m["publicador"]].append(m)
    # relacionados e instituicoes de cada publicador
    rel_pub = collections.defaultdict(set)
    for (tipo, de, para), _ in arestas.items():
        if tipo == "relacionado":
            rel_pub[de[4:]].add(para[4:]); rel_pub[para[4:]].add(de[4:])
    for p in pubs:
        ls = set(pub_lab.get(p["id"], ()))
        iis = set(pub_inst.get(p["id"], ())) | {labs[l]["instituicao"] for l in ls if labs[l]["instituicao"] in insts}
        iis |= {a for x in list(iis) for a in ancestrais(x)}
        p["instituicoes"], p["labs"], p["relacionados"] = sorted(iis, key=str.lower), sorted(ls, key=str.lower), sorted(rel_pub.get(p["id"], ()), key=str.lower)
        if p["tipo"] != "pessoa":
            p.pop("membro_de", None)
        else:   # a interface diz "afiliado(a) a <instituicao>" em vez de "Instituicao" para uma pessoa
            p["afiliado_a"] = p["instituicoes"] if p["natureza"] in ("instituicao", "empresa") else []
            p["natureza_rotulo"] = "afiliada" if p["natureza"] in ("instituicao", "empresa") else p["natureza"]
    # creditos nos modelos: "inst:ID:papel" ou "lab:ID:papel" (papel: desenvolvedor, financiador, parceiro, plataforma)
    cred = collections.defaultdict(list)
    fonte_cred = {}
    for prefixo, ents in (("lab:", labs), ("inst:", insts)):
        for eid, e in ents.items():
            for c in e.get("modelos_creditados") or []:
                chave = f"{prefixo}{eid}:{c['papel']}"
                cred[c["modelo"].lower()].append(chave)
                fonte_cred[(c["modelo"].lower(), chave)] = c["fonte"]
    for m in modelos:
        m["creditos"] = sorted(set(cred.get(m["id"].lower(), ())))
    n_cred = collections.Counter(c.rsplit(":", 1)[0] for m in modelos for c in m["creditos"])
    n_cred_papel = collections.defaultdict(collections.Counter)
    for m in modelos:
        for c in m["creditos"]:
            ent, papel = c.rsplit(":", 1)
            n_cred_papel[ent][papel] += 1
    excecoes = {}   # excecao de escopo Brasil por familia: so os modelos listados no arquivo curado, com a fonte registrada
    for fid, f in sorted(carregar_entidades("familia").items()):
        ex = f.get("excecao_escopo_br")
        for mid in (ex or {}).get("modelos", []):
            excecoes[mid.lower()] = {"familia": fid, "fonte": ex["fontes"][0]}
    atribuir_origem(modelos, mapa, labs, insts, fonte_cred, excecoes)
    # hierarquia e contagens
    filhos = collections.defaultdict(list)
    for iid, pi in pai.items():
        filhos[pi].append(iid)
    def pubs_da_inst(iid, visto=()):
        r = set(pub_inst_rev.get(iid, ()))
        for l, lab in labs.items():
            if lab["instituicao"] == iid:
                r |= lab_pubs.get(l, set())
        for f in filhos.get(iid, []):
            if f not in visto:
                r |= pubs_da_inst(f, visto + (iid,))
        return {x for x in r if x in mapa}
    pub_inst_rev = collections.defaultdict(set)
    for pid, ii in pub_inst.items():
        for x in ii:
            pub_inst_rev[x].add(pid)
    L_inst, L_lab = [], []
    for iid, i in sorted(insts.items(), key=lambda kv: kv[0].lower()):
        ps = pubs_da_inst(iid)
        L_inst.append({"id": iid, "nome": i["nome"], **_nomes_extra(i), "sigla": i.get("sigla"), "pais": i["pais"], "regiao": i.get("regiao"), "tipo": i["tipo"], "parte_de": i.get("parte_de"),
                       "labs": sorted((l for l, lab in labs.items() if lab["instituicao"] == iid), key=str.lower), "publicadores": sorted(ps, key=str.lower),
                       **_contagens([m for pid in ps for m in por_pub.get(pid, [])]), "n_creditados": n_cred.get("inst:" + iid, 0), "n_creditados_papel": dict(sorted(n_cred_papel.get("inst:" + iid, {}).items())), "fontes": i["fontes"]})
    for lid, l in sorted(labs.items(), key=lambda kv: kv[0].lower()):
        ps = {x for x in lab_pubs.get(lid, set()) if x in mapa}
        L_lab.append({"id": lid, "nome": l["nome"], **_nomes_extra(l), "sigla": l.get("sigla"), "instituicao": l["instituicao"], "pais": (insts.get(l["instituicao"]) or {}).get("pais"), "parceiras": sorted((pc["instituicao"] for pc in l.get("parceiras") or []), key=str.lower),
                      "publicadores": sorted(ps, key=str.lower), **_contagens([m for pid in ps for m in por_pub.get(pid, [])]), "n_creditados": n_cred.get("lab:" + lid, 0), "n_creditados_papel": dict(sorted(n_cred_papel.get("lab:" + lid, {}).items())), "fontes": [l["vinculo_fonte"]] + list(l.get("fontes") or [])})
    folha = lambda pid: {"tipo": "publicador", "id": pid, "n_modelos": len(por_pub.get(pid, [])), "filhos": []}
    def no_inst(iid, visto=()):
        fs = [{"tipo": "laboratorio", "id": l, "pais": (insts.get(labs[l]["instituicao"]) or {}).get("pais"), "filhos": [folha(x) for x in sorted((y for y in lab_pubs.get(l, ()) if y in mapa), key=str.lower)]} for l in sorted((l for l, lab in labs.items() if lab["instituicao"] == iid), key=str.lower)]
        fs += [no_inst(f, visto + (iid,)) for f in sorted(filhos.get(iid, []), key=str.lower) if f not in visto]
        fs += [folha(x) for x in sorted((y for y in pub_inst_rev.get(iid, ()) if y in mapa), key=str.lower)]
        return {"tipo": "instituicao", "id": iid, "pais": insts[iid]["pais"], "filhos": fs}
    raizes = [no_inst(iid) for iid in sorted(insts, key=str.lower) if iid not in pai]
    ligados = {x for i in L_inst for x in i["publicadores"]}
    raizes += [folha(p["id"]) for p in sorted(pubs, key=lambda p: p["id"].lower()) if p["id"] not in ligados]
    V = [{"de": de, "para": para, "tipo": tipo, "fonte": f} for (tipo, de, para), f in sorted(arestas.items(), key=lambda kv: (kv[0][0], kv[0][1].lower(), kv[0][2].lower()))]
    return {"instituicoes": L_inst, "laboratorios": L_lab, "vinculos": V, "hierarquia": raizes, "assinatura": assinatura_relacoes(),
            "por_pais": dict(sorted(collections.Counter(i["pais"] for i in L_inst).items()))}


def assinatura_relacoes():
    """Resumo das entidades que alimentam as relacoes: se mudar, as relacoes sao refeitas (sem rede)."""
    ents = {t: carregar_entidades(t) for t in ("instituicao", "laboratorio", "publicador")}
    nucleo = [ents["instituicao"], ents["laboratorio"], {k: [e.get("vinculos"), e.get("relacionados")] for k, e in ents["publicador"].items()}]
    return hashlib.sha1(json.dumps(nucleo, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:16]


def compactar_vinculos(v):
    return {"colunas": ["de", "para", "tipo", "fonte"], "linhas": [[x["de"], x["para"], x["tipo"], x["fonte"]["url"]] for x in v]}


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
    ap.add_argument("--sem-datasets", action="store_true", help="nao coleta a camada de datasets e benchmarks")
    ap.add_argument("--sem-maturidade", action="store_true", help="nao le cartoes (README) para classificar a maturidade")
    ap.add_argument("--so-datasets", action="store_true", help="coleta so a camada de datasets e benchmarks")
    ap.add_argument("--global-pt", action="store_true", help="coleta o recorte 'Em portugues (global)': modelos de qualquer origem com portugues declarado (SPEC 9.8); incremental e retomavel")
    ap.add_argument("--max-candidatos", type=int, default=150)
    a = ap.parse_args()
    if not (a.novos or a.tudo or a.so or a.normalizar or a.global_pt):
        ap.error("escolha um modo: --novos, --tudo, --so a,b ou --global-pt")
    if a.global_pt:
        a.sem_datasets = True
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
    CURADOS_ID.update({k.lower(): k for k in carregar_curados()})
    if not a.normalizar:
        carregar_br_github(sorted(p["id"] for p in exist["pubs"].values() if p["escopo"] == "br"))
    if a.normalizar:
        for m in exist["modelos"]:
            m["builds"].sort(key=lambda b: (b["formato"], b["repo"]))
        pubs_n, mods_n, desc_n = mesclar(exist, [])
        rel = montar_relacoes(pubs_n, mods_n)
        meta, pacote, foto = montar(pubs_n, mods_n, desc_n)
        foto["regra_filtro"] = exist.get("regra")
        foto["instituicoes_por_pais"] = rel["por_pais"]
        print("normalizado; arquivos alterados:", gravar(meta, pacote, foto, None, rel) or "nenhum")
        return
    cands = candidatos_locais(seed, carregar_curados(), exist)
    modo = "--so" if a.so else "--novos" if a.novos else "--tudo" if a.tudo else "--global-pt"
    if a.global_pt:
        for k, c in descobrir_global_pt(cands, exist).items():
            cands[k] = c

    def selecionar():
        if a.global_pt and not (a.so or a.novos or a.tudo):
            return [(c, "global") for k, c in cands.items() if c.get("tipo") == "global_pt"]
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
    alvos = [] if a.so_datasets else selecionar()
    bench = carregar_benchmarks()
    exist_ds = carregar_datasets_existentes()
    br_ids = {c["id"] for c in cands.values() if c["curado"] and c["escopo"] == "br"} | {p["id"] for p in exist["pubs"].values() if p["escopo"] == "br"}
    mundo_ids = {p["id"] for p in exist["pubs"].values() if p["escopo"] == "mundo"}

    def alvos_ds(br, mundo=None):
        todas = unidades_ds(br, mundo_ids if mundo is None else mundo, bench)
        if a.sem_datasets:
            return [], todas
        if a.so:
            pedidos = {x.strip().lower() for x in a.so.split(",") if x.strip()}
            return [(u, "pedido") for u in todas if u.startswith("ds:pub:") and u[7:].lower() in pedidos], todas
        sit = [(u, situacao_ds(u, exist_ds, bench, a.dias)) for u in todas]
        return [(u, x) for u, x in sit if a.tudo or x != "em dia"], todas

    if a.dry_run:
        ncur = sum(1 for c, _ in alvos if c["curado"])
        print(f"{modo} --dry-run --previa (uma consulta de lista por publicador; nada gravado)" if a.previa else f"{modo} --dry-run (sem chamadas de rede, nada gravado)")
        print(f"modelos: candidatos {len(cands)} (curados: {sum(1 for c in cands.values() if c['curado'])}); a coletar: {len(alvos)}; em dia: {len(cands) - len(alvos)}")
        for c, s in sorted(alvos, key=lambda x: (x[1], x[0]["id"].lower())):
            e = c["curado"]
            print(f"  {s:9} {c['origem']:34} {(e['classe_pais'] + ' / ' + e['natureza']) if e else 'classificacao automatica':32} {c['id']}")
            if a.previa:
                xs, _, fora = modelos_do_publicador(c["id"])
                print(f"            previa: {len(xs)} modelo(s) no corte" + (f", {fora} acima de {MAX_B:g} B" if fora else "") + (": " + ", ".join(x["id"].split("/")[-1] for x in xs[:5]) + (" ..." if len(xs) > 5 else "") if xs else ""))
        ch, mi = estimativa(ncur, len(alvos) - ncur)
        mp = 0 if a.sem_maturidade else len(pendentes_maturidade(exist["modelos"], exist.get("regra_mat")))
        if mp:
            print(f"maturidade: {mp} cartao(oes) a ler (cerca de {mp * (PAUSA + 0.3) / 60:.0f} min); o cache por modelo permite retomar")
        ads, todas_ds = alvos_ds(br_ids)
        print(f"datasets: unidades {len(todas_ds)} (publicadores do Brasil: {len(br_ids)}, do mundo: {len(mundo_ids)}, benchmarks: {len(bench)}); a coletar: {len(ads)}")
        for u, x in ads:
            print(f"  {x:9} {u}")
        ch += sum(7 if u == "ds:pt" else 2 for u, _ in ads)
        print(f"estimativa: ~{ch} chamadas, ~{ch / 100:.0f} min na API anonima, mais o indice de builds (~50 chamadas) se o cache expirou. Nao inclui a descoberta por busca.")
        return
    ads, _ = alvos_ds(br_ids)
    rel_antes = ((carregar_json(os.path.join(RAIZ, "data", "relacoes.json"), {}) or {}).get("meta") or {}).get("assinatura")
    mat_pend = 0 if a.sem_maturidade else len(pendentes_maturidade(exist["modelos"], exist.get("regra_mat")))
    if not alvos and not ads and not mat_pend and rel_antes == assinatura_relacoes() and not any(p["id"] in EXCLUIR for p in exist["pubs"].values()):
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
        if a.tudo and not a.so and not a.sem_descoberta and not a.so_datasets:   # pessoas do mundo achadas por builds de navegador
            conhecidos = set(cands) | set(exist["pubs"]) | set(exist["desc"])
            for c in descobrir_independentes(ctx, conhecidos):
                reg = unidade(c, ctx)
                if not reg["incompleto"]:
                    _atomico(_chk(c["id"]), json.dumps(reg, ensure_ascii=False))
                    regs.append(reg)
    except KeyboardInterrupt:
        log(f"interrompido: {len(regs)} publicador(es) ja estao em .cache/publicadores/; rode o mesmo comando para continuar")
        sys.exit(130)

    remover = set()
    if a.tudo and not a.so_datasets:   # coleta completa: quem deixou de ser candidato (entidade arquivada ou apagada, saiu das listas) sai dos dados
        descoberta_rodou = not a.sem_descoberta
        for k, p in list(exist["pubs"].items()) + list(exist["desc"].items()):
            if k not in cands and p.get("origem_lista", p.get("origem")) != GLOBAL_PT_ORIGEM and (descoberta_rodou or p.get("origem_lista", p.get("origem")) != "busca na API"):
                remover.add(k)
    guardar_antes()
    pubs, modelos, desc = mesclar(exist, regs, remover)
    modelos, rel_conv = reatribuir_conversoes(pubs, modelos)
    _atomico(os.path.join(RAIZ, ".relatorios", f"atribuicao-{HOJE}.json"), json.dumps(rel_conv, ensure_ascii=False, indent=1))
    mat_info = {"lidos": 0, "falhas": 0, "total": 0}
    if not a.sem_maturidade:
        try:
            mat_info = maturar(modelos, exist.get("regra_mat"))
        except KeyboardInterrupt:
            log("interrompido na maturidade: os cartoes ja lidos estao em .cache/maturidade/; rode o mesmo comando para continuar")
            sys.exit(130)
        if mat_info["falhas"]:
            log(f"maturidade: {mat_info['falhas']} cartao(oes) sem resposta (falha de rede); ficam indeterminados e serao lidos na proxima coleta")
    rel = montar_relacoes(pubs, modelos)
    meta, pacote, foto = montar(pubs, modelos, desc)
    foto["instituicoes_por_pais"] = rel["por_pais"]
    if a.sem_maturidade or mat_info["falhas"]:
        foto["regra_maturidade"] = exist.get("regra_mat")
    if a.so or a.so_datasets or len(regs) < len(alvos):   # a regra so e marcada como aplicada quando todos os candidatos foram coletados
        foto["regra_filtro"] = exist.get("regra")

    # camada de datasets e benchmarks: unidades incrementais, com checkpoint
    br_ids = {c["id"] for c in cands.values() if c["curado"] and c["escopo"] == "br"} | {p["id"] for p in pubs if p["escopo"] == "br"}
    mundo_ids = {p["id"] for p in pubs if p["escopo"] == "mundo"}
    ads, todas_ds = alvos_ds(br_ids, mundo_ids)
    resultados, nd = [], len(ads)
    if ads:
        log(f"datasets: {nd} unidade(s) a coletar")
    try:
        for i, (u, sit) in enumerate(ads, 1):
            chk, res = _chk_ds(u), None
            if not a.fresh and os.path.exists(chk) and (time.time() - os.path.getmtime(chk)) < CACHE_DIAS * 86400:
                r = carregar_json(chk)
                if r and r.get("v") == 1 and not r.get("incompleto") and r.get("sig", "") == _sig_ds(u, bench):
                    res = r
                    log(f"[datasets {i}/{nd}] {u}: checkpoint de {r['coletado_em']} reaproveitado")
            if res is None:
                t0 = time.time()
                res = coletar_unidade_ds(u, bench)
                if res["incompleto"]:
                    log(f"[datasets {i}/{nd}] {u}: falha de rede durante a coleta; nao entra nos dados (rode de novo)")
                    continue
                res["sig"] = _sig_ds(u, bench)
                _atomico(chk, json.dumps(res, ensure_ascii=False))
                log(f"[datasets {i}/{nd}] {u} ({sit}): {len(res['registros'])} dataset(s)" + (f"; ausentes: {', '.join(res['ausentes'])}" if res["ausentes"] else "") + f"; {res['chamadas']} chamadas, {time.time() - t0:.0f}s")
                if os.environ.get("COLETOR_ESPERA_TESTE"):
                    time.sleep(float(os.environ["COLETOR_ESPERA_TESTE"]))
            resultados.append(res)
    except KeyboardInterrupt:
        log(f"interrompido: {len(resultados)} unidade(s) de datasets ja estao em .cache/datasets/; rode o mesmo comando para continuar")
        sys.exit(130)
    raw, unidades = mesclar_ds(exist_ds, resultados, set(todas_ds), bench, a.tudo and not a.sem_datasets)
    camadas = montar_camadas(raw, bench, br_ids, mundo_ids) + (unidades,)
    mudou = gravar(meta, pacote, foto, camadas, rel)
    log(f"coleta concluida em {(time.time() - t_ini) / 60:.1f} min; chamadas de rede: {estado['rede']}, do cache: {estado['cache']}")
    print(json.dumps({"coletados": len(regs), "unidades_datasets": len(resultados), "arquivos_alterados": mudou, **{k: foto[k] for k in ("brasil", "mundo")}, "camadas": camadas[2]}, ensure_ascii=False, indent=1))
    if mudou:
        try:
            import relatorio_coleta
            relatorio_coleta.gerar(RAIZ, None, chamadas=estado["rede"])
        except Exception as e:   # o relatorio nunca impede a coleta
            log(f"relatorio nao gerado: {e}")


if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    main()
