# Governança e sustentação

Curto de propósito. Vale a partir da publicação.

## Papéis

- **Mantenedores:** fazem merge, atendem pedidos de remoção, decidem disputas, mudam regras e infraestrutura. No lançamento há um mantenedor (o dono da conta que hospeda o repositório, também controlador dos dados pessoais, ver `docs/PRIVACIDADE.md`); a meta é ter pelo menos dois depois.
- **Revisores** (opcionais, convidados pelos mantenedores): leem PRs de dados e recomendam; não fazem merge de dados pessoais. Só os mantenedores mexem em `scripts/`, `schema/`, `.github/`, `docs/` e `data/remocoes.json` (CODEOWNERS).
- **Contribuidores:** qualquer pessoa. O crédito sai do Git.

## Moderação

Pesquisadores e donos de contas são pessoas. A moderação combina **validação mecânica e revisão humana**. Nada decide sozinho.

1. **Validação mecânica determinística, em todo PR (CI).** Schema, ids, URLs, datas, referências mínimas, regras de classificação, padrões de dado pessoal e, quando a página da fonte pode ser baixada, a conferência de que cada **trecho literal citado aparece de fato nela** (`validar.py --trechos`). Só leitura, sem chaves. Mostra um status; não aprova nem rejeita.
2. **Revisão humana dos mantenedores**, sempre: abrem as fontes, conferem se a pessoa deve estar, a neutralidade do texto, disputas e pedidos de remoção, e fazem o merge.


## Como os dados entram no site

A contribuição indica **quem publica** (usuário ou organização do Hugging Face) e a evidência mínima de país e de natureza. Os modelos, tamanhos, formatos, status de build e famílias nunca são inseridos à mão: o coletor os deriva das APIs públicas. Nenhuma etapa depende de inteligência artificial.

1. **Contribuição por PR.** A pessoa abre um PR com arquivos em `data/entidades/` (um por publicador, seguindo a SPEC). O PR não altera scripts, schema, site nem arquivos derivados.
2. **Validação mecânica.** O CI roda `validar.py` (schema, ids, URLs, privacidade, regras de classificação, trechos citados). Mostra um status; não aprova nem rejeita.
3. **Revisão e curadoria pelos mantenedores.** Abrem as fontes, conferem evidência, neutralidade e pessoas listadas; podem corrigir arquivos no próprio PR (commits no ramo do PR) antes do merge. Para ter um resumo local, `scripts/processar_pr.sh <número>` baixa o PR em pasta temporária (somente leitura), confere o que ele toca, valida e lista as entidades novas e os publicadores que a coleta traria.
4. **Merge** pelos mantenedores.
5. **Coleta pelos mantenedores.** Em `main` atualizada, no computador de um mantenedor (a API anônima do Hugging Face basta; a máquina deve estar na tomada): `python3 scripts/coletar.py --novos`. A coleta lê as entidades curadas, coleta só o que falta (publicadores novos, entidades alteradas e coletas com mais de 30 dias) e **mescla** o resultado nos dados existentes. É retomável: cada publicador coletado vira um checkpoint em `.cache/`; se a máquina desligar ou o terminal fechar, o mesmo comando continua de onde parou. Respeita o limite de 500 chamadas por 5 minutos. Referência: cerca de 100 chamadas por minuto; um publicador sem modelos no corte custa 1 a 3 chamadas, e um com modelos custa cerca de 3 chamadas por modelo, mais as do índice de builds (cerca de 50, uma vez por coleta). Na primeira coleta incremental sobre dados gerados antes desta rotina, rode uma vez `python3 scripts/coletar.py --normalizar`, que só reordena os arquivos derivados (sem rede, sem mudar conteúdo), para que o diff mostre apenas o que a coleta mudou.
6. **Relatório.** `scripts/relatorio_coleta.py` (rodado ao fim da coleta) compara os dados antes e depois: publicadores novos, modelos adicionados e removidos, mudanças de status de build, contagens por classe e natureza e anomalias (publicador sem modelos no corte, queda grande de contagem, evidência que parou de responder). Fica em `.relatorios/`, fora do Git, para o mantenedor revisar antes de publicar.
7. **Commit dos dados derivados.** Se o relatório estiver conforme, os mantenedores fazem o commit de `data/*.json` e `web/data.js` em ramo `coleta-*`, por PR, com revisão humana. A saída é determinística: sem mudança na fonte, o diff é vazio.
8. **Atualização do site** a partir do `main`.

**Periodicidade.** `coletar.py --novos` a cada lote de PRs fundidos, pelo menos uma vez por semana; `coletar.py --tudo` uma vez por mês, para atualizar contagens, downloads e status de build de todos os publicadores e retirar dos dados quem deixou de ser candidato (entidade arquivada ou removida). Uma coleta de cerca de 200 publicadores novos leva de 15 a 40 minutos com a API anônima (a maior parte do tempo é espera pelo limite de chamadas).

## Critérios de entrada

| Entidade | Entra quando |
|---|---|
| publicador | tem modelos de linguagem publicados e perfil público; evidência de natureza; país só com evidência |
| laboratório | tem página própria ou institucional que o vincule a uma instituição, e publica ou é citado como autor de modelo ou pesquisa de IA em linguagem |
| pesquisador | página institucional ou perfil profissional público que o liste com vínculo, **e** pelo menos uma publicação ou modelo creditado a ele; estudantes e pessoas sem página só por autoinscrição; menores nunca |
| família | linhagem reconhecida por pelo menos 2 modelos |

