from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from ..database import get_session
from ..models import Card
from ..schemas import CardCreate, CardRead, CardUpdate

router = APIRouter(prefix="/api/cards", tags=["cards"])


@router.get("", response_model=list[CardRead])
def list_cards(
    project_id: int | None = None,
    session: Session = Depends(get_session),
):
    stmt = select(Card).order_by(Card.position, Card.id)
    if project_id is not None:
        stmt = stmt.where(Card.project_id == project_id)
    return session.exec(stmt).all()


@router.post("", response_model=CardRead, status_code=201)
def create_card(payload: CardCreate, session: Session = Depends(get_session)):
    card = Card(**payload.model_dump())
    session.add(card)
    session.commit()
    session.refresh(card)
    return card


@router.patch("/{card_id}", response_model=CardRead)
def update_card(
    card_id: int,
    payload: CardUpdate,
    session: Session = Depends(get_session),
):
    card = session.get(Card, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card não encontrado.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(card, key, value)
    card.updated_at = datetime.now(timezone.utc)
    session.add(card)
    session.commit()
    session.refresh(card)
    return card


@router.delete("/{card_id}", status_code=204)
def delete_card(card_id: int, session: Session = Depends(get_session)):
    card = session.get(Card, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card não encontrado.")
    session.delete(card)
    session.commit()

