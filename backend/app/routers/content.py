from datetime import date, timedelta
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from ..database import get_session
from ..models import (
    Card,
    CardStatus,
    ContentFormat,
    ContentItem,
    ContentStatus,
    Priority,
    Project,
    SourceChannel,
)
from ..schemas import (
    ContentArchiveImportRequest,
    ContentCaptureRequest,
    ContentItemRead,
)

router = APIRouter(prefix="/api/content", tags=["content"])


def _enrich_for_youtube(caption: str, duration_seconds: int, niche: str) -> tuple[ContentFormat, str, str, str]:
    fmt = ContentFormat.SHORTS if duration_seconds < 60 else ContentFormat.LONG_FORM
    clean = re.sub(r"#\S+", "", caption).strip()
    base_hook = clean[:65].rstrip(".,!? ") or f"Dica prática sobre {niche}"
    suffix = " #Shorts" if fmt == ContentFormat.SHORTS else ""
    ai_title = f"{base_hook}{suffix}"

    hashtags = re.findall(r"#([a-zA-Z0-9_À-ÿ]+)", caption)
    tags_list = list(dict.fromkeys([niche.lower(), "shorts" if fmt == ContentFormat.SHORTS else "video", *hashtags]))
    ai_tags = ",".join(tags_list[:10])

    ai_description = (
        f"{clean}\n\n"
        f"📌 Tema: {niche} ({'YouTube Shorts' if fmt == ContentFormat.SHORTS else 'Vídeo Completo'})\n"
        "🔔 Inscreva-se no canal para acompanhar novos conteúdos."
    )
    return fmt, ai_title, ai_description, ai_tags


@router.get("", response_model=list[ContentItemRead])
def list_content(session: Session = Depends(get_session)):
    return session.exec(select(ContentItem).order_by(ContentItem.id.desc())).all()


@router.post("/capture", response_model=ContentItemRead, status_code=201)
def capture_content(
    payload: ContentCaptureRequest,
    session: Session = Depends(get_session),
):
    """Capture an Instagram video, classify Shorts vs Long-Form, and generate YouTube SEO metadata."""
    yt_proj = session.exec(select(Project).where(Project.slug == "conteudo-yt-ig")).first()
    fmt, ai_title, ai_description, ai_tags = _enrich_for_youtube(
        payload.original_caption, payload.duration_seconds, payload.niche
    )

    card_id = None
    if payload.create_kanban_card:
        card = Card(
            title=f"[YT] {ai_title[:64]}",
            description=f"Origem: {payload.source_url or payload.media_path}\n\n{ai_description}",
            status=CardStatus.PR_REVIEW,
            priority=Priority.MEDIUM,
            source_channel=SourceChannel.MANUAL,
            client_name="Esteira IG→YT",
            project_id=yt_proj.id if yt_proj else None,
            start_date=date.today().isoformat(),
            due_date=(date.today() + timedelta(days=1)).isoformat(),
        )
        session.add(card)
        session.commit()
        session.refresh(card)
        card_id = card.id

    item = ContentItem(
        project_id=yt_proj.id if yt_proj else None,
        card_id=card_id,
        source_url=payload.source_url,
        media_path=payload.media_path,
        original_caption=payload.original_caption,
        duration_seconds=payload.duration_seconds,
        format_type=fmt,
        ai_title=ai_title,
        ai_description=ai_description,
        ai_tags=ai_tags,
        status=ContentStatus.AI_ENRICHED,
        scheduled_for=(date.today() + timedelta(days=1)).isoformat(),
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.post("/import-archive", response_model=list[ContentItemRead])
def import_archive(
    payload: ContentArchiveImportRequest,
    session: Session = Depends(get_session),
):
    """Batch-import archive videos and space out scheduled dates to avoid YouTube spam."""
    yt_proj = session.exec(select(Project).where(Project.slug == "conteudo-yt-ig")).first()
    created: list[ContentItem] = []
    per_day = max(1, payload.posts_per_day)

    for idx, entry in enumerate(payload.items):
        fmt, ai_title, ai_description, ai_tags = _enrich_for_youtube(
            entry.original_caption, entry.duration_seconds, entry.niche
        )
        day_offset = (idx // per_day) + 1
        item = ContentItem(
            project_id=yt_proj.id if yt_proj else None,
            source_url=entry.source_url,
            media_path=entry.media_path,
            original_caption=entry.original_caption,
            duration_seconds=entry.duration_seconds,
            format_type=fmt,
            ai_title=ai_title,
            ai_description=ai_description,
            ai_tags=ai_tags,
            status=ContentStatus.AI_ENRICHED,
            scheduled_for=(date.today() + timedelta(days=day_offset)).isoformat(),
        )
        session.add(item)
        created.append(item)

    session.commit()
    for item in created:
        session.refresh(item)
    return created


@router.post("/{item_id}/approve-publish", response_model=ContentItemRead)
def approve_and_publish(item_id: int, session: Session = Depends(get_session)):
    item = session.get(ContentItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item de conteúdo não encontrado.")
    item.status = ContentStatus.PUBLISHED
    item.youtube_video_id = item.youtube_video_id or f"yt-sim-{item.id}"
    session.add(item)

    if item.card_id:
        card = session.get(Card, item.card_id)
        if card:
            card.status = CardStatus.DONE
            session.add(card)

    session.commit()
    session.refresh(item)
    return item

