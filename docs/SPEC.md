# Observatório: padrão de dados, versão 1.0

*English summary: this is the data standard for community contributions to the Observatório (Web AI in Brazil and the world). Entities: institution, lab, publisher, researcher, family and benchmark; relations between them (publisher to lab or institution, related publishers, credits) are curated with sources; models and datasets are always derived by the collector, never contributed. One JSON file per entity under `data/entidades/`, every claim backed by at least one public source (type + URL + access date), generated fields are read-only, researchers are people and follow strict privacy rules (section 7). Validated mechanically by `scripts/validar.py`; every decision is human. Data: CC BY 4.0. Code: MIT.*

As palavras DEVE, NÃO DEVE e PODE seguem o uso da RFC 2119. Os schemas em `schema/` e `scripts/validar.py` implementam este texto; se divergirem dele, é um defeito de um dos dois.

## 1. Camadas: curado e derivado

| Camada | Onde | Quem escreve | Contribuição pode alterar? |
|---|---|---|---|
| **Curada** | `data/entidades/<tipo>/` | pessoas (por pull request), revisão humana | sim |
| **Derivada** | `data/publicadores.json`, `modelos.json`, `familias.json`, `constelacoes.json`, `foto.json`, `datasets.json`, `benchmarks.json`, `foto_camadas.json`, `relacoes.json`, `web/data.js` | só `scripts/coletar.py` (API pública do Hugging Face, regras da seção 9), executado por um mantenedor | **não**. PR que altera arquivo derivado falha na checagem (`PR_DERIVADO`); a exceção é o PR de dados derivados, em ramo `coleta-*`, aberto por um mantenedor depois da coleta e revisado como qualquer outro |
| **Exemplos** | `data/exemplos/` | mantenedor | só para ensinar o formato; nunca entram nos dados oficiais |
| **Remoções** | `data/remocoes.json` | mantenedor | não (seção 8) |

Campos derivados (status de build, `gguf*`, `via`, tamanhos, downloads, contagens, `escopo`, formatos, constelação) NÃO existem nos arquivos curados: o schema os recusa com o código `CAMPO_DERIVADO`.

Por que arquivos curados separados dos gerados: `modelos.json` tem 6 MB e é regerado toda semana; dividi-lo em ~2.000 arquivos geraria ruído de revisão e conflitos. O que se contribui são decisões humanas sobre poucas entidades.

## 2. Entidades e relações

```
publicador ──< modelo >── familia           (derivado: constelação = publicador + seus modelos)
   │              ▲
   │              └── pesquisador.modelos[]  (afirmação do pesquisador, com fonte)
instituicao ─ parte_de ─ instituicao       (hierarquia, sem ciclos)
   ▲
laboratorio ─ instituicao (id) + parceiras[]     (cada vínculo com fonte)
   ▲
   └── pesquisador.afiliacoes[].laboratorio (afirmação do pesquisador, com fonte)
publicador.vinculos[] ─ laboratorio ou instituicao   (conta_oficial, membro, pesquisador, projeto; com fonte)
publicador.relacionados[] ─ publicador              (mesmo projeto ou parceria; com fonte)
laboratorio|instituicao.modelos_creditados[] ─ modelo derivado (crédito, com fonte; não cadastra o modelo)
benchmark.datasets[] ─ datasets do Hugging Face que o benchmark aponta (derivado: metadados do dataset)
publicador ──< dataset                      (derivado: datasets públicos do publicador)
```

- **publicador**: quem publica modelos: pessoa independente, grupo, empresa, universidade ou outra organização. É a chave da constelação.
- **instituicao**: universidade, instituto, empresa, órgão de governo ou outra organização que reúne laboratórios e contas de publicação (seção 4.10).
- **laboratorio**: laboratório ou grupo de pesquisa **vinculado a uma instituição** (por id).
- **pesquisador**: pessoa com vínculo profissional público. Ver seção 7.
- **modelo**: um modelo de linguagem. É sempre derivado pelo coletor a partir do Hugging Face; não existe arquivo curado de modelo.
- **familia**: linhagem de modelos (regra F). O arquivo curado dá nome, descrição e fonte.
- **dataset**: conjunto de dados público do Hugging Face. É sempre derivado pelo coletor (seção 4.8); não existe arquivo curado de dataset.
- **benchmark**: conceito de avaliação em português ou do Brasil (por exemplo, um exame ou um corpus de avaliação), curado por contribuição com evidência, como o laboratório. Aponta para datasets; os metadados deles vêm da coleta (seção 4.9).
- **constelação**: apenas derivada (publicador e seus modelos); não se contribui.

