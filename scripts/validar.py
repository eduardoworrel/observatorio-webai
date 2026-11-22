#!/usr/bin/env python3
"""Validacao mecanica das contribuicoes (docs/SPEC.md, versao 1.0). Stdlib, deterministica, sem rede por padrao.

    python3 scripts/validar.py                 # data/entidades/** e data/remocoes.json
    python3 scripts/validar.py --exemplos      # inclui data/exemplos/** (devem ter "exemplo": true)
    python3 scripts/validar.py --rejeitados    # testa data/exemplos/rejeitados/*: cada um deve falhar com o codigo esperado
    python3 scripts/validar.py --links         # abre cada URL (rede; 404/410 = erro, bloqueio/timeout = aviso)
    python3 scripts/validar.py --trechos       # baixa a fonte e confere que cada trecho citado aparece nela (rede; so evidencias manuais)
    python3 scripts/validar.py --base origin/main   # confere os arquivos que o PR altera
    python3 scripts/validar.py arquivo.json ...     # so esses arquivos

Cada problema sai como  arquivo:linha:coluna: ERRO [CODIGO] mensagem  (e como anotacao no GitHub Actions).
Codigo de saida 1 se houver erro. O validador e deterministico: so regras fixas, sem modelo de linguagem.
Datas: VALIDAR_HOJE=AAAA-MM-DD fixa o "hoje" (testes).
"""
import datetime, json, os, re, subprocess, sys, time, urllib.error, urllib.parse, urllib.request

CONFIAVEL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAIZ = os.path.abspath(os.environ.get("VALIDAR_RAIZ") or CONFIAVEL)   # VALIDAR_RAIZ: copia do PR; schema e codigo vem sempre do ramo confiavel
SCHEMA_DIR = os.path.join(CONFIAVEL, "schema")
HOJE = datetime.date.fromisoformat(os.environ.get("VALIDAR_HOJE") or datetime.date.today().isoformat())
DIRS = {"publicador": "publicador", "laboratorio": "laboratorio", "pesquisador": "pesquisador", "familia": "familia", "benchmark": "benchmark", "instituicao": "instituicao"}
ISO = set("""AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ
DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP
KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM
PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ
UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW""".split())
DERIVADOS = {"n_modelos_hf", "n_membros", "n_modelos_mapeados", "modelos_fora_do_corte", "escopo", "origem_lista", "builds", "formatos_proprios", "formatos_navegador",
             "gguf", "gguf_wllama", "gguf_gb", "gguf_origem", "gguf_grande", "via", "gb_navegador", "conversao_de", "downloads", "atualizado", "idioma_pt", "base",
             "publicadores", "labs", "instituicoes", "membro_de", "n_datasets", "tamanho_total_bytes", "downloads_total", "tarefa", "tarefa_inferida", "regra_tarefa", "constelacao", "arestas", "modelos_total"}
PROIBIDOS = {"email", "e-mail", "telefone", "celular", "endereco", "endereço", "nascimento", "data_nascimento", "foto", "imagem", "avatar", "cpf", "rg", "genero", "gênero",
             "raca", "raça", "etnia", "religiao", "religião", "orientacao_sexual", "nacionalidade", "idade", "estado_civil", "redes", "instagram", "facebook", "whatsapp"}
REDES_PESSOAIS = ("facebook.com", "fb.com", "instagram.com", "tiktok.com", "snapchat.com", "wa.me", "whatsapp.com", "t.me", "telegram.me", "x.com", "twitter.com",
                  "linkedin.com", "threads.net", "vk.com", "reddit.com", "youtube.com", "youtu.be", "medium.com")
HOSTS_INST = re.compile(r"(\.edu(\.[a-z]{2})?|\.gov\.br|\.ac\.[a-z]{2}|\.edu\.br|\.org\.br)$")
PAD = {
    "EMAIL": re.compile(r"[\w.+-]+@[\w-]+(\.[\w-]+)+"),
    "TELEFONE": re.compile(r"(\+\d{1,3}[\s.-]?)?\(?\d{2}\)?[\s.-]\d{4,5}[\s.-]\d{4}\b|\+55\s?\d{2}\s?\d{4,5}|\+\d{1,3}[\s.-]\d{2,4}[\s.-]\d{3,4}[\s.-]\d{3,4}"),
    "CPF": re.compile(r"\b\d{3}\.\d{3}\.\d{3}-\d{2}\b"),
    "ENDERECO": re.compile(r"\b(CEP\s*:?\s*\d{5}-?\d{3}|\b\d{5}-\d{3}\b|Rua\s+[A-ZÀ-Ú]\w+|Avenida\s+[A-ZÀ-Ú]\w+|Av\.\s+[A-ZÀ-Ú]\w+|Street\b|apartamento\s+\d+|apto\.?\s*\d+)"),
    "NASCIMENTO": re.compile(r"nasc(eu|imento|ida|ido)\b|data de nasc|born (on|in)\b|date of birth|birthday|anivers[aá]rio", re.I),
}
SENSIVEL = re.compile(r"\b(religi[aã]o|religious|orienta[cç][aã]o sexual|sexual orientation|etnia|ethnicity|ra[cç]a|race\b|filia[cç][aã]o partid|political party|"
                      r"deficiência|disability|sindicat|g[eê]nero|gender|nacionalidade|nationality|estado civil|marital)\b", re.I)
IMG = re.compile(r"\.(jpe?g|png|gif|webp|avif|bmp|svg)(\?|$)", re.I)
TIPOS_BR = {"perfil_oficial", "site_institucional", "pagina_pessoa", "cartao_modelo", "artigo", "repositorio"}
TIPOS_VINCULO = {"perfil_oficial", "site_institucional", "pagina_pessoa"}

