# Contrato de dados da maturidade do cartão

Versão do contrato: **1** (compatível com [CONTRATO_RELACOES.md](CONTRATO_RELACOES.md) 1.2 e [CONTRATO_CAMADAS.md](CONTRATO_CAMADAS.md)). Só acrescenta campos. A regra está em `docs/SPEC.md`, seção 9.7: é uma classificação por cartão, não um juízo sobre o autor.

## `window.MAPA_DADOS`

| Chave | Tipo | Conteúdo |
|---|---|---|
| `dicionario_maturidade` | `{maturidade: {e, d, i}, sinais: texto[]}` | `maturidade` mapeia o código para o nome (`e` experimental, `d` documentado, `i` indeterminado); `sinais` é a lista de nomes de sinais, indexada pelos números de `sinais_maturidade` |
| `contrato_maturidade` | número | 1 |

## Em cada item de `modelos[]` (em `web/data.js`)

| Campo | Tipo | Significado |
|---|---|---|
| `maturidade` | texto | `e`, `d` ou `i` |
| `sinais_maturidade` | inteiro[] | índices em `dicionario_maturidade.sinais`; os primeiros são os sinais que decidiram (`cartao_padrao_hub`, `placeholders_more_info`, `cartao_trainer_sem_descricao`, `cartao_vazio`, `cartao_curto_de_checkpoint`, `readme_indisponivel`), seguidos de até três sinais informativos (`sem_licenca`...) |

Em `data/modelos.json` os mesmos campos usam o nome por extenso (`experimental`, `documentado`, `indeterminado`) e os nomes dos sinais.

## `foto.maturidade`

```
foto.regra_maturidade = 1
foto.maturidade = {
  "brasil": {"experimental": n, "documentado": n, "indeterminado": n},
  "mundo": {...},
  "brasil_sem_maior": {...},                       // sem o publicador de mais modelos do Brasil
  "por_familia_tarefa": {"gerador": {"brasil": {...}, "mundo": {...}, "brasil_sem_maior": {...}}, "codificador": {...}},
  "builds": {"experimental": {"total": n, "com_build_nativo": n, "so_gguf_wllama": n}, "documentado": {...}, "indeterminado": {...}}
}
```

A interface pode filtrar por `maturidade` e recalcular as contagens a partir de `modelos[]`; `foto.maturidade` traz as contagens já prontas para os números principais. Os modelos `experimental` continuam presentes nos dados: o filtro é da visualização.