A direção das relações é única, para haver uma só verdade por fato: o vínculo pesquisador–laboratório e pesquisador–modelo vive no arquivo do **pesquisador**; o laboratório e o modelo mostram a lista inversa, calculada. Assim, remover uma pessoa é apagar um arquivo, sem referências soltas.

## 3. Formato de arquivo: JSON, um arquivo por entidade

`data/entidades/<tipo>/<id>.json`, em UTF-8, indentação de 2 espaços, uma chave por linha.

Escolha de JSON em vez de YAML, com as razões: (1) o projeto só usa a biblioteca padrão do Python, que lê JSON e não lê YAML; (2) os dados gerados já são JSON; (3) o editor web do GitHub aceita os dois e o validador aponta linha e coluna do erro de JSON; (4) o YAML traz ambiguidades (`no`, datas sem aspas) que uma pessoa iniciante não vê. A contrapartida é a vírgula do último item, que o validador acusa com a linha.

Um arquivo por entidade: diffs de poucas linhas, revisão de um fato por vez, e dois PRs só conflitam se mexerem na mesma entidade.

## 4. Campos

Campos desconhecidos são erro. Em todos: `spec` (obrigatório, `"1.0"`), `entidade` (obrigatório), `fontes` (obrigatório, ver seção 5), `links`, `descricao` (`{"pt": "...", "en": "..."}`, até 240 caracteres cada, pelo menos um idioma), `status` (`ativo` por padrão ou `arquivado` com o objeto `arquivo`), `exemplo`.

### 4.1 Identificadores

- `id`: kebab-case `^[a-z0-9]+(-[a-z0-9]+)*$`, 2 a 60 caracteres. **Estável**: nunca é renomeado nem reaproveitado para outra coisa. Maiúsculas e minúsculas não distinguem ids (o arquivo precisa funcionar em macOS e Windows).
- **Exceção, `publicador.id`**: é a **chave da fonte primária**, com a mesma grafia do Hugging Face (`CEIA-UFG`, `HuggingFaceTB`), porque os dados derivados e a interface usam essa chave. Publicador sem conta no Hugging Face usa kebab-case.
- País: ISO 3166-1 alfa-2 (`BR`, `PT`, `US`), conferido contra a lista. Região, opcional: ISO 3166-2 (`BR-GO`). Região e país descrevem **onde fica a instituição ou o endereço profissional declarado**, nunca a nacionalidade de uma pessoa.
- Datas: `AAAA-MM-DD`, entre aspas.
- URLs: `https://`, até 300 caracteres, sem usuário (`user@`), sem `mailto:` nem `tel:`, de página pública.

### 4.2 publicador

| Campo | Obrig. | Regra |
|---|---|---|
| `id`, `nome` | sim | `nome` como o próprio publicador se apresenta |
| `tipo` | sim | `pessoa` ou `grupo` (o que a plataforma declara) |
| `natureza` | sim | `independente`, `instituicao`, `empresa` ou `nao_classificada` (regra N) |
| `classe_pais` | sim | `br_evidencia`, `fora_br` ou `nao_classificado` (regra B) |
| `pais`, `regiao` | não | `pais = BR` obrigatório se `br_evidencia`; proibido se `nao_classificado` |
| `evidencia_pais` | se `br_evidencia` | evidência (4.7) |
| `evidencia_natureza` | se natureza ≠ `nao_classificada` | evidência com `classe` igual à natureza |
| `origem_cadastro` | se `tipo = pessoa` | `autoinscricao`, `terceiro` ou `coletor` |
| `links` | sim | `hf` (ou `oficial`), `github`, `instituicao`, `repositorio`... |

### 4.3 laboratorio

`id`, `nome`, `sigla?`; `instituicao` obrigatória (id de uma instituição existente, seção 4.10); `vinculo_fonte` obrigatória, evidência (4.7) de que o laboratório pertence à instituição (tipo `site_institucional`, `perfil_oficial`, `pagina_pessoa` ou `cartao_modelo`); `parceiras[]` opcional, `{instituicao, fonte}` para instituições parceiras (por exemplo um centro mantido por uma universidade e uma empresa); `modelos_creditados[]` opcional (4.11); `areas[]` (até 8 termos de até 40 caracteres); `links`; `fontes`. Os publicadores de um laboratório **não** ficam no arquivo do laboratório: a relação vive no arquivo do publicador (4.11) e o laboratório mostra a lista inversa, calculada (`CAMPO_DERIVADO`).

### 4.4 pesquisador

