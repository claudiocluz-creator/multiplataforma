from datetime import datetime, timezone
import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlmodel import Session, or_, select
from ..database import get_session
from ..models import AgentRun, Card, CustomAction, ExecutorType, Project
from ..schemas import (
    ActionExecuteRequest,
    CardRead,
    CustomActionCreate,
    CustomActionRead,
)
from ..services.agent_runner import execute_agent_run

router = APIRouter(prefix="/api/actions", tags=["actions"])


@router.get("", response_model=list[CustomActionRead])
def list_actions(
    project_id: int | None = None,
    session: Session = Depends(get_session),
):
    stmt = select(CustomAction).order_by(CustomAction.id)
    if project_id is not None:
        stmt = stmt.where(
            or_(CustomAction.project_id == project_id, CustomAction.project_id.is_(None))
        )
    return session.exec(stmt).all()


@router.post("", response_model=CustomActionRead, status_code=201)
def create_action(payload: CustomActionCreate, session: Session = Depends(get_session)):
    action = CustomAction(**payload.model_dump())
    session.add(action)
    session.commit()
    session.refresh(action)
    return action


@router.delete("/{action_id}", status_code=204)
def delete_action(action_id: int, session: Session = Depends(get_session)):
    action = session.get(CustomAction, action_id)
    if not action:
        raise HTTPException(status_code=404, detail="Ação não encontrada.")
    session.delete(action)
    session.commit()


@router.post("/{action_id}/execute/{card_id}", response_model=CardRead)
async def execute_action(
    action_id: int,
    card_id: int,
    payload: ActionExecuteRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    """Execute a configurable playbook action on a card."""
    action = session.get(CustomAction, action_id)
    card = session.get(Card, card_id)
    if not action or not card:
        raise HTTPException(status_code=404, detail="Ação ou card não encontrado.")

    if action.target_status is not None:
        card.status = action.target_status
    if payload.resolution_note:
        card.resolution_note = payload.resolution_note
    card.updated_at = datetime.now(timezone.utc)
    session.add(card)
    session.commit()
    session.refresh(card)

    # Trigger webhook if configured
    if action.webhook_url:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    action.webhook_url,
                    json={
                        "action": action.name,
                        "card_id": card.id,
                        "title": card.title,
                        "status": card.status.value,
                        "source_channel": card.source_channel.value,
                        "external_id": card.external_id,
                        "resolution_note": card.resolution_note,
                    },
                )
        except httpx.HTTPError:
            pass  # Webhook failure should not block local status update

    # Trigger AI prompt if the playbook includes an AI template
    if action.ai_prompt_template:
        project = session.get(Project, card.project_id) if card.project_id else None
        prompt = (
            f"{action.ai_prompt_template}\n\n"
            f"Demanda #{card.id}: {card.title}\n"
            f"Cliente: {card.client_name or 'N/A'}\n"
            f"Descrição: {card.description}"
        )
        run = AgentRun(
            card_id=card.id,
            project_id=card.project_id,
            executor=project.executor if project else ExecutorType.SANDBOX,
            prompt=prompt,
        )
        session.add(run)
        session.commit()
        session.refresh(run)
        background_tasks.add_task(execute_agent_run, run.id, False)

    return card

