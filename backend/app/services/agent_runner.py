import asyncio
import importlib.util
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import AsyncGenerator
from sqlmodel import Session
from ..database import engine
from ..models import AgentRun, Card, CardStatus, ExecutorType, Project, RunStatus
from .git_service import commit_and_create_pr, create_card_worktree, is_valid_git_repo, slugify

# In-memory log subscribers per run_id for SSE streaming
_run_subscribers: dict[int, list[asyncio.Queue[str | None]]] = {}


def subscribe_run(run_id: int) -> asyncio.Queue[str | None]:
    queue: asyncio.Queue[str | None] = asyncio.Queue()
    _run_subscribers.setdefault(run_id, []).append(queue)
    return queue


def unsubscribe_run(run_id: int, queue: asyncio.Queue[str | None]) -> None:
    subs = _run_subscribers.get(run_id, [])
    if queue in subs:
        subs.remove(queue)
    if not subs and run_id in _run_subscribers:
        _run_subscribers.pop(run_id, None)


def _emit(run_id: int, message: str, buffer: list[str]) -> None:
    line = f"[{datetime.now().strftime('%H:%M:%S')}] {message}"
    buffer.append(line)
    for q in _run_subscribers.get(run_id, []):
        q.put_nowait(line)


def _close_stream(run_id: int) -> None:
    for q in _run_subscribers.get(run_id, []):
        q.put_nowait(None)


async def _run_antigravity_sdk(
    run_id: int,
    prompt: str,
    workspace_dir: Path,
    system_instructions: str,
    logs: list[str],
) -> str:
    """Execute using the official google-antigravity Python SDK if installed."""
    from google.antigravity import Agent, CapabilitiesConfig, LocalAgentConfig  # type: ignore

    _emit(run_id, f"Inicializando Antigravity Agent em {workspace_dir}...", logs)
    config = LocalAgentConfig(
        system_instructions=(
            system_instructions
            or "Você é um engenheiro de software sênior resolvendo uma demanda no repositório."
        ),
        capabilities=CapabilitiesConfig(),
        working_directory=str(workspace_dir),
    )
    output_chunks: list[str] = []
    async with Agent(config) as agent:
        response = await agent.chat(prompt)
        async for token in response:
            output_chunks.append(token)
    result = "".join(output_chunks)
    _emit(run_id, "Agente Antigravity finalizou a análise/execução.", logs)
    return result


