"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  Check,
  Copy,
  GitBranch,
  GitPullRequest,
  Play,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  AgentRun,
  Card,
  CardStatus,
  CustomAction,
  ExecutorType,
  KANBAN_COLUMNS,
  Project,
} from "@/types";

interface CardModalProps {
  card: Card;
  projects: Project[];
  actions: CustomAction[];
  onClose: () => void;
  onCardUpdated: () => void;
  onDeleteCard: (cardId: number) => void;
}

export function CardModal({
  card,
  projects,
  actions,
  onClose,
  onCardUpdated,
  onDeleteCard,
}: CardModalProps) {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [executor, setExecutor] = useState<ExecutorType>("antigravity_sdk");
  const [copied, setCopied] = useState(false);
  const [resolutionNote, setResolutionNote] = useState(card.resolution_note || "");

  const project = projects.find((p) => p.id === card.project_id);

  useEffect(() => {
    if (project) setExecutor(project.executor);
    api.listCardRuns(card.id).then(setRuns).catch(console.error);
  }, [card.id, project]);

  const handleAskAI = async () => {
    setLiveLogs([]);
    setIsStreaming(true);
    const run = await api.triggerRun(card.id, {
      custom_prompt: customPrompt.trim() || undefined,
      executor_override: executor,
      auto_create_pr: true,
    });
    setRuns((prev) => [run, ...prev]);

    if (run.status === "completed" || run.status === "failed") {
      setLiveLogs(run.logs ? run.logs.split("\n") : []);
      setIsStreaming(false);
      onCardUpdated();
      return;
    }

    const es = new EventSource(api.streamUrl(run.id));
    es.onmessage = (e) => {
      setLiveLogs((prev) => [...prev, e.data]);
    };
    es.addEventListener("done", () => {
      es.close();
      setIsStreaming(false);
      api.listCardRuns(card.id).then(setRuns);
      onCardUpdated();
    });
    es.onerror = () => {
      es.close();
      setIsStreaming(false);
    };
  };

  const handleCopyCopilotPrompt = () => {
    const promptText = [
      `Projeto: ${project?.name || "N/A"} (${project?.repo_path || "sem repo"})`,
      `Demanda #${card.id}: ${card.title}`,
      `Origem: ${card.source_channel} | Cliente: ${card.client_name || "N/A"}`,
      `Contexto:\n${card.description}`,
      project?.system_instructions
        ? `Regras do Projeto:\n${project.system_instructions}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecuteAction = async (action: CustomAction) => {
    await api.executeAction(action.id, card.id, resolutionNote);
    onCardUpdated();
    onClose();
  };

  const handleBidirectionalReply = async () => {
    if (!resolutionNote.trim()) return;
    await api.replyBidirectional(card.id, resolutionNote.trim(), true);
    onCardUpdated();
    onClose();
  };

  const applicableActions = actions.filter(
    (a) => a.project_id === null || a.project_id === card.project_id
  );

  const latestLogs =
    liveLogs.length > 0
      ? liveLogs.join("\n")
      : runs[0]?.logs || "Nenhuma execução de IA registrada ainda.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs text-slate-400">
              <span>Card #{card.id}</span>
              <span>·</span>
              <span className="capitalize">{card.source_channel}</span>
              {card.client_name && (
                <>
                  <span>·</span>
                  <span>{card.client_name}</span>
                </>
              )}
            </div>
            <h2 className="text-lg font-semibold text-white">{card.title}</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onDeleteCard(card.id);
                onClose();
              }}
              className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
              title="Excluir demanda"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="grid flex-1 gap-6 overflow-y-auto p-6 md:grid-cols-[1.3fr_1fr]">
          {/* Left column: Context + AI Execution */}
          <div className="space-y-5">
            <div>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Contexto da Demanda
              </h3>
              <p className="whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 text-sm text-slate-200">
                {card.description || "Sem descrição detalhada."}
              </p>
            </div>

            {/* Pedir para a IA */}
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/15 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-indigo-300">
                  <Bot className="h-4 w-4" />
                  Pedir para a IA ({project?.name || "Sandbox"})
                </h3>

                <button
                  onClick={handleCopyCopilotPrompt}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copiar p/ Claude.ai
                    </>
                  )}
                </button>
              </div>

              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={2}
                placeholder="Instrução adicional opcional para a IA (ou deixe vazio para usar o contexto completo do card)..."
                className="mb-3 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <select
                  value={executor}
                  onChange={(e) => setExecutor(e.target.value as ExecutorType)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="antigravity_sdk">Antigravity Python SDK</option>
                  <option value="claude_cli">Claude Code CLI</option>
                  <option value="sandbox">Modo Sandbox</option>
                </select>

                <button
                  onClick={handleAskAI}
                  disabled={isStreaming}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5" />
                  {isStreaming ? "Executando..." : "Executar & Gerar PR"}
                </button>
              </div>
            </div>

            {/* Live Logs */}
            <div>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Console do Agente (Tempo Real)
              </h3>
              <pre className="max-h-52 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-800 bg-black/70 p-3 font-mono text-xs text-emerald-300">
                {latestLogs}
              </pre>
            </div>
          </div>

          {/* Right column: Status, PR, Custom Actions */}
          <div className="space-y-5">
            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Coluna / Status
                </label>
                <select
                  value={card.status}
                  onChange={async (e) => {
                    await api.updateCard(card.id, {
                      status: e.target.value as CardStatus,
                    });
                    onCardUpdated();
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white"
                >
                  {KANBAN_COLUMNS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Projeto Vinculado
                </label>
                <select
                  value={card.project_id ?? ""}
                  onChange={async (e) => {
                    await api.updateCard(card.id, {
                      project_id: e.target.value ? Number(e.target.value) : null,
                    });
                    onCardUpdated();
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white"
                >
                  <option value="">Sem projeto</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {(card.branch_name || card.pr_url) && (
                <div className="space-y-1.5 rounded-lg border border-purple-500/30 bg-purple-950/20 p-3 text-xs">
                  {card.branch_name && (
                    <div className="flex items-center gap-1.5 text-purple-200">
                      <GitBranch className="h-3.5 w-3.5" />
                      <span className="truncate font-mono">
                        {card.branch_name}
                      </span>
                    </div>
                  )}
                  {card.pr_url && (
                    <div className="flex items-center gap-1.5 text-purple-300">
                      <GitPullRequest className="h-3.5 w-3.5" />
                      {card.pr_url.startsWith("http") ? (
                        <a
                          href={card.pr_url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline hover:text-white"
                        >
                          Abrir Pull Request
                        </a>
                      ) : (
                        <span className="truncate font-mono">{card.pr_url}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Menu de Ações Customizáveis */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                Menu de Ações Customizáveis
              </h3>

              <input
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Mensagem de conclusão para o cliente..."
                className="mb-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-sky-500"
              />

              <button
                onClick={handleBidirectionalReply}
                disabled={!resolutionNote.trim()}
                className="mb-3 w-full rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:opacity-40"
              >
                Resolver &amp; Responder via {card.source_channel.toUpperCase()}
              </button>

              <div className="space-y-2">
                {applicableActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleExecuteAction(action)}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950/90 px-3 py-2 text-left transition hover:border-slate-600 hover:bg-slate-900"
                  >
                    <div>
                      <div className="text-xs font-medium text-white">
                        {action.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {action.description}
                      </div>
                    </div>
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: action.color }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

