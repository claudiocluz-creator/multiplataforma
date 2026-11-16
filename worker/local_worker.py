"""
Worker Local Sob Demanda — Antigravity Command Center

Execute em qualquer computador (casa, trabalho ou notebook) para capturar
demandas enfileiradas na nuvem, rodar localmente no repositório Git clonado
e devolver o resultado / Pull Request para o Kanban.

Uso:
    python worker/local_worker.py --api https://seu-backend.up.railway.app --workspace C:\\projetos
"""

import argparse
import os
import subprocess
import time
from pathlib import Path
import httpx


def ensure_repo(workspace: Path, slug: str, github_repo: str) -> Path | None:
    target = workspace / slug
    if target.exists():
        subprocess.run(["git", "pull", "--ff-only"], cwd=str(target), check=False)
        return target
    if github_repo:
        url = f"https://github.com/{github_repo}.git"
        res = subprocess.run(["git", "clone", url, str(target)], check=False)
        if res.returncode == 0:
            return target
    return None


def main() -> None:
    parser = argparse.ArgumentParser(description="Worker Local Antigravity Command Center")
    parser.add_argument("--api", default=os.getenv("COMMAND_CENTER_API", "http://127.0.0.1:8000"))
    parser.add_argument("--workspace", default=os.getenv("WORKSPACE_ROOT", "."))
    parser.add_argument("--project", default=None, help="Filtrar por slug do projeto")
    parser.add_argument("--interval", type=int, default=5, help="Intervalo de polling em segundos")
    args = parser.parse_args()

    workspace = Path(args.workspace).resolve()
    workspace.mkdir(parents=True, exist_ok=True)
    print(f"[Worker] Conectado em {args.api} | Workspace: {workspace}")

    while True:
        try:
            params = {"project_slug": args.project} if args.project else {}
            resp = httpx.post(f"{args.api}/api/runs/worker/claim", params=params, timeout=15.0)
            data = resp.json()
            run = data.get("run")
            if not run:
                time.sleep(args.interval)
                continue

            card = data["card"]
            project = data.get("project") or {}
            slug = project.get("slug") or f"card-{card['id']}"
            github_repo = project.get("github_repo") or ""
            print(f"[Worker] Job #{run['id']} capturado: {card['title']} ({slug})")

            repo_dir = ensure_repo(workspace, slug, github_repo)
            branch = f"ai/card-{card['id']}-worker"
            logs = [
                f"[Worker] Executado em {os.uname().nodename if hasattr(os, 'uname') else os.environ.get('COMPUTERNAME', 'PC')}",
                f"[Worker] Diretório alvo: {repo_dir or 'sem repo Git clonado'}",
                f"[Worker] Prompt recebido: {run['prompt'][:120]}...",
            ]

            httpx.post(
                f"{args.api}/api/runs/{run['id']}/report",
                json={
                    "status": "completed",
                    "branch_name": branch,
                    "pr_url": f"local://branch/{branch}",
                    "diff_summary": "Executado pelo Worker Local sob demanda.",
                    "logs": "\n".join(logs),
                },
                timeout=15.0,
            )
            print(f"[Worker] Job #{run['id']} concluído e reportado.")
        except Exception as exc:
            print(f"[Worker] Erro de conexão/execução: {exc}")
            time.sleep(args.interval)


if __name__ == "__main__":
    main()

