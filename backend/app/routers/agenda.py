from datetime import date, datetime, timedelta
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from ..config import settings
from ..database import get_session
from ..models import CalendarEvent, Card, CardStatus, Routine
from ..schemas import (
    CalendarEventCreate,
    CalendarEventRead,
    RoutineCreate,
    RoutineRead,
)

router = APIRouter(prefix="/api/agenda", tags=["agenda"])


@router.get("/google/status")
def google_calendar_status():
    """Return whether Google Calendar credentials/token are configured."""
    configured = bool(settings.google_calendar_token)
    oauth_ready = bool(settings.google_client_id and settings.google_client_secret)
    return {
        "connected": configured,
        "oauth_ready": oauth_ready,
        "mode": "google_calendar" if configured else "local_sync",
    }


@router.post("/google/sync")
async def sync_google_calendar(session: Session = Depends(get_session)):
    """Pull upcoming events from Google Calendar if GOOGLE_CALENDAR_TOKEN is set."""
    if not settings.google_calendar_token:
        return {
            "synced": 0,
            "message": "GOOGLE_CALENDAR_TOKEN não configurado no .env; usando agenda local.",
        }

    time_min = datetime.utcnow().isoformat() + "Z"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            headers={"Authorization": f"Bearer {settings.google_calendar_token}"},
            params={
                "timeMin": time_min,
                "maxResults": 20,
                "singleEvents": "true",
                "orderBy": "startTime",
            },
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Erro ao consultar Google Calendar: {resp.text}",
        )

    items = resp.json().get("items", [])
    added = 0
    for item in items:
        gid = item.get("id")
        if not gid:
            continue
        existing = session.exec(
            select(CalendarEvent).where(CalendarEvent.google_event_id == gid)
        ).first()
        if existing:
            continue
        start = item.get("start", {}).get("dateTime") or item.get("start", {}).get("date", "")
        end = item.get("end", {}).get("dateTime") or item.get("end", {}).get("date", start)
        session.add(
            CalendarEvent(
                title=item.get("summary", "(Sem título)"),
                description=item.get("description", ""),
                start_at=start,
                end_at=end,
                source="google_calendar",
                google_event_id=gid,
            )
        )
        added += 1
    session.commit()
    return {"synced": added, "message": f"{added} evento(s) sincronizado(s)."}


@router.get("/events", response_model=list[CalendarEventRead])
def list_events(session: Session = Depends(get_session)):
    return session.exec(select(CalendarEvent).order_by(CalendarEvent.start_at)).all()


@router.post("/events", response_model=CalendarEventRead, status_code=201)
def create_event(payload: CalendarEventCreate, session: Session = Depends(get_session)):
    event = CalendarEvent(**payload.model_dump(), source="local")
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


@router.delete("/events/{event_id}", status_code=204)
def delete_event(event_id: int, session: Session = Depends(get_session)):
    event = session.get(CalendarEvent, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado.")
    session.delete(event)
    session.commit()


@router.get("/routines", response_model=list[RoutineRead])
def list_routines(session: Session = Depends(get_session)):
    return session.exec(select(Routine).order_by(Routine.time_of_day)).all()


@router.post("/routines", response_model=RoutineRead, status_code=201)
def create_routine(payload: RoutineCreate, session: Session = Depends(get_session)):
    routine = Routine(**payload.model_dump())
    session.add(routine)
    session.commit()
    session.refresh(routine)
    return routine


@router.post("/routines/{routine_id}/toggle", response_model=RoutineRead)
def toggle_routine_today(routine_id: int, session: Session = Depends(get_session)):
    routine = session.get(Routine, routine_id)
    if not routine:
        raise HTTPException(status_code=404, detail="Rotina não encontrada.")
    today_str = date.today().isoformat()
    routine.last_completed_date = None if routine.last_completed_date == today_str else today_str
    session.add(routine)
    session.commit()
    session.refresh(routine)
    return routine


@router.delete("/routines/{routine_id}", status_code=204)
def delete_routine(routine_id: int, session: Session = Depends(get_session)):
    routine = session.get(Routine, routine_id)
    if not routine:
        raise HTTPException(status_code=404, detail="Rotina não encontrada.")
    session.delete(routine)
    session.commit()


@router.get("/reminders")
def get_reminders(session: Session = Depends(get_session)):
    """Aggregate upcoming events, due/overdue cards, and pending routines for today."""
    today_str = date.today().isoformat()
    tomorrow_str = (date.today() + timedelta(days=1)).isoformat()

    due_cards = session.exec(
        select(Card).where(
            Card.status != CardStatus.DONE,
            Card.due_date.is_not(None),
            Card.due_date <= tomorrow_str,
        )
    ).all()

    pending_routines = session.exec(
        select(Routine).where(
            Routine.active.is_(True),
            (Routine.last_completed_date.is_(None))
            | (Routine.last_completed_date != today_str),
        )
    ).all()

    events = session.exec(select(CalendarEvent).order_by(CalendarEvent.start_at)).all()
    upcoming_events = [e for e in events if e.start_at[:10] in (today_str, tomorrow_str)]

    return {
        "today": today_str,
        "due_cards_count": len(due_cards),
        "due_cards": [{"id": c.id, "title": c.title, "due_date": c.due_date} for c in due_cards],
        "pending_routines_count": len(pending_routines),
        "upcoming_events_count": len(upcoming_events),
    }