# ---------- localizacao de linha/coluna em JSON ----------
class Loc:
    def __init__(self, texto):
        self.t, self.pos = texto, {}
    def lc(self, i):
        return self.t.count("\n", 0, i) + 1, i - (self.t.rfind("\n", 0, i) + 1) + 1
    def ws(self, i):
        while i < len(self.t) and self.t[i] in " \t\r\n": i += 1
        return i
    def val(self, i, path):
        i = self.ws(i); self.pos[path] = self.lc(i); c = self.t[i]
        if c == "{":
            i = self.ws(i + 1)
            if self.t[i] == "}": return i + 1
            while True:
                i = self.ws(i); j = self.str(i); k = json.loads(self.t[i:j]); self.pos[path + (k,)] = self.lc(i)
                i = self.ws(j) + 1; i = self.val(i, path + (k,)); i = self.ws(i)
                if self.t[i] == ",": i += 1; continue
                return i + 1
        if c == "[":
            i = self.ws(i + 1)
            if self.t[i] == "]": return i + 1
            n = 0
            while True:
                i = self.val(i, path + (n,)); n += 1; i = self.ws(i)
                if self.t[i] == ",": i += 1; continue
                return i + 1
        if c == '"': return self.str(i)
        m = re.compile(r"-?\d+(\.\d+)?([eE][+-]?\d+)?|true|false|null").match(self.t, i)
        return m.end()
    def str(self, i):
        i += 1
        while self.t[i] != '"': i += 2 if self.t[i] == "\\" else 1
        return i + 1
    def where(self, path):
        while path and path not in self.pos: path = path[:-1]
        return self.pos.get(path, (1, 1))

# ---------- relatorio ----------
ERROS, AVISOS = [], []
def rel(f): return os.path.relpath(f, RAIZ)
def emit(arq, loc, path, nivel, cod, msg, dica=""):
    l, c = loc.where(path) if loc else (1, 1)
    (ERROS if nivel == "ERRO" else AVISOS).append(dict(arquivo=rel(arq), linha=l, coluna=c, nivel=nivel, codigo=cod, mensagem=msg, dica=dica, campo=".".join(map(str, path))))

# ---------- mini JSON Schema (subconjunto: o que os schemas usam) ----------
_docs = {}
def doc(nome):
    if nome not in _docs: _docs[nome] = json.load(open(os.path.join(SCHEMA_DIR, nome)))
    return _docs[nome]
def resolve(ref, atual):
    arq, _, frag = ref.partition("#"); d = doc(arq) if arq else atual; n = d
    for p in [x for x in frag.split("/") if x]: n = n[p]
    return n, d
TIPOS = {"object": dict, "array": list, "string": str, "boolean": bool, "integer": int, "number": (int, float)}
def tipo_ok(v, t):
    if t in ("integer", "number") and isinstance(v, bool): return False
    if t == "integer" and isinstance(v, float): return v.is_integer()
    return isinstance(v, TIPOS[t])
def schema_check(v, sc, d, path, out):
    if "$ref" in sc:
        sc2, d2 = resolve(sc["$ref"], d); return schema_check(v, sc2, d2, path, out)
    if "type" in sc and not tipo_ok(v, sc["type"]):
        out.append((path, "TIPO", f"esperado {sc['type']}, veio {type(v).__name__}", "")); return
    if "const" in sc and v != sc["const"]: out.append((path, "VALOR", f"deve ser {sc['const']!r}", "A versao da spec e 1.0.")); return
    if "enum" in sc and v not in sc["enum"]: out.append((path, "VALOR", f"{v!r} nao e permitido", "Valores: " + ", ".join(map(str, sc["enum"])))); return
    if isinstance(v, str):
        if "minLength" in sc and len(v) < sc["minLength"]: out.append((path, "LIMITE", f"texto curto demais (minimo {sc['minLength']})", ""))
        if "maxLength" in sc and len(v) > sc["maxLength"]: out.append((path, "LIMITE", f"texto longo demais ({len(v)} > {sc['maxLength']})", "Resuma; citacoes sao curtas."))
        if "pattern" in sc and not re.search(sc["pattern"], v):
            out.append((path, "FORMATO", f"{v[:80]!r} fora do formato", sc.get("description") or "Veja o padrao em schema/ (" + sc["pattern"] + ")."))
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        if "minimum" in sc and v < sc["minimum"]: out.append((path, "LIMITE", f"minimo {sc['minimum']}", ""))
        if "maximum" in sc and v > sc["maximum"]: out.append((path, "LIMITE", f"maximo {sc['maximum']}", ""))
        if "exclusiveMinimum" in sc and v <= sc["exclusiveMinimum"]: out.append((path, "LIMITE", f"deve ser maior que {sc['exclusiveMinimum']}", ""))
    if isinstance(v, list):
        if "minItems" in sc and len(v) < sc["minItems"]:
            cod = "FONTE_FALTA" if path and path[-1] == "fontes" else "MIN_ITENS"
            out.append((path, cod, f"precisa de pelo menos {sc['minItems']} item(ns)", "Cada entidade precisa de ao menos 1 fonte (url, tipo, acessado)." if cod == "FONTE_FALTA" else ""))
        if "maxItems" in sc and len(v) > sc["maxItems"]: out.append((path, "MAX_ITENS", f"no maximo {sc['maxItems']} itens", ""))
        if "items" in sc:
            for i, x in enumerate(v): schema_check(x, sc["items"], d, path + (i,), out)
    if isinstance(v, dict):
        if "minProperties" in sc and len(v) < sc["minProperties"]: out.append((path, "MIN_ITENS", "objeto vazio", ""))
        for r in sc.get("required", []):
            if r not in v:
                cod = "FONTE_FALTA" if r == "fontes" else "CAMPO_FALTA"
                out.append((path, cod, f"campo obrigatorio ausente: {r}", "Cada entidade precisa de ao menos 1 fonte." if r == "fontes" else "Veja docs/SPEC.md, secao do tipo."))
        props = sc.get("properties", {})
        for k, x in v.items():
            if k in props: schema_check(x, props[k], d, path + (k,), out)
            elif sc.get("additionalProperties") is False:
                if k in DERIVADOS: out.append((path + (k,), "CAMPO_DERIVADO", f"'{k}' e derivado: o coletor calcula, contribuicao nao edita", "Remova o campo."))
                elif k.lower() in PROIBIDOS: out.append((path + (k,), "CAMPO_PROIBIDO", f"'{k}': dado pessoal ou sensivel nao e aceito", "Veja docs/SPEC.md, secao 7 (privacidade)."))
                else: out.append((path + (k,), "CAMPO_DESCONHECIDO", f"campo desconhecido: {k}", "Campo novo = proposta de spec (issue 'Propor campo')."))

