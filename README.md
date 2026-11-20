# Observatório de Web AI

Mapa de modelos que rodam no navegador e na borda, e de quem os publica, no Brasil e no mundo.

- `docs/SPEC.md`: padrão de dados 1.0 (entidades, fontes mínimas, privacidade).
- `data/entidades/`: dados curados, um arquivo por entidade (contribuição). `data/*.json`: derivados, gerados pelo coletor.
- `scripts/coletar.py`: coleta na API pública do Hugging Face (stdlib), a partir dos publicadores curados. `scripts/relatorio_coleta.py`: relatório da coleta. `scripts/processar_pr.sh`: resumo local de um PR. `scripts/validar.py`: valida contribuições. `scripts/verificar.py`: valida os derivados. `tests/testar_fluxo.py`: testes do fluxo.
- `web/index.html`: interface (abra direto no navegador).

```sh
python3 scripts/coletar.py --novos            # só o que falta; mescla nos dados; retomável (--dry-run lista sem chamar a API)
python3 scripts/coletar.py --tudo             # atualização completa (--fresh ignora o cache)
python3 scripts/relatorio_coleta.py           # o que mudou, para revisar antes de publicar
python3 scripts/verificar.py && python3 scripts/validar.py
open web/index.html
```

## Contribuir

Você pode acrescentar ou corrigir **publicadores, laboratórios, pesquisadores, modelos e famílias**, sempre com pelo menos uma fonte pública (tipo, URL, data de acesso). Passo a passo, inclusive para quem nunca usou Git: [CONTRIBUTING.pt.md](CONTRIBUTING.pt.md) ([English](CONTRIBUTING.md)).

- **Pesquisadores são pessoas:** só informação profissional já pública, com fonte; nada de e-mail, telefone, endereço, nascimento, foto ou redes pessoais. Pedido de remoção ou correção a qualquer momento, sem justificar (SPEC, seção 8). O Git é público e permanente.
- **A decisão é sempre humana.** A checagem automática (`python3 scripts/validar.py`) só confere formato, regras fixas e se cada trecho citado aparece na fonte; os mantenedores revisam e decidem (`docs/GOVERNANCA.md`).
- **Privacidade e controlador:** [docs/PRIVACIDADE.md](docs/PRIVACIDADE.md) (PT e EN).
- Você indica **quem publica** (usuário ou organização do Hugging Face) com a evidência de país e de natureza; os modelos, tamanhos, formatos e status de build são sempre derivados pelo coletor a partir das APIs públicas, nunca inseridos à mão. Como os dados entram no site: [docs/GOVERNANCA.md](docs/GOVERNANCA.md).
- Modelos e exemplos: [docs/EXEMPLOS_CONTRIBUICAO.md](docs/EXEMPLOS_CONTRIBUICAO.md). Governança: [docs/GOVERNANCA.md](docs/GOVERNANCA.md). Conduta: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Segurança: [SECURITY.md](SECURITY.md).

## Licenças e crédito

Dados em CC BY 4.0 ([LICENSE-DATA](LICENSE-DATA)); código em MIT ([LICENSE](LICENSE)). Interface inspirada no Observatório da Maritaca (https://observatorio.maritaca.ai/), reescrita à mão, sem copiar arquivos, textos, marca ou dados; o código da interface é original, escrito à mão. Fonte Atkinson Hyperlegible Next e Mono (SIL OFL 1.1).
