#!/usr/bin/env python3
"""Gera CONTRIBUTORS a partir do historico do Git (nomes de commit e numero de commits; nenhum dado extra).
Quem nao quer aparecer anota no .mailmap (uma linha por pessoa que prefere outro nome)."""
import os, subprocess
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = subprocess.run(["git", "shortlog", "-sn", "--no-merges", "HEAD"], cwd=R, capture_output=True, text=True, check=True).stdout
linhas = [l.strip() for l in out.splitlines() if l.strip() and "coleta-semanal" not in l]
open(os.path.join(R, "CONTRIBUTORS"), "w").write("# Gerado por scripts/contributors.py a partir do Git (commits por nome)\n" + "\n".join(linhas) + "\n")
print(len(linhas), "nomes")
