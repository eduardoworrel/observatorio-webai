# SPEC do Observatório (mapa de Web AI), versão 0.2

Observatório é o nome do projeto (não confundir com o Observatório da Maritaca, que o inspirou).

Mapa de modelos de linguagem que rodam (ou podem rodar) no navegador e na borda, e de quem os publica, no Brasil e no mundo. Os dados vêm só da API pública do Hugging Face e são calculados por regra: nenhum modelo de linguagem lê, resume ou decide nada.

## Princípios

1. **Sem fonte, sem linha.** Todo modelo e todo publicador carregam `fontes[]` com `url` e `acessado` (data ISO).
2. **Regra, não opinião.** Status, família, formato e tamanho saem de funções do coletor (`scripts/coletar.py`). A mesma API na mesma data dá o mesmo resultado.
3. **Não medido não é zero.** Campo desconhecido é `null`, nunca 0.
4. **Existe não é roda.** O mapa diz que há arquivos em formato de navegador. Não afirma que funcionam.
5. **Independente de qualquer outro projeto.** Nenhum dado de terceiros além do Hugging Face; ligações com outros projetos (por exemplo, um futuro ranking de desempenho) são só links.

## Entidades

### publicador (`data/publicadores.json`)

| Campo | Tipo | Obrigatório | Origem |
|---|---|---|---|
| `id` | texto | sim | nome no Hugging Face (usuário ou organização) |
| `nome` | texto | sim | `fullname` da API de perfil |
| `tipo` | `pessoa` \| `grupo` | sim | `/api/users/<id>/overview` (pessoa) ou `/api/organizations/<id>/overview` (grupo) |
| `classe_pais` | `br_evidencia` \| `nao_classificado` \| `fora_br` | sim | regra B |
| `evidencia_pais` | `{tipo, url, trecho, acessado, regra}` | sim se `br_evidencia` | regra B; `tipo` é `perfil`, `cartao` ou `institucional` |
| `natureza` | `independente` \| `instituicao` \| `empresa` \| `nao_classificada` | sim | regra N |
| `evidencia_natureza` | `{classe, tipo, url, trecho, acessado, regra}` | sim para publicadores do Brasil classificados | regra N |
| `escopo` | `br` \| `mundo` | sim | `br` só com `classe_pais = br_evidencia` |
| `origem_lista` | texto | sim | `lista inicial`, `busca na API`, `lista mundo` ou `descoberta por builds de navegador` |
| `modelos_fora_do_corte` | inteiro | sim | modelos de linguagem acima do corte de 12 B |
| `n_modelos_hf`, `n_membros` | inteiro ou `null` | não | API de perfil |
| `url`, `fontes[]` | URL; `{rotulo, url, acessado}` | sim | |

### modelo (`data/modelos.json`)

| Campo | Origem na API |
|---|---|
| `id`, `nome`, `url` | `id` do repositório |
| `publicador` | parte antes da barra do `id` |
| `escopo` | herdado do publicador |
| `familia` | regra F |
| `tarefa` | `pipeline_tag` (só `text-generation`, `image-text-to-text`, `any-to-any`, `text2text-generation`) |
| `licenca` | tag `license:*` |
| `parametros_b` | `safetensors.total` (em bilhões), ou `null` |
| `downloads`, `atualizado` | `downloads`, `lastModified` (data) |
| `idioma_pt` | tag `pt` ou nome com pt-br/portugu/brasil |
| `base` | tag `base_model:*` |
| `formatos_proprios[]` | regra de formato, no próprio repositório |
| `builds[]` | repositórios que são o mesmo modelo em outro formato (regra N); cada um com `repo`, `autor`, `formato`, `oficial`, `url`, `atualizado` e, no melhor por formato, `gb` e `variante` |
| `status` | regra S (build nativo de navegador) |
| `gguf` | existe build GGUF de qualquer tamanho (booleano) |
| `gguf_wllama`, `gguf_gb`, `gguf_origem` | regra G: GGUF plausível no navegador, tamanho da menor variante Q4 e se é `oficial` ou `comunidade` |
| `gguf_grande` | existe GGUF, mas acima do corte (não conta) |
| `via` | `nativo` \| `gguf` \| `nenhum` (regra V) |
| `formatos_navegador[]` | formatos de navegador dos builds |
| `gb_navegador` | menor `gb` entre os builds nativos medidos; sem build nativo, o `gguf_gb` |
| `conversao_de` | só em conversões de terceiros: id do modelo-base |
| `fontes[]` | modelo e builds, com `acessado` |

