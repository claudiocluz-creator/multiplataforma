import {
  AgentRun,
  CalendarEvent,
  Card,
  CardStatus,
  ChannelMessage,
  ContentItem,
  CustomAction,
  Project,
  RemindersSummary,
  Routine,
  SourceChannel,
} from "@/types";

const STORAGE_KEY = "acc_demo_state_v1";

interface DemoState {
  projects: Project[];
  cards: Card[];
  actions: CustomAction[];
  runs: AgentRun[];
  events: CalendarEvent[];
  routines: Routine[];
  messages: ChannelMessage[];
  content: ContentItem[];
  nextId: number;
}

function isoDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function createInitialState(): DemoState {
  const now = new Date().toISOString();
  return {
    nextId: 100,
    projects: [
      {
        id: 1,
        name: "AILA Core",
        slug: "aila-core",
        description: "Serviço de IA para autores e fluxo editorial.",
        color: "#6366f1",
        repo_path: "",
        github_repo: "",
        default_branch: "main",
        executor: "antigravity_sdk",
        system_instructions: "Priorize testes unitários e API v2.",
        created_at: now,
        git_valid: false,
      },
      {
        id: 2,
        name: "Plataforma Gestão",
        slug: "plataforma-gestao",
        description: "Sistema web principal dos clientes.",
        color: "#10b981",
        repo_path: "",
        github_repo: "",
        default_branch: "main",
        executor: "antigravity_sdk",
        system_instructions: "Siga o padrão Next.js + FastAPI.",
        created_at: now,
        git_valid: false,
      },
      {
        id: 3,
        name: "Conteúdo YT / IG (Futuro)",
        slug: "conteudo-yt-ig",
        description: "Esteira Instagram → YouTube Shorts.",
        color: "#f59e0b",
        repo_path: "",
        github_repo: "",
        default_branch: "main",
        executor: "sandbox",
        system_instructions: "Classificar <60s como Shorts.",
        created_at: now,
        git_valid: false,
      },
    ],
    cards: [
      {
        id: 1,
        title: "Erro ao exportar capítulos longos na AILA",
        description:
          "Cliente relatou via WhatsApp que exportação PDF trava acima de 40 páginas.",
        status: "triage",
        priority: "high",
        source_channel: "whatsapp",
        external_id: null,
        client_name: "Editora Horizonte",
        project_id: 1,
        start_date: isoDateOffset(0),
        due_date: isoDateOffset(2),
        depends_on_id: null,
        branch_name: null,
        pr_url: null,
        resolution_note: null,
        position: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        title: "Ajustar webhook de cobrança no painel",
        description:
          "Ticket #4821 do Zendesk: status de pagamento demora para refletir no dashboard.",
        status: "in_progress",
        priority: "urgent",
        source_channel: "zendesk",
        external_id: "ZD-4821",
        client_name: "Clínica Vida",
        project_id: 2,
        start_date: isoDateOffset(-1),
        due_date: isoDateOffset(1),
        depends_on_id: null,
        branch_name: null,
        pr_url: null,
        resolution_note: null,
        position: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: 3,
        title: "Corrigir paginação de autores na listagem",
        description: "PR gerado pela IA aguardando sua revisão final.",
        status: "pr_review",
        priority: "medium",
        source_channel: "email",
        external_id: null,
        client_name: "Livraria Central",
        project_id: 1,
        start_date: isoDateOffset(-2),
        due_date: isoDateOffset(1),
        depends_on_id: null,
        branch_name: "ai/card-3-paginacao-autores",
        pr_url: "local://branch/ai/card-3-paginacao-autores",
        resolution_note: null,
        position: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: 4,
        title: "Estruturar captura Reels → YouTube Shorts",
        description: "Projeto satélite para automatizar acervo e novos vídeos.",
        status: "inbox",
        priority: "low",
        source_channel: "manual",
        external_id: null,
        client_name: "Canal André",
        project_id: 3,
        start_date: isoDateOffset(3),
        due_date: isoDateOffset(7),
        depends_on_id: null,
        branch_name: null,
        pr_url: null,
        resolution_note: null,
        position: 0,
        created_at: now,
        updated_at: now,
      },
    ],
    actions: [
      {
        id: 1,
        name: "Enviar para Manutenção da AILA",
        description: "Move para fila da AILA e prepara diagnóstico IA.",
        icon: "cpu",
        color: "#6366f1",
        project_id: 1,
        target_status: "in_progress",
        ai_prompt_template: "Analise o contexto deste chamado da AILA.",
        webhook_url: "",
        notify_source: false,
      },
      {
        id: 2,
        name: "Enviar para Manutenção de Sistema",
        description: "Encaminha correção simples para fila técnica.",
        icon: "wrench",
        color: "#10b981",
        project_id: null,
        target_status: "in_progress",
        ai_prompt_template: "",
        webhook_url: "",
        notify_source: false,
      },
      {
        id: 3,
        name: "Resolver Ticket (Bidirecional)",
        description: "Marca como concluído e registra resposta.",
        icon: "check-circle",
        color: "#0ea5e9",
        project_id: null,
        target_status: "done",
        ai_prompt_template: "",
        webhook_url: "",
        notify_source: true,
      },
    ],
    runs: [],
    events: [
      {
        id: 1,
        title: "Alinhamento rápido — Editora Horizonte (AILA)",
        description: "Validar exportação PDF.",
        start_at: `${isoDateOffset(0)}T14:00`,
        end_at: `${isoDateOffset(0)}T15:00`,
        source: "local",
        google_event_id: null,
        card_id: 1,
      },
    ],
    routines: [
      {
        id: 1,
        title: "Revisar fila de Pull Requests da IA",
        description: "Conferir diffs na coluna Revisão de PR.",
        frequency: "weekdays",
        time_of_day: "09:00",
        project_id: null,
        last_completed_date: null,
        active: true,
      },
      {
        id: 2,
        title: "Triagem da Caixa Multicanal",
        description: "Validar cards criados pela IA.",
        frequency: "daily",
        time_of_day: "10:30",
        project_id: null,
        last_completed_date: null,
        active: true,
      },
    ],
    messages: [
      {
        id: 1,
        channel: "whatsapp",
        direction: "inbound",
        external_thread_id: "wa-5511999990001",
        sender_name: "Editora Horizonte",
        sender_contact: "+55 11 99999-0001",
        raw_content:
          "Oi! Tentamos exportar um livro de 52 páginas na AILA e o PDF travou no meio.",
        card_id: 1,
        dispatched: true,
        created_at: now,
      },
    ],
    content: [
      {
        id: 1,
        project_id: 3,
        card_id: 4,
        source_platform: "instagram",
        source_url: "https://instagram.com/reel/demo-direito-1",
        media_path: "",
        original_caption:
          "Você sabia que multa indevida pode ser anulada? #direito #advocacia",
        duration_seconds: 42,
        format_type: "shorts",
        ai_title:
          "Multa Indevida Pode Ser Anulada? Saiba Seus Direitos em 40s #Shorts",
        ai_description:
          "Entenda em menos de 1 minuto quando uma multa pode ser contestada.",
        ai_tags: "direito,multa indevida,advocacia,shorts",
        status: "ai_enriched",
        youtube_video_id: null,
        scheduled_for: isoDateOffset(1),
        created_at: now,
      },
    ],
  };
}

