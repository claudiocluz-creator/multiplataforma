# CLAUDE.md — Antigravity Command Center

Este arquivo fornece o contexto completo do projeto **Antigravity Command Center** para o Claude / Claude Code / Antigravity IDE, consolidando todas as decisões de produto e arquitetura definidas desde o início.

---

## 1. Visão do Produto ("Eu-Equipe" / Solo Founder)

O usuário atua de forma solo tocando **múltiplos projetos simultâneos** (ex.: *AILA Core*, *Plataforma Gestão*, e projetos satélites futuros como *Esteira Instagram → YouTube*).
O objetivo do sistema é ser um **Centro de Comando Centralizado**:
1. **Centralização Multicanal:** Capturar demandas soltas de WhatsApp, E-mail, Zendesk e Basecamp, usar IA para estruturar em cards no Kanban (agrupando threads e identificando o projeto certo) e responder de forma **bidirecional** ao resolver.
2. **Kanban + Gantt + Agenda/Rotinas:** Unir operação diária (Kanban), linha do tempo de prazos/dependências (Gantt) e assistente executivo pessoal (Google Agenda + Timeboxing + Rotinas recorrentes + Lembretes).
3. **Execução Multi-Projeto por IA + Pull Requests:** Cada card é vinculado a um projeto do catálogo e pode acionar a IA em uma **branch/worktree isolada** para gerar um **Pull Request** para revisão humana final.
4. **Arquitetura Híbrida (Resiliência contra falta de luz / uso em casa e no trabalho):**
   - O Hub (Frontend na **Vercel** + Backend na nuvem via **Railway/Render**) fica 24h online.
   - A execução de código suporta múltiplos modos convivendo juntos:
     - `antigravity_sdk`: Antigravity Python SDK (`google-antigravity`) local.
     - `claude_cli`: Claude Code CLI (`claude -p`) local.
     - `remote_worker`: Fila na nuvem (`queued`) consumida sob demanda por qualquer PC (casa, trabalho ou notebook) rodando `worker/local_worker.py`.
     - `github_actions`: Disparo direto via `repository_dispatch` (`antigravity-card`) no GitHub.
     - `sandbox`: Modo simulado quando sem repo local/chaves.
5. **Esteira de Conteúdo (IG → YouTube) como Projeto Satélite:** Captura Reels/acervo, classifica `Shorts (<60s)` vs `Vídeo Longo`, gera título/descrição/tags SEO e agenda/publica integrado ao Kanban.

---

## 2. Estrutura do Repositório

- **Repositório GitHub:** `https://github.com/claudiocluz-creator/multiplataforma` (branch `main`)
- **Deploy Frontend (Vercel):** `https://multiplataforma-plum.vercel.app/` (Root Directory: `frontend`)

```text
Multi Plataforma/
├── backend/
│   ├── Dockerfile                   # Pronto para Railway / Render
│   ├── requirements.txt             # FastAPI, SQLModel, uvicorn, httpx, pydantic-settings
│   ├── .env.example                 # Variáveis para GitHub, Gemini, Claude, Google Calendar, Zendesk, WhatsApp, YouTube
│   └── app/
│       ├── main.py                  # FastAPI + CORS + lifespan + routers
│       ├── config.py                # Settings via pydantic-settings
│       ├── database.py              # SQLite/SQLModel + seed inicial (Fases 1–4)
│       ├── models.py                # Project, Card, CustomAction, AgentRun, CalendarEvent, Routine, ChannelMessage, ContentItem
│       ├── schemas.py               # Schemas Pydantic
│       ├── routers/
│       │   ├── projects.py          # CRUD catálogo de projetos + validação Git local
│       │   ├── cards.py             # CRUD cards Kanban/Gantt
│       │   ├── actions.py           # Menu de Ações Customizáveis (playbooks + webhooks + prompts)
│       │   ├── runs.py              # Trigger IA, SSE stream, /worker/claim, /{id}/report
│       │   ├── agenda.py            # Eventos, Google Calendar sync, rotinas e lembretes
│       │   ├── intake.py            # Webhooks/simulação multicanal + resposta bidirecional
│       │   └── content.py           # Captura IG, importação em lote de acervo, publicação YT
│       └── services/
│           ├── git_service.py       # Git worktree isolado por card + commit + PR (gh CLI / GitHub API)
│           ├── agent_runner.py      # Executores plugáveis + pub/sub SSE
│           └── intake_service.py    # Triagem automática + envio bidirecional
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx             # Shell principal (6 abas)
│   │   ├── lib/
│   │   │   ├── api.ts               # Cliente tipado com fallback automático para demoStore na Vercel
│   │   │   └── demoStore.ts         # Persistência em localStorage quando NEXT_PUBLIC_API_URL não está configurada
│   │   ├── types/index.ts
│   │   └── components/
│   │       ├── Header.tsx           # Navegação + filtro por projeto + badge de lembretes
│   │       ├── KanbanBoard.tsx      # Drag & drop em 6 colunas
│   │       ├── GanttView.tsx        # Linha do tempo e dependências
│   │       ├── AgendaView.tsx       # Google Agenda, Timeboxing e Rotinas
│   │       ├── IntakeView.tsx       # Caixa Multicanal + simulador de triagem
│   │       ├── ContentView.tsx      # Esteira IG → YouTube
│   │       ├── ProjectsView.tsx     # Catálogo de projetos
│   │       ├── CardModal.tsx        # Detalhes, console SSE, PR, ações customizadas, resposta bidirecional
│   │       └── NewCardModal.tsx
└── worker/
    └── local_worker.py              # Worker portátil (casa/trabalho) para consumir jobs `remote_worker`
```

---

## 3. Comandos Úteis

### Rodar Backend localmente (porta 8000)
```powershell
cd backend
.\.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

### Rodar Frontend localmente (porta 3000)
```powershell
cd frontend
npm run dev
```

### Rodar Worker Local conectado à nuvem (em qualquer PC)
```powershell
python worker/local_worker.py --api https://SUA_URL_BACKEND --workspace C:\projetos
```

### Build / Verificação Frontend
```powershell
cd frontend
npx tsc --noEmit
npm run build
```

---

## 4. Estado Atual & Próximos Passos Planejados
- **Concluído:** Fases 1, 2, 3 e 4 implementadas (backend + frontend), fallback `demoStore.ts` para Vercel, `Dockerfile` e `worker/local_worker.py` para execução híbrida.
- **Em andamento / Próximo:**
  1. Finalizar o ajuste na Vercel (`Root Directory = frontend` + `Framework Preset = Next.js` + Redeploy).
  2. Hospedar `backend/` no Railway ou Render e configurar `NEXT_PUBLIC_API_URL` na Vercel + `CORS_ORIGINS` no backend.
  3. Conectar credenciais reais no `.env` conforme necessidade (GitHub, Google Calendar OAuth, Zendesk, WhatsApp Webhook, YouTube/Instagram) e cadastrar os repositórios reais na aba **Projetos**.
