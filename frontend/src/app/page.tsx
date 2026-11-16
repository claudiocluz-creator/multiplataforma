"use client";

import { useCallback, useEffect, useState } from "react";
import { AgendaView } from "@/components/AgendaView";
import { CardModal } from "@/components/CardModal";
import { ContentView } from "@/components/ContentView";
import { GanttView } from "@/components/GanttView";
import { ActiveView, Header } from "@/components/Header";
import { IntakeView } from "@/components/IntakeView";
import { KanbanBoard } from "@/components/KanbanBoard";
import { NewCardModal } from "@/components/NewCardModal";
import { ProjectsView } from "@/components/ProjectsView";
import { api } from "@/lib/api";
import {
  Card,
  CardStatus,
  CustomAction,
  Project,
  RemindersSummary,
} from "@/types";

export default function Home() {
  const [activeView, setActiveView] = useState<ActiveView>("kanban");
  const [projects, setProjects] = useState<Project[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [actions, setActions] = useState<CustomAction[]>([]);
  const [reminders, setReminders] = useState<RemindersSummary | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showNewCard, setShowNewCard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      setError(null);
      const [projList, cardList, actionList, rem] = await Promise.all([
        api.listProjects(),
        api.listCards(selectedProjectId),
        api.listActions(),
        api.getReminders(),
      ]);
      setProjects(projList);
      setCards(cardList);
      setActions(actionList);
      setReminders(rem);
      setSelectedCard((prev) =>
        prev ? cardList.find((c) => c.id === prev.id) || null : null
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? `Não foi possível conectar ao backend (http://localhost:8000): ${err.message}`
          : "Erro ao carregar dados do backend."
      );
    }
  }, [selectedProjectId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleMoveCard = async (cardId: number, newStatus: CardStatus) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, status: newStatus } : c))
    );
    await api.updateCard(cardId, { status: newStatus });
    loadAll();
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        projects={projects}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
        reminders={reminders}
        onNewCard={() => setShowNewCard(true)}
      />

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-5 py-6">
        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {activeView === "kanban" && (
          <KanbanBoard
            cards={cards}
            projects={projects}
            onSelectCard={setSelectedCard}
            onMoveCard={handleMoveCard}
          />
        )}

        {activeView === "gantt" && (
          <GanttView
            cards={cards}
            projects={projects}
            onSelectCard={setSelectedCard}
          />
        )}

        {activeView === "agenda" && (
          <AgendaView
            cards={cards}
            onSelectCard={setSelectedCard}
            onRefreshReminders={loadAll}
          />
        )}

        {activeView === "intake" && (
          <IntakeView
            cards={cards}
            onSelectCard={setSelectedCard}
            onCardsUpdated={loadAll}
          />
        )}

        {activeView === "content" && <ContentView onCardsUpdated={loadAll} />}

        {activeView === "projects" && (
          <ProjectsView
            projects={projects}
            onCreateProject={async (data) => {
              await api.createProject(data);
              loadAll();
            }}
            onUpdateProject={async (id, data) => {
              await api.updateProject(id, data);
              loadAll();
            }}
          />
        )}
      </main>

      {selectedCard && (
        <CardModal
          card={selectedCard}
          projects={projects}
          actions={actions}
          onClose={() => setSelectedCard(null)}
          onCardUpdated={loadAll}
          onDeleteCard={async (id) => {
            await api.deleteCard(id);
            loadAll();
          }}
        />
      )}

      {showNewCard && (
        <NewCardModal
          projects={projects}
          onClose={() => setShowNewCard(false)}
          onCreate={async (data) => {
            await api.createCard(data);
            loadAll();
          }}
        />
      )}
    </div>
  );
}
