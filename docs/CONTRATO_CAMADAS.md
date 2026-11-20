# Contrato de dados das camadas de datasets e benchmarks

Versão do contrato: **1**. Quem consome (a interface) e quem produz (o coletor) seguem este texto. Mudança de campo ou de coluna cria uma nova versão deste arquivo, com o número no título e o campo `contrato` em `window.MAPA_DADOS.contrato_camadas`.

## Onde estão os dados

`web/data.js` define `window.MAPA_DADOS` e, além de `meta`, `foto`, `publicadores`, `modelos`, `constelacoes` e `familias`, passa a ter:

| Chave | Tipo | Conteúdo |
|---|---|---|
| `datasets` | `{colunas: string[], linhas: Array[]}` | datasets derivados, uma linha por dataset, valores na ordem de `colunas` (formato compacto) |
| `benchmarks` | `Array<objeto>` | benchmarks curados, com os campos derivados |
| `foto_camadas` | objeto | contagens |
| `contrato_camadas` | número | versão deste contrato (1) |

`web/fixtures/camadas.js` define `window.MAPA_CAMADAS_FIXTURE` com a mesma forma (`datasets`, `benchmarks`, `foto_camadas`) e `fixture: true`, com dados de exemplo (ids começando em `fixture-`). Não são dados reais.

## Colunas de `datasets.linhas`

| # | Coluna | Tipo | Significado |
|---|---|---|---|
| 0 | `id` | texto | `<publicador>/<nome>`, como no Hugging Face. A URL é `https://huggingface.co/datasets/<id>` |
| 1 | `publicador` | texto | id do publicador (parte antes da barra); chave de `publicadores[]` quando o publicador está no mapa; um publicador do Brasil sem modelos no corte (registrado em `foto.descartados`) também aparece aqui, sem constelação |
| 2 | `nome` | texto | parte depois da barra |
| 3 | `descricao` | texto | uma linha do cartão, até 160 caracteres, sem contato pessoal; vazio se o cartão não tem texto |
| 4 | `idiomas` | texto[] | códigos de idioma do cartão (`pt`, `en`...), `pt` primeiro, no máximo 8 |
| 5 | `pt_br` | booleano | o cartão marca português do Brasil (`pt-BR`, `brazilian`, `brasil`...) |
| 6 | `tarefas` | texto[] | categorias de tarefa do cartão (`question-answering`...) |
| 7 | `licenca` | texto ou `null` | identificador de licença do cartão |
| 8 | `bytes` | inteiro ou `null` | tamanho dos arquivos do ramo principal, em bytes; `null` se a API não informa |
| 9 | `faixa` | texto ou `null` | `<1MB`, `1-100MB`, `100MB-1GB`, `1-10GB` ou `>10GB`, calculada de `bytes` |
| 10 | `linhas_faixa` | texto ou `null` | faixa de linhas declarada no cartão (`n<1K`, `1K<n<10K`...); a API de listagem não traz a contagem exata |
| 11 | `downloads` | inteiro | downloads dos últimos 30 dias (campo `downloads` da API) |
| 12 | `likes` | inteiro | curtidas |
| 13 | `atualizado` | texto | data `AAAA-MM-DD` da última modificação |
| 14 | `escopo` | texto | `br` (publicador do Brasil com evidência) ou `pt` (só pelo idioma). Dataset de escopo mundo não entra |
| 15 | `benchmarks` | texto[] | ids dos benchmarks que apontam para o dataset (`[]` se nenhum) |

`url` e `fontes[]` não vão em `web/data.js`: a `url` se monta do `id`, e as fontes (URL e data de acesso) estão em `data/datasets.json`.

## Benchmark (objeto em `benchmarks`)

| Campo | Tipo | Origem |
|---|---|---|
| `id` | texto kebab-case | curado |
| `nome` | texto | curado |
| `sigla` | texto (opcional) | curado |
| `descricao` | `{pt, en}` | curado (1 a 2 linhas) |
| `dominio` | texto[] | curado; valores: `geral`, `vestibular_educacao`, `juridico`, `saude`, `codigo`, `matematica`, `extracao_classificacao`, `cultura_lingua`, `outros` |
| `idiomas` | texto[] | curado |
| `tarefas` | texto[] | curado |
| `tipo` | texto | curado: `conjunto`, `avaliacao` ou `leaderboard` |
| `datasets` | texto[] | curado: ids do Hugging Face; os metadados de cada um vêm da coleta |
| `criador` | `{publicador?, nome?}` | curado (publicador do Hugging Face ou nome institucional) |
| `ano` | inteiro | curado |
| `links` | `{artigo?, site?, leaderboard?, codigo?}` | curado |
| `fontes` | `[{tipo, url, acessado, trecho}]` | curado, com trecho literal da página |
| `n_datasets` | inteiro | derivado: datasets de `datasets` encontrados na coleta |
| `tamanho_total_bytes` | inteiro ou `null` | derivado: soma de `bytes` |
| `downloads_total` | inteiro | derivado: soma de `downloads` |

## `foto_camadas`

```
{
  "datasets":   {"total": n, "por_escopo": {"br": n, "pt": n}, "pt_br": n, "por_faixa": {"<1MB": n, ...}, "downloads_total": n},
  "benchmarks": {"total": n, "por_dominio": {"juridico": n, ...}, "por_tipo": {"avaliacao": n, ...}}
}
```

Um benchmark com mais de um domínio conta uma vez em cada.

## Ordem

`datasets.linhas` em ordem estável: escopo (`br` antes de `pt`), `downloads` decrescente, `id` sem diferenciar maiúsculas. `benchmarks` por `id`.
