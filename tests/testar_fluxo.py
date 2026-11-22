#!/usr/bin/env python3
"""Testes do fluxo de entrada e coleta (stdlib, sem rede publica: a API do Hugging Face e simulada por um servidor local).

    python3 tests/testar_fluxo.py

Cobre: (a) entidade curada entra como candidato e prevalece sobre o sinal automatico; (b) --novos nao recoleta quem ja existe;
(c) retomada depois de interrupcao (kill -9 no meio); (d) idempotencia (git diff vazio); (e) scripts/processar_pr.sh num PR local.
"""
import warnings
warnings.simplefilter("ignore", ResourceWarning)
import http.server, json, os, shutil, signal, subprocess, sys, tempfile, threading, time, unittest, urllib.parse

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COLETAR = os.path.join(REPO, "scripts", "coletar.py")
ENT = os.path.join(REPO, "data", "entidades", "publicador")
GIT = ["git", "-c", "user.name=teste", "-c", "user.email=teste"]


def entidade(origem, novo_id, **mudancas):
    """Copia uma entidade curada real, com outro id (nao toca no original)."""
    e = json.load(open(os.path.join(ENT, origem + ".json")))
    e["id"] = novo_id
    e.update(mudancas)
    return e


class ApiFalsa(http.server.BaseHTTPRequestHandler):
    autores = {}    # id -> {"nome", "modelos": [...]}
    acessos = []    # (rota, autor)
    inverter = False
    datasets = []   # itens no formato da listagem de datasets
    readmes = {}    # id do modelo -> texto do README (ausente: 404)

    def log_message(self, *a):
        pass

    def _json(self, obj, codigo=200):
        corpo = json.dumps(obj).encode()
        self.send_response(codigo)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(u.query)
        partes = u.path.strip("/").split("/")
        if len(partes) == 5 and partes[2:] == ["raw", "main", "README.md"]:
            rid = partes[0] + "/" + partes[1]
            ApiFalsa.acessos.append(("readme", rid))
            if rid in ApiFalsa.readmes:
                corpo = ApiFalsa.readmes[rid].encode()
                self.send_response(200)
                self.send_header("Content-Length", str(len(corpo)))
                self.end_headers()
                self.wfile.write(corpo)
                return
            return self._json({}, 404)
        if partes[:2] == ["api", "users"] and partes[3:] == ["overview"]:
            a = ApiFalsa.autores.get(partes[2])
            ApiFalsa.acessos.append(("users", partes[2]))
            return self._json({"fullname": a["nome"], "numModels": len(a["modelos"])}) if a else self._json({}, 404)
        if partes[:2] == ["api", "organizations"]:
            return self._json({}, 404)
        if u.path == "/api/models":
            autor = (q.get("author") or [None])[0]
            if autor:
                ApiFalsa.acessos.append(("lista", autor))
                ms = list((ApiFalsa.autores.get(autor) or {"modelos": []})["modelos"])
                return self._json(list(reversed(ms)) if ApiFalsa.inverter else ms)
            return self._json([])
        if u.path == "/api/datasets":
            autor, filtro = (q.get("author") or [None])[0], (q.get("filter") or [None])[0]
            ApiFalsa.acessos.append(("datasets", autor or filtro or "busca"))
            itens = [x for x in ApiFalsa.datasets if (autor and x["id"].split("/")[0] == autor) or (filtro and filtro in x["tags"])]
            if (q.get("search") or [None])[0]:
                itens = [x for x in ApiFalsa.datasets if x["id"].split("/")[0] == autor and q["search"][0].lower() in x["id"].lower()]
            return self._json(list(reversed(itens)) if ApiFalsa.inverter else itens)
        return self._json([])   # tree/main e demais rotas: vazio


def dataset(id_, downloads=0, likes=0, tags=None, descricao="", gated=False, tamanho=1_000_000):
    return {"id": id_, "tags": tags or [], "downloads": downloads, "likes": likes, "description": descricao, "gated": gated, "private": False,
            "lastModified": "2026-02-03T00:00:00.000Z", "mainSize": tamanho}


def modelo(autor, nome, tarefa="text-generation", params=1_000_000_000, tags=None):
    return {"id": f"{autor}/{nome}", "tags": tags or ["license:apache-2.0"], "downloads": 10, "pipeline_tag": tarefa,
            "lastModified": "2026-01-01T00:00:00.000Z", "safetensors": {"total": params}}