`id` (`nome-sobrenome`, com instituição se houver homônimo), `nome` (nome profissional público), `origem_cadastro` (obrigatório), `afiliacoes[]` (1 a 4): `{instituicao, pais, laboratorio?, papel?, fonte}` com `fonte` em evidência de tipo `site_institucional`, `perfil_oficial` ou `pagina_pessoa`; `areas[]`; `publicacoes[]` (até 30): `{titulo, ano, fonte}`; `modelos[]`: `{modelo, fonte}` (id existente); `links`: `instituicao`, `github`, `hf`, `orcid`, `scholar`, `lattes`, `oficial` (site profissional). **Não existem** campos de e-mail, telefone, endereço, nascimento, foto, redes pessoais, nacionalidade, gênero ou qualquer atributo sensível.

### 4.5 modelo (derivado)

Não há arquivo curado de modelo. Os modelos, com id `<publicador>/<nome>` como no Hugging Face, e todos os seus campos (tarefa, tamanho, formatos, status de build, GGUF, downloads, família) são derivados pelo coletor (seção 9). `pesquisador.modelos[]` pode citar o id de um modelo derivado.

### 4.6 familia

`id` (kebab-case), `nome`, `origem?` (publicador), `descricao`, `links`, `fontes`. A pertença de modelos à família sai da regra F.

### 4.7 Fonte e evidência (referências mínimas)

Fonte: `{tipo, url, acessado}` + opcionais `rotulo`, `trecho`. Evidência: igual, com `trecho` **obrigatório** (citação literal curta, até 240 caracteres, do que a página diz). Tipos:

| `tipo` | Para quê |
|---|---|
| `perfil_oficial` | perfil da própria entidade numa plataforma (Hugging Face, GitHub, ORCID, Google Scholar, Lattes) |
| `site_institucional` | site de universidade, instituto, empresa, órgão de fomento, laboratório |
| `pagina_pessoa` | página de uma pessoa num site institucional, ou o site profissional da própria pessoa |
| `artigo` | artigo, preprint, relatório técnico |
| `repositorio` | repositório de código ou de dados |
| `cartao_modelo` | cartão (README) de um modelo |

### 4.8 dataset (derivado)

Não há arquivo curado de dataset. Cada dataset tem `id` (`<publicador>/<nome>`, como no Hugging Face), `publicador`, `nome`, `url`, `descricao` (uma linha do cartão, até 160 caracteres, sem contato pessoal), `idiomas[]` (códigos do cartão), `pt_br` (o cartão marca português do Brasil), `tarefas[]`, `licenca`, tamanho em bytes e faixa de tamanho (`<1MB`, `1-100MB`, `100MB-1GB`, `1-10GB`, `>10GB`), faixa de linhas declarada no cartão (a API de listagem não traz a contagem exata), `downloads` (30 dias), `likes`, `atualizado`, `escopo` (`br` ou `pt`), `benchmarks[]` (ids dos benchmarks que o apontam) e `fontes[]`. Só se usam metadados públicos que o próprio Hugging Face expõe; datasets privados ou com acesso restrito (gated) não entram. A forma publicada para a interface está em [docs/CONTRATO_CAMADAS.md](CONTRATO_CAMADAS.md).

### 4.9 benchmark

`id` (kebab-case), `nome`, `sigla?`, `descricao` (`pt` e `en`, 1 a 2 linhas), `dominio[]` (obrigatório; um ou mais de `geral`, `vestibular_educacao`, `juridico`, `saude`, `codigo`, `matematica`, `extracao_classificacao`, `cultura_lingua`, `outros`), `idiomas[]`, `tarefas[]`, `tipo` (`conjunto`, `avaliacao` ou `leaderboard`; `leaderboard` exige `links.leaderboard`), `datasets[]` (ids do Hugging Face, `<publicador>/<nome>`), `criador?` (`publicador` do Hugging Face, ou `nome` institucional com `fonte`), `ano?`, `links` (`artigo`, `site`, `leaderboard`, `codigo`; pelo menos um) e `fontes` (pelo menos uma, **cada uma com trecho literal** da página, como as demais evidências da seção 4.7). Campos derivados (`n_datasets`, `tamanho_total_bytes`, `downloads_total`) são calculados pelo coletor a partir dos datasets que a coleta encontra; um dataset citado que não existe, é privado ou tem acesso restrito não conta e aparece no relatório da coleta.

### 4.10 instituicao

