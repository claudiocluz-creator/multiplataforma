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
import { demoStore } from "./demoStore";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function shouldUseDemoImmediately(): boolean {
  if (typeof window === "undefined") return false;
  const isLocalHost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  return !isLocalHost && !process.env.NEXT_PUBLIC_API_URL;
}

async function requestWithFallback<T>(
  path: string,
  fallback: () => T,
  options?: RequestInit
): Promise<T> {
  if (shouldUseDemoImmediately()) {
    return fallback();
  }
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
      ...options,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Erro ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  } catch {
    return fallback();
  }
}

export const api = {
  // Projects
  listProjects: () =>
    requestWithFallback<Project[]>("/api/projects", () =>
      demoStore.listProjects()
    ),
  createProject: (data: Partial<Project>) =>
    requestWithFallback<Project>(
      "/api/projects",
      () => demoStore.createProject(data),
      { method: "POST", body: JSON.stringify(data) }
    ),
  updateProject: (id: number, data: Partial<Project>) =>
    requestWithFallback<Project>(
      `/api/projects/${id}`,
      () => demoStore.updateProject(id, data),
      { method: "PATCH", body: JSON.stringify(data) }
    ),

  // Cards
  listCards: (projectId?: number | null) =>
    requestWithFallback<Card[]>(
      projectId ? `/api/cards?project_id=${projectId}` : "/api/cards",
      () => demoStore.listCards(projectId)
    ),
  createCard: (data: Partial<Card>) =>
    requestWithFallback<Card>("/api/cards", () => demoStore.createCard(data), {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCard: (id: number, data: Partial<Card>) =>
    requestWithFallback<Card>(
      `/api/cards/${id}`,
      () => demoStore.updateCard(id, data),
      { method: "PATCH", body: JSON.stringify(data) }
    ),
  deleteCard: (id: number) =>
    requestWithFallback<void>(
      `/api/cards/${id}`,
      () => demoStore.deleteCard(id),
      { method: "DELETE" }
    ),

  // Custom Actions
  listActions: (projectId?: number | null) =>
    requestWithFallback<CustomAction[]>(
      projectId ? `/api/actions?project_id=${projectId}` : "/api/actions",
      () => demoStore.listActions(projectId)
    ),
  executeAction: (actionId: number, cardId: number, resolutionNote?: string) =>
    requestWithFallback<Card>(
      `/api/actions/${actionId}/execute/${cardId}`,
      () => demoStore.executeAction(actionId, cardId, resolutionNote),
      {
        method: "POST",
        body: JSON.stringify({ resolution_note: resolutionNote || null }),
      }
    ),

  // AI Runs
  listCardRuns: (cardId: number) =>
    requestWithFallback<AgentRun[]>(`/api/runs/card/${cardId}`, () =>
      demoStore.listCardRuns(cardId)
    ),
  triggerRun: (
    cardId: number,
    opts?: {
      custom_prompt?: string;
      executor_override?: ExecutorType;
      auto_create_pr?: boolean;
    }
  ) =>
    requestWithFallback<AgentRun>(
      `/api/runs/card/${cardId}`,
      () => demoStore.triggerRun(cardId),
      { method: "POST", body: JSON.stringify(opts || {}) }
    ),
  streamUrl: (runId: number) => `${API_BASE}/api/runs/${runId}/stream`,

  // Phase 2: Agenda & Routines
  getGoogleStatus: () =>
    requestWithFallback<{ connected: boolean; oauth_ready: boolean; mode: string }>(
      "/api/agenda/google/status",
      () => ({ connected: false, oauth_ready: false, mode: "cloud_demo" })
    ),
  syncGoogleCalendar: () =>
    requestWithFallback<{ synced: number; message: string }>(
      "/api/agenda/google/sync",
      () => ({
        synced: 0,
        message: "Configure NEXT_PUBLIC_API_URL + GOOGLE_CALENDAR_TOKEN para sincronização real.",
      }),
      { method: "POST" }
    ),
  listEvents: () =>
    requestWithFallback<CalendarEvent[]>("/api/agenda/events", () =>
      demoStore.listEvents()
    ),
  createEvent: (data: Partial<CalendarEvent>) =>
    requestWithFallback<CalendarEvent>(
      "/api/agenda/events",
      () => demoStore.createEvent(data),
      { method: "POST", body: JSON.stringify(data) }
    ),
  deleteEvent: (id: number) =>
    requestWithFallback<void>(
      `/api/agenda/events/${id}`,
      () => demoStore.deleteEvent(id),
      { method: "DELETE" }
    ),
  listRoutines: () =>
    requestWithFallback<Routine[]>("/api/agenda/routines", () =>
      demoStore.listRoutines()
    ),
  createRoutine: (data: Partial<Routine>) =>
    requestWithFallback<Routine>(
      "/api/agenda/routines",
      () => demoStore.createRoutine(data),
      { method: "POST", body: JSON.stringify(data) }
    ),
  toggleRoutine: (id: number) =>
    requestWithFallback<Routine>(
      `/api/agenda/routines/${id}/toggle`,
      () => demoStore.toggleRoutine(id),
      { method: "POST" }
    ),
  getReminders: () =>
    requestWithFallback<RemindersSummary>("/api/agenda/reminders", () =>
      demoStore.getReminders()
    ),

  // Phase 3: Multichannel Intake
  listMessages: (cardId?: number) =>
    requestWithFallback<ChannelMessage[]>(
      cardId ? `/api/intake/messages?card_id=${cardId}` : "/api/intake/messages",
      () => demoStore.listMessages(cardId)
    ),
  simulateInbound: (data: {
    channel: SourceChannel;
    sender_name: string;
    sender_contact?: string;
    external_thread_id?: string;
    raw_content: string;
  }) =>
    requestWithFallback<{ message: ChannelMessage; card: Card }>(
      "/api/intake/simulate",
      () => demoStore.simulateInbound(data),
      { method: "POST", body: JSON.stringify(data) }
    ),
  replyBidirectional: (cardId: number, message: string, markDone = true) =>
    requestWithFallback<ChannelMessage>(
      `/api/intake/reply/${cardId}`,
      () => demoStore.replyBidirectional(cardId, message, markDone),
      {
        method: "POST",
        body: JSON.stringify({ message, mark_done: markDone }),
      }
    ),

  // Phase 4: Satellite Content Pipeline (IG -> YT)
  listContent: () =>
    requestWithFallback<ContentItem[]>("/api/content", () =>
      demoStore.listContent()
    ),
  captureContent: (data: {
    source_url?: string;
    media_path?: string;
    original_caption: string;
    duration_seconds: number;
    niche?: string;
    create_kanban_card?: boolean;
  }) =>
    requestWithFallback<ContentItem>(
      "/api/content/capture",
      () => demoStore.captureContent(data),
      { method: "POST", body: JSON.stringify(data) }
    ),
  approvePublishContent: (id: number) =>
    requestWithFallback<ContentItem>(
      `/api/content/${id}/approve-publish`,
      () => demoStore.approvePublishContent(id),
      { method: "POST" }
    ),
};
