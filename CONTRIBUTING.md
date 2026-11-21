# Contributing

[Português](CONTRIBUTING.pt.md)

The Observatório maps who publishes Web AI models in Brazil and around the world. You can add **publishers, labs, researchers, models and families**, always with a public source. The standard is in [docs/SPEC.md](docs/SPEC.md) (in Portuguese; summary in English at the top).

## Four warnings first

1. **No source, no entry.** Every entry needs at least one source (URL, type, the day you opened the page) and every classifying claim needs a short quote from the page.
2. **Researchers are people.** Only professional information that the person or their institution already made public. No e-mail, phone, address, birth date, photo, personal social networks, nationality or any sensitive attribute. If the country or affiliation is unclear, the answer is "not classified", never a guess.
3. **Git is public and permanent.** What you submit (even a closed PR or a commit you later delete) stays in the history and may be copied. Use the private e-mail GitHub offers (Settings, Emails, "Keep my email addresses private") for commits. If you published something that should not be there, ask for removal (below): we rewrite history if needed.
4. **The decision is always human.** The automatic check only verifies format, fixed rules and whether each quoted passage appears on the source page, and shows a status; it does not approve, reject or merge. The maintainers, who are people, review and decide. There is no AI and there are no keys in the review process.

## Kinds of contribution

| I want to... | How |
|---|---|
| Add a publisher, lab, researcher, family or benchmark | PR with a new file under `data/entidades/<type>/` (or the "Add an entity" form) |
| Add an institution, or link a publisher to a lab or institution | PR with a file under `data/entidades/instituicao/` (template `templates/instituicao.json`, or the "Add an institution" form), or a `vinculos` entry in the publisher file ("Link a publisher" form; "Fix a link" form to correct one). Every link needs a source with a literal quote; for a person, only a public professional profile or institutional page, never personal data |
| Add a Portuguese or Brazil-related benchmark | PR with a new file under `data/entidades/benchmark/` (template `templates/benchmark.json`, or the "Add a benchmark" form): name, domain, the Hugging Face datasets it points to and sources with a literal quote. Dataset metadata (size, downloads, license) is derived by the collector |
| Add or fix a source | PR editing `fontes`, or the "Source" form |
| Fix an error | PR editing the file, or the "Fix" form |
| Request removal or correction of a person's data | "Request removal" form or the private report in the repository's Security tab (contacts in `docs/PRIVACIDADE.md`) |
| Propose a new field | "Propose a field" form; changing the standard is a spec decision |

Do not edit `data/publicadores.json`, `modelos.json`, `familias.json`, `constelacoes.json`, `foto.json`, `datasets.json`, `benchmarks.json`, `foto_camadas.json`, `relacoes.json` or `web/data.js`: the collector generates them (build status, sizes, formats, counts). The check rejects PRs that touch them. You indicate **who publishes** (a Hugging Face user or organization) with the minimum evidence of country and nature; the models are always derived by the collector from the public APIs and are never entered by hand. After a PR is merged, the maintainers run the collection and publish the derived data (section "Como os dados entram no site" in `docs/GOVERNANCA.md`, in Portuguese).

## Without knowing Git: in the browser

1. Create a GitHub account (in Settings, Emails, turn on "Keep my email addresses private").
2. Open the repository's `templates/` folder, open the template for your type (for example `pesquisador.json`) and copy the text.
3. Go to `data/entidades/<type>/`, click **Add file, Create new file** and type the name: the id plus `.json` (`recogna.json`). The id is kebab-case: lowercase, digits and hyphens.
4. Paste the template and replace the values. Delete what does not apply (optional fields). Mind the commas: no comma after the last item of a list.
5. For each source: open the page, check it says what you wrote, copy the URL, pick the `tipo` and put today's date in `acessado` (`"2026-11-20"`, quoted). For evidence, paste a short quote from the page in `trecho`.
6. Click **Commit changes, Propose changes**, then **Create pull request**. GitHub makes your copy for you.
7. The check runs and shows errors with file, line and a hint. Fix them by editing the file under "Files changed" and committing again.
8. Wait for the maintainer's review. If changes are requested, reply in the PR.

## With Git (clone)

```sh
git clone <your-fork>   &&   cd observatorio
cp templates/laboratorio.json data/entidades/laboratorio/my-lab.json   # edit it
python3 scripts/validar.py             # offline: schema, ids, URLs, dates, references, privacy, rules
python3 scripts/validar.py --links     # optional: opens every URL (needs internet)
python3 scripts/verificar.py           # derived data
git checkout -b add-my-lab && git add data/entidades && git commit && git push
```

Python 3.9+, standard library only. The validator prints `file:line:column: ERRO [CODE] message` and a hint; codes are listed in section 12 of the SPEC.

## What happens next

1. **Automatic (no judgment):** format (schema), unique ids, well-formed URLs, dates, required fields, minimum sources, classification rules, no personal data by simple patterns (e-mail, phone, postal code, birth, personal networks). With `--links`, whether pages answer; with `--trechos`, whether each quoted passage really appears on the source page.
2. **Human:** the maintainer opens the sources and checks they say what the file claims, whether the person should be listed at all (SPEC section 7) and whether the wording is neutral. Target: a reply within 14 days; it can take longer, this is volunteer work.
3. A person merges. The site updates on the next publish.

## Changing the interface

The interface is plain HTML, CSS and JavaScript in `web/` (no build step). Before opening a PR, run `node scripts/testar-camadas.mjs` (tabs, filters and exports, with the example data of `?fixture=1`) and `node scripts/perf.mjs` (frame cost with 500 to 4,000 nodes; the map must stay under 3 ms per frame at p95). Both need `playwright-core` and Chrome (`PLAYWRIGHT_CORE` and `CHROME` set the paths). The adapter for the datasets and benchmarks contract is `web/camadas.js`; the exports are in `web/exportar.js`. Do not add libraries or external requests: the page and the exported files must work offline.

## Examples

Accepted: `data/exemplos/` (marked `"exemplo": true`; they never enter the official data). Rejected, with the reason: `data/exemplos/rejeitados/` and [docs/EXEMPLOS_CONTRIBUICAO.md](docs/EXEMPLOS_CONTRIBUICAO.md).

## Request removal or correction

You may ask at any time, without a reason and without sending ID: the entry id is enough. We acknowledge within 3 business days and remove within 7 days; if personal data that should not be there is in the Git history, we rewrite the history within 30 days. We cannot recall copies, forks and web archives that already exist. An issue is public: do not write personal data in it. Details: SPEC section 8 and [docs/GOVERNANCA.md](docs/GOVERNANCA.md).

## License and credit

Data under CC BY 4.0, code under MIT. By opening the PR you declare the text is yours (or a short quote with a source) and accept CC BY 4.0. The contributors list is built from Git history (`python3 scripts/contributors.py`), collecting nothing extra; if you prefer not to appear, use a commit name you choose or ask the maintainer to note it in `.mailmap`.

Conduct: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Security issues: [SECURITY.md](SECURITY.md).