`id` (kebab-case), `nome`, `sigla?`, `tipo` (`universidade`, `instituto`, `empresa`, `governo` ou `outro`), `pais` (ISO 3166-1), `regiao?`, `parte_de?` (id de outra instituição; a hierarquia não pode ter ciclos, `VINCULO_CICLO`), `modelos_creditados[]` opcional (4.11), `links`, `descricao?` e `fontes` (pelo menos uma, **cada uma com trecho literal** que identifica a instituição, como nas demais evidências da seção 4.7). Uma instituição é uma só, mesmo com várias contas no Hugging Face: as contas se ligam a ela pelos vínculos (4.11), sem duplicar a entidade.

### 4.11 vínculos, relacionados e créditos

Cada relação muitos-para-muitos vive num só arquivo, o do seu dono, com fonte e trecho literal.

- **`publicador.vinculos[]`**: `{alvo: {tipo: laboratorio|instituicao, id}, relacao, fonte}`. `relacao` é `conta_oficial` (a conta pertence ao alvo), `membro` (a conta é de uma unidade ou membro do alvo), `projeto` (a conta é de um projeto conduzido pelo alvo) ou `pesquisador` (só para `tipo: pessoa`). O alvo precisa existir (`REF_INEXISTENTE`) e o vínculo sem fonte é recusado.
- **`publicador.relacionados[]`**: `{publicador, fonte}`. Liga duas contas do mesmo projeto ou de uma parceria declarada por fonte pública. Simétrica: basta declarar em um dos lados. Não se liga pessoa a pessoa nem um publicador a si mesmo.
- **`modelos_creditados[]`** (em laboratório ou instituição): `{modelo, papel, fonte}`, `papel` em `desenvolvedor`, `financiador`, `parceiro` ou `plataforma`. É uma afirmação do laboratório ou da instituição com fonte (por exemplo, o cartão do modelo); **não cadastra o modelo**, que continua derivado e com um só dono, o publicador da conta. O modelo citado precisa existir nos dados derivados.
- **Pessoas.** O vínculo de um publicador do tipo pessoa com um laboratório ou instituição é um atributo do próprio publicador, sem página de pessoa, e só existe com evidência pública profissional (perfil profissional público, página institucional ou página da própria pessoa); cadastro por terceiro exige página institucional que a liste, e estudante só por autoinscrição (seção 7). Nunca se publica dado pessoal além disso. Os dados derivados trazem, para uma conta de pessoa, apenas as organizações curadas das quais ela é membro pública no Hugging Face (`membro_de`), sem nomes nem contas de outras pessoas; isso é um sinal para o mantenedor e não afiliação.
- **Pessoa afiliada.** Para um publicador do tipo pessoa com natureza `instituicao` ou `empresa`, a natureza descreve o vínculo profissional da pessoa, não que a conta seja uma instituição. Os dados derivados trazem `natureza_rotulo: "afiliada"` e `afiliado_a` (ids das instituições dos vínculos), para a interface dizer "afiliado(a) a <instituição>" em vez de "Instituição". A natureza continua com o mesmo valor, sem quebrar a compatibilidade.
- **Instituição fora do Brasil.** A classe de país do publicador (regra B) e o país da instituição são independentes: um publicador pode ter classe `br_evidencia` e vínculo com uma instituição de outro país. Cada instituição, laboratório e nó da hierarquia traz o `pais` da instituição, e `foto.instituicoes_por_pais` conta as instituições por país. Nenhuma nacionalidade é afirmada: a classe de país vem só da evidência do próprio publicador (local ou afiliação declarados, ou fomento e instituições brasileiras citados nos cartões).
- **Derivados.** O coletor calcula, a partir dessas relações, `instituicoes[]`, `labs[]` e `relacionados[]` de cada publicador, as contagens por laboratório e instituição (modelos, builds nativos, GGUF e família de tarefa) e a hierarquia instituição > laboratório > publicador (arquivo `data/relacoes.json`). Builds de terceiros continuam ligados ao modelo original pela regra R, sem virar modelos novos.

## 5. Referências mínimas

1. **Toda entidade tem `fontes` com pelo menos 1 fonte** (tipo, URL, data de acesso). Sem fonte, sem arquivo (`FONTE_FALTA`).
2. **Toda afirmação classificatória tem a própria evidência, com trecho:** país (`evidencia_pais`), natureza (`evidencia_natureza`), vínculo laboratório–instituição, afiliação de pesquisador, modelo atribuído a pesquisador. O trecho é o que se leu, não o que se concluiu.
3. A fonte tem de ser **aberta e lida** no dia de `acessado`, e responder 200. Link de busca, resultado de buscador ou URL adivinhada não vale.
4. `acessado` não pode estar no futuro; fonte lida há mais de 180 dias gera aviso e há mais de 365 dias, erro (releia e atualize).
5. A fonte deve ser **do próprio sujeito ou de instituição que o descreve**. Rede social pessoal e LinkedIn não são aceitos como fonte nem como link (a primeira por ser pessoal; o segundo por exigir login e expor dado pessoal que não dá para conferir sem conta).
6. Citações de terceiros são curtas (até 240 caracteres) e com a origem. Nada de copiar páginas.

