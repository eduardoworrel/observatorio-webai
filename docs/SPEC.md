# Observatório: padrão de dados, versão 1.0

*English summary: this is the data standard for community contributions to the Observatório (Web AI in Brazil and the world). Entities: publisher, lab, researcher, model, family. One JSON file per entity under `data/entidades/`, every claim backed by at least one public source (type + URL + access date), generated fields are read-only, researchers are people and follow strict privacy rules (section 7). Validated mechanically by `scripts/validar.py`; every decision is human. Data: CC BY 4.0. Code: MIT.*

As palavras DEVE, NÃO DEVE e PODE seguem o uso da RFC 2119. Os schemas em `schema/` e `scripts/validar.py` implementam este texto; se divergirem dele, é um defeito de um dos dois.

## 1. Camadas: curado e derivado

| Camada | Onde | Quem escreve | Contribuição pode alterar? |
|---|---|---|---|
| **Curada** | `data/entidades/<tipo>/` | pessoas (por pull request), revisão humana | sim |
| **Derivada** | `data/publicadores.json`, `modelos.json`, `familias.json`, `constelacoes.json`, `foto.json`, `web/data.js` | só `scripts/coletar.py` (API pública do Hugging Face, regras da seção 9) | **não**. PR que altera arquivo derivado falha na checagem (`PR_DERIVADO`); a exceção é o PR da coleta semanal, em ramo `coleta-*`, aberto pelo workflow do próprio repositório e fundido por uma pessoa |
| **Exemplos** | `data/exemplos/` | mantenedor | só para ensinar o formato; nunca entram nos dados oficiais |
| **Remoções** | `data/remocoes.json` | mantenedor | não (seção 8) |

Campos derivados (status de build, `gguf*`, `via`, tamanhos, downloads, contagens, `escopo`, formatos, constelação) NÃO existem nos arquivos curados: o schema os recusa com o código `CAMPO_DERIVADO`.

Por que arquivos curados separados dos gerados: `modelos.json` tem 6 MB e é regerado toda semana; dividi-lo em ~2.000 arquivos geraria ruído de revisão e conflitos. O que se contribui são decisões humanas sobre poucas entidades.

## 2. Entidades e relações

```
publicador ──< modelo >── familia           (derivado: constelação = publicador + seus modelos)
   │              ▲
   │              └── pesquisador.modelos[]  (afirmação do pesquisador, com fonte)
laboratorio ─ instituição (objeto: nome, país, fonte)
   ▲
   └── pesquisador.afiliacoes[].laboratorio (afirmação do pesquisador, com fonte)
laboratorio.publicadores[] ─ contas que o laboratório usa para publicar
```

- **publicador**: quem publica modelos: pessoa independente, grupo, empresa, universidade ou outra organização. É a chave da constelação.
- **laboratorio**: laboratório ou grupo de pesquisa **vinculado a uma instituição**.
- **pesquisador**: pessoa com vínculo profissional público. Ver seção 7.
- **modelo**: um modelo de linguagem. Os do Hugging Face vêm do coletor; o arquivo curado só existe para modelo fora do Hugging Face ou para ligar fonte e família.
- **familia**: linhagem de modelos (regra F). O arquivo curado dá nome, descrição e fonte.
- **constelação**: apenas derivada (publicador e seus modelos); não se contribui.

A direção das relações é única, para haver uma só verdade por fato: o vínculo pesquisador–laboratório e pesquisador–modelo vive no arquivo do **pesquisador**; o laboratório e o modelo mostram a lista inversa, calculada. Assim, remover uma pessoa é apagar um arquivo, sem referências soltas.

## 3. Formato de arquivo: JSON, um arquivo por entidade

`data/entidades/<tipo>/<id>.json`, em UTF-8, indentação de 2 espaços, uma chave por linha. Modelo: `data/entidades/modelo/<publicador>/<nome>.json`.

Escolha de JSON em vez de YAML, com as razões: (1) o projeto só usa a biblioteca padrão do Python, que lê JSON e não lê YAML; (2) os dados gerados já são JSON; (3) o editor web do GitHub aceita os dois e o validador aponta linha e coluna do erro de JSON; (4) o YAML traz ambiguidades (`no`, datas sem aspas) que uma pessoa iniciante não vê. A contrapartida é a vírgula do último item, que o validador acusa com a linha.

Um arquivo por entidade: diffs de poucas linhas, revisão de um fato por vez, e dois PRs só conflitam se mexerem na mesma entidade.

## 4. Campos

Campos desconhecidos são erro. Em todos: `spec` (obrigatório, `"1.0"`), `entidade` (obrigatório), `fontes` (obrigatório, ver seção 5), `links`, `descricao` (`{"pt": "...", "en": "..."}`, até 240 caracteres cada, pelo menos um idioma), `status` (`ativo` por padrão ou `arquivado` com o objeto `arquivo`), `exemplo`.

### 4.1 Identificadores