# ---------- regras semanticas ----------
def strings(v, path=()):
    if isinstance(v, str): yield path, v
    elif isinstance(v, dict):
        for k, x in v.items(): yield from strings(x, path + (k,))
    elif isinstance(v, list):
        for i, x in enumerate(v): yield from strings(x, path + (i,))
def urls(v, path=()):
    for p, s in strings(v, path):
        if s.startswith(("http://", "https://", "mailto:", "tel:")) and p[-1] in ("url", "oficial", "instituicao", "hf", "github", "repositorio", "orcid", "scholar", "lattes", "artigo", "pagina", "site", "leaderboard", "codigo"):
            yield p, s
        elif s.startswith(("mailto:", "tel:")): yield p, s
def fontes_de(o):
    """(caminho, objeto) de toda fonte/evidencia da entidade."""
    for p, v in walk(o):
        if isinstance(v, dict) and "acessado" in v and "url" in v: yield p, v
def walk(v, path=()):
    yield path, v
    if isinstance(v, dict):
        for k, x in v.items(): yield from walk(x, path + (k,))
    elif isinstance(v, list):
        for i, x in enumerate(v): yield from walk(x, path + (i,))
def host(u): return (urllib.parse.urlparse(u).hostname or "").lower()

def semantica(arq, o, loc, ctx, rejeitado=False):
    E = lambda p, c, m, d="": emit(arq, loc, tuple(p), "ERRO", c, m, d)
    def creditos(o):
        for i, m in enumerate(o.get("modelos_creditados") or []):
            if m.get("modelo") not in ctx["modelos"]: E(("modelos_creditados", i, "modelo"), "REF_INEXISTENTE", f"modelo {m.get('modelo')!r} nao existe nos dados (o modelo e derivado pelo coletor; nao se cadastra)", "")
            if (m.get("fonte") or {}).get("tipo") not in TIPOS_VINCULO | {"cartao_modelo", "artigo", "repositorio", None}: E(("modelos_creditados", i, "fonte", "tipo"), "VINCULO_FONTE", "credito: cite o cartao do modelo, o artigo ou a pagina oficial", "")
    W = lambda p, c, m, d="": emit(arq, loc, tuple(p), "AVISO", c, m, d)
    ent = o.get("entidade")
    # privacidade: padroes em todo texto (exceto urls, conferidas a parte)
    for p, s in strings(o):
        if p[-1] in ("url", "oficial", "instituicao", "hf", "github", "repositorio", "orcid", "scholar", "lattes", "artigo", "site", "leaderboard", "codigo"): continue
        for cod, rx in PAD.items():
            if rx.search(s): E(p, cod, f"{cod.lower()} detectado em texto: dado pessoal nao entra", "Use so informacao profissional publica; cite a pagina em vez de copiar o contato.")
        m = SENSIVEL.search(s)
        if m:
            W(p, "SENSIVEL", f"palavra de atributo sensivel ({m.group(0)!r}): nao se infere nem registra", "Se for apenas tema de pesquisa, ignore este aviso; o revisor confere.")
    # urls
    vistos = set()
    for p, u in urls(o):
        pr = urllib.parse.urlparse(u); h = (pr.hostname or "").lower()
        if pr.scheme != "https": E(p, "URL", f"URL deve ser https (veio {pr.scheme or 'vazio'}:)", "mailto:, tel: e http nao sao aceitos.")
        elif "." not in h or pr.username or " " in u: E(p, "URL", "URL mal formada", "Use o endereco completo da pagina, sem usuario@.")
        if any(h == r or h.endswith("." + r) for r in REDES_PESSOAIS): E(p, "REDE_PESSOAL", f"{h}: rede social pessoal nao e fonte nem link aceito", "Use pagina institucional, ORCID, Google Scholar, GitHub ou Hugging Face.")
        if ent in ("pesquisador", "publicador") and IMG.search(pr.path or ""): E(p, "FOTO", "link para imagem de pessoa: fotos nao sao aceitas", "Nao inclua fotos.")
        if re.search(r"[?&](q|query|search|s)=", u): W(p, "URL_BUSCA", "parece resultado de busca, nao a pagina", "Cite a pagina que afirma o fato.")
    for p, f in fontes_de(o):
        try:
            d = datetime.date.fromisoformat(f["acessado"])
        except (ValueError, TypeError):
            continue
        if d > HOJE: E(p + ("acessado",), "DATA_FUTURA", f"data de acesso no futuro ({f['acessado']})", "Use o dia em que voce abriu a pagina.")
        idade = (HOJE - d).days
        if idade > 365: E(p + ("acessado",), "FONTE_VELHA", f"fonte lida ha {idade} dias", "Abra de novo, confirme e atualize 'acessado'.")
        elif idade > 180: W(p + ("acessado",), "FONTE_VELHA", f"fonte lida ha {idade} dias", "Reabra e atualize a data.")
    fs = o.get("fontes") or []
    us = [f.get("url") for f in fs if isinstance(f, dict)]
    if len(us) != len(set(us)): W(("fontes",), "FONTE_REPETIDA", "a mesma URL aparece duas vezes em fontes", "")
    # exemplo
    ex = o.get("exemplo") is True
    if not rejeitado:
        if "exemplos" in rel(arq).split(os.sep) and not ex: E(("exemplo",), "EXEMPLO_MARCA", "arquivo em data/exemplos precisa de \"exemplo\": true", "")
        if "exemplos" not in rel(arq).split(os.sep) and ex: E(("exemplo",), "EXEMPLO_MARCA", "\"exemplo\": true so vale em data/exemplos", "Exemplos nao entram nos dados oficiais.")
    # arquivamento
    if (o.get("status") == "arquivado") != ("arquivo" in o): E(("arquivo",), "ARQUIVO", "status 'arquivado' exige o objeto 'arquivo' (em, motivo), e so ele", "")
    # pais
    def pais(p, v):
        if v not in ISO: E(p, "PAIS_INVALIDO", f"{v!r} nao esta na ISO 3166-1 alfa-2", "Exemplos: BR, PT, US.")
    if isinstance(o.get("pais"), str): pais(("pais",), o["pais"])
    # identidade x arquivo
    if not rejeitado and isinstance(o.get("id"), str):
        stem = rel(arq)[:-5].split(os.sep)
        if ent in DIRS and stem[-1:] != [o["id"]]:
            E(("id",), "ID_ARQUIVO", f"o caminho do arquivo nao bate com o id {o['id']!r}", "Nome do arquivo = id.")
        chave = (ent, o["id"].lower(), "exemplos" in stem)
        if chave in ctx["ids"]: E(("id",), "ID_DUPLICADO", f"id repetido (sem diferenciar maiusculas): {o['id']}", f"Ja existe em {ctx['ids'][chave]}.")
        else: ctx["ids"][chave] = rel(arq)
        import hashlib
        if hashlib.sha256(o["id"].lower().encode()).hexdigest() in ctx["removidos"]: E(("id",), "REMOVIDO", "esta entidade foi removida a pedido do titular e nao pode voltar", "Fale com o mantenedor.")
    # classificacao (publicador)
    if ent == "publicador":
        cp, nat, tp = o.get("classe_pais"), o.get("natureza"), o.get("tipo")
        ep, en = o.get("evidencia_pais"), o.get("evidencia_natureza")
        if cp == "br_evidencia":
            if o.get("pais") != "BR": E(("pais",), "BR_REGRA", "Brasil (evidencia) exige pais = BR", "")
            if not ep: E(("evidencia_pais",), "BR_REGRA", "Brasil (evidencia) exige evidencia_pais (url, tipo, trecho, acessado)", "Local ou afiliacao declarados em pagina publica; nunca o idioma, o nome ou a foto.")
            elif ep.get("tipo") not in TIPOS_BR: E(("evidencia_pais", "tipo"), "BR_REGRA", "tipo de evidencia nao aceito para pais", "")
            elif re.search(r"portugu[eê]s|portuguese|idioma|language", ep.get("trecho", ""), re.I) and not re.search(r"brasil|brazil|\.br\b|UF[A-Z]{1,3}|USP|UNESP|UNICAMP", ep.get("trecho", ""), re.I):
                E(("evidencia_pais", "trecho"), "BR_REGRA", "usar portugues nao e evidencia de Brasil", "Cite local ou afiliacao declarados.")
        elif cp == "fora_br":
            if o.get("pais") == "BR": E(("pais",), "BR_REGRA", "fora_br com pais BR", "")
        elif cp == "nao_classificado":
            if o.get("pais") or ep: E(("classe_pais",), "NAO_CLASSIFICADO", "nao_classificado nao carrega pais nem evidencia_pais", "Sem evidencia, nao se adivinha: deixe nao_classificado.")
        if nat != "nao_classificada":
            if not en: E(("evidencia_natureza",), "NATUREZA_SEM_EVIDENCIA", f"natureza '{nat}' exige evidencia_natureza", "")
            elif en.get("classe") != nat: E(("evidencia_natureza", "classe"), "NATUREZA_INCOERENTE", f"classe {en.get('classe')!r} diferente de natureza {nat!r}", "")
            elif nat == "independente":
                if tp not in ("pessoa", "grupo"): E(("natureza",), "INDEPENDENTE", "independente: pessoa ou grupo pequeno", "")
                if en.get("tipo") not in ("perfil_oficial", "pagina_pessoa", "repositorio", "cartao_modelo"): E(("evidencia_natureza", "tipo"), "INDEPENDENTE", "independente: cite o perfil ou a pagina da propria pessoa/grupo", "")
                for k, u in (o.get("links") or {}).items():
                    if HOSTS_INST.search(host(u)) or k == "instituicao": E(("links", k), "INDEPENDENTE", f"link institucional ({host(u)}) em publicador 'independente'", "Se ha vinculo declarado, a natureza e 'instituicao' ou 'empresa'.")
            elif nat == "instituicao" and en.get("tipo") not in TIPOS_VINCULO | {"cartao_modelo"}: E(("evidencia_natureza", "tipo"), "NATUREZA_SEM_EVIDENCIA", "instituicao: cite pagina institucional ou perfil", "")
        if tp == "pessoa" and "origem_cadastro" not in o: E(("origem_cadastro",), "CAMPO_FALTA", "publicador pessoa exige origem_cadastro (autoinscricao, terceiro, coletor)", "")
    if ent == "publicador":
        tp = o.get("tipo")
        vs = o.get("vinculos") or []
        if o.get("natureza") == "independente" and (vs or o.get("relacionados")): E(("natureza",), "INDEPENDENTE", "independente nao tem vinculo declarado: com vinculos, use a natureza que a fonte sustenta ou nao_classificada", "")
        for i, v in enumerate(vs):
            al = v.get("alvo") or {}
            if al.get("tipo") == "laboratorio" and al.get("id") not in ctx["labs"]: E(("vinculos", i, "alvo", "id"), "REF_INEXISTENTE", f"laboratorio {al.get('id')!r} nao existe", "")
            if al.get("tipo") == "instituicao" and al.get("id") not in ctx["insts"]: E(("vinculos", i, "alvo", "id"), "REF_INEXISTENTE", f"instituicao {al.get('id')!r} nao existe", "")
            fp = (v.get("fonte") or {}).get("tipo")
            if tp == "pessoa":
                if v.get("relacao") != "pesquisador": E(("vinculos", i, "relacao"), "PESSOA_RELACAO", "pessoa so tem a relacao 'pesquisador' (vinculo profissional declarado)", "Conta oficial, membro e projeto sao relacoes de grupos.")
                if fp not in TIPOS_VINCULO: E(("vinculos", i, "fonte", "tipo"), "VINCULO_FONTE", "vinculo de pessoa: so perfil profissional publico, pagina institucional ou pagina da propria pessoa", "")
                if o.get("origem_cadastro") != "autoinscricao" and fp not in ("site_institucional", "pagina_pessoa"): E(("vinculos", i, "fonte", "tipo"), "TERCEIRO_SEM_FONTE", "vinculo de pessoa cadastrado por terceiro exige pagina institucional que a liste; sem isso, so por autoinscricao", "")
            elif v.get("relacao") == "pesquisador": E(("vinculos", i, "relacao"), "PESSOA_RELACAO", "'pesquisador' e a relacao de um publicador do tipo pessoa", "")
            elif fp not in TIPOS_VINCULO | {"cartao_modelo", "repositorio", "artigo"}: E(("vinculos", i, "fonte", "tipo"), "VINCULO_FONTE", "vinculo: cite pagina institucional, perfil oficial, cartao de modelo ou artigo que declare a relacao", "")
        for i, r in enumerate(o.get("relacionados") or []):
            if r.get("publicador") == o.get("id"): E(("relacionados", i, "publicador"), "VINCULO_AUTO", "o publicador nao e relacionado a si mesmo", "")
            elif r.get("publicador") not in ctx["pubs"]: E(("relacionados", i, "publicador"), "REF_INEXISTENTE", f"publicador {r.get('publicador')!r} nao existe", "")
            elif tp == "pessoa" and ctx["pubs_tipo"].get(r.get("publicador")) == "pessoa": E(("relacionados", i, "publicador"), "PESSOA_RELACAO", "nao se liga pessoa a pessoa: use o vinculo com laboratorio ou instituicao", "")
    if ent == "laboratorio":
        if o.get("instituicao") and o["instituicao"] not in ctx["insts"]: E(("instituicao",), "REF_INEXISTENTE", f"instituicao {o['instituicao']!r} nao existe", "Cadastre a instituicao no mesmo PR (data/entidades/instituicao/) ou use um id existente.")
        ft = o.get("vinculo_fonte") or {}
        if ft.get("tipo") not in TIPOS_VINCULO | {"cartao_modelo", None}: E(("vinculo_fonte", "tipo"), "VINCULO_FONTE", "vinculo com a instituicao: cite pagina institucional, perfil oficial ou cartao de modelo", "")
        for i, pc in enumerate(o.get("parceiras") or []):
            if pc.get("instituicao") not in ctx["insts"]: E(("parceiras", i, "instituicao"), "REF_INEXISTENTE", f"instituicao {pc.get('instituicao')!r} nao existe", "")
            elif pc.get("instituicao") == o.get("instituicao"): E(("parceiras", i, "instituicao"), "VINCULO_AUTO", "a instituicao principal nao e parceira de si mesma", "")
            if (pc.get("fonte") or {}).get("tipo") not in TIPOS_VINCULO | {None}: E(("parceiras", i, "fonte", "tipo"), "VINCULO_FONTE", "parceria: cite pagina institucional ou perfil oficial", "")
        creditos(o)
    if ent == "instituicao":
        if isinstance(o.get("pais"), str): pais(("pais",), o["pais"])
        pai = o.get("parte_de")
        if pai:
            if pai == o.get("id"): E(("parte_de",), "VINCULO_AUTO", "a instituicao nao e parte de si mesma", "")
            elif pai not in ctx["insts"]: E(("parte_de",), "REF_INEXISTENTE", f"instituicao {pai!r} nao existe", "")
            else:
                visto, atual = {o.get("id")}, pai
                while atual:
                    if atual in visto: E(("parte_de",), "VINCULO_CICLO", "ciclo em parte_de: a hierarquia de instituicoes nao pode voltar a si mesma", ""); break
                    visto.add(atual); atual = ctx["inst_pai"].get(atual)
        creditos(o)
    if ent == "pesquisador":
        for i, a in enumerate(o.get("afiliacoes") or []):
            if isinstance(a.get("pais"), str): pais(("afiliacoes", i, "pais"), a["pais"])
            if a.get("laboratorio") and a["laboratorio"] not in ctx["labs"]: E(("afiliacoes", i, "laboratorio"), "REF_INEXISTENTE", f"laboratorio {a['laboratorio']!r} nao existe", "")
            if isinstance(a.get("fonte"), dict) and a["fonte"].get("tipo") not in TIPOS_VINCULO: E(("afiliacoes", i, "fonte", "tipo"), "VINCULO_FONTE", "afiliacao: cite a pagina institucional, o perfil oficial ou a pagina da pessoa (artigo sozinho nao prova vinculo atual)", "")
        for i, m in enumerate(o.get("modelos") or []):
            if m.get("modelo") not in ctx["modelos"]: E(("modelos", i, "modelo"), "REF_INEXISTENTE", f"modelo {m.get('modelo')!r} nao existe nos dados", "")
        if o.get("origem_cadastro") == "terceiro" and not any((a.get("fonte") or {}).get("tipo") in TIPOS_VINCULO for a in o.get("afiliacoes") or []):
            E(("origem_cadastro",), "TERCEIRO_SEM_FONTE", "cadastro por terceiro exige pagina institucional ou perfil publico que liste a pessoa", "")
        if ent == "pesquisador" and o.get("origem_cadastro") != "coletor" and any(k in o for k in ("brasil", "classe_pais")): E(("classe_pais",), "CAMPO_PROIBIDO", "pesquisador nao tem classe de pais: so afiliacao", "")
    if ent == "benchmark":
        c = o.get("criador")
        if isinstance(c, dict) and not c.get("publicador") and not (c.get("nome") and isinstance(c.get("fonte"), dict)): E(("criador",), "CAMPO_FALTA", "criador: informe o publicador do Hugging Face, ou o nome institucional com a fonte (evidencia)", "")
        ds = o.get("datasets") or []
        if len(ds) != len({d.lower() for d in ds if isinstance(d, str)}): E(("datasets",), "ID_DUPLICADO", "dataset repetido na lista", "")
        if o.get("tipo") == "leaderboard" and not (o.get("links") or {}).get("leaderboard"): E(("links", "leaderboard"), "CAMPO_FALTA", "tipo leaderboard exige links.leaderboard", "")
    if ent == "familia":
        for i, mid in enumerate((o.get("excecao_escopo_br") or {}).get("modelos") or []):
            if mid not in ctx["modelos"]: E(("excecao_escopo_br", "modelos", i), "REF_INEXISTENTE", f"modelo {mid!r} nao existe nos dados (o modelo e derivado pelo coletor; nao se cadastra)", "")
    if ent == "familia" and o.get("origem") and o["origem"] not in ctx["pubs"]: E(("origem",), "REF_INEXISTENTE", f"publicador {o['origem']!r} nao existe", "")

