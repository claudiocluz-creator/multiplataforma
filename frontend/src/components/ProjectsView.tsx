"use client";

import { useState } from "react";
import { CheckCircle2, FolderGit2, Plus, Terminal, XCircle } from "lucide-react";
import { ExecutorType, Project } from "@/types";

interface ProjectsViewProps {
  projects: Project[];
  onCreateProject: (data: Partial<Project>) => Promise<void>;
  onUpdateProject: (id: number, data: Partial<Project>) => Promise<void>;
}

export function ProjectsView({
  projects,
  onCreateProject,
  onUpdateProject,
}: ProjectsViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [repoPath, setRepoPath] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [executor, setExecutor] = useState<ExecutorType>("antigravity_sdk");
  const [instructions, setInstructions] = useState("");
  const [color, setColor] = useState("#6366f1");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onCreateProject({
      name,
      slug:
        slug.trim() ||
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      repo_path: repoPath,
      github_repo: githubRepo,
      executor,
      system_instructions: instructions,
      color,
    });
    setName("");
    setSlug("");
    setRepoPath("");
    setGithubRepo("");
    setInstructions("");
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Catálogo de Projetos Conectados
          </h2>
          <p className="text-xs text-slate-400">
            Cada card do Kanban aciona o repositório e o executor de IA do
            projeto vinculado.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          Novo Projeto
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-4 md:grid-cols-2"
        >
          <input
            placeholder="Nome do Projeto (ex: AILA Core)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
          />
          <input
            placeholder="Caminho local do repo Git (ex: C:\projetos\aila)"
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
          />
          <input
            placeholder="GitHub repo opcional (owner/repo)"
            value={githubRepo}
            onChange={(e) => setGithubRepo(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
          />
          <div className="flex gap-2">
            <select
              value={executor}
              onChange={(e) => setExecutor(e.target.value as ExecutorType)}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
            >
              <option value="antigravity_sdk">Antigravity Python SDK</option>
              <option value="claude_cli">Claude Code CLI</option>
              <option value="remote_worker">Worker Local (Casa/Trabalho)</option>
              <option value="github_actions">GitHub Actions (Nuvem)</option>
              <option value="sandbox">Modo Sandbox</option>
            </select>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-12 cursor-pointer rounded-lg border border-slate-700 bg-slate-950 p-1"
            />
          </div>
          <textarea
            placeholder="Instruções específicas da IA para este projeto..."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={2}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 md:col-span-2"
          />
          <div className="flex justify-end gap-2 md:col-span-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Salvar Projeto
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <div
            key={p.id}
            className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4"
          >
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <h3 className="font-semibold text-white">{p.name}</h3>
                </div>
                {p.git_valid ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    Git válido
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">
                    <XCircle className="h-3 w-3" />
                    Sem repo local
                  </span>
                )}
              </div>

              <p className="mb-3 text-xs text-slate-400">
                {p.description || "Sem descrição."}
              </p>

              <div className="space-y-1.5 rounded-lg bg-slate-950/70 p-2.5 text-xs text-slate-300">
                <div className="flex items-center gap-1.5 truncate">
                  <FolderGit2 className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                  <span className="truncate">
                    {p.repo_path || "Caminho local não configurado"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                  <span>Executor: {p.executor}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-3">
              <button
                onClick={() => {
                  const path = window.prompt(
                    `Caminho local do repositório Git para ${p.name}:`,
                    p.repo_path
                  );
                  if (path !== null) {
                    onUpdateProject(p.id, { repo_path: path });
                  }
                }}
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
              >
                Configurar Repo Local
              </button>
              <span className="text-[11px] text-slate-500">
                Branch: {p.default_branch}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