## 6. Regras de classificação (publicador)

Os campos `classe_pais` e `natureza` de um arquivo curado têm **precedência** sobre a regra automática do coletor, mas só com evidência de uma pessoa revisada pelo mantenedor.

### B: Brasil (evidência)

"Brasil" quer dizer que **o publicador (pessoa, grupo, empresa ou instituição) declara publicamente local ou afiliação no Brasil**, e o modelo é criado por ele (inclui ajuste fino de base estrangeira). Não é "modelo em português feito por estrangeiros".

- `br_evidencia` exige `pais = BR` e `evidencia_pais` com trecho de local ou afiliação declarados, em perfil oficial, site institucional, página da pessoa, cartão do modelo, artigo ou repositório.
- **Não é evidência:** idioma português, nome ou sobrenome, foto, fuso horário, número de downloads, ou ter modelos treinados em português.
- `nao_classificado` = não se achou evidência. **Não quer dizer não brasileiro.** Nesse caso `pais` e `evidencia_pais` ficam ausentes: não se adivinha.
- `fora_br`: lista curada de grandes publicadores internacionais (confiança baixa, sem inferência por pessoa).
- Regras de evidência automáticas do coletor, preservadas no campo `regra`: E1 (site `.br` no perfil), E2 (descrição cita Brasil), E3a (cartão com endereço `.br`; só o domínio é guardado), E3b (cartão com afiliação e Brasil na mesma linha, `revisar`), E4 (GitHub vinculado declara local no Brasil), E4b (GitHub vinculado cita Brasil), "seed verificado" (página institucional curada, que respondeu com o padrão esperado), "lista curada". Contribuição manual usa `regra` ausente.

### N: natureza

- `instituicao`: universidade ou instituto; evidência em página institucional ou perfil.
- `empresa`: perfil ou página institucional declara empresa.
- `independente`: pessoa, ou grupo pequeno, **sem nenhum vínculo curado** (`vinculos[]` ou `relacionados[]` vazios) e **sem vínculo institucional ou de empresa declarado** na fonte citada. A ausência de vínculo declarado não prova que não exista, e o trecho diz isso. Mecânico: link de domínio `.edu`, `.edu.br`, `.gov.br`, `.ac.*` num publicador `independente` falha (`INDEPENDENTE`).
- `nao_classificada`: o resto. É o valor correto na dúvida.

Quando a fonte mostra vínculo profissional declarado e ele não está publicado como vínculo, a natureza não é `independente`: fica `nao_classificada`. A natureza de uma conta com vínculo a uma instituição é a que a fonte sustenta para a própria conta, e não a da instituição.

Disputa ("não sou brasileiro", "não sou independente"): ver `docs/GOVERNANCA.md`. A palavra do próprio titular sobre si prevalece sobre a regra.

## 7. Privacidade e ética

Pesquisadores e donos de contas são **pessoas**. Valem a LGPD (Lei 13.709/2018) e o GDPR.