def carregar_json(arq):
    texto = open(arq, encoding="utf-8").read()
    try:
        return json.loads(texto), texto
    except json.JSONDecodeError as e:
        (ERROS).append(dict(arquivo=rel(arq), linha=e.lineno, coluna=e.colno, nivel="ERRO", codigo="JSON", mensagem="JSON invalido: " + e.msg,
                            dica="Confira virgulas, aspas e chaves (virgula depois do ultimo item nao pode).", campo=""))
        return None, texto

def indices():
    L = lambda n, k: {x["id"] for x in json.load(open(os.path.join(RAIZ, "data", n + ".json")))[k]} if os.path.exists(os.path.join(RAIZ, "data", n + ".json")) else set()
    return L("publicadores", "publicadores"), L("modelos", "modelos"), {x["id"] for x in json.load(open(os.path.join(RAIZ, "data", "familias.json")))["familias"]} if os.path.exists(os.path.join(RAIZ, "data", "familias.json")) else set()

def listar(sub):
    out = []
    for r, _, fs in os.walk(os.path.join(RAIZ, "data", sub)):
        if os.sep + "rejeitados" in r: continue
        out += [os.path.join(r, f) for f in fs if f.endswith(".json")]
    return sorted(out)

def validar_arquivos(arqs, rejeitado=False, ctx=None):
    for arq in arqs:
        o, texto = carregar_json(arq)
        if o is None: continue
        loc = Loc(texto); loc.val(0, ())
        if not isinstance(o, dict) or o.get("entidade") not in DIRS:
            emit(arq, loc, (), "ERRO", "ENTIDADE", "campo 'entidade' ausente ou desconhecido", "Use: " + ", ".join(DIRS)); continue
        out = []; schema_check(o, {"$ref": o["entidade"] + ".schema.json"}, {}, (), out)
        for p, cod, msg, dica in out: emit(arq, loc, p, "ERRO", cod, msg, dica)
        semantica(arq, o, loc, ctx, rejeitado)

