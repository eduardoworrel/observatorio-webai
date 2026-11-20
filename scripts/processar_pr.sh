#!/usr/bin/env bash
# Processa um pull request em leitura: baixa a cabeca do PR numa pasta temporaria, confere o que ele toca,
# roda a validacao mecanica e lista as entidades e os publicadores que a coleta traria.
# Nao comenta, nao aprova, nao funde, nao muda o ramo atual: so le o PR e escreve um relatorio local.
#
#   scripts/processar_pr.sh <numero> [--sem-rede]
#
# Variaveis: PR_REMOTE (padrao origin), PR_BASE (ramo de destino, padrao main).
# Codigo de saida: 0 tudo certo; 1 a validacao falhou; 2 so alertas; 3 uso incorreto.
set -u
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
N="${1:-}"; REDE=1
[ "${2:-}" = "--sem-rede" ] && REDE=0
case "$N" in ''|*[!0-9]*) echo "uso: scripts/processar_pr.sh <numero> [--sem-rede]" >&2; exit 3;; esac
REMOTE="${PR_REMOTE:-origin}"; BASE="${PR_BASE:-main}"
cd "$RAIZ" || exit 3
TMP="$(mktemp -d)"; PRDIR="$TMP/pr"
limpar() { git -C "$RAIZ" worktree remove --force "$PRDIR" >/dev/null 2>&1; rm -rf "$TMP"; }
trap limpar EXIT
mkdir -p .relatorios
REL=".relatorios/pr-$N-$(date +%Y%m%d-%H%M%S).txt"
saida() { tee -a "$RAIZ/$REL"; }
{
echo "Relatorio do PR #$N ($(date '+%Y-%m-%d %H:%M')), somente leitura"
git fetch -q "$REMOTE" "$BASE" || { echo "nao consegui ler o ramo $BASE de $REMOTE"; exit 3; }
BASE_SHA="$(git rev-parse FETCH_HEAD)"
git fetch -q "$REMOTE" "pull/$N/head" || { echo "nao consegui ler pull/$N/head de $REMOTE"; exit 3; }
HEAD_SHA="$(git rev-parse FETCH_HEAD)"
git worktree add -q --detach "$PRDIR" "$HEAD_SHA" || exit 3
echo "base ${BASE_SHA:0:7}, cabeca do PR ${HEAD_SHA:0:7}"
echo "commits: $(git rev-list --count "$BASE_SHA..$HEAD_SHA")"
git log --format='  %h %s' "$BASE_SHA..$HEAD_SHA" | head -30

echo; echo "== Arquivos tocados"
ALERTAS=0
while IFS=$'\t' read -r st arq resto; do
  [ -z "$st" ] && continue
  case "$arq" in
    data/entidades/*) echo "  $st $arq";;
    *) echo "  $st $arq   ALERTA: fora de data/entidades/ (revisao humana obrigatoria)"; ALERTAS=$((ALERTAS+1));;
  esac
done < <(git diff --name-status "$BASE_SHA...$HEAD_SHA")
echo "alertas de arquivos: $ALERTAS"
echo "  (scripts, schema, web, workflows, docs e arquivos derivados nao devem mudar em PR de dados)"

echo; echo "== Validacao mecanica (codigo e schema do ramo atual, dados do PR)"
export VALIDAR_RAIZ="$PRDIR"
ARGS=(--base "$BASE_SHA")
python3 scripts/validar.py "${ARGS[@]}"; VAL=$?
if [ "$REDE" = 1 ] && curl -s -o /dev/null --max-time 6 https://huggingface.co; then
  echo; echo "-- com rede: --links --trechos"
  python3 scripts/validar.py --links --trechos; [ $? -ne 0 ] && VAL=1
else
  echo "(sem rede ou --sem-rede: links e trechos nao conferidos)"
fi
unset VALIDAR_RAIZ

echo; echo "== Entidades novas, alteradas e removidas"
git diff --name-status "$BASE_SHA...$HEAD_SHA" -- data/entidades | while IFS=$'\t' read -r st arq; do
  rot="alterada"; [ "$st" = A ] && rot="nova"; [ "$st" = D ] && rot="removida"
  info=""
  [ -f "$PRDIR/$arq" ] && info="$(python3 - "$PRDIR/$arq" <<'PY'
import json,sys
e=json.load(open(sys.argv[1]))
print(" | ".join(str(e.get(k)) for k in ("entidade","id","classe_pais","natureza") if e.get(k)))
PY
)"
  echo "  $rot: $arq   $info"
done

echo; echo "== O que a coleta faria (modelos nunca vem do PR: o coletor os deriva da API publica)"
export COLETOR_RAIZ="$PRDIR"
python3 scripts/coletar.py --novos --dry-run
if [ "$REDE" = 1 ] && curl -s -o /dev/null --max-time 6 https://huggingface.co; then
  echo; echo "-- previa (uma consulta por publicador; so o filtro de relevancia, sem builds nem tamanhos)"
  python3 scripts/coletar.py --novos --dry-run --previa 2>/dev/null | grep -E "^ +(novo|alterado|vencido)|previa:"
fi
unset COLETOR_RAIZ
echo; echo "Veredito mecanico: validacao $([ $VAL -eq 0 ] && echo passou || echo FALHOU); alertas de arquivos: $ALERTAS. A decisao e dos mantenedores."
echo "$VAL $ALERTAS" > "$TMP/estado"
} 2>&1 | saida
read -r VAL ALERTAS < "$TMP/estado" 2>/dev/null || { VAL=3; ALERTAS=0; }
echo "(relatorio gravado em $REL)"
[ "$VAL" -ne 0 ] && exit 1
[ "$ALERTAS" -ne 0 ] && exit 2
exit 0
