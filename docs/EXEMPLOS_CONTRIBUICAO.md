# Exemplos de contribuição

Todos os arquivos de exemplo ficam em `data/exemplos/` e têm `"exemplo": true`: servem para ensinar o formato e **não entram nos dados oficiais**. Foram conferidos abrindo as páginas em 2026-11-20. Os três pesquisadores são figuras públicas com página institucional clara; eles não consentiram em entrar no mapa, e por isso o arquivo fica só como exemplo. Informações que as páginas trazem e que **não foram copiadas** (e-mail, local de nascimento) mostram a regra: só o profissional e público necessário.

## Aceitos

| Exemplo | O que mostra |
|---|---|
| `publicador/maritaca-ai.json` | Empresa brasileira: país por local declarado no site (`site_institucional`), natureza `empresa` pelo selo do perfil no Hugging Face (`perfil_oficial`), dois links. |
| `publicador/CEIA-UFG.json` | Instituição: página do centro cita a Universidade Federal de Goiás e o Brasil. `regiao: BR-GO`. |
| `publicador/AIInstituteLNCC.json` | Perfil oficial que diz "Petrópolis (RJ), Brazil". |
| `laboratorio/ceia-ufg.json`, `c4ai-usp.json`, `iia-lncc.json` | Laboratório vinculado a uma instituição, com `instituicao.fonte` (trecho da página); `publicadores` liga às contas. |
| `pesquisador/fabio-cozman.json` | Cadastro por terceiro **com** página institucional que o lista; vínculo com laboratório por id; sem e-mail, foto ou local de nascimento. |
| `pesquisador/joao-paulo-papa.json` | Idem, com perfil institucional de órgão de fomento. |
| `pesquisador/anna-reali.json` | Idem, página no site do departamento. A página traz e-mail, telefone e sala: nada disso é copiado. |
| `instituicao/*` | Instituição com `tipo`, país e fonte com trecho literal. |
| `publicador/exemplo-pessoa.json` | Publicador do tipo pessoa com vínculo `pesquisador` a um laboratório, por autoinscrição e com página pública que a liste. |
| `benchmark/*` | Benchmark com `dominio`, datasets do Hugging Face e fontes com trecho literal; `n_datasets`, tamanho e downloads são **derivados**. |
| `familia/*` | Família com nome, descrição `pt`/`en` e fonte. |

## Rejeitados, com o motivo

Cada um é um arquivo de teste em `data/exemplos/rejeitados/` (pessoas e instituições fictícias) e o validador confirma o código com `python3 scripts/validar.py --rejeitados`.

| Arquivo | Por que é rejeitado | Código |
|---|---|---|
| `01-sem-fonte.json` | Entrada sem nenhuma fonte: sem fonte, sem linha. | FONTE_FALTA |
| `02-email-no-texto.json` | E-mail copiado para a descricao: contato pessoal nao entra. | EMAIL |
| `03-telefone.json` | Telefone no texto. | TELEFONE |
| `04-brasil-sem-evidencia.json` | 'br_evidencia' sem evidencia_pais: nao se adivinha. | BR_REGRA |
| `05-brasil-por-idioma.json` | Evidencia de Brasil e so o idioma portugues. | BR_REGRA |
| `06-independente-com-vinculo.json` | Natureza 'independente' com link de universidade. | INDEPENDENTE |
| `07-campo-derivado.json` | Campo derivado (calculado pelo coletor) editado a mao. | CAMPO_DERIVADO |
| `08-rede-pessoal.json` | Link para rede social pessoal. | REDE_PESSOAL |
| `09-foto.json` | Link de foto de pessoa. | FOTO |
| `10-data-nascimento.json` | Campo de dado pessoal proibido. | CAMPO_PROIBIDO |
| `11-terceiro-so-noticia.json` | Cadastro por terceiro com afiliacao provada so por artigo/noticia. | VINCULO_FONTE, TERCEIRO_SEM_FONTE |
| `12-nao-classificado-com-pais.json` | 'nao_classificado' com pais: ou ha evidencia, ou nao se classifica. | NAO_CLASSIFICADO |
| `13-data-futura.json` | Data de acesso no futuro. | DATA_FUTURA |
| `14-id-fora-do-padrao.json` | Id com maiuscula e espaco (kebab-case). | FORMATO |
| `15-pais-inexistente.json` | Codigo de pais fora da ISO 3166-1. | PAIS_INVALIDO |
| `16-url-http.json` | URL sem https. | FORMATO |
| `17-atributo-sensivel.json` | Texto que registra atributo sensivel. | SENSIVEL |
| `19-benchmark-sem-dominio.json` | Benchmark sem dominio. | CAMPO_FALTA |
| `20-benchmark-dominio-invalido.json` | Dominio fora da lista permitida. | VALOR |
| `21-benchmark-campo-derivado.json` | `n_datasets` e derivado: o coletor calcula. | CAMPO_DERIVADO |
| `22-benchmark-fonte-sem-trecho.json` | Fonte de benchmark sem trecho literal. | CAMPO_FALTA |
| `23-benchmark-dataset-id-invalido.json` | Dataset precisa ser `<publicador>/<nome>`. | FORMATO |
| `24-benchmark-leaderboard-sem-link.json` | Tipo leaderboard exige `links.leaderboard`. | CAMPO_FALTA |
| `25-vinculo-instituicao-inexistente.json` | Vínculo para instituição que não existe. | REF_INEXISTENTE |
| `26-vinculo-sem-fonte.json` | Vínculo sem fonte. | CAMPO_FALTA |
| `27-pessoa-conta-oficial.json` | Pessoa só tem a relação `pesquisador`. | PESSOA_RELACAO |
| `28-independente-com-vinculo.json` | Natureza `independente` com vínculo declarado. | INDEPENDENTE |
| `29-vinculo-com-email.json` | E-mail no trecho de um vínculo. | EMAIL |
| `30-relacionado-a-si-mesmo.json` | Publicador relacionado a si mesmo. | VINCULO_AUTO |
| `31-instituicao-parte-de-si-mesma.json` | Instituição parte de si mesma. | VINCULO_AUTO |
| `32-instituicao-tipo-invalido.json` | Tipo de instituição fora da lista. | VALOR |

## Rejeitados por revisão humana (o validador não vê)

- Cadastro de uma pessoa **a partir de uma reportagem** que a descreve, sem página institucional ou perfil próprio: o validador acusa `VINCULO_FONTE` se o tipo for `artigo`; se alguém marcar a reportagem como `pagina_pessoa`, o revisor recusa.
- Um trecho que não está na página (o revisor abre a fonte e não acha a frase).
- Marcar alguém como `br_evidencia` porque o nome "parece brasileiro".
- Descrição com adjetivos ("referência nacional", "o melhor grupo") ou conclusões ("abandonado"): o texto só diz o que a fonte diz, com a data.
- Cadastro de estudante de graduação por terceiro.
- PR que altera `scripts/` ou o schema junto com dados: pedimos separar (infraestrutura é revisada à parte).