function loadState(): DemoState {
  if (typeof window === "undefined") return createInitialState();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const init = createInitialState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
    return init;
  }
  return JSON.parse(raw) as DemoState;
}

function saveState(state: DemoState): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

export const demoStore = {
  listProjects: (): Project[] => loadState().projects,
  createProject: (data: Partial<Project>): Project => {
    const s = loadState();
    const p: Project = {
      id: ++s.nextId,
      name: data.name || "Novo Projeto",
      slug: data.slug || `proj-${s.nextId}`,
      description: data.description || "",
      color: data.color || "#6366f1",
      repo_path: data.repo_path || "",
      github_repo: data.github_repo || "",
      default_branch: data.default_branch || "main",
      executor: data.executor || "sandbox",
      system_instructions: data.system_instructions || "",
      created_at: new Date().toISOString(),
      git_valid: false,
    };
    s.projects.push(p);
    saveState(s);
    return p;
  },
  updateProject: (id: number, data: Partial<Project>): Project => {
    const s = loadState();
    const idx = s.projects.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Projeto não encontrado");
    s.projects[idx] = { ...s.projects[idx], ...data };
    saveState(s);
    return s.projects[idx];
  },

  listCards: (projectId?: number | null): Card[] => {
    const cards = loadState().cards;
    return projectId ? cards.filter((c) => c.project_id === projectId) : cards;
  },
  createCard: (data: Partial<Card>): Card => {
    const s = loadState();
    const now = new Date().toISOString();
    const card: Card = {
      id: ++s.nextId,
      title: data.title || "Nova demanda",
      description: data.description || "",
      status: data.status || "inbox",
      priority: data.priority || "medium",
      source_channel: data.source_channel || "manual",
      external_id: data.external_id || null,
      client_name: data.client_name || "",
      project_id: data.project_id ?? null,
      start_date: data.start_date ?? null,
      due_date: data.due_date ?? null,
      depends_on_id: data.depends_on_id ?? null,
      branch_name: null,
      pr_url: null,
      resolution_note: null,
      position: 0,
      created_at: now,
      updated_at: now,
    };
    s.cards.push(card);
    saveState(s);
    return card;
  },
  updateCard: (id: number, data: Partial<Card>): Card => {
    const s = loadState();
    const idx = s.cards.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Card não encontrado");
    s.cards[idx] = {
      ...s.cards[idx],
      ...data,
      updated_at: new Date().toISOString(),
    };
    saveState(s);
    return s.cards[idx];
  },
  deleteCard: (id: number): void => {
    const s = loadState();
    s.cards = s.cards.filter((c) => c.id !== id);
    saveState(s);
  },

  listActions: (projectId?: number | null): CustomAction[] => {
    const acts = loadState().actions;
    return projectId
      ? acts.filter((a) => a.project_id === null || a.project_id === projectId)
      : acts;
  },
  executeAction: (
    actionId: number,
    cardId: number,
    resolutionNote?: string
  ): Card => {
    const s = loadState();
    const act = s.actions.find((a) => a.id === actionId);
    const idx = s.cards.findIndex((c) => c.id === cardId);
    if (!act || idx === -1) throw new Error("Ação ou card não encontrado");
    if (act.target_status) s.cards[idx].status = act.target_status;
    if (resolutionNote) s.cards[idx].resolution_note = resolutionNote;
    s.cards[idx].updated_at = new Date().toISOString();
    saveState(s);
    return s.cards[idx];
  },

  listCardRuns: (cardId: number): AgentRun[] =>
    loadState().runs.filter((r) => r.card_id === cardId),
  triggerRun: (cardId: number): AgentRun => {
    const s = loadState();
    const idx = s.cards.findIndex((c) => c.id === cardId);
    if (idx === -1) throw new Error("Card não encontrado");
    const branch = `ai/card-${cardId}`;
    const run: AgentRun = {
      id: ++s.nextId,
      card_id: cardId,
      project_id: s.cards[idx].project_id,
      executor: "sandbox",
      status: "completed",
      prompt: s.cards[idx].title,
      branch_name: branch,
      worktree_path: null,
      pr_url: `local://branch/${branch}`,
      diff_summary: "Modo Vercel Cloud Demo: conecte seu backend local/remoto via NEXT_PUBLIC_API_URL para execução Git real.",
      logs: `[Demo Cloud] Analisando card #${cardId}...\n[Demo Cloud] Branch simulada: ${branch}\n[Demo Cloud] Concluído!`,
      created_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
    };
    s.runs.unshift(run);
    s.cards[idx].status = "pr_review" as CardStatus;
    s.cards[idx].branch_name = branch;
    s.cards[idx].pr_url = run.pr_url;
    saveState(s);
    return run;
  },

  listEvents: (): CalendarEvent[] => loadState().events,
  createEvent: (data: Partial<CalendarEvent>): CalendarEvent => {
    const s = loadState();
    const ev: CalendarEvent = {
      id: ++s.nextId,
      title: data.title || "Compromisso",
      description: data.description || "",
      start_at: data.start_at || new Date().toISOString().slice(0, 16),
      end_at: data.end_at || new Date().toISOString().slice(0, 16),
      source: "local",
      google_event_id: null,
      card_id: data.card_id ?? null,
    };
    s.events.push(ev);
    saveState(s);
    return ev;
  },
  deleteEvent: (id: number): void => {
    const s = loadState();
    s.events = s.events.filter((e) => e.id !== id);
    saveState(s);
  },

  listRoutines: (): Routine[] => loadState().routines,
  createRoutine: (data: Partial<Routine>): Routine => {
    const s = loadState();
    const rt: Routine = {
      id: ++s.nextId,
      title: data.title || "Rotina",
      description: data.description || "",
      frequency: data.frequency || "daily",
      time_of_day: data.time_of_day || "09:00",
      project_id: null,
      last_completed_date: null,
      active: true,
    };
    s.routines.push(rt);
    saveState(s);
    return rt;
  },
  toggleRoutine: (id: number): Routine => {
    const s = loadState();
    const idx = s.routines.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error("Rotina não encontrada");
    const today = isoDateOffset(0);
    s.routines[idx].last_completed_date =
      s.routines[idx].last_completed_date === today ? null : today;
    saveState(s);
    return s.routines[idx];
  },

  getReminders: (): RemindersSummary => {
    const s = loadState();
    const today = isoDateOffset(0);
    const tomorrow = isoDateOffset(1);
    const dueCards = s.cards.filter(
      (c) => c.status !== "done" && c.due_date && c.due_date <= tomorrow
    );
    const pendingRoutines = s.routines.filter(
      (r) => r.active && r.last_completed_date !== today
    );
    const upcomingEvents = s.events.filter((e) =>
      [today, tomorrow].includes(e.start_at.slice(0, 10))
    );
    return {
      today,
      due_cards_count: dueCards.length,
      due_cards: dueCards.map((c) => ({
        id: c.id,
        title: c.title,
        due_date: c.due_date || today,
      })),
      pending_routines_count: pendingRoutines.length,
      upcoming_events_count: upcomingEvents.length,
    };
  },

  listMessages: (cardId?: number): ChannelMessage[] => {
    const msgs = loadState().messages;
    return cardId ? msgs.filter((m) => m.card_id === cardId) : msgs;
  },
  simulateInbound: (data: {
    channel: SourceChannel;
    sender_name: string;
    raw_content: string;
  }) => {
    const s = loadState();
    const matched =
      s.projects.find((p) =>
        data.raw_content.toLowerCase().includes(p.name.toLowerCase().split(" ")[0])
      ) || s.projects[0];
    const card: Card = {
      id: ++s.nextId,
      title: data.raw_content.slice(0, 68),
      description: data.raw_content,
      status: "triage",
      priority: data.raw_content.toLowerCase().includes("urgente")
        ? "urgent"
        : "high",
      source_channel: data.channel,
      external_id: null,
      client_name: data.sender_name || "Cliente",
      project_id: matched ? matched.id : null,
      start_date: isoDateOffset(0),
      due_date: isoDateOffset(2),
      depends_on_id: null,
      branch_name: null,
      pr_url: null,
      resolution_note: null,
      position: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const msg: ChannelMessage = {
      id: ++s.nextId,
      channel: data.channel,
      direction: "inbound",
      external_thread_id: "",
      sender_name: data.sender_name || "Cliente",
      sender_contact: "",
      raw_content: data.raw_content,
      card_id: card.id,
      dispatched: true,
      created_at: new Date().toISOString(),
    };
    s.cards.unshift(card);
    s.messages.unshift(msg);
    saveState(s);
    return { message: msg, card };
  },
  replyBidirectional: (cardId: number, message: string, markDone = true): ChannelMessage => {
    const s = loadState();
    const idx = s.cards.findIndex((c) => c.id === cardId);
    if (idx === -1) throw new Error("Card não encontrado");
    if (markDone) s.cards[idx].status = "done";
    s.cards[idx].resolution_note = message;
    const msg: ChannelMessage = {
      id: ++s.nextId,
      channel: s.cards[idx].source_channel,
      direction: "outbound",
      external_thread_id: "",
      sender_name: "Antigravity Command Center",
      sender_contact: s.cards[idx].client_name,
      raw_content: message,
      card_id: cardId,
      dispatched: true,
      created_at: new Date().toISOString(),
    };
    s.messages.unshift(msg);
    saveState(s);
    return msg;
  },

  listContent: (): ContentItem[] => loadState().content,
  captureContent: (data: {
    source_url?: string;
    original_caption: string;
    duration_seconds: number;
    niche?: string;
  }): ContentItem => {
    const s = loadState();
    const fmt = data.duration_seconds < 60 ? "shorts" : "long_form";
    const item: ContentItem = {
      id: ++s.nextId,
      project_id: 3,
      card_id: null,
      source_platform: "instagram",
      source_url: data.source_url || "",
      media_path: "",
      original_caption: data.original_caption,
      duration_seconds: data.duration_seconds,
      format_type: fmt,
      ai_title: `${data.original_caption.slice(0, 55)}${fmt === "shorts" ? " #Shorts" : ""}`,
      ai_description: `${data.original_caption}\n\n📌 Tema: ${data.niche || "Geral"}`,
      ai_tags: `${(data.niche || "conteudo").toLowerCase()},${fmt}`,
      status: "ai_enriched",
      youtube_video_id: null,
      scheduled_for: isoDateOffset(1),
      created_at: new Date().toISOString(),
    };
    s.content.unshift(item);
    saveState(s);
    return item;
  },
  approvePublishContent: (id: number): ContentItem => {
    const s = loadState();
    const idx = s.content.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error("Item não encontrado");
    s.content[idx].status = "published";
    s.content[idx].youtube_video_id = `yt-demo-${id}`;
    saveState(s);
    return s.content[idx];
  },
};