def contexto(arqs_ent):
    pubs, mods, fams = indices(); labs = set()
    ctx = {"ids": {}, "removidos": set(), "pubs": set(pubs), "modelos": set(mods), "fams": set(fams), "labs": set(), "insts": set(), "inst_pai": {}, "pubs_tipo": {}}
    rm = os.path.join(RAIZ, "data", "remocoes.json")
    if os.path.exists(rm):
        o, t = carregar_json(rm)
        if o is not None:
            out = []; schema_check(o, {"$ref": "remocoes.schema.json"}, {}, (), out); loc = Loc(t); loc.val(0, ())
            for p, c, m, d in out: emit(rm, loc, p, "ERRO", c, m, d)
            ctx["removidos"] = {i["sha256"] for i in o.get("itens", []) if isinstance(i, dict) and "sha256" in i}
    av = os.path.join(RAIZ, "data", "avatares.json")   # enderecos de avatares publicos (sem imagem) e pedidos de ocultar
    if os.path.exists(av):
        o, t = carregar_json(av)
        if o is not None:
            out = []; schema_check(o, {"$ref": "avatares.schema.json"}, {}, (), out); loc = Loc(t); loc.val(0, ())
            for p, c, m, d in out: emit(av, loc, p, "ERRO", c, m, d)
            import re as _re
            for h, u in ((o.get("avatares") or {}).items() if isinstance(o, dict) and isinstance(o.get("avatares"), dict) else []):
                if not _re.match(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$", str(h)) or not isinstance(u, str) or not _re.match(r"^https://(huggingface\.co/avatars/|cdn-avatars\.huggingface\.co/)\S+$", u):
                    emit(av, loc, ("avatares", h), "ERRO", "AVATAR_URL", "so enderecos https do proprio Hugging Face (huggingface.co/avatars/ ou cdn-avatars.huggingface.co); nunca a imagem", "use scripts/avatares.py")
            for h in (o.get("ocultar") or []) if isinstance(o, dict) else []:
                if isinstance(h, str) and h in (o.get("avatares") or {}): emit(av, loc, ("avatares", h), "ERRO", "AVATAR_OCULTO", "o avatar de quem pediu para ocultar nao pode estar em avatares", "remova a entrada de avatares")
    for a in arqs_ent:  # ids das proprias contribuicoes, para referencias cruzadas
        try: o = json.load(open(a, encoding="utf-8"))
        except Exception: continue
        if not isinstance(o, dict) or not isinstance(o.get("id"), str): continue
        {"publicador": ctx["pubs"], "laboratorio": ctx["labs"], "familia": ctx["fams"], "instituicao": ctx["insts"]}.get(o.get("entidade"), set()).add(o["id"])
        if o.get("entidade") == "instituicao" and o.get("parte_de"): ctx["inst_pai"][o["id"]] = o["parte_de"]
        if o.get("entidade") == "publicador": ctx["pubs_tipo"][o["id"]] = o.get("tipo")
    return ctx

def derivados_pii():
    """Os arquivos gerados tambem nao podem carregar e-mail."""
    for n in ("publicadores", "familias", "constelacoes", "foto", "modelos"):
        f = os.path.join(RAIZ, "data", n + ".json")
        if not os.path.exists(f): continue
        for l, linha in enumerate(open(f, encoding="utf-8"), 1):
            if PAD["EMAIL"].search(linha):
                ERROS.append(dict(arquivo=rel(f), linha=l, coluna=1, nivel="ERRO", codigo="EMAIL", mensagem="e-mail em dado derivado: " + PAD["EMAIL"].search(linha).group(0)[:3] + "...",
                                  dica="Rode scripts/migrar_1_0.py (ou o coletor atual) para omitir.", campo=""))

def verificar_links(arqs):
    vistos = {}
    for arq in arqs:
        o, texto = carregar_json(arq)
        if not isinstance(o, dict): continue
        loc = Loc(texto); loc.val(0, ())
        for p, v in walk(o):
            if isinstance(v, str) and v.startswith("https://") and p and p[-1] in ("url", "oficial", "instituicao", "hf", "github", "repositorio", "orcid", "scholar", "lattes", "artigo", "site", "leaderboard", "codigo"):
                if v not in vistos:
                    vistos[v] = status_url(v); time.sleep(0.25)
                cod = vistos[v]
                if cod in (404, 410): emit(arq, loc, p, "ERRO", "LINK_QUEBRADO", f"{v} respondeu {cod}", "Ache a pagina atual ou remova a afirmacao.")
                elif cod != 200: emit(arq, loc, p, "AVISO", "LINK_INCERTO", f"{v}: {cod if cod else 'sem resposta'} (certificado, bloqueio a robos ou fora do ar)", "Abra no navegador e confirme.")

def status_url(u):
    for met in ("HEAD", "GET"):
        try:
            rq = urllib.request.Request(u, method=met, headers={"User-Agent": "observatorio-validar/1.0 (+verificacao de links)"})
            with urllib.request.urlopen(rq, timeout=15) as r: return r.status
        except urllib.error.HTTPError as e:
            if met == "HEAD" and e.code in (403, 405, 400, 501): continue
            return e.code
        except Exception:
            if met == "GET": return 0
    return 0

def pagina_texto(u):
    """Baixa a pagina e devolve o texto visivel (sem tags). None se nao der para baixar."""
    import html, ssl
    for ctxs in (None, "curl"):
        try:
            if ctxs is None:
                rq = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0 (observatorio-validar/1.0)"})
                with urllib.request.urlopen(rq, timeout=20) as r: raw = r.read(3_000_000).decode(r.headers.get_content_charset() or "utf-8", "replace")
            else:
                raw = subprocess.run(["curl", "-sL", "-m", "25", "-A", "Mozilla/5.0", u], capture_output=True).stdout.decode("utf-8", "replace")
                if not raw: return None
            raw = re.sub(r"(?s)<(script|style|noscript)\b.*?</\1>", " ", raw)
            return html.unescape(re.sub(r"<[^>]+>", " ", raw))
        except Exception:
            continue
    return None

def norm(t):
    import unicodedata
    t = unicodedata.normalize("NFKD", t.replace("\u2019", "'").replace("\u2018", "'").replace("\u201c", '"').replace("\u201d", '"'))
    t = "".join(c for c in t if not unicodedata.combining(c)).lower()
    t = re.sub(r"\s+([,.;:!?)])", r"\1", t); t = re.sub(r"([(])\s+", r"\1", t)
    return re.sub(r"[\s*_]+", " ", t).strip()

def verificar_trechos(arqs):
    """Cada trecho literal de evidencia manual (sem 'regra') precisa aparecer na pagina da fonte. Sem IA."""
    cache = {}
    for arq in arqs:
        o, texto = carregar_json(arq)
        if not isinstance(o, dict): continue
        loc = Loc(texto); loc.val(0, ())
        for p, v in walk(o):
            if isinstance(v, dict) and v.get("trecho") and v.get("url") and not v.get("regra"):
                if v["url"] not in cache: cache[v["url"]] = pagina_texto(v["url"]); time.sleep(0.25)
                pg = cache[v["url"]]
                if pg is None: emit(arq, loc, p + ("trecho",), "AVISO", "TRECHO_NAO_VERIFICADO", "nao consegui baixar a fonte para conferir o trecho", "O revisor confere abrindo a pagina."); continue
                N = norm(pg)
                if len(N) < 300: emit(arq, loc, p + ("trecho",), "AVISO", "TRECHO_NAO_VERIFICADO", "a pagina quase nao tem texto (provavel JavaScript)", "O revisor confere no navegador."); continue
                partes = [x for x in re.split(r"\s*(?:\.\.\.|\u2026)\s*", v["trecho"]) if x.strip()]
                falta = [x for x in partes if norm(x) not in N]
                if falta: emit(arq, loc, p + ("trecho",), "ERRO", "TRECHO_AUSENTE", f"o trecho nao aparece na pagina: {falta[0][:60]!r}...", "Copie a frase exatamente como esta na pagina (use ... para pular partes).")

def conferir_diff(base):
    try: nomes = subprocess.run(["git", "diff", "--name-only", f"{base}...HEAD"], cwd=RAIZ, capture_output=True, text=True, check=True).stdout.split()
    except Exception as e:
        print("nao consegui ler o diff:", e, file=sys.stderr); return
    for n in nomes:
        f = os.path.join(RAIZ, n)
        if re.fullmatch(r"data/(publicadores|modelos|familias|constelacoes|foto|datasets|benchmarks|foto_camadas)\.json|web/data\.js", n):
            ERROS.append(dict(arquivo=n, linha=1, coluna=1, nivel="ERRO", codigo="PR_DERIVADO", mensagem="arquivo derivado: so o coletor altera", dica="Reverta este arquivo; corrija a entidade em data/entidades/.", campo=""))
        elif n.startswith(("scripts/", "schema/", ".github/", "docs/", "LICENSE", "SECURITY", "CODE_OF", "CONTRIBUTING", "PULL_REQUEST")) or n in ("data/remocoes.json",):
            AVISOS.append(dict(arquivo=n, linha=1, coluna=1, nivel="AVISO", codigo="PR_INFRA", mensagem="altera infraestrutura, regras ou documentos: revisao humana obrigatoria", dica="", campo=""))

def rejeitados():
    ok = True
    for arq in sorted(os.path.join(RAIZ, "data", "exemplos", "rejeitados", f) for f in os.listdir(os.path.join(RAIZ, "data", "exemplos", "rejeitados")) if f.endswith(".json")):
        o = json.load(open(arq, encoding="utf-8")); esperado = o.pop("_esperado", []); o.pop("_motivo", None)
        ERROS.clear(); AVISOS.clear()
        tmp = arq + ".tmp"; json.dump(o, open(tmp, "w"), ensure_ascii=False, indent=2)
        try: validar_arquivos([tmp], rejeitado=True, ctx=contexto([]))
        finally: os.remove(tmp)
        achados = {e["codigo"] for e in ERROS + AVISOS}
        falta = [c for c in esperado if c not in achados]
        print(("ok   " if not falta else "FALHA") + f" {rel(arq)}: esperado {esperado}, achado {sorted(achados)}")
        ok &= not falta
    ERROS.clear(); AVISOS.clear()
    return ok

def main():
    a = sys.argv[1:]
    if "-h" in a or "--help" in a: print(__doc__); return 0
    if "--rejeitados" in a:
        return 0 if rejeitados() else 1
    base = a[a.index("--base") + 1] if "--base" in a else None
    arqs = [x for x in a if x.endswith(".json")] or listar("entidades") + (listar("exemplos") if "--exemplos" in a else [])
    arqs = [os.path.abspath(x) for x in arqs]
    ctx = contexto(listar("entidades") + listar("exemplos") if "--exemplos" in a else listar("entidades"))
    validar_arquivos(arqs, ctx=ctx)
    derivados_pii()
    if "--links" in a: verificar_links(arqs)
    if "--trechos" in a: verificar_trechos(arqs)
    if base: conferir_diff(base)
    gh = os.environ.get("GITHUB_ACTIONS") == "true"
    if "--json" in a: print(json.dumps(dict(erros=ERROS, avisos=AVISOS), ensure_ascii=False, indent=1))
    else:
        for e in ERROS + AVISOS:
            print(f"{e['arquivo']}:{e['linha']}:{e['coluna']}: {e['nivel']} [{e['codigo']}] {e['mensagem']}" + (f"\n    dica: {e['dica']}" if e["dica"] else ""))
            if gh: print(f"::{'error' if e['nivel'] == 'ERRO' else 'warning'} file={e['arquivo']},line={e['linha']},col={e['coluna']},title={e['codigo']}::{e['mensagem']}")
        print(f"{len(arqs)} arquivo(s) de entidade; {len(ERROS)} erro(s), {len(AVISOS)} aviso(s)")
    return 1 if ERROS else 0

if __name__ == "__main__":
    sys.exit(main())
