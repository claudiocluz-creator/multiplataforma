export type ExecutorType = "antigravity_sdk" | "claude_cli" | "sandbox";

export type CardStatus =
  | "inbox"
  | "triage"
  | "in_progress"
  | "ai_running"
  | "pr_review"
  | "done";

export type Priority = "low" | "medium" | "high" | "urgent";

export type SourceChannel = "manual" | "whatsapp" | "email" | "zendesk" | "basecamp";

export type RunStatus = "pending" | "running" | "completed" | "failed";

export type RoutineFrequency = "daily" | "weekdays" | "weekly";

export type ContentFormat = "shorts" | "long_form";

export type ContentStatus = "captured" | "ai_enriched" | "approved" | "published";

export interface Project {
  id: number;
  name: string;
  slug: string;
  description: string;
  color: string;
  repo_path: string;
  github_repo: string;
  default_branch: string;
  executor: ExecutorType;
  system_instructions: string;
  created_at: string;
  git_valid: boolean;
}

export interface Card {
  id: number;
  title: string;
  description: string;
  status: CardStatus;
  priority: Priority;
  source_channel: SourceChannel;
  external_id: string | null;
  client_name: string;
  project_id: number | null;
  start_date: string | null;
  due_date: string | null;
  depends_on_id: number | null;
  branch_name: string | null;
  pr_url: string | null;
  resolution_note: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CustomAction {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  project_id: number | null;
  target_status: CardStatus | null;
  ai_prompt_template: string;
  webhook_url: string;
  notify_source: boolean;
}

export interface AgentRun {
  id: number;
  card_id: number;
  project_id: number | null;
  executor: ExecutorType;
  status: RunStatus;
  prompt: string;
  branch_name: string | null;
  worktree_path: string | null;
  pr_url: string | null;
  diff_summary: string;
  logs: string;
  created_at: string;
  finished_at: string | null;
}

export interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  start_at: string;
  end_at: string;
  source: string;
  google_event_id: string | null;
  card_id: number | null;
}

export interface Routine {
  id: number;
  title: string;
  description: string;
  frequency: RoutineFrequency;
  time_of_day: string;
  project_id: number | null;
  last_completed_date: string | null;
  active: boolean;
}

export interface RemindersSummary {
  today: string;
  due_cards_count: number;
  due_cards: { id: number; title: string; due_date: string }[];
  pending_routines_count: number;
  upcoming_events_count: number;
}

export interface ChannelMessage {
  id: number;
  channel: SourceChannel;
  direction: "inbound" | "outbound";
  external_thread_id: string;
  sender_name: string;
  sender_contact: string;
  raw_content: string;
  card_id: number | null;
  dispatched: boolean;
  created_at: string;
}

export interface ContentItem {
  id: number;
  project_id: number | null;
  card_id: number | null;
  source_platform: string;
  source_url: string;
  media_path: string;
  original_caption: string;
  duration_seconds: number;
  format_type: ContentFormat;
  ai_title: string;
  ai_description: string;
  ai_tags: string;
  status: ContentStatus;
  youtube_video_id: string | null;
  scheduled_for: string | null;
  created_at: string;
}

export const KANBAN_COLUMNS: { id: CardStatus; label: string; accent: string }[] = [
  { id: "inbox", label: "Entrada", accent: "border-slate-600" },
  { id: "triage", label: "Triagem IA", accent: "border-amber-500" },
  { id: "in_progress", label: "Em Execução", accent: "border-sky-500" },
  { id: "ai_running", label: "IA Trabalhando", accent: "border-indigo-500" },
  { id: "pr_review", label: "Revisão de PR", accent: "border-purple-500" },
  { id: "done", label: "Concluído", accent: "border-emerald-500" },
];
