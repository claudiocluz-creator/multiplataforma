from datetime import date, datetime, timedelta
from sqlmodel import Session, select
from ..models import CalendarEvent, Card, CardStatus, Priority, Routine

PRIORITY_WEIGHT = {
    Priority.URGENT: 4,
    Priority.HIGH: 3,
    Priority.MEDIUM: 2,
    Priority.LOW: 1,
}


def detect_dependency_conflicts(cards: list[Card]) -> list[dict]:
    """Identify cards whose due_date is infeasible due to unfinished dependencies."""
    card_map = {c.id: c for c in cards}
    conflicts: list[dict] = []
    today_str = date.today().isoformat()

    for card in cards:
        if card.status == CardStatus.DONE or not card.depends_on_id:
            continue
        parent = card_map.get(card.depends_on_id)
        if not parent or parent.status == CardStatus.DONE:
            continue

        if card.due_date and parent.due_date and parent.due_date >= card.due_date:
            conflicts.append(
                {
                    "card_id": card.id,
                    "card_title": card.title,
                    "card_due": card.due_date,
                    "depends_on_id": parent.id,
                    "depends_on_title": parent.title,
                    "parent_due": parent.due_date,
                    "reason": (
                        f"Card #{card.id} vence em {card.due_date}, mas depende do Card #{parent.id} "
                        f"que só vence em {parent.due_date}."
                    ),
                }
            )
        elif card.due_date and not parent.due_date:
            conflicts.append(
                {
                    "card_id": card.id,
                    "card_title": card.title,
                    "card_due": card.due_date,
                    "depends_on_id": parent.id,
                    "depends_on_title": parent.title,
                    "parent_due": None,
                    "reason": (
                        f"Card #{card.id} vence em {card.due_date}, mas o bloqueador Card #{parent.id} "
                        "não tem prazo definido."
                    ),
                }
            )
        elif parent.due_date and parent.due_date < today_str:
            conflicts.append(
                {
                    "card_id": card.id,
                    "card_title": card.title,
                    "card_due": card.due_date,
                    "depends_on_id": parent.id,
                    "depends_on_title": parent.title,
                    "parent_due": parent.due_date,
                    "reason": (
                        f"Card #{card.id} está bloqueado pelo Card #{parent.id}, "
                        f"que já está atrasado desde {parent.due_date}."
                    ),
                }
            )
    return conflicts


def _parse_hhmm(iso_str: str) -> tuple[int, int] | None:
    if "T" not in iso_str:
        return None
    time_part = iso_str.split("T", 1)[1][:5]
    try:
        h, m = map(int, time_part.split(":"))
        return h, m
    except ValueError:
        return None


def generate_smart_plan(session: Session, target_date: str | None = None) -> dict:
    """Cross active cards, Gantt dependencies, and calendar events to suggest timeboxing blocks."""
    day_str = target_date or date.today().isoformat()
    cards = session.exec(select(Card)).all()
    events = session.exec(select(CalendarEvent)).all()
    routines = session.exec(select(Routine).where(Routine.active.is_(True))).all()

    conflicts = detect_dependency_conflicts(cards)

    # Occupied intervals in minutes from midnight on day_str
    occupied: list[tuple[int, int]] = []
    day_events = [e for e in events if e.start_at.startswith(day_str)]
    for ev in day_events:
        s = _parse_hhmm(ev.start_at)
        e = _parse_hhmm(ev.end_at)
        if s and e:
            occupied.append((s[0] * 60 + s[1], e[0] * 60 + e[1]))

    # Find free 60-min slots between 09:00 (540) and 18:00 (1080), skipping 12:00-13:00 lunch
    occupied.append((12 * 60, 13 * 60))
    free_slots: list[tuple[int, int]] = []
    for hour in range(9, 18):
        slot_start = hour * 60
        slot_end = slot_start + 60
        overlaps = any(not (slot_end <= os or slot_start >= oe) for os, oe in occupied)
        if not overlaps:
            free_slots.append((slot_start, slot_end))

    # Rank active cards not already scheduled today
    scheduled_card_ids = {e.card_id for e in day_events if e.card_id is not None}
    candidates = [
        c
        for c in cards
        if c.status != CardStatus.DONE and c.id not in scheduled_card_ids
    ]
    candidates.sort(
        key=lambda c: (
            -PRIORITY_WEIGHT.get(c.priority, 1),
            c.due_date or "9999-12-31",
            c.id or 0,
        )
    )

    suggested_blocks: list[dict] = []
    for card, (s_min, e_min) in zip(candidates, free_slots):
        start_iso = f"{day_str}T{s_min // 60:02d}:{s_min % 60:02d}"
        end_iso = f"{day_str}T{e_min // 60:02d}:{e_min % 60:02d}"
        suggested_blocks.append(
            {
                "card_id": card.id,
                "card_title": card.title,
                "priority": card.priority.value,
                "due_date": card.due_date,
                "start_at": start_iso,
                "end_at": end_iso,
                "title": f"Foco: #{card.id} {card.title}",
            }
        )

    pending_routines = [
        r for r in routines if r.last_completed_date != day_str
    ]

    lines = [
        f"📅 *Plano do Dia ({day_str}) — Antigravity Command Center*",
        f"• Compromissos hoje: {len(day_events)}",
        f"• Rotinas pendentes: {len(pending_routines)}",
        f"• Conflitos de dependência: {len(conflicts)}",
    ]
    if conflicts:
        lines.append("\n⚠️ *Alertas de Prazo:*")
        for c in conflicts[:3]:
            lines.append(f"- {c['reason']}")
    if suggested_blocks:
        lines.append("\n⏱️ *Blocos de Timeboxing Sugeridos:*")
        for b in suggested_blocks[:4]:
            lines.append(f"- {b['start_at'][11:16]}–{b['end_at'][11:16]}: {b['title']}")

    return {
        "date": day_str,
        "conflicts": conflicts,
        "suggested_blocks": suggested_blocks,
        "day_events_count": len(day_events),
        "pending_routines_count": len(pending_routines),
        "summary_text": "\n".join(lines),
    }
