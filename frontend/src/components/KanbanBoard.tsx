"use client";

import { useState } from "react";
import {
  Bot,
  Calendar,
  GitPullRequest,
  Mail,
  MessageSquare,
  Ticket,
  User,
} from "lucide-react";
import {
  Card,
  CardStatus,
  KANBAN_COLUMNS,
  Priority,
  Project,
  SourceChannel,
} from "@/types";

interface KanbanBoardProps {
  cards: Card[];
  projects: Project[];
  onSelectCard: (card: Card) => void;
  onMoveCard: (cardId: number, newStatus: CardStatus) => void;
}

const PRIORITY_BADGE: Record<Priority, { label: string; cls: string }> = {
  low: { label: "Baixa", cls: "bg-slate-800 text-slate-300" },
  medium: { label: "Média", cls: "bg-sky-500/15 text-sky-300" },
  high: { label: "Alta", cls: "bg-amber-500/15 text-amber-300" },
  urgent: { label: "Urgente", cls: "bg-rose-500/20 text-rose-300" },
};

function ChannelIcon({ channel }: { channel: SourceChannel }) {
  switch (channel) {
    case "whatsapp":
      return <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />;
    case "email":
      return <Mail className="h-3.5 w-3.5 text-sky-400" />;
    case "zendesk":
      return <Ticket className="h-3.5 w-3.5 text-amber-400" />;
    default:
      return <User className="h-3.5 w-3.5 text-slate-400" />;
  }
}

export function KanbanBoard({
  cards,
  projects,
  onSelectCard,
  onMoveCard,
}: KanbanBoardProps) {
  const [draggedCardId, setDraggedCardId] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<CardStatus | null>(null);

  const projectMap = new Map(projects.map((p) => [p.id, p]));

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {KANBAN_COLUMNS.map((col) => {
        const colCards = cards.filter((c) => c.status === col.id);
        const isOver = dragOverCol === col.id;

        return (
          <div
            key={col.id}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverCol(col.id);
            }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverCol(null);
              if (draggedCardId !== null) {
                onMoveCard(draggedCardId, col.id);
                setDraggedCardId(null);
              }
            }}
            className={`flex min-w-[280px] flex-1 flex-col rounded-xl border bg-slate-900/60 p-3 transition ${
              isOver
                ? "border-indigo-500 bg-indigo-950/20"
                : "border-slate-800/90"
            }`}
          >
            <div
              className={`mb-3 flex items-center justify-between border-b-2 pb-2 ${col.accent}`}
            >
              <span className="text-sm font-semibold text-slate-100">
                {col.label}
              </span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300">
                {colCards.length}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-2.5">
              {colCards.map((card) => {
                const project = card.project_id
                  ? projectMap.get(card.project_id)
                  : undefined;
                const prio = PRIORITY_BADGE[card.priority];

                return (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => setDraggedCardId(card.id)}
                    onDragEnd={() => {
                      setDraggedCardId(null);
                      setDragOverCol(null);
                    }}
                    onClick={() => onSelectCard(card)}
                    className="group cursor-pointer rounded-lg border border-slate-800 bg-slate-950/80 p-3 shadow-sm transition hover:border-indigo-500/60 hover:bg-slate-900"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      {project ? (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium"
                          style={{
                            backgroundColor: `${project.color}22`,
                            color: project.color,
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: project.color }}
                          />
                          {project.name}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500">
                          Sem projeto
                        </span>
                      )}

                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${prio.cls}`}
                      >
                        {prio.label}
                      </span>
                    </div>

                    <h3 className="mb-1.5 text-sm font-medium leading-snug text-slate-100 group-hover:text-white">
                      #{card.id} {card.title}
                    </h3>

                    {card.client_name && (
                      <p className="mb-2 text-xs text-slate-400">
                        Cliente: {card.client_name}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2 text-[11px] text-slate-400">
                      <span className="inline-flex items-center gap-1 capitalize">
                        <ChannelIcon channel={card.source_channel} />
                        {card.source_channel}
                      </span>

                      <div className="flex items-center gap-2">
                        {card.status === "ai_running" && (
                          <span className="inline-flex items-center gap-1 text-indigo-400">
                            <Bot className="h-3.5 w-3.5 animate-pulse" />
                            IA ativa
                          </span>
                        )}
                        {card.pr_url && (
                          <span className="inline-flex items-center gap-1 text-purple-400">
                            <GitPullRequest className="h-3.5 w-3.5" />
                            PR
                          </span>
                        )}
                        {card.due_date && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {card.due_date.slice(5)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {colCards.length === 0 && (
                <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-800 text-xs text-slate-600">
                  Arraste um card aqui
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