async def _run_claude_cli(
    run_id: int,
    prompt: str,
    workspace_dir: Path,
    logs: list[str],
) -> str:
    """Execute using `claude -p` CLI if installed and authenticated."""
    _emit(run_id, f"Executando Claude CLI em {workspace_dir}...", logs)
    proc = await asyncio.create_subprocess_exec(
        "claude",
        "-p",
        prompt,
        cwd=str(workspace_dir),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    lines: list[str] = []
    assert proc.stdout is not None
    async for raw in proc.stdout:
        text = raw.decode(errors="replace").rstrip()
        if text:
            lines.append(text)
            _emit(run_id, f"[claude] {text}", logs)
    await proc.wait()
    if proc.returncode != 0:
        raise RuntimeError(f"Claude CLI retornou código {proc.returncode}")
    return "\n".join(lines)


async def _run_sandbox(
    run_id: int,
    card_id: int,
    card_title: str,
    project_name: str | None,
    workspace_dir: Path | None,
    logs: list[str],
) -> str:
    """Simulated multi-step runner when SDK/CLI is not installed or repo is unlinked."""
    steps = [
        f"Lendo contexto do card #{card_id}: '{card_title}'",
        f"Projeto alvo: {project_name or 'Sem projeto vinculado'}",
        f"Workspace isolado: {workspace_dir if workspace_dir else 'Modo sandbox (sem repo Git local)'}",
        "Analisando requisitos, arquivos relacionados e plano de alteração...",
        "Aplicando alterações propostas e validando consistência...",
        "Preparando resumo técnico para revisão de Pull Request.",
    ]
    for step in steps:
        _emit(run_id, step, logs)
        await asyncio.sleep(0.35)
    return (
        f"Plano/Execução concluída em modo Sandbox para '{card_title}'.\n"
        "Vincule um repositório Git local válido ao projeto e instale `google-antigravity` "
        "ou `claude` CLI para execução real no código."
    )


async def execute_agent_run(run_id: int, auto_create_pr: bool = True) -> None:
    """Background task that runs the selected AI executor inside an isolated git worktree."""
    logs: list[str] = []
    with Session(engine) as session:
        run = session.get(AgentRun, run_id)
        if not run:
            return
        card = session.get(Card, run.card_id)
        if not card:
            return
        project = session.get(Project, run.project_id) if run.project_id else None

        card_id = card.id
        card_title = card.title
        run_executor = run.executor
        run_prompt = run.prompt
        project_name = project.name if project else None
        project_repo_path = project.repo_path if project else ""
        project_default_branch = project.default_branch if project else "main"
        project_github_repo = project.github_repo if project else ""
        project_instructions = project.system_instructions if project else ""

        run.status = RunStatus.RUNNING
        card.status = CardStatus.AI_RUNNING
        session.add(run)
        session.add(card)
        session.commit()

    worktree_path: Path | None = None
    branch_name: str | None = None
    pr_url: str | None = None
    diff_summary = ""

    try:
        # 1. Prepare isolated Git worktree if project has a valid local Git repo
        if project_repo_path and is_valid_git_repo(project_repo_path):
            _emit(run_id, f"Criando Git worktree isolado para '{project_name}'...", logs)
            branch_name, worktree_path = create_card_worktree(
                project_repo_path,
                card_id,
                card_title,
                project_default_branch,
            )
            _emit(run_id, f"Branch isolada pronta: {branch_name} ({worktree_path})", logs)
        else:
            branch_name = f"ai/card-{card_id}-{slugify(card_title)}"
            _emit(run_id, "Projeto sem repositório Git local válido — rodando em modo sandbox.", logs)

        # 2. Choose executor
        target_dir = worktree_path or Path.cwd()
        summary = ""

        if run_executor == ExecutorType.ANTIGRAVITY_SDK:
            if importlib.util.find_spec("google.antigravity") is not None:
                summary = await _run_antigravity_sdk(
                    run_id,
                    run_prompt,
                    target_dir,
                    project_instructions,
                    logs,
                )
            else:
                _emit(
                    run_id,
                    "Pacote `google-antigravity` não detectado no .venv; usando fallback Sandbox.",
                    logs,
                )
                summary = await _run_sandbox(
                    run_id, card_id, card_title, project_name, worktree_path, logs
                )

        elif run_executor == ExecutorType.CLAUDE_CLI:
            if shutil.which("claude"):
                summary = await _run_claude_cli(run_id, run_prompt, target_dir, logs)
            else:
                _emit(
                    run_id,
                    "Comando `claude` não encontrado no PATH; usando fallback Sandbox.",
                    logs,
                )
                summary = await _run_sandbox(
                    run_id, card_id, card_title, project_name, worktree_path, logs
                )
        else:
            summary = await _run_sandbox(
                run_id, card_id, card_title, project_name, worktree_path, logs
            )

        # 3. Commit & Create PR
        if auto_create_pr:
            if worktree_path is not None and branch_name is not None:
                _emit(run_id, "Gerando commit e Pull Request...", logs)
                pr_url, diff_summary = commit_and_create_pr(
                    worktree_path=worktree_path,
                    branch_name=branch_name,
                    base_branch=project_default_branch,
                    title=f"[Card #{card_id}] {card_title}",
                    body=summary,
                    github_repo=project_github_repo,
                )
                _emit(run_id, f"PR / Branch registrada: {pr_url}", logs)
            else:
                pr_url = f"local://branch/{branch_name}"
                diff_summary = summary

        with Session(engine) as session:
            db_run = session.get(AgentRun, run_id)
            db_card = session.get(Card, card_id)
            if db_run and db_card:
                db_run.status = RunStatus.COMPLETED
                db_run.branch_name = branch_name
                db_run.worktree_path = str(worktree_path) if worktree_path else None
                db_run.pr_url = pr_url
                db_run.diff_summary = diff_summary or summary
                db_run.logs = "\n".join(logs)
                db_run.finished_at = datetime.now(timezone.utc)

                db_card.status = CardStatus.PR_REVIEW if auto_create_pr else CardStatus.IN_PROGRESS
                db_card.branch_name = branch_name
                db_card.pr_url = pr_url
                db_card.updated_at = datetime.now(timezone.utc)
                session.add(db_run)
                session.add(db_card)
                session.commit()

        _emit(run_id, "Execução concluída! Card movido para Revisão de PR.", logs)

    except Exception as exc:
        _emit(run_id, f"ERRO: {exc}", logs)
        with Session(engine) as session:
            db_run = session.get(AgentRun, run_id)
            db_card = session.get(Card, card_id)
            if db_run and db_card:
                db_run.status = RunStatus.FAILED
                db_run.logs = "\n".join(logs)
                db_run.finished_at = datetime.now(timezone.utc)
                db_card.status = CardStatus.TRIAGE
                db_card.updated_at = datetime.now(timezone.utc)
                session.add(db_run)
                session.add(db_card)
                session.commit()
    finally:
        _close_stream(run_id)


async def stream_run_logs(run_id: int) -> AsyncGenerator[str, None]:
    """Yield SSE events for an AgentRun's live logs."""
    queue = subscribe_run(run_id)
    try:
        # Send existing logs first
        with Session(engine) as session:
            run = session.get(AgentRun, run_id)
            if run and run.logs:
                for line in run.logs.splitlines():
                    yield f"data: {line}\n\n"
            if run and run.status in (RunStatus.COMPLETED, RunStatus.FAILED):
                yield f"event: done\ndata: {run.status.value}\n\n"
                return

        while True:
            item = await queue.get()
            if item is None:
                with Session(engine) as session:
                    run = session.get(AgentRun, run_id)
                    status = run.status.value if run else "completed"
                yield f"event: done\ndata: {status}\n\n"
                break
            yield f"data: {item}\n\n"
    finally:
        unsubscribe_run(run_id, queue)

