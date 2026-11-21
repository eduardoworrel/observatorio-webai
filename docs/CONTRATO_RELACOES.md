# Contrato de dados das relações (instituições, laboratórios, vínculos e família de tarefa)

Versão do contrato: **1** (revisão 1.1: campos acrescentados, sem quebrar a compatibilidade). Complementa [CONTRATO_CAMADAS.md](CONTRATO_CAMADAS.md). Quem consome (a interface) e quem produz (o coletor) seguem este texto. Mudança de campo cria uma nova versão deste arquivo e muda `window.MAPA_DADOS.contrato_relacoes`.

`web/fixtures/relacoes.js` define `window.MAPA_RELACOES_FIXTURE` com a mesma forma e `fixture: true`, com dados de exemplo (ids começando em `fixture-`).

## Novas chaves de `window.MAPA_DADOS`

| Chave | Tipo | Conteúdo |
|---|---|---|
| `instituicoes` | `Array<objeto>` | instituições curadas, com contagens derivadas |
| `laboratorios` | `Array<objeto>` | laboratórios curados, com contagens derivadas |
| `vinculos` | `{colunas, linhas[]}` | arestas do grafo de relações, formato compacto |
| `hierarquia` | `Array<nó>` | árvore instituição > laboratório > publicador |
| `contrato_relacoes` | número | 1 |

## Ids com prefixo

Nas arestas e nas listas de créditos, um id de entidade leva o tipo como prefixo: `inst:<id>` (instituição), `lab:<id>` (laboratório), `pub:<id>` (publicador). O prefixo evita colisão entre ids de tipos diferentes.

## `instituicoes[]`

| Campo | Tipo | Significado |
|---|---|---|
| `id` | texto | kebab-case |
| `nome`, `sigla` | texto | `sigla` pode ser `null` |
| `pais`, `regiao` | texto | ISO 3166-1 e 3166-2 (`regiao` pode ser `null`) |
| `tipo` | texto | `universidade`, `instituto`, `empresa`, `governo` ou `outro` |
| `parte_de` | texto ou `null` | id da instituição maior (por exemplo, uma escola dentro de uma universidade) |
| `labs` | texto[] | ids de laboratórios (sem prefixo) |
| `publicadores` | texto[] | ids de publicadores do mapa ligados diretamente, pelos laboratórios ou pelas partes, sem repetição |
| `n_modelos` | inteiro | modelos dos publicadores da instituição, dos seus laboratórios e das instituições que são parte dela (soma, sem duplicar) |
| `n_builds` | `{nativo, gguf}` | modelos com build nativo de navegador e modelos só com GGUF via wllama |
| `por_familia_tarefa` | `{gerador, codificador}` | `n_modelos` por família de tarefa |
| `fontes` | `[{tipo, url, acessado, trecho}]` | evidências |

## `laboratorios[]`

`id`, `nome`, `sigla`, `instituicao` (id da instituição principal), `pais` (país da instituição principal), `parceiras` (ids de instituições parceiras), `publicadores` (ids), `n_modelos`, `n_builds`, `por_familia_tarefa` (como acima) e `fontes`.

## `vinculos`

`{colunas: ["de", "para", "tipo", "fonte"], linhas: [[...]]}`. Cada linha é uma aresta com ids prefixados e a URL da fonte (a evidência completa, com trecho, está em `data/vinculos.json`).

| `tipo` | `de` → `para` | Significado |
|---|---|---|
| `conta_oficial` | `pub` → `lab` ou `inst` | a conta no Hugging Face pertence ao laboratório ou à instituição |
| `membro` | `pub` → `lab` ou `inst` | a conta é de um membro ou unidade do laboratório ou da instituição |
| `pesquisador` | `pub` → `lab` ou `inst` | publicador do tipo pessoa que declara, em perfil profissional público, o vínculo |
| `projeto` | `pub` → `lab` ou `inst` | a conta é de um projeto conduzido pelo laboratório ou pela instituição |
| `relacionado` | `pub` → `pub` | mesmo projeto ou parceria entre duas contas |
| `mesma_organizacao` | `lab` → `inst` ou `inst` → `inst` | laboratório da instituição (principal), instituição parceira, ou parte de outra instituição |

