# Como contribuir

[English](CONTRIBUTING.md)

O Observatório mapeia quem publica modelos de Web AI no Brasil e no mundo. Você pode acrescentar **publicadores, laboratórios, pesquisadores, modelos e famílias**, sempre com fonte pública. O padrão está em [docs/SPEC.md](docs/SPEC.md).

## Antes de tudo: quatro avisos

1. **Sem fonte, sem entrada.** Cada entrada precisa de pelo menos uma fonte (URL, tipo, o dia em que você abriu a página) e cada afirmação classificatória, de um trecho curto da página.
2. **Pesquisadores são pessoas.** Só informação profissional que a própria pessoa ou a instituição dela já tornou pública. Nada de e-mail, telefone, endereço, data de nascimento, foto, redes pessoais, nacionalidade ou qualquer atributo sensível. Na dúvida sobre o país ou o vínculo, a resposta é "não classificado", nunca um palpite.
3. **O Git é público e permanente.** O que você envia (inclusive um PR fechado ou um commit apagado depois) fica no histórico e pode ser copiado. Use o e-mail privado oferecido pelo GitHub (Settings, Emails, "Keep my email addresses private") nos commits. Se errou e pôs algo que não devia, peça remoção (abaixo): reescrevemos o histórico se for preciso.
4. **A decisão é sempre humana.** A checagem automática só confere formato, regras fixas e se cada trecho citado aparece na página da fonte, e mostra um status; não aprova, não rejeita e não faz merge. Quem revisa e decide são os mantenedores, pessoas. Não há IA nem chaves no processo de revisão.

## Tipos de contribuição

| Quero... | Como |
|---|---|
| Adicionar publicador, laboratório, pesquisador, modelo ou família | PR com um arquivo novo em `data/entidades/<tipo>/` (ou o formulário "Adicionar entidade") |
| Adicionar ou corrigir uma fonte | PR editando o campo `fontes`, ou o formulário "Fonte" |
| Corrigir um erro | PR editando o arquivo, ou o formulário "Corrigir" |
| Pedir remoção ou correção de dados de uma pessoa | Formulário "Pedir remoção" ou relato privado na aba Security do repositório (contatos em `docs/PRIVACIDADE.md`) |
| Propor um campo novo | Formulário "Propor campo"; mudar o padrão é decisão de spec |

Não edite `data/publicadores.json`, `modelos.json`, `familias.json`, `constelacoes.json`, `foto.json` nem `web/data.js`: são gerados pelo coletor (status de build, tamanhos, formatos, contagens). A checagem recusa PR que mexe neles.

## Sem saber usar Git: pelo navegador

1. Crie uma conta no GitHub (nas configurações, em Settings, Emails, ative "Keep my email addresses private").
2. Abra a pasta `templates/` do repositório, abra o modelo do tipo que você quer (por exemplo `pesquisador.json`) e copie o texto.
3. Vá a `data/entidades/<tipo>/`, clique em **Add file, Create new file** e digite o nome: o id e `.json` (`recogna.json`; para modelo, `publicador/nome.json`). O id é kebab-case: minúsculas, números e hífens.
4. Cole o modelo e troque os valores. Apague o que não se aplica (campos opcionais). Cuidado com as vírgulas: depois do último item de uma lista não vai vírgula.
5. Para cada fonte: abra a página, confira que ela diz o que você escreveu, copie a URL, escolha o `tipo` e ponha o dia de hoje em `acessado` (`"2026-11-20"`, com aspas). Em evidências, cole em `trecho` a frase curta da página.
6. Clique em **Commit changes, Propose changes** e depois **Create pull request**. O GitHub cria a sua cópia sozinho.
7. A checagem roda e mostra erros com arquivo, linha e dica. Corrija editando o arquivo na aba "Files changed" do PR e confirmando de novo.
8. Espere a revisão do mantenedor. Se pedir mudança, responda no PR.

## Pelo Git (clone)

```sh
git clone <fork>   &&   cd observatorio
cp templates/laboratorio.json data/entidades/laboratorio/meu-lab.json   # edite
python3 scripts/validar.py             # sem rede: schema, ids, URLs, datas, referências, privacidade, regras
python3 scripts/validar.py --links     # opcional: abre cada URL (precisa de internet)
python3 scripts/verificar.py           # dados derivados
git checkout -b adicionar-meu-lab && git add data/entidades && git commit && git push
```

Python 3.9 ou mais novo, só biblioteca padrão. O validador diz `arquivo:linha:coluna: ERRO [CODIGO] mensagem` e uma dica; os códigos estão na seção 12 da SPEC.

## O que acontece depois

1. **Automático (sem julgamento):** formato (schema), ids únicos, URLs bem formadas, datas, campos obrigatórios, fontes mínimas, regras de classificação, ausência de dado pessoal por padrão simples (e-mail, telefone, CEP, nascimento, redes pessoais). Com `--links`, se as páginas respondem; com `--trechos`, se cada trecho citado aparece mesmo na página da fonte.
2. **Humano:** o mantenedor abre as fontes e confere se dizem o que o arquivo afirma, se a pessoa deve estar mesmo (seção 7 da SPEC) e se o texto é neutro. Meta de resposta: até 14 dias; pode demorar, é trabalho voluntário.
3. Merge feito por uma pessoa. O site se atualiza na próxima publicação.

## Exemplos

Aceitos: `data/exemplos/` (marcados `"exemplo": true`; não entram nos dados oficiais). Rejeitados, com o motivo: `data/exemplos/rejeitados/` e [docs/EXEMPLOS_CONTRIBUICAO.md](docs/EXEMPLOS_CONTRIBUICAO.md).

## Pedir remoção ou correção

Você pode pedir a qualquer momento, sem justificar e sem mandar documento: o id da entrada basta. Confirmamos em até 3 dias úteis e removemos em até 7 dias corridos; se houver dado pessoal no histórico do Git que não devia estar lá, reescrevemos o histórico em até 30 dias. Não conseguimos recolher cópias, forks e arquivos da web já feitos. O pedido por issue é público: não escreva dados pessoais nele. Detalhes: SPEC seção 8 e [docs/GOVERNANCA.md](docs/GOVERNANCA.md).

## Licença e crédito

Dados em CC BY 4.0, código em MIT. Ao abrir o PR você declara que o texto é seu (ou uma citação curta com fonte) e aceita CC BY 4.0. A lista de contribuidores sai do histórico do Git (`python3 scripts/contributors.py`), sem coletar nenhum dado a mais; se não quiser aparecer, use um nome de commit que você escolha ou peça ao mantenedor para anotar no `.mailmap`.

Conduta: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Problema de segurança: [SECURITY.md](SECURITY.md).
