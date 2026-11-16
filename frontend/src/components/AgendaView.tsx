"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  CalendarEvent,
  Card,
  RemindersSummary,
  Routine,
  RoutineFrequency,
} from "@/types";

interface AgendaViewProps {
  cards: Card[];
  onSelectCard: (card: Card) => void;
  onRefreshReminders: () => void;
}

export function AgendaView({
  cards,
  onSelectCard,
  onRefreshReminders,
}: AgendaViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [reminders, setReminders] = useState<RemindersSummary | null>(null);
  const [googleMode, setGoogleMode] = useState<{
    connected: boolean;
    mode: string;
  } | null>(null);
  const [syncMessage, setSyncMessage] = useState("");

  // New event / timebox form
  const [evTitle, setEvTitle] = useState("");
  const [evStart, setEvStart] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d.toISOString().slice(0, 16);
  });
  const [evEnd, setEvEnd] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 2);
    return d.toISOString().slice(0, 16);
  });
  const [evCardId, setEvCardId] = useState("");

  // New routine form
  const [rtTitle, setRtTitle] = useState("");
  const [rtTime, setRtTime] = useState("09:00");
  const [rtFreq, setRtFreq] = useState<RoutineFrequency>("daily");

  const loadData = useCallback(async () => {
    const [evList, rtList, rem, gStatus] = await Promise.all([
      api.listEvents(),
      api.listRoutines(),
      api.getReminders(),
      api.getGoogleStatus(),
    ]);
    setEvents(evList);
    setRoutines(rtList);
    setReminders(rem);
    setGoogleMode(gStatus);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const linkedCard = evCardId ? cards.find((c) => c.id === Number(evCardId)) : null;
    const title = evTitle.trim() || (linkedCard ? `Foco: #${linkedCard.id} ${linkedCard.title}` : "");
    if (!title) return;
    await api.createEvent({
      title,
      start_at: evStart,
      end_at: evEnd,
      card_id: linkedCard ? linkedCard.id : null,
    });
    setEvTitle("");
    setEvCardId("");
    await loadData();
    onRefreshReminders();
  };

  const handleCreateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rtTitle.trim()) return;
    await api.createRoutine({
      title: rtTitle,
      time_of_day: rtTime,
      frequency: rtFreq,
    });
    setRtTitle("");
    await loadData();
    onRefreshReminders();
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Reminders Banner */}
      {reminders && (
        <div className="grid gap-3 rounded-xl border border-amber-500/30 bg-amber-950/15 p-4 md:grid-cols-3">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-amber-400" />
            <div>
              <div className="text-sm font-semibold text-white">
                {reminders.due_cards_count} demanda(s) vencendo hoje/amanhã
              </div>
              <div className="text-xs text-slate-400">
                Prazos próximos no Kanban/Gantt
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-sky-400" />
            <div>
              <div className="text-sm font-semibold text-white">
                {reminders.upcoming_events_count} compromisso(s) próximos
              </div>
              <div className="text-xs text-slate-400">
                Agenda integrada ({googleMode?.connected ? "Google Sync" : "Local"})
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <div>
              <div className="text-sm font-semibold text-white">
                {reminders.pending_routines_count} rotina(s) pendente(s) hoje
              </div>
              <div className="text-xs text-slate-400">Checklist diário</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Google Calendar & Timeboxing */}
        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-white">
                <Calendar className="h-4 w-4 text-indigo-400" />
                Agenda &amp; Timeboxing (Google Calendar)
              </h2>
              <p className="text-xs text-slate-400">
                Bloqueie horários para demandas do Kanban ou sincronize seus
                compromissos.
              </p>
            </div>
            <button
              onClick={async () => {
                const res = await api.syncGoogleCalendar();
                setSyncMessage(res.message);
                await loadData();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Sincronizar Google
            </button>
          </div>

          {syncMessage && (
            <div className="rounded-lg bg-slate-950 px-3 py-2 text-xs text-sky-300">
              {syncMessage}
            </div>
          )}

          <form
            onSubmit={handleCreateEvent}
            className="space-y-2.5 rounded-xl border border-slate-800 bg-slate-950/70 p-3.5"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                placeholder="Título do compromisso ou bloco de foco"
                value={evTitle}
                onChange={(e) => setEvTitle(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
              />
              <select
                value={evCardId}
                onChange={(e) => setEvCardId(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
              >
                <option value="">Vincular card (Timeboxing opcional)</option>
                {cards
                  .filter((c) => c.status !== "done")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.id} {c.title}
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="datetime-local"
                value={evStart}
                onChange={(e) => setEvStart(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
              />
              <input
                type="datetime-local"
                value={evEnd}
                onChange={(e) => setEvEnd(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
            >
              <Plus className="h-3.5 w-3.5" />
              Agendar Compromisso / Foco
            </button>
          </form>

          <div className="space-y-2">
            {events.map((ev) => {
              const linked = ev.card_id
                ? cards.find((c) => c.id === ev.card_id)
                : null;
              return (
                <div
                  key={ev.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/80 px-3.5 py-2.5"
                >
                  <div>
                    <div className="text-sm font-medium text-white">
                      {ev.title}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>{ev.start_at.replace("T", " ")}</span>
                      <span>→</span>
                      <span>{ev.end_at.slice(11, 16)}</span>
                      {linked && (
                        <button
                          onClick={() => onSelectCard(linked)}
                          className="text-indigo-400 underline hover:text-indigo-300"
                        >
                          Abrir Card #{linked.id}
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await api.deleteEvent(ev.id);
                      loadData();
                    }}
                    className="rounded p-1 text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Routines & Daily Habits */}
        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Rotinas &amp; Lembretes Recorrentes
            </h2>
            <p className="text-xs text-slate-400">
              Checklists diários e semanais para manter o ritmo entre vários
              projetos.
            </p>
          </div>

          <form
            onSubmit={handleCreateRoutine}
            className="flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3"
          >
            <input
              placeholder="Nova rotina (ex: Checar WhatsApp pendente)"
              value={rtTitle}
              onChange={(e) => setRtTitle(e.target.value)}
              required
              className="min-w-[200px] flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
            />
            <input
              type="time"
              value={rtTime}
              onChange={(e) => setRtTime(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
            />
            <select
              value={rtFreq}
              onChange={(e) => setRtFreq(e.target.value as RoutineFrequency)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
            >
              <option value="daily">Diária</option>
              <option value="weekdays">Dias úteis</option>
              <option value="weekly">Semanal</option>
            </select>
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </button>
          </form>

          <div className="space-y-2">
            {routines.map((rt) => {
              const doneToday = rt.last_completed_date === today;
              return (
                <div
                  key={rt.id}
                  onClick={async () => {
                    await api.toggleRoutine(rt.id);
                    await loadData();
                    onRefreshReminders();
                  }}
                  className={`flex cursor-pointer items-center justify-between rounded-lg border px-3.5 py-2.5 transition ${
                    doneToday
                      ? "border-emerald-500/30 bg-emerald-950/20"
                      : "border-slate-800 bg-slate-950/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {doneToday ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-500" />
                    )}
                    <div>
                      <div
                        className={`text-sm font-medium ${
                          doneToday ? "text-slate-400 line-through" : "text-white"
                        }`}
                      >
                        {rt.title}
                      </div>
                      <div className="text-xs text-slate-400">
                        {rt.time_of_day} · {rt.frequency}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {doneToday ? "Feito hoje" : "Pendente"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