### família e constelação

- **Família** (`data/familias.json`): grupo de modelos com a mesma linhagem (regra F). Cruza publicadores: Tucano e Qwen3 podem estar na mesma família.
- **Constelação** (`data/constelacoes.json`): um publicador e seus modelos. As arestas ligam modelos da mesma família dentro da constelação. Na interface é possível trocar o agrupamento para "por família".

### fonte

Objeto `{rotulo, url, acessado}`. `url` é sempre um endereço público conferível; `acessado` é a data da coleta.

### foto (`data/foto.json`)

Contagens por escopo (Brasil, mundo) e por natureza no Brasil: `modelos`, `nativo_oficial`, `nativo_comunidade`, `so_gguf_wllama`, `nenhum`, `gguf_grande_sem_nativo`, `so_nativo`, `nativo_mais_gguf`; publicadores por natureza; candidatos avaliados, classificados e descartados por motivo; ressalvas.

## Regras

### Formato (de um repositório)

| Formato | Marca no repositório |
|---|---|
| `onnx` (Transformers.js / ONNX Runtime Web) | tag `onnx` ou "onnx" no nome |
| `mlc` (WebLLM) | tag `mlc-llm` ou nome terminando em `-MLC` |
| `litert` (LiteRT, MediaPipe) | tag `litert`, `tflite`, `litert-lm`, ou "litert" no nome |
| `gguf` (wllama, llama.cpp em WebAssembly) | tag `gguf` |

Formatos **de navegador**: `onnx`, `mlc`, `litert`. `gguf` fica à parte (precisa de wllama e raramente é publicado para isso).

### R: o que é build do mesmo modelo

Um repositório candidato é build do modelo M se, depois do nome de M (separado em partes por `-`, `_`, `.`), restarem apenas marcas de formato ou quantização (`onnx`, `mlc`, `gguf`, `litert`, `q4f16`, `q4_k_m`, `int4`, `web`, `webgpu`, `qat`, `mobile`...). Versões diferentes (`-Instruct`, `-Base`) são modelos diferentes. Candidatos vêm de um índice dos repositórios de formato de navegador: todas as publicações das organizações de runtime (`onnx-community`, `mlc-ai`, `litert-community`) e das buscas por tag (`transformers.js`, `mlc-llm`, `litert`) para texto, indexados pelo nome sem marcas de formato; mais os repositórios de formato do próprio publicador.

### S: status do build nativo

- **oficial** (build do publicador): existe build nativo (`onnx`, `mlc`, `litert`) em repositório do próprio publicador (inclui o caso de o modelo já ser publicado nesse formato).
- **comunidade**: não há build do publicador, mas há build nativo de outra conta (organização de runtime ou pessoa).
- **sem_build**: nenhum build nativo encontrado.

### G: GGUF via wllama (conta à parte)

