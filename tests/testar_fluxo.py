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
GIT = ["git", "-c", "user.name=teste", "-c", "user.email=teste@example.invalid"]


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
        return self._json([])   # tree/main e demais rotas: vazio


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

    def por(self, e):
        json.dump(e, open(os.path.join(self.raiz, "data", "entidades", "publicador", e["id"] + ".json"), "w"), ensure_ascii=False, indent=2)

    def coletar(self, *args, esperar=0, popen=False):
        env = dict(os.environ, COLETOR_RAIZ=self.raiz, COLETOR_API=self.api, COLETOR_PAUSA="0")
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

    def test_negativos(self):
        self.assertIsNone(self.inf("Qwen3-Embedding-0.6B", ["safetensors", "qwen3"]), "embedding")
        self.assertIsNone(self.inf("x-lora", ["peft", "llama"]), "adaptador")
        self.assertIsNone(self.inf("x", ["bert", "pt"]), "encoder")
        self.assertIsNone(self.inf("BERTimbau-NER", ["safetensors", "t5"]), "nome de classificador")
        self.assertIsNone(self.inf("x", ["llama", "text-classification"]), "classificacao")
        self.assertIsNone(self.inf("CAPIVARA", ["open_clip", "safetensors"]), "visao")
        self.assertIsNone(self.inf("x", ["llama"], total=None), "sem tamanho conhecido")
        self.assertIsNone(self.inf("x", ["llama"], pipeline_tag="text-classification"), "ja tem tarefa declarada")
        self.assertIsNone(self.inf("x", ["region:us"]), "sem sinal")

    def test_integrado_entra_marcado_e_respeita_corte(self):
        c = self.c
        base = dict(downloads=1, lastModified="2026-01-01T00:00:00.000Z")
        ok = dict(id="p/AMP_llama", tags=["safetensors", "llama"], safetensors={"total": 4_000_000_000}, **base)
        grande = dict(id="p/Grande-llama", tags=["safetensors", "llama"], safetensors={"total": 30_000_000_000}, **base)
        emb = dict(id="p/Emb-embedding", tags=["safetensors", "qwen3"], safetensors={"total": 600_000_000}, **base)
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


class TestRotulos(unittest.TestCase):
    def test_tipos_de_fonte_tem_rotulo_em_pt_e_en(self):
        app = open(os.path.join(REPO, "web", "app.js"), encoding="utf-8").read()
        tipos = json.load(open(os.path.join(REPO, "schema", "comum.schema.json")))["$defs"]["tipo_fonte"]["enum"]
        tipos += ["orgao_fomento", "perfil", "cartao", "institucional", "curadoria"]   # tipos de fonte e de evidencia derivada
        for t in tipos:
            self.assertEqual(app.count(f"src_{t}: '"), 2, f"falta rotulo PT e EN para {t}")
        self.assertIn("tipoFonte(p.evidencia_pais.tipo)", app)
        self.assertNotIn("evidencia_pais.tipo +", app, "o tipo cru nao deve ser impresso")


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


if __name__ == "__main__":
    unittest.main(verbosity=2)
