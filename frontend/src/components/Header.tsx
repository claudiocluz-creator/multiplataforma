"use client";

import {
  CalendarClock,
  CalendarRange,
  FolderGit2,
  Inbox,
  Kanban,
  Plus,
  Sparkles,
  Video,
} from "lucide-react";
import { Project, RemindersSummary } from "@/types";

export type ActiveView =
  | "kanban"
  | "gantt"
  | "agenda"
  | "intake"
  | "content"
  | "projects";

interface HeaderProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  projects: Project[];
  selectedProjectId: number | null;
  setSelectedProjectId: (id: number | null) => void;
  reminders: RemindersSummary | null;
  onNewCard: () => void;
}

export function Header({
  activeView,
  setActiveView,
  projects,
  selectedProjectId,
  setSelectedProjectId,
  reminders,
  onNewCard,
}: HeaderProps) {
  const alertCount =
    (reminders?.due_cards_count || 0) + (reminders?.pending_routines_count || 0);

  const navBtn = (
    view: ActiveView,
    label: string,
    Icon: typeof Kanban,
    badge?: number
  ) => {
    const active = activeView === view;
    return (
      <button
        onClick={() => setActiveView(view)}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition sm:text-sm ${
          active
            ? "bg-indigo-600 text-white shadow-sm"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
        }`}
      >
        <Icon className="h-4 w-4" />
        <span>{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-white">
              Antigravity Command Center
            </h1>
            <p className="text-xs text-slate-400">
              Hub Multi-Projeto · Kanban, Gantt, Agenda &amp; IA
            </p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-900 p-1 ring-1 ring-slate-800">
          {navBtn("kanban", "Kanban", Kanban)}
          {navBtn("gantt", "Gantt", CalendarRange)}
          {navBtn("agenda", "Agenda & Rotinas", CalendarClock, alertCount)}
          {navBtn("intake", "Multicanal", Inbox)}
          {navBtn("content", "IG → YouTube", Video)}
          {navBtn("projects", "Projetos", FolderGit2)}
        </nav>

        <div className="flex items-center gap-3">
          <select
            value={selectedProjectId ?? ""}
            onChange={(e) =>
              setSelectedProjectId(e.target.value ? Number(e.target.value) : null)
            }
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-indigo-500"
          >
            <option value="">Todos os Projetos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={onNewCard}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Nova Demanda
          </button>
        </div>
      </div>
    </header>
  );
}
