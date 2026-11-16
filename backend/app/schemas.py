from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from .models import (
    CardStatus,
    ContentFormat,
    ContentStatus,
    ExecutorType,
    Priority,
    RoutineFrequency,
    RunStatus,
    SourceChannel,
)


class ProjectCreate(BaseModel):
    name: str
    slug: str
    description: str = ""
    color: str = "#6366f1"
    repo_path: str = ""
    github_repo: str = ""
    default_branch: str = "main"
    executor: ExecutorType = ExecutorType.ANTIGRAVITY_SDK
    system_instructions: str = ""


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    repo_path: Optional[str] = None
    github_repo: Optional[str] = None
    default_branch: Optional[str] = None
    executor: Optional[ExecutorType] = None
    system_instructions: Optional[str] = None


class ProjectRead(BaseModel):
    id: int
    name: str
    slug: str
    description: str
    color: str
    repo_path: str
    github_repo: str
    default_branch: str
    executor: ExecutorType
    system_instructions: str
    created_at: datetime
    git_valid: bool = False


class CardCreate(BaseModel):
    title: str
    description: str = ""
    status: CardStatus = CardStatus.INBOX
    priority: Priority = Priority.MEDIUM
    source_channel: SourceChannel = SourceChannel.MANUAL
    external_id: Optional[str] = None
    client_name: str = ""
    project_id: Optional[int] = None
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    depends_on_id: Optional[int] = None


class CardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[CardStatus] = None
    priority: Optional[Priority] = None
    source_channel: Optional[SourceChannel] = None
    external_id: Optional[str] = None
    client_name: Optional[str] = None
    project_id: Optional[int] = None
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    depends_on_id: Optional[int] = None
    branch_name: Optional[str] = None
    pr_url: Optional[str] = None
    resolution_note: Optional[str] = None
    position: Optional[int] = None


class CardRead(BaseModel):
    id: int
    title: str
    description: str
    status: CardStatus
    priority: Priority
    source_channel: SourceChannel
    external_id: Optional[str]
    client_name: str
    project_id: Optional[int]
    start_date: Optional[str]
    due_date: Optional[str]
    depends_on_id: Optional[int]
    branch_name: Optional[str]
    pr_url: Optional[str]
    resolution_note: Optional[str]
    position: int
    created_at: datetime
    updated_at: datetime


class CustomActionCreate(BaseModel):
    name: str
    description: str = ""
    icon: str = "zap"
    color: str = "#0ea5e9"
    project_id: Optional[int] = None
    target_status: Optional[CardStatus] = None
    ai_prompt_template: str = ""
    webhook_url: str = ""
    notify_source: bool = False


class CustomActionRead(BaseModel):
    id: int
    name: str
    description: str
    icon: str
    color: str
    project_id: Optional[int]
    target_status: Optional[CardStatus]
    ai_prompt_template: str
    webhook_url: str
    notify_source: bool


class ActionExecuteRequest(BaseModel):
    resolution_note: Optional[str] = None


class RunTriggerRequest(BaseModel):
    custom_prompt: Optional[str] = None
    executor_override: Optional[ExecutorType] = None
    auto_create_pr: bool = True


class AgentRunRead(BaseModel):
    id: int
    card_id: int
    project_id: Optional[int]
    executor: ExecutorType
    status: RunStatus
    prompt: str
    branch_name: Optional[str]
    worktree_path: Optional[str]
    pr_url: Optional[str]
    diff_summary: str
    logs: str
    created_at: datetime
    finished_at: Optional[datetime]


# --- Phase 2 Schemas ---


class CalendarEventCreate(BaseModel):
    title: str
    description: str = ""
    start_at: str
    end_at: str
    card_id: Optional[int] = None


class CalendarEventRead(BaseModel):
    id: int
    title: str
    description: str
    start_at: str
    end_at: str
    source: str
    google_event_id: Optional[str]
    card_id: Optional[int]


class RoutineCreate(BaseModel):
    title: str
    description: str = ""
    frequency: RoutineFrequency = RoutineFrequency.DAILY
    time_of_day: str = "09:00"
    project_id: Optional[int] = None


class RoutineRead(BaseModel):
    id: int
    title: str
    description: str
    frequency: RoutineFrequency
    time_of_day: str
    project_id: Optional[int]
    last_completed_date: Optional[str]
    active: bool


# --- Phase 3 Schemas ---


class InboundMessageRequest(BaseModel):
    channel: SourceChannel = SourceChannel.WHATSAPP
    sender_name: str = ""
    sender_contact: str = ""
    external_thread_id: str = ""
    raw_content: str


class ChannelMessageRead(BaseModel):
    id: int
    channel: SourceChannel
    direction: str
    external_thread_id: str
    sender_name: str
    sender_contact: str
    raw_content: str
    card_id: Optional[int]
    dispatched: bool
    created_at: datetime


class BidirectionalReplyRequest(BaseModel):
    message: str
    mark_done: bool = True


# --- Phase 4 Schemas ---


class ContentCaptureRequest(BaseModel):
    source_url: str = ""
    media_path: str = ""
    original_caption: str
    duration_seconds: int = 45
    niche: str = "Direito"
    create_kanban_card: bool = True


class ContentArchiveImportRequest(BaseModel):
    items: list[ContentCaptureRequest]
    posts_per_day: int = 1


class ContentItemRead(BaseModel):
    id: int
    project_id: Optional[int]
    card_id: Optional[int]
    source_platform: str
    source_url: str
    media_path: str
    original_caption: str
    duration_seconds: int
    format_type: ContentFormat
    ai_title: str
    ai_description: str
    ai_tags: str
    status: ContentStatus
    youtube_video_id: Optional[str]
    scheduled_for: Optional[str]
    created_at: datetime