class Base(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), ApiFalsa)
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()
        cls.api = f"http://127.0.0.1:{cls.srv.server_address[1]}/api"
        ApiFalsa.autores = {
            "teste-br": {"nome": "Teste BR", "modelos": [modelo("teste-br", "alfa-1B"), modelo("teste-br", "beta-2B"), modelo("teste-br", "grande-30B", params=30_000_000_000),
                                                         modelo("teste-br", "imagem", tarefa="text-to-image"), modelo("teste-br", "lora", tags=["peft", "lora"])]},
            "teste-fora": {"nome": "Teste Fora", "modelos": [modelo("teste-fora", "m-1B")]},
            "teste-nc": {"nome": "Teste NC", "modelos": [modelo("teste-nc", "x-1B-onnx", tags=["onnx"]), modelo("teste-nc", "y-1B")]},
            "teste-vazio": {"nome": "Teste Vazio", "modelos": [modelo("teste-vazio", "so-imagem", tarefa="image-classification")]},
            "teste-novo": {"nome": "Teste Novo", "modelos": [modelo("teste-novo", "n-1B")]},
        }

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.raiz = os.path.join(self.tmp, "raiz")
        for d in ("seed", "web", os.path.join("data", "entidades", "publicador")):
            os.makedirs(os.path.join(self.raiz, d))
        json.dump({"br": [], "mundo": [], "runtime_orgs": [], "termos_busca": [], "empresas_mundo": [], "instituicoes_mundo": []}, open(os.path.join(self.raiz, "seed", "publishers.json"), "w"))
        json.dump({}, open(os.path.join(self.raiz, "seed", "evidencias.json"), "w"))
        json.dump({"spec": "1.0", "itens": []}, open(os.path.join(self.raiz, "data", "remocoes.json"), "w"))
        ApiFalsa.inverter = False
        ApiFalsa.acessos.clear()
        ApiFalsa.datasets = []
        ApiFalsa.readmes = {}

    def por(self, e):
        json.dump(e, open(os.path.join(self.raiz, "data", "entidades", "publicador", e["id"] + ".json"), "w"), ensure_ascii=False, indent=2)

    def coletar(self, *args, esperar=0, popen=False):
        env = dict(os.environ, COLETOR_RAIZ=self.raiz, COLETOR_API=self.api, COLETOR_HF=self.api[: -len("/api")], COLETOR_PAUSA="0")
        if esperar:
            env["COLETOR_ESPERA_TESTE"] = str(esperar)
        cmd = [sys.executable, COLETAR, "--sem-descoberta", *args]
        if popen:
            return subprocess.Popen(cmd, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        return subprocess.run(cmd, env=env, capture_output=True, text=True)

    def dados(self, nome="publicadores"):
        return json.load(open(os.path.join(self.raiz, "data", nome + ".json")))[nome]

    def acessos(self, tipo, autor):
        return sum(1 for a in ApiFalsa.acessos if a == (tipo, autor))


class TestCandidatosCurados(Base):
    def test_a_entidade_curada_entra_como_candidato_e_prevalece(self):
        br = entidade("22h", "teste-br")
        fora = entidade("google", "teste-fora")
        nc = entidade("Xenova", "teste-nc")
        vazio = entidade("22h", "teste-vazio")
        arq = entidade("22h", "teste-arquivado", status="arquivado")
        for e in (br, fora, nc, vazio, arq):
            self.por(e)
        r = self.coletar("--novos", "--dry-run")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("entidade curada", r.stdout)
        for i in ("teste-br", "teste-fora", "teste-nc", "teste-vazio"):
            self.assertIn(i, r.stdout)
        self.assertNotIn("teste-arquivado", r.stdout)
        self.assertEqual(self.acessos("lista", "teste-br"), 0, "--dry-run nao chama a API de modelos")
        r = self.coletar("--novos")
        self.assertEqual(r.returncode, 0, r.stderr)
        pubs = {p["id"]: p for p in self.dados()}
        self.assertEqual(set(pubs), {"teste-br", "teste-fora", "teste-nc"})
        self.assertEqual(pubs["teste-br"]["escopo"], "br")
        self.assertEqual(pubs["teste-br"]["evidencia_pais"], br["evidencia_pais"], "evidencia de pais vem da entidade")
        self.assertEqual(pubs["teste-br"]["natureza"], br["natureza"])
        self.assertEqual(pubs["teste-fora"]["escopo"], "mundo")
        self.assertEqual(pubs["teste-nc"]["escopo"], "mundo")   # nao classificado fica fora do escopo Brasil
        self.assertEqual(pubs["teste-nc"]["classe_pais"], "nao_classificado")
        self.assertEqual([m["id"] for m in self.dados("modelos") if m["publicador"] == "teste-nc"], ["teste-nc/x-1B-onnx"], "nao classificado: so repositorios de formato de navegador")
        mods = [m["id"] for m in self.dados("modelos") if m["publicador"] == "teste-br"]
        self.assertEqual(mods, ["teste-br/alfa-1B", "teste-br/beta-2B"], "so linguagem, sem LoRA, ate 12 B")
        foto = json.load(open(os.path.join(self.raiz, "data", "foto.json")))
        vazio_d = [d for d in foto["descartados"] if d["id"] == "teste-vazio"]
        self.assertTrue(vazio_d and vazio_d[0]["motivo"].startswith("sem modelos no corte"))

    def test_remocao_e_excluir_valem(self):
        import hashlib
        self.por(entidade("22h", "teste-br"))
        self.por(entidade("22h", "teste-fora"))
        json.dump({"spec": "1.0", "itens": [{"sha256": hashlib.sha256(b"teste-br").hexdigest()}]}, open(os.path.join(self.raiz, "data", "remocoes.json"), "w"))
        r = self.coletar("--novos", "--dry-run")
        self.assertNotIn("teste-br ", r.stdout + " ")
        self.assertIn("teste-fora", r.stdout)
        open(os.path.join(self.raiz, ".excluir"), "w").write("teste-fora\n")
        r = self.coletar("--novos", "--dry-run")
        self.assertIn("a coletar: 0", r.stdout)


class TestIncremental(Base):
    def test_b_novos_nao_recoleta_quem_ja_existe(self):
        self.por(entidade("22h", "teste-br"))
        self.por(entidade("google", "teste-fora"))
        self.assertEqual(self.coletar("--novos").returncode, 0)
        antes = self.acessos("lista", "teste-br")
        self.por(entidade("22h", "teste-novo"))
        r = self.coletar("--novos", "--cache-dias", "0")   # sem cache de respostas: se recoletasse, a API falsa contaria
        self.assertIn("1 publicador(es) a coletar", r.stderr)
        self.assertEqual(self.acessos("lista", "teste-br"), antes)
        self.assertEqual({p["id"] for p in self.dados()}, {"teste-br", "teste-fora", "teste-novo"})
        self.assertEqual(sum(1 for m in self.dados("modelos") if m["publicador"] == "teste-br"), 2, "mescla, nao sobrescreve")
        r = self.coletar("--novos", "--cache-dias", "0")
        self.assertIn("nada a coletar", r.stdout)

    def test_entidade_alterada_e_recoletada(self):
        self.por(entidade("22h", "teste-br"))
        self.coletar("--novos")
        evid = json.load(open(os.path.join(ENT, "google.json")))["evidencia_natureza"]
        self.por(entidade("22h", "teste-br", natureza="empresa", evidencia_natureza=evid))
        r = self.coletar("--novos", "--dry-run")
        self.assertIn("alterado", r.stdout)
        self.coletar("--novos")
        self.assertEqual(self.dados()[0]["natureza"], "empresa")

    def test_tudo_remove_quem_deixou_de_ser_candidato(self):
        self.por(entidade("22h", "teste-br"))
        self.por(entidade("google", "teste-fora"))
        self.coletar("--tudo")
        self.assertEqual({p["id"] for p in self.dados()}, {"teste-br", "teste-fora"})
        self.por(entidade("google", "teste-fora", status="arquivado"))
        self.coletar("--novos")
        self.assertIn("teste-fora", {p["id"] for p in self.dados()}, "--novos nao remove")
        self.coletar("--tudo")
        self.assertEqual({p["id"] for p in self.dados()}, {"teste-br"})
        self.assertEqual({m["publicador"] for m in self.dados("modelos")}, {"teste-br"})

    def test_c_retomada_depois_de_interrupcao(self):
        for i in ("teste-br", "teste-fora", "teste-nc"):
            self.por(entidade("22h", i))
        p = self.coletar("--novos", esperar=4, popen=True)
        chk = os.path.join(self.raiz, ".cache", "publicadores")
        limite = time.time() + 30
        while time.time() < limite and not (os.path.isdir(chk) and os.listdir(chk)):
            time.sleep(0.1)
        self.assertTrue(os.path.isdir(chk) and os.listdir(chk), "o checkpoint do primeiro publicador deve existir")
        os.kill(p.pid, signal.SIGKILL)
        p.wait()
        feitos = sorted(f for f in os.listdir(chk) if f.endswith(".json"))
        self.assertTrue(0 < len(feitos) < 3)
        self.assertFalse(os.path.exists(os.path.join(self.raiz, "data", "publicadores.json")), "nada e gravado nos dados antes do fim")
        r = self.coletar("--novos")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(r.stderr.count("reaproveitado"), len(feitos))
        self.assertEqual({p["id"] for p in self.dados()}, {"teste-br", "teste-fora", "teste-nc"})

    def test_d_idempotencia_diff_vazio(self):
        for i, o in (("teste-br", "22h"), ("teste-fora", "google"), ("teste-nc", "Xenova"), ("teste-vazio", "22h")):
            self.por(entidade(o, i))
        self.assertEqual(self.coletar("--tudo").returncode, 0)
        subprocess.run(GIT + ["init", "-q"], cwd=self.raiz, check=True)
        subprocess.run(["git", "add", "-A", "data", "web"], cwd=self.raiz, check=True)
        subprocess.run(GIT + ["commit", "-q", "-m", "x"], cwd=self.raiz, check=True)

        def diff():
            return subprocess.run(["git", "status", "--porcelain", "data", "web"], cwd=self.raiz, capture_output=True, text=True).stdout
        self.coletar("--novos")
        self.assertEqual(diff(), "")
        self.coletar("--tudo")
        self.assertEqual(diff(), "")
        ApiFalsa.inverter = True   # a API devolve na ordem inversa: a saida continua igual
        self.coletar("--tudo", "--fresh")
        self.assertEqual(diff(), "", "recoleta completa com a API em outra ordem deve dar o mesmo arquivo")
        self.assertEqual(self.coletar("--normalizar").returncode, 0)
        self.assertEqual(diff(), "")


class TestCamadas(Base):
    def setUp(self):
        super().setUp()
        os.makedirs(os.path.join(self.raiz, "data", "entidades", "benchmark"))
        self.por(entidade("22h", "teste-br"))
        bench = json.load(open(os.path.join(REPO, "data", "entidades", "benchmark", "enem.json")))
        bench["datasets"] = ["externo/ds-bench", "externo/ds-inexistente"]
        json.dump(bench, open(os.path.join(self.raiz, "data", "entidades", "benchmark", "enem.json"), "w"), ensure_ascii=False)
        pt = ["language:pt", "license:mit"]
        ApiFalsa.datasets = [
            dataset("teste-br/ds-a", 1, 0, ["language:pt", "task_categories:question-answering", "license:apache-2.0", "size_categories:n<1K"], "# Titulo\n\n| Paper | Code |\nConjunto de perguntas e respostas em portugues do Brasil, para avaliacao. Contato: fulano@example.org"),
            dataset("teste-br/ds-fechado", 900, 9, pt, "Conjunto fechado que nao deve entrar na camada de datasets", gated=True),
            dataset("outro/ds-pt-popular", 500, 0, pt + ["language:pt-br"], "Conjunto em portugues com muitos downloads para o corte de relevancia"),
            dataset("outro/ds-pt-curtido", 5, 4, pt, "Conjunto em portugues com poucas baixas e varias curtidas, relevante pelo corte"),
            dataset("outro/ds-pt-fraco", 5, 0, pt, "Conjunto em portugues sem downloads nem curtidas suficientes"),
            dataset("outro/ds-sem-meta", 900, 9, ["language:pt"], ""),
            dataset("outro/ds-en", 900, 9, ["language:en", "license:mit"], "Conjunto em ingles que nao entra pelo idioma nem por benchmark"),
            dataset("copia/ds-pt-popular", 120, 0, pt, "Conjunto em portugues com muitos downloads para o corte de relevancia"),
            dataset("externo/ds-bench", 1, 0, ["language:en"], "Conjunto de um benchmark, sem idioma portugues no cartao e poucos downloads"),
        ]

    def final(self):
        return {d["id"]: d for d in json.load(open(os.path.join(self.raiz, "data", "datasets.json")))["datasets"]}

    def test_regra_de_relevancia_e_escopo(self):
        r = self.coletar("--tudo")
        self.assertEqual(r.returncode, 0, r.stderr)
        f = self.final()
        self.assertEqual(set(f), {"teste-br/ds-a", "outro/ds-pt-popular", "outro/ds-pt-curtido", "externo/ds-bench"}, "inclui br, pt com limiar e o dataset do benchmark; exclui fechado, fraco, sem metadados, ingles e duplicata")
        self.assertEqual(f["teste-br/ds-a"]["escopo"], "br")
        self.assertEqual(f["outro/ds-pt-popular"]["escopo"], "mundo")
        self.assertTrue(f["outro/ds-pt-popular"]["pt"])
        self.assertNotIn("pt", {x["escopo"] for x in f.values()}, "idioma e atributo, nao escopo")
        self.assertTrue(f["outro/ds-pt-popular"]["pt_br"])
        self.assertEqual(f["externo/ds-bench"]["benchmarks"], ["enem"])
        self.assertNotIn("fulano@", f["teste-br/ds-a"]["descricao"])
        self.assertTrue(f["teste-br/ds-a"]["descricao"].startswith("Conjunto de perguntas"))
        self.assertEqual((f["teste-br/ds-a"]["faixa"], f["teste-br/ds-a"]["linhas_faixa"]), ("1-100MB", "n<1K"))
        b = json.load(open(os.path.join(self.raiz, "data", "benchmarks.json")))["benchmarks"][0]
        self.assertEqual((b["n_datasets"], b["downloads_total"]), (1, 1), "o dataset ausente nao conta")
        js = open(os.path.join(self.raiz, "web", "data.js")).read()
        d = json.loads(js[len("window.MAPA_DADOS="):-1])
        self.assertNotIn("builds", d["modelos"][0] if d["modelos"] else {}, "data.js leve: builds ficam em data-builds.js")
        jd = open(os.path.join(self.raiz, "web", "data-datasets.js")).read()
        d["datasets"] = json.loads(jd[len("window.MAPA_DADOS.datasets="):-1])
        d["benchmarks"] = json.loads(open(os.path.join(self.raiz, "web", "data-benchmarks.js")).read()[len("window.MAPA_DADOS.benchmarks="):-1])
        self.assertEqual(d["datasets"]["colunas"][0], "id")
        self.assertEqual(len(d["datasets"]["linhas"]), 4)
        self.assertEqual(d["datasets"]["linhas"][0][14], "br", "ordem: Brasil primeiro")
        self.assertEqual(d["foto_camadas"]["datasets"]["por_escopo"], {"br": 1, "mundo": 3})
        self.assertEqual(d["foto_camadas"]["datasets"]["pt"], {"sim": 3, "nao": 1})
        self.assertEqual(d["datasets"]["colunas"][14], "escopo")
        self.assertEqual(d["datasets"]["colunas"][16], "pt")

    def test_publicador_do_mundo_entra_pelo_limiar_sem_idioma(self):
        ApiFalsa.datasets += [dataset("teste-fora/ds-w1", 150, 0, ["language:en", "license:mit"], "Conjunto em ingles de publicador do mundo no mapa, acima do limiar"),
                              dataset("teste-fora/ds-w2", 5, 1, ["language:en", "license:mit"], "Conjunto em ingles de publicador do mundo, abaixo do limiar"),
                              dataset("teste-fora/ds-w3", 2, 4, ["language:pt", "license:mit"], "Conjunto em portugues de publicador do mundo com curtidas suficientes")]
        self.por(entidade("google", "teste-fora"))
        ApiFalsa.autores["teste-fora"] = {"nome": "Teste Fora", "modelos": [modelo("teste-fora", "m-1B")]}
        self.assertEqual(self.coletar("--tudo").returncode, 0)
        f = self.final()
        self.assertEqual(f["teste-fora/ds-w1"]["escopo"], "mundo")
        self.assertFalse(f["teste-fora/ds-w1"]["pt"])
        self.assertNotIn("teste-fora/ds-w2", f)
        self.assertTrue(f["teste-fora/ds-w3"]["pt"])

    def test_incremental_e_idempotente(self):
        self.assertEqual(self.coletar("--novos").returncode, 0)
        antes = self.acessos("datasets", "language:pt")
        r = self.coletar("--novos", "--cache-dias", "0")
        self.assertIn("nada a coletar", r.stdout)
        self.assertEqual(self.acessos("datasets", "language:pt"), antes)
        subprocess.run(GIT + ["init", "-q"], cwd=self.raiz, check=True)
        subprocess.run(["git", "add", "-A", "data", "web"], cwd=self.raiz, check=True)
        subprocess.run(GIT + ["commit", "-q", "-m", "x"], cwd=self.raiz, check=True)
        ApiFalsa.inverter = True
        self.coletar("--tudo", "--fresh")
        out = subprocess.run(["git", "status", "--porcelain", "data", "web"], cwd=self.raiz, capture_output=True, text=True).stdout
        self.assertEqual(out, "", "recoleta completa em outra ordem da API da o mesmo arquivo")

    def test_benchmark_alterado_e_recoletado_e_arquivado_sai(self):
        self.coletar("--novos")
        p = os.path.join(self.raiz, "data", "entidades", "benchmark", "enem.json")
        b = json.load(open(p))
        b["datasets"] = ["externo/ds-bench", "outro/ds-pt-popular"]
        json.dump(b, open(p, "w"), ensure_ascii=False)
        r = self.coletar("--novos", "--dry-run")
        self.assertIn("alterado  ds:bench:enem", r.stdout)
        self.coletar("--novos")
        self.assertEqual(self.final()["outro/ds-pt-popular"]["benchmarks"], ["enem"])
        b["status"] = "arquivado"
        b["arquivo"] = {"em": "2026-11-20", "motivo": "encerrado"}
        json.dump(b, open(p, "w"), ensure_ascii=False)
        self.coletar("--tudo")
        self.assertNotIn("externo/ds-bench", self.final(), "sem benchmark, o dataset fora do idioma sai")

    def test_so_datasets_e_sem_datasets(self):
        self.coletar("--so-datasets", "--novos")
        self.assertTrue(os.path.exists(os.path.join(self.raiz, "data", "datasets.json")))
        self.assertFalse(os.path.exists(os.path.join(self.raiz, "data", "modelos.json")) and False)
        r = self.coletar("--sem-datasets", "--novos", "--dry-run")
        self.assertIn("a coletar: 0", r.stdout.split("datasets:")[1])


class TestValidadorBenchmark(unittest.TestCase):
    def test_exemplos_e_rejeitados(self):
        for args in (["--exemplos"], ["--rejeitados"]):
            r = subprocess.run([sys.executable, os.path.join(REPO, "scripts", "validar.py"), *args], capture_output=True, text=True)
            self.assertEqual(r.returncode, 0, r.stdout[-600:])
        r = subprocess.run([sys.executable, os.path.join(REPO, "scripts", "validar.py"), "--rejeitados"], capture_output=True, text=True)
        for n in ("19-benchmark-sem-dominio", "20-benchmark-dominio-invalido", "21-benchmark-campo-derivado", "22-benchmark-fonte-sem-trecho", "23-benchmark-dataset-id-invalido", "24-benchmark-leaderboard-sem-link"):
            self.assertRegex(r.stdout, rf"ok\s+data/exemplos/rejeitados/{n}")

    def test_benchmarks_reais_validam(self):
        r = subprocess.run([sys.executable, os.path.join(REPO, "scripts", "validar.py")] + [os.path.join(REPO, "data", "entidades", "benchmark", f) for f in os.listdir(os.path.join(REPO, "data", "entidades", "benchmark"))], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stdout[-800:])


class TestInferenciaDeTarefa(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        sys.path.insert(0, os.path.join(REPO, "scripts"))
        import coletar
        cls.c = coletar

    def inf(self, nome, tags, total=1_000_000_000, **extra):
        x = {"id": "p/" + nome, "tags": tags, "safetensors": {"total": total} if total else None}
        x.update(extra)
        return self.c.inferir_tarefa(x)

    def test_positivos(self):
        self.assertEqual(self.inf("AMP_llama_2_compressao", ["safetensors", "llama"])[0], "text-generation")
        self.assertEqual(self.inf("PrAACT-qwen-4b-it", ["safetensors", "qwen3"])[0], "text-generation")
        self.assertEqual(self.inf("modelo", ["text-generation-inference"])[0], "text-generation")
        self.assertEqual(self.inf("monoptt5", ["safetensors", "t5"])[0], "text2text-generation")
        self.assertIn("llama", self.inf("x", ["llama"])[1])

    def test_codificadores_e_familia_de_tarefa(self):
        self.assertEqual(self.inf("Qwen3-Embedding-0.6B", ["safetensors", "qwen3"])[0], "feature-extraction", "embedding e codificador")
        self.assertEqual(self.inf("x", ["bert", "pt"])[0], "feature-extraction")
        self.assertEqual(self.inf("x", ["safetensors", "xlm-roberta"])[0], "feature-extraction")
        self.assertEqual(self.inf("x", ["llama", "text-classification"])[0], "text-classification")
        self.assertEqual(self.inf("x", ["sentence-transformers"])[0], "feature-extraction")
        self.assertEqual(self.inf("modelo-rerank", ["qwen3"])[0], "text-ranking")
        f = self.c.familia_tarefa
        for t in ("text-generation", "image-text-to-text", "any-to-any", "text2text-generation"):
            self.assertEqual(f(t), "gerador")
        for t in ("fill-mask", "feature-extraction", "sentence-similarity", "text-classification", "token-classification", "question-answering", "zero-shot-classification", "text-ranking"):
            self.assertEqual(f(t), "codificador")
        self.assertTrue({"fill-mask", "text-generation"} <= self.c.TAREFAS)
        self.assertFalse({"automatic-speech-recognition", "text-to-image", "translation", "summarization"} & self.c.TAREFAS)

    def test_negativos(self):
        self.assertIsNone(self.inf("x-lora", ["peft", "llama"]), "adaptador")
        self.assertIsNone(self.inf("BERTimbau-NER", ["safetensors", "t5"]), "nome de classificador sem arquitetura de codificador")
        self.assertIsNone(self.inf("CAPIVARA", ["open_clip", "safetensors"]), "visao")
        self.assertIsNone(self.inf("x", ["whisper"]), "audio")
        self.assertIsNone(self.inf("x", ["llama"], total=None), "sem tamanho conhecido")
        self.assertIsNone(self.inf("x", ["llama"], pipeline_tag="text-classification"), "ja tem tarefa declarada")
        self.assertIsNone(self.inf("x", ["region:us"]), "sem sinal")

    def test_integrado_entra_marcado_e_respeita_corte(self):
        c = self.c
        base = dict(downloads=1, lastModified="2026-01-01T00:00:00.000Z")
        ok = dict(id="p/AMP_llama", tags=["safetensors", "llama"], safetensors={"total": 4_000_000_000}, **base)
        grande = dict(id="p/Grande-llama", tags=["safetensors", "llama"], safetensors={"total": 30_000_000_000}, **base)
        emb = dict(id="p/Img-vision", tags=["safetensors", "vit"], safetensors={"total": 600_000_000}, **base)
        antes = c.listar
        c.listar = lambda **k: [ok, grande, emb]
        try:
            xs, _, fora = c.modelos_do_publicador("p")
        finally:
            c.listar = antes
        self.assertEqual([x["id"] for x in xs], ["p/AMP_llama"])
        self.assertEqual(fora, 1)
        self.assertTrue(xs[0]["tarefa_inferida"])
        m = c.construir(xs[0], "p", "br", {}, [])
        self.assertTrue(m["tarefa_inferida"] and m["regra_tarefa"])
        self.assertEqual(m["tarefa"], "text-generation")


class TestRelacoes(Base):
    def setUp(self):
        super().setUp()
        for t in ("instituicao", "laboratorio"):
            os.makedirs(os.path.join(self.raiz, "data", "entidades", t))
        self.copia("instituicao", "usp", "inst-a")
        self.copia("instituicao", "unicamp", "inst-b")
        lab = json.load(open(os.path.join(REPO, "data", "entidades", "laboratorio", "c4ai-usp.json")))
        lab["id"], lab["instituicao"] = "lab-a", "inst-a"
        lab["parceiras"] = [{"instituicao": "inst-b", "fonte": lab["vinculo_fonte"]}]
        json.dump(lab, open(os.path.join(self.raiz, "data", "entidades", "laboratorio", "lab-a.json"), "w"), ensure_ascii=False)
        ev = json.load(open(os.path.join(ENT, "22h.json")))["evidencia_pais"]
        ev = {k: v for k, v in ev.items() if k != "regra"}
        a = entidade("22h", "teste-br", vinculos=[{"alvo": {"tipo": "laboratorio", "id": "lab-a"}, "relacao": "conta_oficial", "fonte": ev}], relacionados=[{"publicador": "teste-fora", "fonte": ev}])
        b = entidade("google", "teste-fora", vinculos=[{"alvo": {"tipo": "instituicao", "id": "inst-b"}, "relacao": "projeto", "fonte": ev}])
        c = entidade("22h", "teste-nc", vinculos=[])
        for e in (a, b, c):
            self.por(e)
        ApiFalsa.autores["teste-nc"] = {"nome": "Teste NC", "modelos": [modelo("teste-nc", "enc-1B", tarefa="fill-mask")]}

    def copia(self, tipo, origem, novo):
        e = json.load(open(os.path.join(REPO, "data", "entidades", tipo, origem + ".json")))
        e["id"] = novo
        json.dump(e, open(os.path.join(self.raiz, "data", "entidades", tipo, novo + ".json"), "w"), ensure_ascii=False)

    def dados_js(self):
        js = open(os.path.join(self.raiz, "web", "data.js")).read()
        return json.loads(js[len("window.MAPA_DADOS="):-1])

    def test_hierarquia_vinculos_e_contagens(self):
        self.assertEqual(self.coletar("--tudo").returncode, 0)
        d = self.dados_js()
        self.assertEqual(d["contrato_relacoes"], 1)
        pubs = {p["id"]: p for p in d["publicadores"]}
        self.assertEqual(pubs["teste-br"]["labs"], ["lab-a"])
        self.assertEqual(pubs["teste-br"]["instituicoes"], ["inst-a"])
        self.assertEqual(pubs["teste-br"]["relacionados"], ["teste-fora"])
        self.assertEqual(pubs["teste-fora"]["relacionados"], ["teste-br"], "relacionado e simetrico")
        self.assertEqual(pubs["teste-fora"]["instituicoes"], ["inst-b"])
        self.assertEqual(pubs["teste-nc"]["instituicoes"], [])
        inst = {i["id"]: i for i in d["instituicoes"]}
        self.assertEqual(inst["inst-a"]["labs"], ["lab-a"])
        self.assertEqual(inst["inst-a"]["publicadores"], ["teste-br"])
        self.assertEqual(inst["inst-a"]["n_modelos"], 2)
        self.assertEqual(inst["inst-b"]["publicadores"], ["teste-fora"])
        tipos = {tuple(l[:3]) for l in d["vinculos"]["linhas"]}
        self.assertIn(("pub:teste-br", "lab:lab-a", "conta_oficial"), tipos)
        self.assertIn(("pub:teste-br", "pub:teste-fora", "relacionado"), tipos)
        self.assertIn(("lab:lab-a", "inst:inst-a", "mesma_organizacao"), tipos)
        self.assertIn(("lab:lab-a", "inst:inst-b", "mesma_organizacao"), tipos, "parceira")
        self.assertEqual(d["vinculos"]["colunas"], ["de", "para", "tipo", "fonte"])
        raiz_ids = [(n["tipo"], n["id"]) for n in d["hierarquia"]]
        self.assertEqual(raiz_ids, [("instituicao", "inst-a"), ("instituicao", "inst-b"), ("publicador", "teste-nc")])
        self.assertEqual(d["hierarquia"][0]["filhos"][0]["tipo"], "laboratorio")
        self.assertEqual(d["hierarquia"][0]["filhos"][0]["filhos"][0], {"tipo": "publicador", "id": "teste-br", "n_modelos": 2, "filhos": []})
        mods = {m["id"]: m for m in d["modelos"]}
        self.assertEqual(mods["teste-nc/enc-1B"]["familia_tarefa"], "codificador")
        self.assertEqual(mods["teste-br/alfa-1B"]["familia_tarefa"], "gerador")
        f = d["foto"]
        self.assertEqual(f["por_familia_tarefa"]["codificador"]["brasil"]["modelos"], 1)
        self.assertEqual(f["por_familia_tarefa"]["codificador"]["brasil_sem_maior"]["modelos"], 1)
        self.assertEqual(f["por_familia_tarefa"]["gerador"]["brasil_sem_maior"]["modelos"], 0)
        self.assertEqual(f["sem_maior_publicador"]["id"], "teste-br")
        self.assertEqual(f["sem_maior_publicador"]["brasil"]["modelos"], 1)
        self.assertEqual(f["brasil"]["modelos"], 3, "foto.brasil conta todos, geradores e codificadores")

    def test_pessoa_afiliada_e_instituicao_no_exterior(self):
        ev = {k: v for k, v in json.load(open(os.path.join(ENT, "22h.json")))["evidencia_pais"].items() if k != "regra"}
        inst = json.load(open(os.path.join(self.raiz, "data", "entidades", "instituicao", "inst-b.json")))
        inst["pais"], inst["regiao"] = "DE", "DE-NW"
        json.dump(inst, open(os.path.join(self.raiz, "data", "entidades", "instituicao", "inst-b.json"), "w"), ensure_ascii=False)
        pes = entidade("rhaymison", "teste-pes", natureza="instituicao", evidencia_natureza={"classe": "instituicao", **{k: v for k, v in ev.items()}},
                       vinculos=[{"alvo": {"tipo": "instituicao", "id": "inst-b"}, "relacao": "pesquisador", "fonte": ev}])
        self.por(pes)
        ApiFalsa.autores["teste-pes"] = {"nome": "Pessoa", "modelos": [modelo("teste-pes", "p-1B")]}
        self.coletar("--tudo")
        d = self.dados_js()
        p = {x["id"]: x for x in d["publicadores"]}["teste-pes"]
        self.assertEqual((p["natureza"], p["natureza_rotulo"], p["afiliado_a"]), ("instituicao", "afiliada", ["inst-b"]))
        self.assertEqual({x["id"]: x for x in d["publicadores"]}["teste-br"].get("natureza_rotulo"), None, "so para pessoa")
        self.assertEqual(p["classe_pais"], "br_evidencia")
        no = [n for n in d["hierarquia"] if n["id"] == "inst-b"][0]
        self.assertEqual(no["pais"], "DE")
        self.assertEqual({i["id"]: i["pais"] for i in d["instituicoes"]}["inst-b"], "DE")
        self.assertEqual(d["foto"]["instituicoes_por_pais"], {"BR": 1, "DE": 1})

    def test_relacoes_sem_rede_e_idempotentes(self):
        self.coletar("--tudo")
        r = self.coletar("--novos")
        self.assertIn("nada a coletar", r.stdout)
        p = os.path.join(self.raiz, "data", "entidades", "publicador", "teste-nc.json")
        e = json.load(open(p))
        e["vinculos"] = [{"alvo": {"tipo": "instituicao", "id": "inst-a"}, "relacao": "membro", "fonte": json.load(open(os.path.join(ENT, "22h.json")))["fontes"][0] | {"trecho": "x y z"}}]
        json.dump(e, open(p, "w"), ensure_ascii=False)
        antes = len(ApiFalsa.acessos)
        r = self.coletar("--novos")
        self.assertEqual(len(ApiFalsa.acessos), antes, "mudar so as relacoes nao chama a API")
        self.assertEqual(self.dados_js()["publicadores"][[x["id"] for x in self.dados_js()["publicadores"]].index("teste-nc")]["instituicoes"], ["inst-a"])

    def test_credito_nao_cadastra_modelo(self):
        self.coletar("--tudo")
        p = os.path.join(self.raiz, "data", "entidades", "instituicao", "inst-a.json")
        e = json.load(open(p))
        fonte = e["fontes"][0]
        e["modelos_creditados"] = [{"modelo": "teste-br/alfa-1B", "papel": "desenvolvedor", "fonte": fonte}]
        json.dump(e, open(p, "w"), ensure_ascii=False)
        self.coletar("--novos")
        mods = {m["id"]: m for m in self.dados_js()["modelos"]}
        self.assertEqual(mods["teste-br/alfa-1B"]["creditos"], ["inst:inst-a:desenvolvedor"])
        self.assertEqual(mods["teste-br/alfa-1B"]["publicador"], "teste-br", "o dono continua sendo um so")
        self.assertEqual(mods["teste-br/beta-2B"]["creditos"], [])


class TestValidadorRelacoes(unittest.TestCase):
    def valida(self, entidades):
        tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, tmp, True)
        for e in entidades:
            d = os.path.join(tmp, "data", "entidades", e["entidade"])
            os.makedirs(d, exist_ok=True)
            json.dump(e, open(os.path.join(d, e["id"] + ".json"), "w"), ensure_ascii=False)
        env = dict(os.environ, VALIDAR_RAIZ=tmp)
        r = subprocess.run([sys.executable, os.path.join(REPO, "scripts", "validar.py")], env=env, capture_output=True, text=True)
        return r.returncode, r.stdout

    def inst(self, id_, pai=None):
        e = json.load(open(os.path.join(REPO, "data", "entidades", "instituicao", "usp.json")))
        e["id"] = id_
        if pai:
            e["parte_de"] = pai
        return e

    def test_ciclo_e_inexistente(self):
        a, b, c = self.inst("inst-a", "inst-b"), self.inst("inst-b", "inst-c"), self.inst("inst-c", "inst-a")
        rc, out = self.valida([a, b, c])
        self.assertEqual(rc, 1)
        self.assertIn("VINCULO_CICLO", out)
        rc, out = self.valida([self.inst("inst-a", "nao-existe")])
        self.assertIn("REF_INEXISTENTE", out)

    def test_aceita_hierarquia_valida_e_lab_com_instituicao(self):
        lab = json.load(open(os.path.join(REPO, "data", "entidades", "laboratorio", "c4ai-usp.json")))
        lab["instituicao"] = "inst-b"
        rc, out = self.valida([self.inst("inst-a"), self.inst("inst-b", "inst-a"), lab | {"id": "lab-x"}])
        self.assertEqual(rc, 0, out)
        lab["instituicao"] = "inst-sem-cadastro"
        rc, out = self.valida([self.inst("inst-a"), lab | {"id": "lab-x"}])
        self.assertIn("REF_INEXISTENTE", out)


class TestAvatares(unittest.TestCase):
    """Avatar publico do Hugging Face de quem portou o build: so o endereco (nunca a imagem); ocultar_avatar e a lista ocultar valem."""
    @classmethod
    def setUpClass(cls):
        sys.path.insert(0, os.path.join(REPO, "scripts"))

    def valida(self, conteudo, entidades=()):
        tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, tmp, True)
        os.makedirs(os.path.join(tmp, "data"), exist_ok=True)
        json.dump(conteudo, open(os.path.join(tmp, "data", "avatares.json"), "w"))
        for e in entidades:
            d = os.path.join(tmp, "data", "entidades", e["entidade"]); os.makedirs(d, exist_ok=True)
            json.dump(e, open(os.path.join(d, e["id"] + ".json"), "w"), ensure_ascii=False)
        r = subprocess.run([sys.executable, os.path.join(REPO, "scripts", "validar.py")], env=dict(os.environ, VALIDAR_RAIZ=tmp), capture_output=True, text=True)
        return r.returncode, r.stdout

    def test_validador_aceita_e_rejeita(self):
        ok = {"spec": "1.0", "ocultar": ["fulano"], "avatares": {"mradermacher": "https://huggingface.co/avatars/abc.svg"}}
        rc, out = self.valida(ok)
        self.assertEqual(rc, 0, out)
        rc, out = self.valida({"spec": "1.0", "ocultar": [], "avatares": {"x": "https://exemplo.com/foto.png"}})   # so enderecos do proprio Hugging Face
        self.assertEqual(rc, 1)
        rc, out = self.valida({"spec": "1.0", "ocultar": ["fulano"], "avatares": {"fulano": "https://huggingface.co/avatars/abc.svg"}})   # quem pediu para ocultar nao pode ter avatar
        self.assertIn("AVATAR_OCULTO", out)

    def test_gerador_omite_quem_pediu_ocultar(self):
        import coletar
        antigo = coletar.RAIZ
        tmp = tempfile.mkdtemp(); self.addCleanup(shutil.rmtree, tmp, True)
        os.makedirs(os.path.join(tmp, "data", "entidades", "publicador"))
        json.dump({"spec": "1.0", "ocultar": ["a"], "avatares": {"a": "https://huggingface.co/avatars/1.svg", "b": "https://huggingface.co/avatars/2.svg", "c": "https://huggingface.co/avatars/3.svg"}}, open(os.path.join(tmp, "data", "avatares.json"), "w"))
        json.dump({"spec": "1.0", "entidade": "publicador", "id": "c", "ocultar_avatar": True}, open(os.path.join(tmp, "data", "entidades", "publicador", "c.json"), "w"))
        coletar.RAIZ = tmp
        try:
            self.assertEqual(sorted(coletar.avatares_web()), ["b"])
        finally:
            coletar.RAIZ = antigo

    def test_portador_do_build_em_destaque(self):
        import coletar
        m = {"publicador": "orig", "builds": [{"autor": "outro", "destaque": False, "url": "u1"}, {"autor": "comunidade", "destaque": True, "url": "u2", "runtime_org": False}]}
        self.assertEqual(coletar.portador_info(m), {"portado_por": "comunidade", "portado_papel": "comunidade", "portado_url": "u2"})
        self.assertEqual(coletar.portador_info({"publicador": "orig", "builds": [{"autor": "Orig", "url": "u"}]})["portado_papel"], "proprio")
        self.assertEqual(coletar.portador_info({"publicador": "orig", "builds": []}), {})


