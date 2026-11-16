from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from ..database import get_session
from ..models import AgentRun, Card, ExecutorType, Project
from ..schemas import AgentRunRead, RunTriggerRequest
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
    """Trigger an AI agent execution for a card in its linked project."""
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

    run = AgentRun(
        card_id=card.id,
        project_id=card.project_id,
        executor=executor,
        prompt=prompt,
    )
    session.add(run)
    session.commit()
    session.refresh(run)

    background_tasks.add_task(execute_agent_run, run.id, payload.auto_create_pr)
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

