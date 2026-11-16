import {
  AgentRun,
  CalendarEvent,
  Card,
  ChannelMessage,
  ContentItem,
  CustomAction,
  ExecutorType,
  Project,
  RemindersSummary,
  Routine,
  SourceChannel,
} from "@/types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Erro ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Projects
  listProjects: () => request<Project[]>("/api/projects"),
  createProject: (data: Partial<Project>) =>
    request<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateProject: (id: number, data: Partial<Project>) =>
    request<Project>(`/api/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Cards
  listCards: (projectId?: number | null) =>
    request<Card[]>(
      projectId ? `/api/cards?project_id=${projectId}` : "/api/cards"
    ),
  createCard: (data: Partial<Card>) =>
    request<Card>("/api/cards", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCard: (id: number, data: Partial<Card>) =>
    request<Card>(`/api/cards/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteCard: (id: number) =>
    request<void>(`/api/cards/${id}`, { method: "DELETE" }),

  // Custom Actions
  listActions: (projectId?: number | null) =>
    request<CustomAction[]>(
      projectId ? `/api/actions?project_id=${projectId}` : "/api/actions"
    ),
  executeAction: (actionId: number, cardId: number, resolutionNote?: string) =>
    request<Card>(`/api/actions/${actionId}/execute/${cardId}`, {
      method: "POST",
      body: JSON.stringify({ resolution_note: resolutionNote || null }),
    }),

  // AI Runs
  listCardRuns: (cardId: number) =>
    request<AgentRun[]>(`/api/runs/card/${cardId}`),
  triggerRun: (
    cardId: number,
    opts?: {
      custom_prompt?: string;
      executor_override?: ExecutorType;
      auto_create_pr?: boolean;
    }
  ) =>
    request<AgentRun>(`/api/runs/card/${cardId}`, {
      method: "POST",
      body: JSON.stringify(opts || {}),
    }),
  streamUrl: (runId: number) => `${API_BASE}/api/runs/${runId}/stream`,

  // Phase 2: Agenda & Routines
  getGoogleStatus: () =>
    request<{ connected: boolean; oauth_ready: boolean; mode: string }>(
      "/api/agenda/google/status"
    ),
  syncGoogleCalendar: () =>
    request<{ synced: number; message: string }>("/api/agenda/google/sync", {
      method: "POST",
    }),
  listEvents: () => request<CalendarEvent[]>("/api/agenda/events"),
  createEvent: (data: Partial<CalendarEvent>) =>
    request<CalendarEvent>("/api/agenda/events", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteEvent: (id: number) =>
    request<void>(`/api/agenda/events/${id}`, { method: "DELETE" }),
  listRoutines: () => request<Routine[]>("/api/agenda/routines"),
  createRoutine: (data: Partial<Routine>) =>
    request<Routine>("/api/agenda/routines", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  toggleRoutine: (id: number) =>
    request<Routine>(`/api/agenda/routines/${id}/toggle`, {
      method: "POST",
    }),
  getReminders: () => request<RemindersSummary>("/api/agenda/reminders"),

  // Phase 3: Multichannel Intake
  listMessages: (cardId?: number) =>
    request<ChannelMessage[]>(
      cardId ? `/api/intake/messages?card_id=${cardId}` : "/api/intake/messages"
    ),
  simulateInbound: (data: {
    channel: SourceChannel;
    sender_name: string;
    sender_contact?: string;
    external_thread_id?: string;
    raw_content: string;
  }) =>
    request<{ message: ChannelMessage; card: Card }>("/api/intake/simulate", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  replyBidirectional: (cardId: number, message: string, markDone = true) =>
    request<ChannelMessage>(`/api/intake/reply/${cardId}`, {
      method: "POST",
      body: JSON.stringify({ message, mark_done: markDone }),
    }),

  // Phase 4: Satellite Content Pipeline (IG -> YT)
  listContent: () => request<ContentItem[]>("/api/content"),
  captureContent: (data: {
    source_url?: string;
    media_path?: string;
    original_caption: string;
    duration_seconds: number;
    niche?: string;
    create_kanban_card?: boolean;
  }) =>
    request<ContentItem>("/api/content/capture", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  approvePublishContent: (id: number) =>
    request<ContentItem>(`/api/content/${id}/approve-publish`, {
      method: "POST",
    }),
};