`relacionado` é simétrica e aparece uma vez (a ordem de `de` e `para` é a do id, sem diferenciar maiúsculas). As demais têm direção.

## `hierarquia`

Lista de nós `{tipo, id, filhos}`:

- `tipo: "instituicao"` → filhos `laboratorio`, `publicador` (conta ligada direto à instituição) e `instituicao` (partes);
- `tipo: "laboratorio"` → filhos `publicador`;
- `tipo: "publicador"` → folha, com `n_modelos`. Os ids dos modelos estão em `constelacoes[]` (um item por publicador, como antes).

Nós `instituicao` e `laboratorio` trazem `pais` (ISO 3166-1 da instituição). Uma instituição no exterior pode agrupar publicadores com classe `br_evidencia`: o país da instituição e a classe de país do publicador são independentes.

Publicadores sem instituição nem laboratório aparecem como nós `publicador` na raiz, depois das instituições. A ordem é estável: instituições por `id` sem diferenciar maiúsculas, depois publicadores por `id`.

## Mudanças em `modelos[]`

| Campo | Tipo | Significado |
|---|---|---|
| `familia_tarefa` | texto | `gerador` (`text-generation`, `image-text-to-text`, `any-to-any`, `text2text-generation`) ou `codificador` (`fill-mask`, `feature-extraction`, `sentence-similarity`, `text-classification`, `token-classification`, `question-answering`, `zero-shot-classification`, `text-ranking`) |
| `creditos` | texto[] | ids com prefixo (`lab:...`, `inst:...`) creditados pelo modelo por evidência curada; `[]` se nenhum |

`tarefa` continua com o valor da API (ou inferido). O dono do modelo é sempre um só: `publicador`.

## Mudanças em `publicadores[]`

| Campo | Tipo | Significado |
|---|---|---|
| `instituicoes` | texto[] | ids de instituições ligadas (direto ou pelos laboratórios) |
| `labs` | texto[] | ids de laboratórios ligados |
| `relacionados` | texto[] | ids de outros publicadores ligados por `relacionado` |
| `membro_de` | texto[] | só para `tipo: "pessoa"`: ids de publicadores curados (organizações) de que a pessoa é membro público; não há nomes nem contas de outras pessoas |
| `natureza_rotulo` | texto | só para `tipo: "pessoa"`: `afiliada` quando a natureza é `instituicao` ou `empresa`; nos demais casos repete `natureza`. A interface usa para não rotular uma pessoa como "Instituição" |
| `afiliado_a` | texto[] | só para `tipo: "pessoa"`: ids de instituições (de `instituicoes[]`) a que a pessoa se afilia; a interface mostra "afiliado(a) a <nome da instituição>"; `[]` se a natureza não é `instituicao` ou `empresa` |
| `natureza` | texto | coerente com os vínculos (SPEC, regra N): `independente` só sem vínculo curado |

## Mudanças em `foto`

Os blocos `brasil` e `mundo` passam a contar **todos** os modelos do mapa (as duas famílias de tarefa). Chaves novas:

```
foto.por_familia_tarefa = {
  "gerador":    {"brasil": <contagem>, "mundo": <contagem>, "brasil_sem_maior": <contagem>},
  "codificador": {"brasil": <contagem>, "mundo": <contagem>, "brasil_sem_maior": <contagem>}
}
foto.sem_maior_publicador = {
  "id": "<publicador com mais modelos no Brasil>", "modelos": n,
  "brasil": <contagem sem esse publicador>, "publicadores_brasil": n   // publicadores do Brasil com modelos, sem o maior
}
```

`<contagem>` tem a forma de `foto.brasil` (`modelos`, `nativo_oficial`, `nativo_comunidade`, `so_gguf_wllama`, `nenhum`, `so_nativo`, `nativo_mais_gguf`, ...). `foto.instituicoes_por_pais` conta as instituições por país (`{"BR": n, "DE": n}`). `foto.regra_filtro` é a versão da regra de relevância dos modelos. A interface mostra os dois jeitos: com todos e sem o maior publicador.

## Ordem

`instituicoes`, `laboratorios` e `hierarquia` por `id` sem diferenciar maiúsculas; `vinculos.linhas` por (`tipo`, `de`, `para`).
