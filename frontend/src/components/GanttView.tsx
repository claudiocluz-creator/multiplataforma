"use client";

import { useMemo } from "react";
import { Calendar, Link2 } from "lucide-react";
import { Card, KANBAN_COLUMNS, Project } from "@/types";

interface GanttViewProps {
  cards: Card[];
  projects: Project[];
  onSelectCard: (card: Card) => void;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function GanttView({ cards, projects, onSelectCard }: GanttViewProps) {
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const statusMap = new Map(KANBAN_COLUMNS.map((c) => [c.id, c.label]));

  const { days, rangeStart } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = addDays(today, -3);
    const list: Date[] = [];
    for (let i = 0; i < 15; i++) {
      list.push(addDays(start, i));
    }
    return { days: list, rangeStart: start };
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <Calendar className="h-4 w-4 text-indigo-400" />
            Gantt &amp; Linha do Tempo de Prazos
          </h2>
          <p className="text-xs text-slate-400">
            Visualize entregas simultâneas entre projetos e dependências entre
            cards.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[960px]">
          {/* Timeline Header */}
          <div className="grid grid-cols-[280px_repeat(15,minmax(42px,1fr))] border-b border-slate-800 pb-2 text-xs text-slate-400">
            <div className="font-medium text-slate-300">Demanda / Projeto</div>
            {days.map((day) => {
              const iso = day.toISOString().slice(0, 10);
              const isToday = iso === todayStr;
              return (
                <div
                  key={iso}
                  className={`text-center ${
                    isToday ? "font-bold text-indigo-400" : ""
                  }`}
                >
                  <div>{String(day.getDate()).padStart(2, "0")}/{String(day.getMonth() + 1).padStart(2, "0")}</div>
                  {isToday && <div className="text-[10px]">Hoje</div>}
                </div>
              );
            })}
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-800/70">
            {cards.map((card) => {
              const project = card.project_id
                ? projectMap.get(card.project_id)
                : undefined;
              const start =
                parseDate(card.start_date) ||
                parseDate(card.due_date) ||
                new Date();
              const end = parseDate(card.due_date) || addDays(start, 2);

              const startIdx = Math.max(
                0,
                Math.floor(
                  (start.getTime() - rangeStart.getTime()) / 86400000
                )
              );
              const endIdx = Math.min(
                14,
                Math.max(
                  startIdx,
                  Math.floor(
                    (end.getTime() - rangeStart.getTime()) / 86400000
                  )
                )
              );
              const span = endIdx - startIdx + 1;

              return (
                <div
                  key={card.id}
                  onClick={() => onSelectCard(card)}
                  className="grid cursor-pointer grid-cols-[280px_repeat(15,minmax(42px,1fr))] items-center py-2.5 transition hover:bg-slate-800/40"
                >
                  <div className="pr-3">
                    <div className="truncate text-sm font-medium text-slate-100">
                      #{card.id} {card.title}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                      <span>{project?.name || "Sem projeto"}</span>
                      <span>·</span>
                      <span>{statusMap.get(card.status)}</span>
                      {card.depends_on_id && (
                        <span className="inline-flex items-center gap-0.5 text-amber-400">
                          <Link2 className="h-3 w-3" />#{card.depends_on_id}
                        </span>
                      )}
                    </div>
                  </div>

                  {days.map((_, idx) => {
                    if (idx < startIdx || idx > endIdx) {
                      return (
                        <div
                          key={idx}
                          className="h-7 border-l border-slate-800/40"
                        />
                      );
                    }
                    if (idx === startIdx) {
                      return (
                        <div
                          key={idx}
                          style={{
                            gridColumn: `span ${span} / span ${span}`,
                            backgroundColor: project?.color || "#6366f1",
                          }}
                          className="mx-0.5 flex h-7 items-center truncate rounded-md px-2 text-[11px] font-medium text-white shadow-sm"
                        >
                          {card.due_date ? `Até ${card.due_date.slice(5)}` : card.title}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

