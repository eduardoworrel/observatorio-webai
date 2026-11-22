# Contrato: escopo do modelo, créditos com papel e recorte em português

Campos novos de cada modelo, em `data/modelos.json` e em `web/data.js` (objeto por modelo, sem recodificação):

| campo | tipo | significado |
|---|---|---|
| `escopo` | `"br"` ou `"mundo"` | escopo do **modelo** (seção 9.8 da SPEC) |
| `origem_motivo` | `"publicador"`, `"desenvolvedor"`, `"financiador"` ou `"foco_pt_br"` | por que é Brasil; ausente quando o escopo é Mundo |
| `origem_fonte` | objeto | para os motivos diferentes de `publicador`: `url`, `trecho` e, conforme o motivo, `credito` (`inst:ID:papel` ou `pub:ID`) ou `criterio` (`variante_explicita`, `declaracao` ou `artigo`) |
| `publicador` | texto | quem hospeda o modelo; atributo próprio, separado da origem |
| `creditos` | lista de textos `inst:ID:papel` ou `lab:ID:papel` | papel: `desenvolvedor`, `financiador`, `parceiro` ou `plataforma` |
| `idiomas` | lista | idiomas do cartão (ISO 639-1) |
| `pt` | booleano | o português está entre os idiomas |
| `recorte_pt` | `true` | o modelo só entra pelo recorte "Em português (global)"; fora das contagens de Mundo |

Em `data/relacoes.json` (e `web/data.js`), cada instituição e laboratório traz `n_creditados` (total) e `n_creditados_papel` (por exemplo `{"financiador": 13}`), para contar por papel sem apresentar o financiador como quem produziu o modelo. Em `data/foto.json`: `por_origem_brasil` (modelos Brasil por motivo), `recorte_pt` (contagens do recorte) e `pt_declarado`.

O recorte "Em português (global)" é identificado por `recorte_pt: true` em cada modelo; esses modelos não entram em `foto.mundo`, que conta só os modelos principais de Mundo, e têm contagem própria em `foto.recorte_pt` (e `foto.pt_declarado.recorte`). Um modelo do recorte que satisfaz uma condição do escopo Brasil passa a Brasil e perde a marca `recorte_pt`.