GGUF roda no navegador via wllama (llama.cpp em WebAssembly), mas só em tamanho plausível. Regra: o GGUF **conta** se a menor variante Q4 (`Q4_K_M`, senão qualquer `Q4`; sem Q4, a variante mais leve) somar **até 4,0 GB**. As partes de um GGUF dividido são somadas. Acima disso, `gguf_grande = true` e não conta. O corte vem de fatos públicos de plataforma: WebAssembly de 32 bits chega a 4 GB no Chrome (https://v8.dev/blog/4gb-wasm-memory); o ONNX Runtime Web diz que não roda modelo acima de 4 GB no WASM (https://onnxruntime.ai/docs/tutorials/web/large-models.html); o wllama limita o arquivo a 2 GB, por isso modelos maiores precisam ser divididos em partes (https://github.com/ngxson/wllama). Candidatos GGUF vêm do próprio publicador e da relação `base_model:quantized:<modelo>` declarada nos cartões; até 3 repositórios por modelo têm o tamanho medido.

### V: via de execução

`nativo` se há build nativo; senão `gguf` se `gguf_wllama`; senão `nenhum`. A foto mostra **só nativo** e **nativo + GGUF** separadamente.

### Tamanho do download (`gb`)

Soma dos arquivos da variante mais leve de interesse no repositório do build (API `tree`):

- `onnx`: preferência `q4f16`, `q4`, `int4`, `bnb4`, `q4f32`, `q2f16`, `q8f16`, `uint8`, `int8`, `quantized`, `fp16`; repositório sem sufixo de tipo usa a soma de todos os arquivos `.onnx*` (variante `unico`). Soma todos os componentes daquela variante (decodificador, embeddings, visão), então pode incluir o codificador de imagem.
- `mlc`: soma dos `params_shard_*.bin`.
- `litert`: menor arquivo `.litertlm`/`.task`/`.tflite` com `int4`, `4bit` ou `web` no nome; senão o menor.
- `gguf`: menor arquivo `Q4_K_M`; senão qualquer `Q4`; senão o menor (sem `mmproj` e `imatrix`).

### F: família

Nome do modelo-base (tag `base_model` ou, sem ela, o próprio nome), reduzido ao prefixo alfabético mais o primeiro número de versão: `Qwen3.5-4B` → `Qwen3.5`; `Llama-3.1-8B` → `Llama-3.1`; `LFM3-1.7B` → `LFM3`.

### B: "modelo brasileiro" = criado por brasileiros

Modelo **criado por brasileiros** (pessoa, grupo, empresa ou universidade do Brasil), incluindo ajustes finos e treinos sobre bases estrangeiras. **Não** é "modelo em português feito por estrangeiros". A classificação é **por publicador**, com evidência pública guardada com `url`, `trecho` e `acessado`:

- **E1**: o perfil declara um site com domínio `.br`;
- **E2**: a descrição do perfil cita Brasil;
- **E3**: o cartão de um modelo do publicador traz endereço ou e-mail `.br` (E3a) ou uma linha com afiliação e Brasil, fora de menções ao idioma (E3b, marcada `revisar`);
- **institucional**: página curada (`seed/evidencias.json`) que responde na coleta e traz o padrão esperado.

Classes: `br_evidencia` (Brasil, com evidência), `nao_classificado` (sem evidência: **não é adivinhado**, e fica fora do mapa) e `fora_br` (lista curada de grandes publicadores internacionais, confiança baixa). Candidatos vêm da lista inicial e de buscas na API por termos em português (`pt`, `pt-br`, `ptbr`, `portuguese`, `brasil`, `brazil`...); só entram no mapa os que têm evidência. Os demais ficam em `data/foto.json` (`descartados`), com o motivo. Independentes descobertos fora do Brasil por terem builds de navegador entram como `nao_classificado`.

### N: natureza do publicador

- **instituição**: universidade ou instituto declarado no perfil, no site ou no cartão (domínio edu/gov.br, "Universidade", "Instituto", siglas conhecidas), ou página institucional curada;
- **empresa**: perfil ou página institucional a declara (Ltda, S.A., startup, "company"...);
- **independente**: pessoa, ou grupo pequeno (até 5 membros, não verificado), sem vínculo institucional ou de empresa declarado no perfil nem nos cartões lidos. A ausência de vínculo declarado não prova que não exista; a evidência diz isso;
- **nao_classificada**: o resto (por exemplo, uma organização sem sinais).

## Qualidade e verificação

- `python3 scripts/verificar.py` confere o esquema: campos obrigatórios, `fontes[]` com URL e data, status coerente com `builds[]`, `gb` nulo ou positivo, escopo `br` com `evidencia`, ids únicos.
- O coletor faz pausa entre chamadas, repete em caso de limite de uso (429) e guarda respostas em `.cache/` (fora do Git).
- Cada coleta registra a data e o número de chamadas em `data/foto.json`.

## Amostra

Todos os modelos de linguagem de cada publicador classificado, paginando a API, com corte de **12 B de parâmetros** (`safetensors.total`, ou `gguf.total`; sem informação, o modelo fica). Adaptadores LoRA/PEFT (tags `peft`, `lora` ou `base_model:adapter`) não contam, pois não rodam sozinhos. Repositórios que são só um formato de outro modelo do mesmo publicador viram build desse modelo, não modelo novo. O coletor respeita o limite da API anônima (500 chamadas por 5 minutos) lendo o cabeçalho de limite.

## Fora do escopo (0.2)

Medir desempenho, executar modelos, ler cartões com LLM, rastrear fora do Hugging Face.
