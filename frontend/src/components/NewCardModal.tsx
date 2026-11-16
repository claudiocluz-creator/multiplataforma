"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Card, Priority, Project, SourceChannel } from "@/types";

interface NewCardModalProps {
  projects: Project[];
  onClose: () => void;
  onCreate: (data: Partial<Card>) => Promise<void>;
}

export function NewCardModal({
  projects,
  onClose,
  onCreate,
}: NewCardModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string>(
    projects[0] ? String(projects[0].id) : ""
  );
  const [priority, setPriority] = useState<Priority>("medium");
  const [sourceChannel, setSourceChannel] = useState<SourceChannel>("whatsapp");
  const [clientName, setClientName] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onCreate({
      title,
      description,
      project_id: projectId ? Number(projectId) : null,
      priority,
      source_channel: sourceChannel,
      client_name: clientName,
      start_date: startDate || null,
      due_date: dueDate || null,
      status: "inbox",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">
            Nova Demanda / Entrada Multicanal
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            placeholder="Título da demanda"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
          />

          <textarea
            placeholder="Mensagem original do cliente ou contexto técnico..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            >
              <option value="">Sem projeto</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={sourceChannel}
              onChange={(e) =>
                setSourceChannel(e.target.value as SourceChannel)
              }
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="zendesk">Zendesk</option>
              <option value="email">E-mail</option>
              <option value="basecamp">Basecamp</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Cliente (opcional)"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            >
              <option value="low">Prioridade: Baixa</option>
              <option value="medium">Prioridade: Média</option>
              <option value="high">Prioridade: Alta</option>
              <option value="urgent">Prioridade: Urgente</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Início</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Prazo</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Criar Card
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

