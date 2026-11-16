# Antigravity Command Center (Fase 1 — MVP)

Hub central de gestão de demandas em **Kanban + Gantt**, com **Catálogo Multi-Projeto**, **Orquestrador de IA** (Antigravity Python SDK / Claude CLI / Sandbox) em **Git Worktrees** isolados, **Menu de Ações Customizáveis** e **Geração de Pull Requests**.

## Como executar localmente

### 1. Backend (FastAPI + SQLite)
```powershell
cd backend
.\.venv\Scripts\uvicorn app.main:app --reload --port 8000
```
API disponível em `http://localhost:8000` (Swagger em `http://localhost:8000/docs`).

### 2. Frontend (Next.js)
```powershell
cd frontend
npm run dev
```
Interface disponível em `http://localhost:3000`.