- `id`: kebab-case `^[a-z0-9]+(-[a-z0-9]+)*$`, 2 a 60 caracteres. **Estável**: nunca é renomeado nem reaproveitado para outra coisa. Maiúsculas e minúsculas não distinguem ids (o arquivo precisa funcionar em macOS e Windows).
- **Exceção, `publicador.id` e o publicador de um `modelo`**: é a **chave da fonte primária**, com a mesma grafia do Hugging Face (`CEIA-UFG`, `HuggingFaceTB`), porque os dados derivados e a interface usam essa chave. Publicador sem conta no Hugging Face usa kebab-case.
- `modelo.id`: `<publicador>/<nome>`, como no Hugging Face.
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

`id`, `nome`, `sigla`; `instituicao` obrigatória: `{nome, pais, regiao?, fonte}` em que `fonte` é evidência de que o laboratório pertence à instituição (tipo `site_institucional`, `perfil_oficial` ou `pagina_pessoa`); `publicadores[]` (ids de publicador existentes); `areas[]` (até 8 termos de até 40 caracteres); `links`; `fontes`.

### 4.4 pesquisador

`id` (`nome-sobrenome`, com instituição se houver homônimo), `nome` (nome profissional público), `origem_cadastro` (obrigatório), `afiliacoes[]` (1 a 4): `{instituicao, pais, laboratorio?, papel?, fonte}` com `fonte` em evidência de tipo `site_institucional`, `perfil_oficial` ou `pagina_pessoa`; `areas[]`; `publicacoes[]` (até 30): `{titulo, ano, fonte}`; `modelos[]`: `{modelo, fonte}` (id existente); `links`: `instituicao`, `github`, `hf`, `orcid`, `scholar`, `lattes`, `oficial` (site profissional). **Não existem** campos de e-mail, telefone, endereço, nascimento, foto, redes pessoais, nacionalidade, gênero ou qualquer atributo sensível.

### 4.5 modelo

`id`, `nome`, `publicador` (existente), `familia?`, `licenca?`, `lancado_em?`, `parametros_b?`, `links` (pelo menos um: `hf`, `oficial`, `repositorio`, `artigo`), `fontes`. Se há `links.hf`, o id é o do repositório. Status de build, formatos, GGUF, tamanhos e downloads são **derivados** e só existem para modelos do Hugging Face, calculados pelo coletor.

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
- `independente`: pessoa, ou grupo pequeno, **sem vínculo institucional ou de empresa declarado** na fonte citada. A ausência de vínculo declarado não prova que não exista, e o trecho diz isso. Mecânico: link de domínio `.edu`, `.edu.br`, `.gov.br`, `.ac.*` num publicador `independente` falha (`INDEPENDENTE`).
- `nao_classificada`: o resto. É o valor correto na dúvida.

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

O status de build por regra (nativo oficial, nativo de comunidade, GGUF via wllama, sem build), família, tamanhos e demais campos derivados continuam calculados pelo coletor a partir da API pública do Hugging Face, **sem edição humana**. As regras (formato, R, S, G, V, tamanho, F) estão em [docs/SPEC_0.2_coleta.md](SPEC_0.2_coleta.md) e permanecem válidas.

Os arquivos de `data/entidades/` são validados e servem de fonte curada; a classificação de publicadores no mapa continua a calculada pelo coletor com as regras da seção 6.

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

`JSON`, `ENTIDADE`, `TIPO`, `VALOR`, `FORMATO`, `LIMITE`, `MIN_ITENS`, `MAX_ITENS`, `CAMPO_FALTA`, `CAMPO_DESCONHECIDO`, `CAMPO_DERIVADO`, `CAMPO_PROIBIDO`, `FONTE_FALTA`, `FONTE_REPETIDA`, `FONTE_VELHA`, `DATA_FUTURA`, `URL`, `URL_BUSCA`, `REDE_PESSOAL`, `FOTO`, `EMAIL`, `TELEFONE`, `CPF`, `ENDERECO`, `NASCIMENTO`, `SENSIVEL`, `PAIS_INVALIDO`, `BR_REGRA`, `NAO_CLASSIFICADO`, `NATUREZA_SEM_EVIDENCIA`, `NATUREZA_INCOERENTE`, `INDEPENDENTE`, `VINCULO_FONTE`, `TERCEIRO_SEM_FONTE`, `REF_INEXISTENTE`, `ID_ARQUIVO`, `ID_DUPLICADO`, `HF_ID`, `EXEMPLO_MARCA`, `ARQUIVO`, `REMOVIDO`, `PR_DERIVADO`, `PR_INFRA`, `LINK_QUEBRADO`, `LINK_INCERTO`, `TRECHO_AUSENTE`, `TRECHO_NAO_VERIFICADO`. Todos são erros, exceto `SENSIVEL`, `URL_BUSCA`, `FONTE_REPETIDA`, `PR_INFRA`, `LINK_INCERTO`, `TRECHO_NAO_VERIFICADO` e `FONTE_VELHA` entre 180 e 365 dias, que são avisos. Os casos em `data/exemplos/rejeitados/` testam o validador (`python3 scripts/validar.py --rejeitados`).