1. **Só informação profissional já pública, com fonte pública citada.** Nome profissional, afiliação, papel, áreas, publicações, modelos, links profissionais.
2. **Proibido:** e-mail, telefone, endereço (nem residencial nem de sala), data de nascimento, documentos, foto (a 1.0 não aceita fotos), redes sociais pessoais, nacionalidade, família, e qualquer dado sensível (origem racial ou étnica, religião, opinião política, saúde, vida sexual, filiação a sindicato ou partido, genética, biometria). Se a página fonte traz isso, **não se copia** (por exemplo, perfil que informa naturalidade).
3. **Proibido inferir.** Nenhum atributo é deduzido de nome, foto, idioma ou conta. Sem evidência: `nao_classificado` / `nao_classificada`.
4. **Quem entra:** quem tem página institucional ou perfil profissional público próprio que o liste com vínculo. Pessoas sem isso, e estudantes de graduação, só por `autoinscricao`. Cadastro por `terceiro` exige página institucional ou perfil público que liste a pessoa (`TERCEIRO_SEM_FONTE`). Menores de idade não entram.
5. **Base legal** (ver `docs/GOVERNANCA.md`): legítimo interesse (LGPD art. 7, IX; GDPR art. 6(1)(f)) para dados tornados manifestamente públicos pelo titular, com finalidade de pesquisa e transparência, minimização e direito de oposição simples.
6. **Direitos:** correção e remoção por pedido, sem justificativa (seção 8). O aviso de privacidade completo, com o controlador identificado, está em `docs/PRIVACIDADE.md` e é referenciado no `README`, no `SECURITY.md` e no rodapé do site.
7. **Checagem mecânica:** o validador recusa e-mail, telefone, CPF, CEP e endereço, frases de nascimento, redes pessoais, imagens de pessoa e campos proibidos, e avisa sobre palavras de atributo sensível.
8. **Sem fonte, sai na hora.** Dado sobre pessoa sem fonte, ou com fonte que não o sustenta, é removido sem discussão; para voltar, exige fonte. O ônus da prova é de quem acrescenta. Se a pessoa que contesta chegou com cordialidade ou com raiva, a resposta é a mesma: tratar com gentileza e corrigir.
9. **O Git é público e permanente.** Tudo o que entra num PR (inclusive PR fechado) fica no histórico e em cópias. Por isso a regra é não pôr o que não pode ficar. Ver 8. Estas regras seguem práticas de comunidades equivalentes (ver `docs/GOVERNANCA.md`, Inspirações).

## 8. Remoção e histórico

1. Pedido por issue (modelo "Pedir remoção") ou por relato privado na aba Security do repositório (contatos em `docs/PRIVACIDADE.md`). **Identificação mínima:** o id da entidade e se o pedido é do próprio ou de representante. Não se pede documento. Quem pede não precisa se expor: um pedido sem identificação ainda é atendido, por cautela, quando se trata de dado pessoal.
2. Prazos: confirmação em até **3 dias úteis**; remoção do estado atual do repositório e do site em até **7 dias corridos** (LGPD art. 19 fala em prazo de até 15 dias para a declaração completa; GDPR art. 12(3), em um mês; o projeto assume prazos mais curtos).
3. Atendimento por **mantenedor humano**. Ferramentas automáticas não decidem nem respondem pedidos.
4. A remoção apaga o arquivo e inclui em `data/remocoes.json` o `sha256` do id em minúsculas (guarda só o hash, não o nome), para a entidade não voltar por outro PR nem pelo coletor (`REMOVIDO`). O coletor lê essa lista e ignora a conta.
5. **Histórico:** apagar o arquivo não apaga o histórico. Se o titular pedir e houver dado pessoal que não devia estar, o mantenedor reescreve o histórico (`git filter-repo`), força o push, pede ao GitHub a limpeza de caches e de referências de PRs, e registra `historico_reescrito: true`. Limites que o aviso diz com todas as letras: clones, forks e arquivos da web que já existem não estão sob controle do projeto. Prazo para reescrita: até 30 dias.
6. Arquivamento (`status: arquivado`) é para entidades **não pessoais** (laboratório encerrado, link morto, fusão). Pessoas não são arquivadas: são mantidas ou removidas.

## 9. Dados derivados e regras de coleta automática

### 9.1 Princípio: a contribuição indica publicadores, o coletor deriva os modelos

Modelos e datasets do Hugging Face, tamanhos, formatos, status de build, GGUF, família e contagens **nunca são inseridos à mão nem por contribuição**: são sempre derivados pelo coletor a partir das APIs públicas do Hugging Face, por regra. A contribuição indica **quem publica** (usuário ou organização do Hugging Face, por id ou URL), com a evidência mínima de país e de natureza (seções 4.2 e 6). Nenhuma etapa do fluxo, da contribuição à publicação, depende de inteligência artificial: a validação é mecânica e a revisão é humana.

### 9.2 Quem entra no mapa

O coletor lê, nesta ordem de precedência: (1) as entidades curadas de `data/entidades/publicador/` (a classificação de país e de natureza e as evidências vêm da entidade, já validadas pelo `validar.py`, sem nova derivação por regra); (2) as listas de `seed/publishers.json`; (3) a descoberta automática por busca na API. A entidade curada tem precedência sobre o sinal automático (seção 6).

| Classe da entidade | Escopo no mapa |
|---|---|
| `br_evidencia` | Brasil |
| `fora_br` | mundo |
| `nao_classificado` | mundo (até 8 repositórios de formato de navegador); nunca entra no escopo Brasil |

Entidades `arquivado` e exemplos não são coletados. Contas em `data/remocoes.json` e na lista local `.excluir` são ignoradas.