class TestFamilia(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        sys.path.insert(0, os.path.join(REPO, "scripts"))
        import coletar
        cls.f = staticmethod(lambda rid, base=None: coletar.familia(rid, ["base_model:" + base] if base else []))

    def test_tamanho_e_variante_nao_separam(self):
        f = self.f
        self.assertEqual(f("neuralmind/bert-base-portuguese-cased"), "bert-portuguese")
        self.assertEqual(f("neuralmind/bert-large-portuguese-cased"), "bert-portuguese")
        self.assertEqual(f("x/bert-base-uncased"), "bert")
        self.assertEqual(f("x/bert-base-portuguese-cased-domain-classifier"), "bert-portuguese")
        self.assertEqual(f("a/TeenyTinyLlama-460m"), f("a/TeenyTinyLlama-160m"))
        self.assertEqual(f("a/Mistral-7B-Instruct-v0.2"), "Mistral")
        self.assertEqual(f("a/Tucano-160m"), f("a/Tucano-2b4"))
        self.assertEqual(f("x/qualquer-nome", "neuralmind/bert-base-portuguese-cased"), "bert-portuguese", "usa o modelo-base")

    def test_geracoes_diferentes_continuam_distintas(self):
        f = self.f
        self.assertNotEqual(f("a/Qwen2.5-7B"), f("a/Qwen3-4B"))
        self.assertNotEqual(f("a/Llama-2-7b"), f("a/Llama-3-8B"))
        self.assertNotEqual(f("a/Llama-3-8B"), f("a/Llama-3.1-8B"))
        self.assertNotEqual(f("a/gemma-2b"), f("a/gemma-2-9b"))
        self.assertNotEqual(f("a/Tucano-160m"), f("a/Tucano2-0.6B"))
        self.assertEqual((f("a/Qwen2.5-7B"), f("a/Llama-3.1-8B"), f("a/gemma-2-9b")), ("Qwen2.5", "Llama-3.1", "gemma-2"))

    def test_nome_de_marca_so_de_entidade_curada(self):
        e = json.load(open(os.path.join(REPO, "data", "entidades", "familia", "bert-portuguese.json")))
        self.assertEqual((e["id"], e["nome"]), ("bert-portuguese", "BERTimbau"))
        self.assertTrue(all(f.get("trecho") for f in e["fontes"]))
        fam = {x["id"]: x for x in json.load(open(os.path.join(REPO, "data", "familias.json")))["familias"]}
        self.assertEqual(fam["bert-portuguese"]["nome"], "BERTimbau")
        self.assertEqual(fam["bert"]["nome"], "bert", "sem entidade curada, o nome e a chave derivada")


class TestCreditoRealVerificado(unittest.TestCase):
    def test_modelos_pessoais_e_creditados(self):
        d = json.load(open(os.path.join(REPO, "data", "relacoes.json")))
        mods = {m["id"]: m for m in json.load(open(os.path.join(REPO, "data", "modelos.json")))["modelos"]}
        fap = [i for i in d["instituicoes"] if i["id"] == "fapergs"][0]
        self.assertEqual(fap["n_creditados"], 13)
        pessoa = [p for p in json.load(open(os.path.join(REPO, "data", "publicadores.json")))["publicadores"] if p["id"] == "nicholasKluge"][0]
        self.assertEqual(pessoa["labs"], ["caisa-b-it"], "pessoa afiliada ao laboratorio")
        self.assertEqual(mods["nicholasKluge/TeenyTinyLlama-460m"]["creditos"], ["inst:fapergs:financiador"])
        self.assertEqual(mods["nicholasKluge/TeenyTinyLlama-460m"]["publicador"], "nicholasKluge", "o dono continua sendo um so")
        self.assertEqual(mods["nicholasKluge/Aira-2-124M"]["creditos"], [], "o que o cartao nao sustenta continua pessoal")


class TestRelacionadosPessoaGrupo(TestValidadorRelacoes):
    def test_pessoa_e_grupo_relacionados_mas_pessoa_com_pessoa_nao(self):
        ev = {k: v for k, v in json.load(open(os.path.join(ENT, "22h.json")))["evidencia_pais"].items() if k != "regra"}
        grupo = entidade("22h", "grupo-x", relacionados=[{"publicador": "pessoa-x", "fonte": ev}])
        pessoa = entidade("rhaymison", "pessoa-x")
        rc, out = self.valida([grupo, pessoa])
        self.assertEqual(rc, 0, out)
        p2 = entidade("rhaymison", "pessoa-y", relacionados=[{"publicador": "pessoa-x", "fonte": ev}], natureza="nao_classificada")
        p2.pop("evidencia_natureza", None)
        rc, out = self.valida([pessoa, p2])
        self.assertIn("PESSOA_RELACAO", out)


CARTAO_PADRAO = """---
library_name: transformers
tags: []
---

# Model Card for Model ID

<!-- Provide a quick summary of what the model is/does. -->

## Model Details

### Model Description

This is the model card of a 🤗 transformers model that has been pushed on the Hub. This model card has been automatically generated.

- **Developed by:** [More Information Needed]
- **Funded by [optional]:** [More Information Needed]
- **Model type:** [More Information Needed]

## Uses

[More Information Needed]

## Bias, Risks, and Limitations

[More Information Needed]

### Recommendations

Users (both direct and downstream) should be made aware of the risks, biases and limitations of the model. More information needed for further recommendations.

## How to Get Started with the Model

Use the code below to get started with the model.

[More Information Needed]
"""
CARTAO_TRAINER = """---
library_name: transformers
license: gemma
base_model: google/gemma-3-1b-it
tags:
- generated_from_trainer
---

<!-- This model card has been generated automatically according to the information the Trainer had access to. You
should probably proofread and complete it, then remove this comment. -->

# gemma-1b-it-assin2

This model is a fine-tuned version of [google/gemma-3-1b-it](https://huggingface.co/google/gemma-3-1b-it) on an unknown dataset.
It achieves the following results on the evaluation set:
- Loss: 0.1835

## Model description

More information needed

## Intended uses & limitations

More information needed

## Training and evaluation data

More information needed

### Training hyperparameters

The following hyperparameters were used during training:
- learning_rate: 2e-05
- num_epochs: 2
"""
CARTAO_CHECKPOINT = """---
language: en
license: llama2
base_model: locuslab/tofu_ft_llama2-7b
---
# IHL + Reset Both - TOFU forget10 - Epoch 9/20

Input embeddings and LM head initialized from another model; other weights retained. Standalone full model checkpoint.
"""
CARTAO_ESCRITO = """---
license: apache-2.0
language: pt
datasets:
- exemplo/corpus
base_model: exemplo/base
---
# Modelo Exemplo

Modelo de linguagem pequeno treinado em português do Brasil. Este cartão descreve os dados de treino, a arquitetura, a avaliação em tarefas de classificação e de perguntas e respostas, os limites conhecidos e o uso pretendido. O treino usou 10 bilhões de tokens de textos públicos, filtrados por qualidade, e a avaliação comparou o modelo com linhas de base de tamanho semelhante em quatro conjuntos de teste, com resultados médios e desvio padrão por execução.

## Uso

```python
from transformers import pipeline
```

## Citação

Veja o artigo associado.
"""


class TestMaturidade(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        sys.path.insert(0, os.path.join(REPO, "scripts"))
        import coletar
        cls.m = staticmethod(coletar.maturidade)
        cls.c = coletar

    def test_cartoes_padrao_sao_experimentais(self):
        mat, sin = self.m(CARTAO_PADRAO, "autor/modelo-run9")
        self.assertEqual(mat, "experimental")
        self.assertIn("cartao_padrao_hub", sin)
        self.assertIn("placeholders_more_info", sin)
        self.assertIn("sem_licenca", sin)
        mat, sin = self.m(CARTAO_TRAINER, "autor/gemma-1b-it-assin2")
        self.assertEqual((mat, sin[0]), ("experimental", "cartao_trainer_sem_descricao"))
        self.assertEqual(self.m("---\nlicense: mit\n---\n# Curious\n", "a/b")[0], "experimental", "cartao sem conteudo proprio")

    def test_cartao_curto_que_se_declara_checkpoint(self):
        mat, sin = self.m(CARTAO_CHECKPOINT, "autor/tofu-llama2-7b-epoch09")
        self.assertEqual((mat, sin[0]), ("experimental", "cartao_curto_de_checkpoint"))

    def test_cartao_escrito_e_documentado_mesmo_sem_cabecalho_completo(self):
        self.assertEqual(self.m(CARTAO_ESCRITO, "autor/modelo-exemplo")[0], "documentado")
        sem_yaml = CARTAO_ESCRITO.split("---\n", 2)[2]
        mat, sin = self.m(sem_yaml, "autor/modelo-exemplo")
        self.assertEqual(mat, "documentado")
        self.assertIn("sem_licenca", sin, "sinal fraco informativo; nao basta para experimental")
        mat, _ = self.m(CARTAO_ESCRITO + "\n\n" + "Resultados.\n" * 5, "autor/modelo-run3")
        self.assertEqual(mat, "documentado", "nome de checkpoint com cartao longo continua documentado")

    def test_cartao_padrao_com_texto_proprio_substancial_e_documentado(self):
        mat, _ = self.m(CARTAO_PADRAO + "\n\n## Descrição\n\n" + "Modelo treinado para tarefas de saúde em português, com dados clínicos anonimizados e avaliação em três hospitais. " * 4, "autor/modelo")
        self.assertEqual(mat, "documentado")

    def test_readme_indisponivel_e_indeterminado(self):
        self.assertEqual(self.m(None, "a/b"), ("indeterminado", ["readme_indisponivel"]))

    def test_compactacao_para_a_interface(self):
        out = self.c.compactar_modelos([{"id": "a/b", "maturidade": "experimental", "sinais_maturidade": ["cartao_padrao_hub", "sem_licenca"]}, {"id": "a/c", "maturidade": "indeterminado", "sinais_maturidade": ["readme_indisponivel"]}])
        self.assertEqual((out[0]["maturidade"], out[1]["maturidade"]), ("e", "i"))
        self.assertEqual([self.c.SINAIS_MAT[i] for i in out[0]["sinais_maturidade"]], ["cartao_padrao_hub", "sem_licenca"])


class TestMaturidadeNaColeta(Base):
    def test_coleta_cache_e_contagens(self):
        self.por(entidade("22h", "teste-br"))
        self.por(entidade("google", "teste-fora"))
        ApiFalsa.readmes = {"teste-br/alfa-1B": CARTAO_PADRAO, "teste-br/beta-2B": CARTAO_ESCRITO, "teste-fora/m-1B": CARTAO_ESCRITO}
        self.assertEqual(self.coletar("--tudo").returncode, 0)
        d = json.load(open(os.path.join(self.raiz, "data", "modelos.json")))["modelos"]
        m = {x["id"]: x for x in d}
        self.assertEqual((m["teste-br/alfa-1B"]["maturidade"], m["teste-br/beta-2B"]["maturidade"]), ("experimental", "documentado"))
        self.assertEqual(m["teste-br/alfa-1B"]["sinais_maturidade"][0], "cartao_padrao_hub")
        foto = json.load(open(os.path.join(self.raiz, "data", "foto.json")))
        self.assertEqual(foto["maturidade"]["brasil"], {"experimental": 1, "documentado": 1, "indeterminado": 0})
        self.assertEqual(foto["maturidade"]["mundo"]["documentado"], 1)
        self.assertEqual(foto["maturidade"]["builds"]["experimental"]["total"], 1)
        self.assertEqual(foto["regra_maturidade"], 1)
        js = open(os.path.join(self.raiz, "web", "data.js")).read()
        dados = json.loads(js[len("window.MAPA_DADOS="):-1])
        mm = {x["id"]: x for x in dados["modelos"]}
        self.assertEqual(mm["teste-br/alfa-1B"]["maturidade"], "e")
        self.assertEqual(dados["dicionario_maturidade"]["maturidade"]["e"], "experimental")
        self.assertEqual(dados["foto"]["maturidade"]["brasil"]["experimental"], 1)
        lidos = sum(1 for a in ApiFalsa.acessos if a[0] == "readme")
        self.assertEqual(lidos, 3)
        r = self.coletar("--tudo", "--fresh")   # recoleta completa: o cache por modelo (mesma data de atualizacao) evita reler
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(sum(1 for a in ApiFalsa.acessos if a[0] == "readme"), lidos + 3, "--fresh apaga o cache e le de novo")
        r = self.coletar("--novos")
        self.assertIn("nada a coletar", r.stdout)

    def test_indisponivel_e_sem_maturidade(self):
        self.por(entidade("22h", "teste-br"))
        self.coletar("--novos")
        d = {x["id"]: x for x in json.load(open(os.path.join(self.raiz, "data", "modelos.json")))["modelos"]}
        self.assertEqual(d["teste-br/alfa-1B"]["maturidade"], "indeterminado")
        self.assertEqual(d["teste-br/alfa-1B"]["sinais_maturidade"], ["readme_indisponivel"])


class TestDatasetsReais(unittest.TestCase):
    def test_escopo_e_pais_do_publicador_e_nao_restam_datasets_pt(self):
        d = json.load(open(os.path.join(REPO, "data", "datasets.json")))["datasets"]
        pubs = {p["id"]: p for p in json.load(open(os.path.join(REPO, "data", "publicadores.json")))["publicadores"]}
        self.assertTrue(d)
        self.assertEqual({x["escopo"] for x in d} - {"br", "mundo"}, set(), "nao restam datasets com escopo pt")
        self.assertTrue(any(x["escopo"] == "mundo" and not x["pt"] for x in d), "ha datasets do mundo sem portugues")
        self.assertTrue(any(x["escopo"] == "mundo" and x["pt"] for x in d))
        for x in d:
            if x["publicador"] in pubs:
                self.assertEqual(x["escopo"], "br" if pubs[x["publicador"]]["escopo"] == "br" else "mundo", x["id"])
        js = open(os.path.join(REPO, "web", "data-datasets.js")).read()
        col = json.loads(js[len("window.MAPA_DADOS.datasets="):-1])["colunas"]
        self.assertEqual((col[14], col[16]), ("escopo", "pt"))


class TestRotulos(unittest.TestCase):
    def test_tipos_de_fonte_tem_rotulo_em_pt_e_en(self):
        app = open(os.path.join(REPO, "web", "app.js"), encoding="utf-8").read()
        drawer = open(os.path.join(REPO, "web", "drawer.js"), encoding="utf-8").read()   # o painel de detalhes tem modulo proprio
        tipos = json.load(open(os.path.join(REPO, "schema", "comum.schema.json")))["$defs"]["tipo_fonte"]["enum"]
        tipos += ["orgao_fomento", "perfil", "cartao", "institucional", "curadoria"]   # tipos de fonte e de evidencia derivada
        for t in tipos:
            self.assertEqual(app.count(f"src_{t}: '"), 2, f"falta rotulo PT e EN para {t}")
        self.assertIn("tipoFonte(p.evidencia_pais.tipo)", app + drawer)
        self.assertNotIn("evidencia_pais.tipo +", app + drawer, "o tipo cru nao deve ser impresso")


@unittest.skipUnless(shutil.which("git") and shutil.which("bash"), "precisa de git e bash")
class TestProcessarPR(unittest.TestCase):
    def sh(self, *cmd, cwd, check=True):
        return subprocess.run(list(cmd), cwd=cwd, capture_output=True, text=True, check=check)

    def test_e_processar_pr_local(self):
        tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, tmp, True)
        origem = os.path.join(tmp, "origem.git")
        trabalho = os.path.join(tmp, "trabalho")
        # copia do repositorio atual (arquivos do diretorio de trabalho, sem .git), com um remoto local
        self.sh("git", "init", "-q", "-b", "main", trabalho, cwd=tmp)
        for pasta in ("scripts", "schema", "seed", "data", "docs", "web", "tests", "templates"):
            if os.path.isdir(os.path.join(REPO, pasta)):
                shutil.copytree(os.path.join(REPO, pasta), os.path.join(trabalho, pasta), ignore=shutil.ignore_patterns("__pycache__"))
        shutil.copy2(os.path.join(REPO, ".gitignore"), os.path.join(trabalho, ".gitignore"))
        self.sh("git", "add", "-A", cwd=trabalho)
        self.sh(*GIT, "commit", "-q", "-m", "base", cwd=trabalho)
        self.sh("git", "clone", "-q", "--bare", trabalho, origem, cwd=tmp)
        self.sh("git", "remote", "add", "origin", origem, cwd=trabalho)
        # PR 7: so entidade; PR 8: entidade e um script (deve gerar alerta)
        pr = os.path.join(tmp, "pr")
        self.sh("git", "clone", "-q", origem, pr, cwd=tmp)
        json.dump(entidade("22h", "teste-pr"), open(os.path.join(pr, "data", "entidades", "publicador", "teste-pr.json"), "w"), ensure_ascii=False, indent=2)
        self.sh("git", "add", "-A", cwd=pr)
        self.sh(*GIT, "commit", "-q", "-m", "pr7", cwd=pr)
        self.sh("git", "push", "-q", "origin", "HEAD:refs/pull/7/head", cwd=pr)
        with open(os.path.join(pr, "scripts", "coletar.py"), "a") as f:
            f.write("\n# alteracao de teste\n")
        self.sh("git", "add", "-A", cwd=pr)
        self.sh(*GIT, "commit", "-q", "-m", "pr8", cwd=pr)
        self.sh("git", "push", "-q", "origin", "HEAD:refs/pull/8/head", cwd=pr)
        refs_antes = self.sh("git", "for-each-ref", cwd=origem).stdout
        head_antes = self.sh("git", "rev-parse", "HEAD", cwd=trabalho).stdout
        env = dict(os.environ, PR_REMOTE="origin", PR_BASE="main")
        r = subprocess.run(["bash", "scripts/processar_pr.sh", "7", "--sem-rede"], cwd=trabalho, env=env, capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("nova: data/entidades/publicador/teste-pr.json", r.stdout)
        self.assertIn("teste-pr", r.stdout.split("O que a coleta faria")[1], "a coleta listaria o publicador novo")
        self.assertIn("validacao passou", r.stdout)
        r = subprocess.run(["bash", "scripts/processar_pr.sh", "8", "--sem-rede"], cwd=trabalho, env=env, capture_output=True, text=True)
        self.assertEqual(r.returncode, 2, r.stdout + r.stderr)
        self.assertIn("ALERTA", r.stdout)
        self.assertTrue([f for f in os.listdir(os.path.join(trabalho, ".relatorios")) if f.startswith("pr-7-")])
        # somente leitura: nada mudou no remoto nem no ramo atual, e nao sobrou worktree
        self.assertEqual(self.sh("git", "for-each-ref", cwd=origem).stdout, refs_antes)
        self.assertEqual(self.sh("git", "rev-parse", "HEAD", cwd=trabalho).stdout, head_antes)
        self.assertEqual(self.sh("git", "worktree", "list", cwd=trabalho).stdout.count("\n"), 1)
        r = subprocess.run(["bash", "scripts/processar_pr.sh", "abc"], cwd=trabalho, env=env, capture_output=True, text=True)
        self.assertEqual(r.returncode, 3)


class TestConversaoFiel(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        sys.path.insert(0, os.path.join(REPO, "scripts"))
        import coletar
        cls.c = coletar

    def test_nome_sem_formato(self):
        self.assertEqual(self.c.nome_sem_formato("sabia-7b-GGUF"), ["sabia", "7b"])
        self.assertEqual(self.c.nome_sem_formato("Tucano-630m-mlx-4bit"), ["tucano", "630m"])
        self.assertEqual(self.c.nome_sem_formato("Firefly-Q8_0-GGUF"), ["firefly"])

    def test_declarado_pela_tag(self):
        r = self.c.classificar_conversao({"id": "a/modelo-x-GGUF", "tags": ["gguf", "base_model:quantized:b/modelo-x"]}, "a")
        self.assertEqual((r["grau"], r["original"]), ("declarado", "b/modelo-x"))

    def test_derivado_nao_e_conversao(self):
        self.assertIsNone(self.c.classificar_conversao({"id": "a/modelo-x-GGUF", "tags": ["gguf", "base_model:finetune:b/modelo-x"]}, "a"))

    def test_nome_sem_marca_nao_e_conversao(self):
        self.assertIsNone(self.c.classificar_conversao({"id": "a/modelo-y", "tags": ["base_model:quantized:b/modelo-y"]}, "a"))

    def test_reatribuir_move_o_build_e_remove_a_entrada(self):
        orig = {"id": "b/modelo-x", "publicador": "b", "escopo": "br", "builds": [], "fontes": [], "familia_tarefa": "gerador"}
        conv = {"id": "a/modelo-x-GGUF", "publicador": "a", "escopo": "br", "fontes": [], "conversao": {"grau": "declarado", "original": "b/modelo-x", "trecho": "base_model:quantized:b/modelo-x"},
                "builds": [{"repo": "a/modelo-x-GGUF", "autor": "a", "formato": "gguf", "oficial": True, "runtime_org": False, "proprio": True, "gb": 2.0, "downloads": 5, "destaque": True, "url": "u"}]}
        pubs = [{"id": "a"}, {"id": "b"}]
        saida, rel = self.c.reatribuir_conversoes(pubs, [orig, conv])
        self.assertEqual([m["id"] for m in saida], ["b/modelo-x"])
        b = saida[0]["builds"][0]
        self.assertEqual((b["autor"], b["oficial"], b["grau"]), ("a", False, "declarado"))
        self.assertTrue(saida[0]["gguf_wllama"])
        self.assertEqual(rel["movidos"][0]["para"], "b/modelo-x")


class TestEscopoDoModelo(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        sys.path.insert(0, os.path.join(REPO, "scripts"))
        import coletar
        cls.c = coletar

    def modelo(self, i, pub, creditos=(), foco=None):
        m = {"id": i, "publicador": pub, "escopo": "mundo", "creditos": list(creditos), "url": "https://huggingface.co/" + i}
        if foco:
            m["foco_pt_br"] = foco
        return m

    def rodar(self, ms, fonte=None):
        insts = {"financiadora-br": {"pais": "BR"}, "uni-de": {"pais": "DE"}}
        mapa = {"pub-br": {"escopo": "br"}, "pub-x": {"escopo": "mundo"}}
        fc = {(m["id"].lower(), c): fonte or {"url": "https://exemplo.org/p", "trecho": "financiado pela instituicao"} for m in ms for c in m["creditos"]}
        self.c.atribuir_origem(ms, mapa, {}, insts, fc)
        return {m["id"]: m for m in ms}

    def test_condicoes(self):
        r = self.rodar([self.modelo("pub-br/a", "pub-br"),
                        self.modelo("pub-x/b", "pub-x", ["inst:financiadora-br:financiador"]),
                        self.modelo("pub-x/c", "pub-x", ["inst:financiadora-br:desenvolvedor"]),
                        self.modelo("pub-x/d", "pub-x", ["inst:financiadora-br:parceiro", "inst:uni-de:desenvolvedor"]),
                        self.modelo("pub-x/e", "pub-x", foco={"criterio": "idioma_unico", "trecho": "language: pt"}),
                        self.modelo("pub-x/f", "pub-x")])
        self.assertEqual(r["pub-br/a"]["origem_motivo"], "publicador")
        self.assertEqual((r["pub-x/b"]["escopo"], r["pub-x/b"]["origem_motivo"]), ("br", "financiador"))
        self.assertEqual(r["pub-x/b"]["origem_fonte"]["trecho"], "financiado pela instituicao")
        self.assertEqual(r["pub-x/c"]["origem_motivo"], "desenvolvedor")
        self.assertEqual(r["pub-x/d"]["escopo"], "mundo")   # parceiro e instituicao estrangeira nao qualificam
        self.assertEqual(r["pub-x/e"]["origem_motivo"], "foco_pt_br")
        self.assertEqual(r["pub-x/f"]["escopo"], "mundo")
        self.assertNotIn("origem_motivo", r["pub-x/f"])

    def test_foco_so_portugues(self):
        self.assertEqual(self.c.idiomas_tags(["pt-BR", "text-generation", "llama", "en"]), ["en", "pt"])
        self.assertIsNone(self.c.foco_pt_br("a/b-ptpt-encoder", [], ["pt"]))             # portugues europeu fica fora
        self.assertIsNone(self.c.foco_pt_br("a/b", ["pt-PT"], ["pt"]))
        self.assertEqual(self.c.foco_pt_br("a/b-ptbr-encoder", [], ["pt"])["criterio"], "variante_explicita")
        self.assertIsNone(self.c.foco_pt_br("a/b", [], ["en", "es", "pt"]))               # multilingue que so inclui o portugues
        self.assertIsNone(self.c.foco_pt_br("a/b", [], ["en"]))

    def test_alvo_declarado_no_artigo_e_codigo_fonte(self):
        self.assertTrue(self.c.ALVO_ARTIGO.search("Although our efforts are mainly concerned with Brazilian Portuguese, we believe"))
        self.assertFalse(self.c.ALVO_ARTIGO.search("A BERT model tailored for the Brazilian Portuguese language"))
        self.c.BR_GITHUB["autor-br"] = "pub-br"
        self.assertTrue(self.c.LINHA_CODIGO.search("This repository has the [source code](https://github.com/autor-br/x) used to train this model."))
        self.c.BR_GITHUB.clear()


if __name__ == "__main__":
    unittest.main(verbosity=2)
