from datetime import date, datetime, timedelta
from sqlmodel import Session, SQLModel, create_engine, select
from .config import settings
from .models import (
    CalendarEvent,
    Card,
    CardStatus,
    ChannelMessage,
    ContentFormat,
    ContentItem,
    ContentStatus,
    CustomAction,
    ExecutorType,
    Priority,
    Project,
    Routine,
    RoutineFrequency,
    SourceChannel,
)

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, echo=False, connect_args=connect_args)


def get_session():
    with Session(engine) as session:
        yield session


def init_db() -> None:
    """Create tables and seed initial demo data if tables are empty."""
    SQLModel.metadata.create_all(engine)
    today = date.today()
    d = lambda offset: (today + timedelta(days=offset)).isoformat()

    with Session(engine) as session:
        if not session.exec(select(Project)).first():
            p_aila = Project(
                name="AILA Core",
                slug="aila-core",
                description="Serviço de IA para autores e fluxo editorial.",
                color="#6366f1",
                repo_path="",
                github_repo="",
                default_branch="main",
                executor=ExecutorType.ANTIGRAVITY_SDK,
                system_instructions="Priorize testes unitários e mantenha compatibilidade com a API v2.",
            )
            p_sys = Project(
                name="Plataforma Gestão",
                slug="plataforma-gestao",
                description="Sistema web principal dos clientes.",
                color="#10b981",
                repo_path="",
                github_repo="",
                default_branch="main",
                executor=ExecutorType.ANTIGRAVITY_SDK,
                system_instructions="Siga o padrão Next.js + FastAPI e valide permissões.",
            )
            p_yt = Project(
                name="Conteúdo YT / IG (Futuro)",
                slug="conteudo-yt-ig",
                description="Esteira futura de publicação Instagram → YouTube Shorts.",
                color="#f59e0b",
                repo_path="",
                github_repo="",
                default_branch="main",
                executor=ExecutorType.SANDBOX,
                system_instructions="Classificar vídeos < 60s como Shorts e otimizar SEO.",
            )
            session.add_all([p_aila, p_sys, p_yt])
            session.commit()
            session.refresh(p_aila)
            session.refresh(p_sys)
            session.refresh(p_yt)

            cards = [
                Card(
                    title="Erro ao exportar capítulos longos na AILA",
                    description="Cliente relatou via WhatsApp que exportação PDF trava acima de 40 páginas.",
                    status=CardStatus.TRIAGE,
                    priority=Priority.HIGH,
                    source_channel=SourceChannel.WHATSAPP,
                    client_name="Editora Horizonte",
                    project_id=p_aila.id,
                    start_date=d(0),
                    due_date=d(2),
                    position=0,
                ),
                Card(
                    title="Ajustar webhook de cobrança no painel",
                    description="Ticket #4821 do Zendesk: status de pagamento demora para refletir no dashboard.",
                    status=CardStatus.IN_PROGRESS,
                    priority=Priority.URGENT,
                    source_channel=SourceChannel.ZENDESK,
                    external_id="ZD-4821",
                    client_name="Clínica Vida",
                    project_id=p_sys.id,
                    start_date=d(-1),
                    due_date=d(1),
                    position=0,
                ),
                Card(
                    title="Corrigir paginação de autores na listagem",
                    description="PR gerado pela IA aguardando sua revisão final.",
                    status=CardStatus.PR_REVIEW,
                    priority=Priority.MEDIUM,
                    source_channel=SourceChannel.EMAIL,
                    client_name="Livraria Central",
                    project_id=p_aila.id,
                    start_date=d(-2),
                    due_date=d(1),
                    branch_name="ai/card-3-paginacao-autores",
                    pr_url="local://branch/ai/card-3-paginacao-autores",
                    position=0,
                ),
                Card(
                    title="Estruturar captura Reels → YouTube Shorts",
                    description="Projeto satélite para automatizar acervo e novos vídeos.",
                    status=CardStatus.INBOX,
                    priority=Priority.LOW,
                    source_channel=SourceChannel.MANUAL,
                    client_name="Canal André",
                    project_id=p_yt.id,
                    start_date=d(3),
                    due_date=d(7),
                    position=0,
                ),
            ]
            session.add_all(cards)
            session.commit()

            actions = [
                CustomAction(
                    name="Enviar para Manutenção da AILA",
                    description="Move para fila de manutenção da AILA e prepara diagnóstico IA.",
                    icon="cpu",
                    color="#6366f1",
                    project_id=p_aila.id,
                    target_status=CardStatus.IN_PROGRESS,
                    ai_prompt_template="Analise o contexto deste chamado da AILA e proponha o plano de correção.",
                ),
                CustomAction(
                    name="Enviar para Manutenção de Sistema",
                    description="Encaminha correção simples para fila técnica do sistema.",
                    icon="wrench",
                    color="#10b981",
                    project_id=None,
                    target_status=CardStatus.IN_PROGRESS,
                ),
                CustomAction(
                    name="Resolver Ticket (Bidirecional)",
                    description="Marca como concluído e registra resposta para o canal de origem.",
                    icon="check-circle",
                    color="#0ea5e9",
                    project_id=None,
                    target_status=CardStatus.DONE,
                    notify_source=True,
                ),
            ]
            session.add_all(actions)
            session.commit()

        # Phase 2 seed: Routines & Calendar Events
        if not session.exec(select(Routine)).first():
            session.add_all(
                [
                    Routine(
                        title="Revisar fila de Pull Requests da IA",
                        description="Conferir diffs gerados na coluna Revisão de PR.",
                        frequency=RoutineFrequency.WEEKDAYS,
                        time_of_day="09:00",
                    ),
                    Routine(
                        title="Triagem da Caixa Multicanal (WhatsApp / Zendesk)",
                        description="Validar cards criados automaticamente pela IA.",
                        frequency=RoutineFrequency.DAILY,
                        time_of_day="10:30",
                    ),
                    Routine(
                        title="Revisão semanal de prazos no Gantt",
                        description="Ajustar entregas da semana e metas.",
                        frequency=RoutineFrequency.WEEKLY,
                        time_of_day="17:00",
                    ),
                ]
            )
            session.commit()

        if not session.exec(select(CalendarEvent)).first():
            now_dt = datetime.now().replace(minute=0, second=0, microsecond=0)
            ev1_start = (now_dt + timedelta(hours=2)).isoformat(timespec="minutes")
            ev1_end = (now_dt + timedelta(hours=3)).isoformat(timespec="minutes")
            ev2_start = (now_dt + timedelta(days=1, hours=10 - now_dt.hour)).isoformat(timespec="minutes")
            ev2_end = (now_dt + timedelta(days=1, hours=11 - now_dt.hour)).isoformat(timespec="minutes")
            session.add_all(
                [
                    CalendarEvent(
                        title="Alinhamento rápido — Editora Horizonte (AILA)",
                        description="Validar exportação PDF de capítulos longos.",
                        start_at=ev1_start,
                        end_at=ev1_end,
                        source="local",
                    ),
                    CalendarEvent(
                        title="Bloco de Foco: Revisão de PRs",
                        description="Revisar e aprovar entregas dos agentes.",
                        start_at=ev2_start,
                        end_at=ev2_end,
                        source="local",
                    ),
                ]
            )
            session.commit()

        # Phase 3 seed: Sample Multichannel Message
        if not session.exec(select(ChannelMessage)).first():
            first_card = session.exec(select(Card)).first()
            if first_card:
                session.add(
                    ChannelMessage(
                        channel=SourceChannel.WHATSAPP,
                        direction="inbound",
                        external_thread_id="wa-5511999990001",
                        sender_name="Editora Horizonte",
                        sender_contact="+55 11 99999-0001",
                        raw_content="Oi! Tentamos exportar um livro de 52 páginas na AILA e o PDF travou no meio.",
                        card_id=first_card.id,
                    )
                )
                session.commit()

        # Phase 4 seed: Sample Content Pipeline Item
        if not session.exec(select(ContentItem)).first():
            yt_proj = session.exec(select(Project).where(Project.slug == "conteudo-yt-ig")).first()
            session.add(
                ContentItem(
                    project_id=yt_proj.id if yt_proj else None,
                    source_platform="instagram",
                    source_url="https://instagram.com/reel/demo-direito-1",
                    original_caption="Você sabia que multa indevida pode ser anulada? #direito #advocacia",
                    duration_seconds=42,
                    format_type=ContentFormat.SHORTS,
                    ai_title="Multa Indevida Pode Ser Anulada? Saiba Seus Direitos em 40s #Shorts",
                    ai_description=(
                        "Entenda em menos de 1 minuto quando uma multa pode ser contestada e anulada.\n\n"
                        "📌 Conteúdo educativo sobre Direito.\n"
                        "🔔 Inscreva-se para mais dicas jurídicas práticas."
                    ),
                    ai_tags="direito,multa indevida,advocacia,shorts,direito do consumidor",
                    status=ContentStatus.AI_ENRICHED,
                    scheduled_for=d(1),
                )
            )
            session.commit()