### 9.3 Filtro de relevância (quais modelos sobem para a página)

1. **Tarefa e família de tarefa:** cada modelo tem `familia_tarefa`. **Gerador** é `pipeline_tag` em `text-generation`, `image-text-to-text`, `any-to-any` ou `text2text-generation`. **Codificador** é `pipeline_tag` em `fill-mask`, `feature-extraction`, `sentence-similarity`, `text-classification`, `token-classification`, `question-answering`, `zero-shot-classification` ou `text-ranking`. Voz, imagem pura, tradução, sumarização e outras tarefas ficam fora. Quando o repositório não declara `pipeline_tag`, a tarefa é **inferida por regra**, só com campos da listagem da API (tags, nome e tamanho dos pesos; nenhum peso é baixado): (a) o tamanho precisa ser conhecido (`safetensors.total` ou `gguf.total`); (b) arquitetura causal (`llama`, `mistral`, `gemma`, `qwen`, `phi`, `gpt2`, `gpt_neox`, `falcon` e semelhantes) ou tag `text-generation`, `text-generation-inference` ou `conversational` dão `text-generation`; arquitetura sequência-para-sequência (`t5`, `mt5`, `bart`, `pegasus` e semelhantes) ou tag `text2text-generation` dão `text2text-generation`; arquitetura de codificador (`bert`, `roberta`, `deberta`, `electra`, `albert`, `distilbert`, `xlm-roberta` e semelhantes), biblioteca `sentence-transformers` ou tag de tarefa de codificador dão a tarefa de codificador correspondente (`feature-extraction` quando só a arquitetura indica); nome com `embed` ou `rerank` numa arquitetura de linguagem dá `feature-extraction` ou `text-ranking`; (c) ficam de fora adaptadores (LoRA/PEFT), visão e áudio, e nomes de classificadores ou detectores sem arquitetura de codificador; (d) vale o corte de tamanho do item 2. O modelo inferido traz `tarefa_inferida: true` e `regra_tarefa`. Sem sinal, o repositório não entra. O status de build (nativo, GGUF) vale para as duas famílias.
2. **Tamanho:** até 12 bilhões de parâmetros (`safetensors.total`, ou `gguf.total`); sem informação de tamanho, o modelo fica, com `parametros_b` nulo.
3. **Sem adaptadores:** LoRA/PEFT (tags `peft`, `lora` ou `base_model:adapter`) não contam, pois não rodam sozinhos.
4. **Sem duplicatas (regra R):** repositório que é só outro formato ou quantização (ONNX, MLC, LiteRT, GGUF) de um modelo do mesmo publicador vira **build** desse modelo, não modelo novo. Builds de terceiros são ligados ao modelo de origem pelo nome e pela relação `base_model:quantized`; conversões de terceiros só aparecem como modelo próprio para publicadores do mundo sem classificação, com `conversao_de`.
5. **GGUF à parte:** GGUF via wllama conta separado do build nativo e só se a menor variante Q4 tiver até 4 GB (regra G).
6. **Publicador sem modelos no corte:** o publicador é registrado em `foto.json` (`descartados`) com o motivo "sem modelos no corte" e os números de cada filtro, e não aparece no mapa.

### 9.4 Coleta

Os mantenedores rodam `scripts/coletar.py` em modo incremental (`--novos`: só publicadores ainda ausentes dos dados, cuja entidade curada mudou ou cuja coleta passou de 30 dias; o resultado é mesclado) ou completo (`--tudo`), ou só para alguns publicadores (`--so`). A saída é determinística (ordem estável): rodar duas vezes sem mudança na fonte não altera nenhum arquivo. A coleta é retomável (um checkpoint por publicador) e respeita o limite da API anônima (500 chamadas por 5 minutos). `scripts/relatorio_coleta.py` compara os dados antes e depois para revisão. As regras de formato, R, S, G, V, tamanho e F estão em [docs/SPEC_0.2_coleta.md](SPEC_0.2_coleta.md) e permanecem válidas.

### 9.5 Camada de datasets

O coletor deriva a camada de datasets por unidades, cada uma com checkpoint: os datasets em português, um conjunto por publicador do Brasil e um por benchmark. Entram no mapa apenas datasets públicos (não privados, não gated), pela regra:

1. **Escopo `br`:** todos os datasets públicos dos publicadores brasileiros curados (classe `br_evidencia`, com ou sem modelos no corte).
2. **Escopo `pt`:** datasets com idioma `pt`, `pt-br` ou `por` no cartão, de outros publicadores, com pelo menos **100 downloads** (últimos 30 dias) **ou 3 curtidas**. Fica de fora o reupload sem metadados mínimos (sem licença **e** sem descrição) e a duplicata óbvia (mesmo nome e mesmo tamanho; permanece o de mais downloads).
3. **Datasets de benchmark:** todo dataset público citado por um benchmark curado entra, mesmo abaixo dos limiares, com escopo `pt` quando o publicador não é do Brasil.
4. Datasets de escopo mundo (sem idioma português e sem benchmark) não entram.

A ordem é estável: Brasil antes de português, `downloads` decrescente, `id`. Rodar a coleta duas vezes sem mudança na fonte não altera nenhum arquivo.

### 9.6 Contagens publicadas

`foto.brasil` e `foto.mundo` contam todos os modelos do mapa, geradores e codificadores. `foto.por_familia_tarefa` repete as contagens por família. Como um único publicador pode concentrar muitos modelos de experimento, a foto traz também `foto.sem_maior_publicador` e, por família, `brasil_sem_maior`: as contagens do Brasil sem o publicador de mais modelos, sempre ao lado das contagens com todos. Mudar a regra de relevância muda `foto.regra_filtro`, e a coleta incremental recoleta todos os publicadores.

## 10. Texto, idiomas, licenças

- Nomes próprios não se traduzem. Descrições: `pt` e `en`; basta um idioma, o outro fica como pendência.
- **Dados:** CC BY 4.0 (`LICENSE-DATA`). **Código:** MIT (`LICENSE`). Ao contribuir, a pessoa declara que o texto é dela ou citação curta com fonte, e o licencia em CC BY 4.0. Não há documento a assinar; o PR é o aceite, e o `README` diz isso.
- Crédito: o rodapé do site mantém o crédito "Inspirado no Observatório da Maritaca", em texto simples (PT e EN); o código da interface é original, escrito à mão. Os dados do Hugging Face seguem os termos da plataforma e da licença de cada modelo; o projeto não redistribui pesos.

## 11. Versionamento e mudança

- Versão `MAIOR.MENOR`. **Menor**: acrescenta campo opcional, valor de enumeração ou regra que só gera aviso; arquivos antigos continuam válidos. **Maior**: remove ou renomeia campo, endurece regra com erro, muda id; vem com script de migração em `scripts/` e período de uma versão menor de aviso.
- Ids nunca mudam; entidade substituída fica `arquivada` com `substituido_por`.
- Campo novo = proposta (issue "Propor campo"), com justificativa, fonte pública e análise de privacidade; só entra se não for dado pessoal e puder ser verificado por fonte.
- Cada arquivo carrega `spec`; os derivados carregam `meta.versao_spec`.

## 12. Códigos do validador

`JSON`, `ENTIDADE`, `TIPO`, `VALOR`, `FORMATO`, `LIMITE`, `MIN_ITENS`, `MAX_ITENS`, `CAMPO_FALTA`, `CAMPO_DESCONHECIDO`, `CAMPO_DERIVADO`, `CAMPO_PROIBIDO`, `FONTE_FALTA`, `FONTE_REPETIDA`, `FONTE_VELHA`, `DATA_FUTURA`, `URL`, `URL_BUSCA`, `REDE_PESSOAL`, `FOTO`, `EMAIL`, `TELEFONE`, `CPF`, `ENDERECO`, `NASCIMENTO`, `SENSIVEL`, `PAIS_INVALIDO`, `BR_REGRA`, `NAO_CLASSIFICADO`, `NATUREZA_SEM_EVIDENCIA`, `NATUREZA_INCOERENTE`, `INDEPENDENTE`, `VINCULO_FONTE`, `TERCEIRO_SEM_FONTE`, `REF_INEXISTENTE`, `ID_ARQUIVO`, `ID_DUPLICADO`, `EXEMPLO_MARCA`, `ARQUIVO`, `REMOVIDO`, `PR_DERIVADO`, `PR_INFRA`, `LINK_QUEBRADO`, `LINK_INCERTO`, `TRECHO_AUSENTE`, `TRECHO_NAO_VERIFICADO`, `VINCULO_CICLO`, `VINCULO_AUTO`, `PESSOA_RELACAO`. Todos são erros, exceto `SENSIVEL`, `URL_BUSCA`, `FONTE_REPETIDA`, `PR_INFRA`, `LINK_INCERTO`, `TRECHO_NAO_VERIFICADO` e `FONTE_VELHA` entre 180 e 365 dias, que são avisos. Os casos em `data/exemplos/rejeitados/` testam o validador (`python3 scripts/validar.py --rejeitados`).
