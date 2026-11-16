from datetime import date, datetime, timedelta, timezone
import re
import httpx
from sqlmodel import Session, select
from ..config import settings
from ..models import (
    Card,
    CardStatus,
    ChannelMessage,
    Priority,
    Project,
    SourceChannel,
)


def _infer_priority(text: str) -> Priority:
    lower = text.lower()
    if any(w in lower for w in ("urgente", "parou", "fora do ar", "travou", "crítico", "critico")):
        return Priority.URGENT
    if any(w in lower for w in ("erro", "bug", "não funciona", "nao funciona", "falha")):
        return Priority.HIGH
    return Priority.MEDIUM


def _match_project(text: str, projects: list[Project]) -> Project | None:
    lower = text.lower()
    for p in projects:
        tokens = [p.name.lower(), p.slug.lower(), *re.findall(r"[a-z0-9]{3,}", p.slug.lower())]
        if any(t in lower for t in tokens if t):
            return p
    return projects[0] if projects else None


def _summarize_title(raw_content: str, channel: SourceChannel) -> str:
    first_line = raw_content.strip().splitlines()[0] if raw_content.strip() else "Nova demanda"
    cleaned = re.sub(r"\s+", " ", first_line).strip()
    if len(cleaned) > 72:
        cleaned = cleaned[:69].rstrip() + "..."
    return cleaned or f"Demanda via {channel.value}"


def triage_inbound_message(
    session: Session,
    channel: SourceChannel,
    sender_name: str,
    sender_contact: str,
    external_thread_id: str,
    raw_content: str,
) -> tuple[ChannelMessage, Card]:
    """Convert an unstructured inbound message into a structured Kanban card (or append to open thread)."""
    projects = session.exec(select(Project).order_by(Project.id)).all()

    # Check if there's already an active card for this external_thread_id
    existing_card: Card | None = None
    if external_thread_id:
        prev_msg = session.exec(
            select(ChannelMessage)
            .where(ChannelMessage.external_thread_id == external_thread_id)
            .order_by(ChannelMessage.id.desc())
        ).first()
        if prev_msg and prev_msg.card_id:
            candidate = session.get(Card, prev_msg.card_id)
            if candidate and candidate.status != CardStatus.DONE:
                existing_card = candidate

    if existing_card:
        existing_card.description = (
            f"{existing_card.description}\n\n[{channel.value} - {sender_name or 'Cliente'}]: {raw_content}"
        ).strip()
        existing_card.updated_at = datetime.now(timezone.utc)
        session.add(existing_card)
        card = existing_card
    else:
        matched_project = _match_project(raw_content, projects)
        today = date.today()
        card = Card(
            title=_summarize_title(raw_content, channel),
            description=raw_content.strip(),
            status=CardStatus.TRIAGE,
            priority=_infer_priority(raw_content),
            source_channel=channel,
            external_id=external_thread_id or None,
            client_name=sender_name or sender_contact or "Cliente",
            project_id=matched_project.id if matched_project else None,
            start_date=today.isoformat(),
            due_date=(today + timedelta(days=2)).isoformat(),
        )
        session.add(card)
        session.commit()
        session.refresh(card)

    msg = ChannelMessage(
        channel=channel,
        direction="inbound",
        external_thread_id=external_thread_id,
        sender_name=sender_name,
        sender_contact=sender_contact,
        raw_content=raw_content,
        card_id=card.id,
        dispatched=True,
    )
    session.add(msg)
    session.commit()
    session.refresh(msg)
    session.refresh(card)
    return msg, card


async def dispatch_bidirectional_reply(
    session: Session,
    card: Card,
    message: str,
    mark_done: bool = True,
) -> ChannelMessage:
    """Record an outbound reply and dispatch to Zendesk/WhatsApp if configured."""
    dispatched = False

    if card.source_channel == SourceChannel.WHATSAPP and settings.whatsapp_webhook_url:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(
                    settings.whatsapp_webhook_url,
                    json={
                        "card_id": card.id,
                        "external_id": card.external_id,
                        "client_name": card.client_name,
                        "message": message,
                    },
                )
                dispatched = resp.status_code < 300
        except httpx.HTTPError:
            dispatched = False

    elif (
        card.source_channel == SourceChannel.ZENDESK
        and settings.zendesk_subdomain
        and settings.zendesk_api_token
        and card.external_id
    ):
        ticket_id = re.sub(r"[^0-9]", "", card.external_id)
        if ticket_id:
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.put(
                        f"https://{settings.zendesk_subdomain}.zendesk.com/api/v2/tickets/{ticket_id}.json",
                        auth=(f"{settings.zendesk_email}/token", settings.zendesk_api_token),
                        json={
                            "ticket": {
                                "status": "solved" if mark_done else "open",
                                "comment": {"body": message, "public": True},
                            }
                        },
                    )
                    dispatched = resp.status_code < 300
            except httpx.HTTPError:
                dispatched = False

    outbound = ChannelMessage(
        channel=card.source_channel,
        direction="outbound",
        external_thread_id=card.external_id or "",
        sender_name="Antigravity Command Center",
        sender_contact=card.client_name,
        raw_content=message,
        card_id=card.id,
        dispatched=dispatched,
    )
    session.add(outbound)

    if mark_done:
        card.status = CardStatus.DONE
    card.resolution_note = message
    card.updated_at = datetime.now(timezone.utc)
    session.add(card)
    session.commit()
    session.refresh(outbound)
    return outbound