Fora do escopo: ranking de pessoas, métricas de desempenho de pessoas, perfil pessoal, avaliação de qualidade de pesquisa.

## Critérios de saída

- **Pessoas:** removidas a pedido (SPEC seção 8) ou quando a fonte deixa de sustentar o fato e ninguém a substitui. Não há arquivamento por "inatividade".
- **Organizações, laboratórios, modelos e famílias:** arquivados (`status: arquivado`, com motivo) se a fonte sai do ar sem substituta por 90 dias, se encerram ou se fundem (`substituido_por`).
- Uma entrada sem nenhuma fonte válida há mais de 365 dias é arquivada ou removida.

## Disputas

Regra geral: **a palavra da pessoa sobre ela mesma prevalece sobre a regra automática.**

- "Não sou brasileiro": muda para `nao_classificado` (ou `fora_br`, se a pessoa indicar e houver fonte) em até 7 dias e remove a evidência de país. A pessoa não precisa provar nada além de poder falar pelo perfil citado ou pelo canal privado.
- "Não sou independente" / "sou da empresa ou universidade X": a natureza muda para a que a pessoa indicar, com a fonte que ela apontar; sem fonte, `nao_classificada`.
- "Sou brasileiro e fui classificado como não classificado": é o comportamento esperado; a pessoa pode abrir PR com a evidência.
- Terceiro contesta dado de outra pessoa: vale a fonte; sem fonte pública que sustente, sai.
- Conflito entre contribuidores: os mantenedores decidem, escrevem o motivo no PR e a regra, se for o caso, entra na SPEC.

## Sustentação

- **Esforço de moderação, fase 1 (estimativa a medir no piloto, em horas por semana):**

| PRs por semana | Horas por semana |
|---|---|
| 3 a 5 (começo) | cerca de 1 |
| cerca de 10 | 2 a 3 |
| cerca de 30 | 5 a 8 |

  Cada PR bem formado leva de 8 a 15 minutos: a checagem de trechos poupa parte da abertura das fontes, e o humano confere contexto, pessoa e neutralidade. Pedidos de remoção são raros, mas têm prazo.
- **Dependência de uma pessoa:** é o risco principal. Mitigações: procedimento escrito aqui, a meta de ter um segundo mantenedor e a possibilidade de pôr o projeto em modo somente leitura.
- **Atualização dos derivados:** os mantenedores rodam `scripts/coletar.py` conforme a seção "Como os dados entram no site"; a diferença entra por PR (ramo `coleta-*`), com revisão e merge humanos.
- **Crédito:** CONTRIBUTORS gerado do Git (`scripts/contributors.py`), sem coletar nada além do nome de commit. O rodapé do site mantém o crédito "Inspirado no Observatório da Maritaca", em texto simples, e a fonte Atkinson Hyperlegible (SIL OFL 1.1). O código da interface é original, escrito à mão.
- **Licenças:** dados CC BY 4.0 (`LICENSE-DATA`), código MIT (`LICENSE`). Titular: "Observatório contributors".
- **Privacidade:** aviso em [docs/PRIVACIDADE.md](PRIVACIDADE.md) (quem é listado, fonte, como se opor); base legal: legítimo interesse (LGPD art. 7, IX e §§3 e 4; GDPR art. 6(1)(f)); prazos na SPEC, seção 8.
- **Identidade de commit:** cada mantenedor define a própria com `git config user.name` e `git config user.email`, preferindo o e-mail privado que o GitHub oferece.

## Inspirações

Estrutura e redação foram alinhadas a práticas de projetos comunitários públicos (páginas abertas em 2026-11-20):

- CNCF Landscape (https://github.com/cncf/landscape): dados num arquivo versionado alterado só por pull request, critérios de inclusão publicados, saída sob CC BY 4.0. Aqui: um arquivo por entidade, critérios de entrada acima.
- Listas "awesome" (https://github.com/sindresorhus/awesome): modelo de PR com lista de conferência e lint mecânico (`awesome-lint`) antes da revisão. Aqui: `PULL_REQUEST_TEMPLATE.md` e `validar.py`.
- Wikidata, política de pessoas vivas (https://www.wikidata.org/wiki/Wikidata:Living_people): dado contestável precisa de fonte pública confiável; o ônus da prova é de quem acrescenta; pedidos de remoção pelo titular. Aqui: SPEC seções 5, 7 e 8.
- Wikipédia, biografias de pessoas vivas (https://en.wikipedia.org/wiki/Wikipedia:Biographies_of_living_persons): material contestável sem fonte é removido na hora, restrição com pessoas privadas, gentileza com quem pede correção. Aqui: SPEC seção 7, item 8.
- Hugging Face, política de conteúdo (https://huggingface.co/content-policy): proíbe publicar informação privada de terceiros sem permissão, como endereço físico ou e-mail. Aqui: campos proibidos.
- Contributor Covenant 2.1 (https://www.contributor-covenant.org/version/2/1/code_of_conduct/): `CODE_OF_CONDUCT.md` usa o texto padrão.
- Documentação do GitHub sobre política de segurança (https://docs.github.com/en/code-security/getting-started/adding-a-security-policy-to-your-repository): `SECURITY.md` com versões suportadas e como relatar.
