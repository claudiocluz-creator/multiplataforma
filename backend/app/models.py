from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from sqlmodel import Field, Relationship, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ExecutorType(str, Enum):
    ANTIGRAVITY_SDK = "antigravity_sdk"
    CLAUDE_CLI = "claude_cli"
    REMOTE_WORKER = "remote_worker"
    GITHUB_ACTIONS = "github_actions"
    SANDBOX = "sandbox"


class CardStatus(str, Enum):
    INBOX = "inbox"
    TRIAGE = "triage"
    IN_PROGRESS = "in_progress"
    AI_RUNNING = "ai_running"
    PR_REVIEW = "pr_review"
    DONE = "done"


class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class SourceChannel(str, Enum):
    MANUAL = "manual"
    WHATSAPP = "whatsapp"
    EMAIL = "email"
    ZENDESK = "zendesk"
    BASECAMP = "basecamp"


class RunStatus(str, Enum):
    PENDING = "pending"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class RoutineFrequency(str, Enum):
    DAILY = "daily"
    WEEKDAYS = "weekdays"
    WEEKLY = "weekly"


class ContentFormat(str, Enum):
    SHORTS = "shorts"
    LONG_FORM = "long_form"


class ContentStatus(str, Enum):
    CAPTURED = "captured"
    AI_ENRICHED = "ai_enriched"
    APPROVED = "approved"
    PUBLISHED = "published"


class Project(SQLModel, table=True):
    """Registered software or automation project that cards can target."""

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    slug: str = Field(unique=True, index=True)
    description: str = ""
    color: str = "#6366f1"
    repo_path: str = ""
    github_repo: str = ""
    default_branch: str = "main"
    executor: ExecutorType = ExecutorType.ANTIGRAVITY_SDK
    system_instructions: str = ""
    created_at: datetime = Field(default_factory=utcnow)

    cards: list["Card"] = Relationship(back_populates="project")
    actions: list["CustomAction"] = Relationship(back_populates="project")


class Card(SQLModel, table=True):
    """Kanban & Gantt work item linked to a project and optional source channel."""

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str = ""
    status: CardStatus = Field(default=CardStatus.INBOX, index=True)
    priority: Priority = Field(default=Priority.MEDIUM)
    source_channel: SourceChannel = Field(default=SourceChannel.MANUAL)
    external_id: Optional[str] = None
    client_name: str = ""
    project_id: Optional[int] = Field(default=None, foreign_key="project.id")
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    depends_on_id: Optional[int] = Field(default=None, foreign_key="card.id")
    branch_name: Optional[str] = None
    pr_url: Optional[str] = None
    resolution_note: Optional[str] = None
    position: int = 0
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    project: Optional[Project] = Relationship(back_populates="cards")
    runs: list["AgentRun"] = Relationship(back_populates="card")


class CustomAction(SQLModel, table=True):
    """Configurable playbook button displayed inside cards."""

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: str = ""
    icon: str = "zap"
    color: str = "#0ea5e9"
    project_id: Optional[int] = Field(default=None, foreign_key="project.id")
    target_status: Optional[CardStatus] = None
    ai_prompt_template: str = ""
    webhook_url: str = ""
    notify_source: bool = False
    created_at: datetime = Field(default_factory=utcnow)

    project: Optional[Project] = Relationship(back_populates="actions")


class AgentRun(SQLModel, table=True):
    """Execution record of an AI agent run triggered from a card."""

    id: Optional[int] = Field(default=None, primary_key=True)
    card_id: int = Field(foreign_key="card.id", index=True)
    project_id: Optional[int] = Field(default=None, foreign_key="project.id")
    executor: ExecutorType = ExecutorType.SANDBOX
    status: RunStatus = Field(default=RunStatus.PENDING)
    prompt: str = ""
    branch_name: Optional[str] = None
    worktree_path: Optional[str] = None
    pr_url: Optional[str] = None
    diff_summary: str = ""
    logs: str = ""
    created_at: datetime = Field(default_factory=utcnow)
    finished_at: Optional[datetime] = None

    card: Optional[Card] = Relationship(back_populates="runs")


# --- Phase 2: Executive Assistant (Calendar & Routines) ---


class CalendarEvent(SQLModel, table=True):
    """Appointment or timeboxed focus block synced with Google Calendar."""

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str = ""
    start_at: str  # ISO datetime string
    end_at: str    # ISO datetime string
    source: str = "local"  # "local" | "google_calendar"
    google_event_id: Optional[str] = None
    card_id: Optional[int] = Field(default=None, foreign_key="card.id")
    created_at: datetime = Field(default_factory=utcnow)


class Routine(SQLModel, table=True):
    """Recurring daily/weekly routine or habit reminder."""

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str = ""
    frequency: RoutineFrequency = Field(default=RoutineFrequency.DAILY)
    time_of_day: str = "09:00"
    project_id: Optional[int] = Field(default=None, foreign_key="project.id")
    last_completed_date: Optional[str] = None  # YYYY-MM-DD
    active: bool = True
    created_at: datetime = Field(default_factory=utcnow)


# --- Phase 3: Multichannel Intake & Bidirectional Hub ---


class ChannelMessage(SQLModel, table=True):
    """Inbound or outbound message from WhatsApp, Email, Zendesk, or Basecamp."""

    id: Optional[int] = Field(default=None, primary_key=True)
    channel: SourceChannel
    direction: str = "inbound"  # "inbound" | "outbound"
    external_thread_id: str = ""
    sender_name: str = ""
    sender_contact: str = ""
    raw_content: str
    card_id: Optional[int] = Field(default=None, foreign_key="card.id", index=True)
    dispatched: bool = False
    created_at: datetime = Field(default_factory=utcnow)


# --- Phase 4: Satellite Content Pipeline (Instagram -> YouTube) ---


class ContentItem(SQLModel, table=True):
    """Video item captured from Instagram/Archive and enriched for YouTube."""

    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: Optional[int] = Field(default=None, foreign_key="project.id")
    card_id: Optional[int] = Field(default=None, foreign_key="card.id")
    source_platform: str = "instagram"
    source_url: str = ""
    media_path: str = ""
    original_caption: str = ""
    duration_seconds: int = 45
    format_type: ContentFormat = Field(default=ContentFormat.SHORTS)
    ai_title: str = ""
    ai_description: str = ""
    ai_tags: str = ""
    status: ContentStatus = Field(default=ContentStatus.AI_ENRICHED)
    youtube_video_id: Optional[str] = None
    scheduled_for: Optional[str] = None  # YYYY-MM-DD
    created_at: datetime = Field(default_factory=utcnow)
