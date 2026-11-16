from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import init_db
from .routers import actions, agenda, cards, content, intake, projects, runs


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(cards.router)
app.include_router(actions.router)
app.include_router(runs.router)
app.include_router(agenda.router)
app.include_router(intake.router)
app.include_router(content.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "app": settings.app_name}
