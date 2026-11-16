from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from ..database import get_session
from ..models import Card, ChannelMessage, SourceChannel
from ..schemas import (
    BidirectionalReplyRequest,
    ChannelMessageRead,
    InboundMessageRequest,
)
from ..services.intake_service import (
    dispatch_bidirectional_reply,
    triage_inbound_message,
)

router = APIRouter(prefix="/api/intake", tags=["intake"])


@router.get("/messages", response_model=list[ChannelMessageRead])
def list_messages(card_id: int | None = None, session: Session = Depends(get_session)):
    stmt = select(ChannelMessage).order_by(ChannelMessage.id.desc())
    if card_id is not None:
        stmt = stmt.where(ChannelMessage.card_id == card_id)
    return session.exec(stmt).all()


@router.post("/simulate")
def simulate_inbound(
    payload: InboundMessageRequest,
    session: Session = Depends(get_session),
):
    """Ingest an unstructured message, run AI triage, and create/update a Kanban card."""
    msg, card = triage_inbound_message(
        session=session,
        channel=payload.channel,
        sender_name=payload.sender_name,
        sender_contact=payload.sender_contact,
        external_thread_id=payload.external_thread_id,
        raw_content=payload.raw_content,
    )
    return {"message": msg, "card": card}


@router.post("/webhook/{channel}")
def webhook_inbound(
    channel: SourceChannel,
    payload: InboundMessageRequest,
    session: Session = Depends(get_session),
):
    msg, card = triage_inbound_message(
        session=session,
        channel=channel,
        sender_name=payload.sender_name,
        sender_contact=payload.sender_contact,
        external_thread_id=payload.external_thread_id,
        raw_content=payload.raw_content,
    )
    return {"status": "triaged", "card_id": card.id, "message_id": msg.id}


@router.post("/reply/{card_id}", response_model=ChannelMessageRead)
async def reply_bidirectional(
    card_id: int,
    payload: BidirectionalReplyRequest,
    session: Session = Depends(get_session),
):
    """Send a bidirectional update back to the card's origin channel."""
    card = session.get(Card, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card não encontrado.")
    return await dispatch_bidirectional_reply(
        session=session,
        card=card,
        message=payload.message,
        mark_done=payload.mark_done,
    )

