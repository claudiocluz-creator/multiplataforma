from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from ..database import get_session
from ..models import AgentRun, Card, CardStatus, ExecutorType, Project, RunStatus
from ..schemas import AgentRunRead, RunTriggerRequest, WorkerReportRequest
from ..services.agent_runner import execute_agent_run, stream_run_logs

router = APIRouter(prefix="/api/runs", tags=["runs"])


@router.get("/card/{card_id}", response_model=list[AgentRunRead])
def list_card_runs(card_id: int, session: Session = Depends(get_session)):
    stmt = select(AgentRun).where(AgentRun.card_id == card_id).order_by(AgentRun.id.desc())
    return session.exec(stmt).all()


@router.post("/card/{card_id}", response_model=AgentRunRead, status_code=201)
async def trigger_card_run(
    card_id: int,
    payload: RunTriggerRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    """Trigger an AI agent execution or queue it for a remote worker."""
    card = session.get(Card, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card não encontrado.")

    project = session.get(Project, card.project_id) if card.project_id else None
    executor = payload.executor_override or (
        project.executor if project else ExecutorType.SANDBOX
    )

    prompt = payload.custom_prompt or (
        f"Resolva a demanda #{card.id}: {card.title}\n"
        f"Origem: {card.source_channel.value} | Cliente: {card.client_name or 'N/A'}\n"
        f"Contexto:\n{card.description}\n\n"
        "Analise o código do projeto, aplique as alterações necessárias em uma branch isolada "
        "e prepare o resumo para revisão de Pull Request."
    )

    initial_status = (
        RunStatus.QUEUED if executor == ExecutorType.REMOTE_WORKER else RunStatus.PENDING
    )
    run = AgentRun(
        card_id=card.id,
        project_id=card.project_id,
        executor=executor,
        status=initial_status,
        prompt=prompt,
        logs=(
            "Aguardando um Worker Local (casa ou trabalho) capturar este job na fila..."
            if initial_status == RunStatus.QUEUED
            else ""
        ),
    )
    if initial_status == RunStatus.QUEUED:
        card.status = CardStatus.AI_RUNNING
        session.add(card)
    session.add(run)
    session.commit()
    session.refresh(run)

    if initial_status != RunStatus.QUEUED:
        background_tasks.add_task(execute_agent_run, run.id, payload.auto_create_pr)
    return run


@router.post("/worker/claim")
def claim_queued_run(project_slug: str | None = None, session: Session = Depends(get_session)):
    """Called by any local worker (home or work PC) to claim the next queued run."""
    stmt = select(AgentRun).where(AgentRun.status == RunStatus.QUEUED).order_by(AgentRun.id)
    runs = session.exec(stmt).all()
    for run in runs:
        project = session.get(Project, run.project_id) if run.project_id else None
        if project_slug and project and project.slug != project_slug:
            continue
        run.status = RunStatus.RUNNING
        session.add(run)
        session.commit()
        session.refresh(run)
        card = session.get(Card, run.card_id)
        return {
            "run": run,
            "card": card,
            "project": project,
        }
    return {"run": None}


@router.post("/{run_id}/report", response_model=AgentRunRead)
def report_worker_result(
    run_id: int,
    payload: WorkerReportRequest,
    session: Session = Depends(get_session),
):
    """Called by a local worker after finishing execution on a cloned repo."""
    run = session.get(AgentRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Execução não encontrada.")
    card = session.get(Card, run.card_id)

    run.status = payload.status
    run.branch_name = payload.branch_name
    run.pr_url = payload.pr_url
    run.diff_summary = payload.diff_summary
    run.logs = payload.logs
    run.finished_at = datetime.now(timezone.utc)
    session.add(run)

    if card:
        card.branch_name = payload.branch_name
        card.pr_url = payload.pr_url
        card.status = (
            CardStatus.PR_REVIEW
            if payload.status == RunStatus.COMPLETED
            else CardStatus.TRIAGE
        )
        card.updated_at = datetime.now(timezone.utc)
        session.add(card)

    session.commit()
    session.refresh(run)
    return run


@router.get("/{run_id}/stream")
async def stream_run(run_id: int):
    return StreamingResponse(
        stream_run_logs(run_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
